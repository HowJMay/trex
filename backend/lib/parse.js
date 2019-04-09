const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('lib:parse');
const moment = require('moment');
const nconf = require('nconf'); 
const xpath = require('xpath');
const xmldom = require('xmldom');
const JSDOM = require('jsdom').JSDOM;

const mongo = require('./mongo');
const echoes = require('./echoes');
const utils = require('./utils');
const glue = require('./glue');

function checkMetadata(impression, repeat) {
    /* this function return an impression if, and only if
       we HAVE to process it. when the 'repeat' is true, 
       a present metadata would be remove and the tested
       impression is returned */
    if(_.isUndefined(impression.id))
        throw new Error("impression missing");

    return mongo
        .readOne(nconf.get('schema').metadata, { id: impression.id })
        .then(function(i) {
            if( _.get(i, 'id') === impression.id && !repeat) {
                debug("metadata [%s] already exists: skipping", i.id);
                return null;
            }

            if( _.get(i, 'id') === impression.id && repeat) {
                debug("metadata [%s] exists, but repeat is requested", i.id);
                return mongo
                    .remove(nconf.get('schema').metadata, { id: impression.id })
                    .return(impression);
            }

            /* else if _.isUndefined(i) is returned the impression */
            return impression;
        });
}

function initialize(impression) {
    /* this function initialize the libraries and the envelop */

    const xmlerr = { warning: 0, error: 0, fatal: 0 };
    var domOptions = {
          errorHandler:{
              warning: function() { xmlerr.warning += 1; },
              error: function() { xmlerr.error += 1; },
              fatalError: function() { xmlerr.fatal += 1;  },
          }
    };
    /* this is the envelope with get appended the metadata from the various parsers */
    return {
        impression,
        xmlerr,
        xpath,
        jsdom: new JSDOM(impression.html.replace(/\n\ +/g, '')).window.document,
        dom: new xmldom.DOMParser(domOptions).parseFromString(impression.html),
    };
}

function finalize(envelopes) {
    /* here is build the new complex object which travels in the pipeline,
     * metadata & parsers are the internal content, not meant to be public */
    if(!_.size(envelopes))
        return { metadata: [], summary: [], statistics: [], parsers: [], errors: [] };

    const errors = _.reduce(envelopes, function(memo, e) {
        if(!_.size(e.errors))
            return memo;
        var r = {
            errors: e.errors,
            when:  new Date(),
            id: e.impression.id,
            timelineId: e.impression.timelineId
        }
        memo.push(r);
        return memo;
    }, []);

    const removef = ['dom', 'jsdom', 'xpath', 'xmlerr', 'impression', 'errors'];
    const impressionFields =
        ['id', 'timelineId', 'userId', 'impressionOrder', 'impressionTime'];

    const metadata = _.map(envelopes, function(e) {
        return _.extend(
            _.pick(e.impression, impressionFields),
            _.omit(e, removef),
            { when: new Date() }
        );
    });
    const parsers = _.map(metadata, parserDebug);

    /* summary is the format used for user-facing API */ 
    const summary = _.map(metadata, summarize);
    /* statistics are the public information on how fbtrex is doing */
    const statistics = _.map(summary, /* aggregated. */ computeStats);

    return {
        metadata,
        parsers,
        summary,
        statistics,
        errors
    };
}

function logSummary(blobs) {
    /* echoes to ELK */
    
    _.each(blobs.summary, function(e) {
        echoes.echo(
            _.extend({'index': 'parserv' },
            _.pick(e, ['errors', 'type', 'publicationTime', 'postId',
                       'permaLink', 'author', 'textlength', 'impressionTime',
                       'impressionOrder', 'pseudo', 'timeline', 'regexp' ])
            )
        );
    });

    /* the `fulldump` is set by executers or by `parsers/precise.js` */
    if(nconf.get('fulldump'))
        _.times(_.size(blobs.metadata), function(o, i) {
            let s = _.nth(blobs.summary, i);
            console.log(JSON.stringify(s, undefined, 1));
            console.log("\x1b[36m");
            let m = _.nth(blobs.metadata, i);
            console.log(JSON.stringify(m, undefined, 1));
        });

    /* this is dumped even without fulldump */
    const E = "\x1b[47m\x1b[31m";
    _.each(blobs.errors, function(o) {
        console.log(E, JSON.stringify(o, undefined, 2));
    });
}

function mark(blobs) {
    /* mark the submission entry as processed */
    return Promise.map(blobs.metadata, function(e) {
        return mongo
            .readOne(nconf.get('schema').htmls, { id: e.id })
            .then(function(existing) {
                existing.processed = true;
                return mongo
                    .updateOne(nconf.get('schema').htmls, { _id: existing._id }, existing);
            });
    }, { concurrency: 1});
}

function save(blobs) {
    /* record changes on the DB */
    let chain = [];
    debug("Received %d metadata and %d errors", _.size(blobs.metadata), _.size(blobs.errors));

    if(_.size(blobs.metadata))
        chain.push(
            mongo.writeMany(nconf.get('schema').metadata, blobs.metadata)  );

    if(_.size(blobs.metadata) && !nconf.get('onlymetadata') ) {
        chain.push(
            mongo.writeMany(nconf.get('schema').summary, blobs.summary)  );
        chain.push(
            /* aggregated. */ updateHourly(blobs.statistics)   );
        chain.push(
            mongo.writeMany(nconf.get('schema').parsers, blobs.parsers)   );
    }

    if(_.size(blobs.errors) && !nconf.get('onlymetadata') )
        chain.push(
            mongo.writeMany(nconf.get('schema').errors, blobs.errors)  );

    return Promise
        .all(chain)
        .return({
            metadata: _.size(blobs.metadata),
            errors: _.size(blobs.errors)
        });
}

function postIdCount(e) {
    /* this function creates certain conditional fields in metadata:
     * - postId is build at the end of `sequence`
     * - postCount { personal, global } gets created always */

    if(!e.postId)
        return e;

    e.postCount = { personal: null, global: null };

    return Promise.all([
        mongo.count(nconf.get('schema').metadata,
            { linkedtime: { postId: e.postId } }),
        mongo.count(nconf.get('schema').metadata,
            { linkedtime: { postId: e.postId }, userId: e.userId })
    ])
    .then(function(results) {
        e.postCount.global = results[0];
        e.postCount.personal = results[1];
        return e;
    }); 
};

function semanticIdCount(e) {
    /* this function creates certain conditional fields in metadata:
     * * if there is no .texts or zero-length texts, it returns
     * - semanticId gets created always
     * - semanticCount { personal, global } gets created always
     * - semantic: true, gets created when the semanticCount.global is zero  */

    if(!e.fullTextSize)
        return e;

    e.semanticId = utils.hash({ text: e.fullText });
    e.semanticCount = { personal: null, global: null };

    return Promise.all([
        mongo.count(nconf.get('schema').metadata, { semanticId: e.semanticId }),
        mongo.count(nconf.get('schema').metadata, { semanticId: e.semanticId, userId: e.userId })
    ])
    .then(function(results) {
        e.semanticCount.global = results[0];
        e.semanticCount.personal = results[1];

        /* only the first metadata with a due semanticId is marked with `semantic`,
         * this will be processed later by lib/semantic.js */
        if(!e.semanticCount.global)
            e.semantic = true;
        return e;
    });
};

function mergeHTMLImpression(html) {
    return mongo
        .readOne(nconf.get('schema').impressions, { id: html.impressionId })
        .then(function(impression) {
            _.unset(impression, 'id');
            _.unset(impression, 'htmlId');
            return _.merge(html, impression);
        });
}

function parseHTML(htmlfilter, repeat) {
    /* retrive the HTML from db/file/remote and apply many of the processing functions */
    return mongo
        .read(nconf.get('schema').htmls, htmlfilter)
        .then(function(found) {
            if(_.size(found) > 0)
                return found;
            if(nconf.get('retrive') != true)
                return [];
            return glue.retrive(htmlfilter)
                .then(glue.writers)
                .tap(function(x) {
                    if(x && x[2] && htmlfilter.id == x[2][0].id)
                        debug("Successfully retrived remote content");
                    else
                        debug("Failure in retriving remote content!");
                })
                .then(function() {
                    return mongo
                        .read(nconf.get('schema').htmls, htmlfilter);
                });
        })
        .catch(function(error) {
            debug("Managed error in retrieving content: %s", error);
            // console.error(error.stack);
            return [];
        })
        .map(mergeHTMLImpression, { concurrency: 1 })
        .then(_.compact)
        .then(function(impressions) {
            return _.orderBy(impressions, { impressionOrder: -1 });
        })
        .tap(function(impressions) {
            if(_.size(impressions)) {
                const firstT = moment(_.first(impressions).impressionTime).format("DD/MMM/YY HH:mm");
                const lastT = moment(_.last(impressions).impressionTime).format("DD/MMM/YY HH:mm");
                const humanized = moment
                    .duration( _.last(impressions).impressionTime - _.first(impressions).impressionTime )
                    .humanize();
                debug("Processing %d impressionsOrder %s [%s] %s %s [%s] %s",
                    /*                                    ^^^^^^^^^^^^^ conditionals */
                    _.size(impressions),
                    _.first(impressions).impressionOrder, firstT,
                    _.size(impressions) > 1 ? "-" : "",
                    _.size(impressions) > 1 ? _.last(impressions).impressionOrder : "",
                    _.size(impressions) > 1 ? "[" + lastT + "]" : "",
                    _.size(impressions) > 1 ? "(" + humanized + ")" : ""
                );
            }
        })
        .map(function(e) {
            return checkMetadata(e, repeat);
        }, { concurrency: 1 })
        .then(_.compact)
        .map(initialize)
        .map(sequence, { concurrency: 1 })
        /* this is the function processing the parsers
         * it is call of every .id which should be analyzed */
        .catch(function(error) {
            debug("[E] Unmanaged error in parser sequence: %s", error.message);
            console.log(error.stack);
            return null;
        })
        .then(function(metadata) {
            if(!metadata)
                return [];

            debug("⁂  completed %d metadata", _.size(metadata));
            if(!_.isUndefined(nconf.get('verbose')))
                debug("⁂  %s", JSON.stringify(metadata, undefined, 2));

            return metadata;
        })
        .map(postIdCount)
        .map(semanticIdCount)
        .then(finalize)
        .tap(logSummary)
        .tap(mark)
        .then(save)
        .catch(function(error) {
            debug("[error after parsing] %s", error.message);
            console.log(error.stack);
            process.exit(1);
            // return null;
        });
}

module.exports = {
    checkMetadata: checkMetadata,
    initialize: initialize,
    mergeHTMLImpression: mergeHTMLImpression,
    finalize: finalize,
    logSummary: logSummary,
    save: save,
    postIdCount: postIdCount,
    semanticIdCount: semanticIdCount,
    mark: mark,
    parseHTML: parseHTML,
};