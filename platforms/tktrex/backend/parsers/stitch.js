const _ = require('lodash');
const debug = require('debug')('parsers:stitch');

function stitch(envelop, previous) {
  /* 2.4.x only feed 'foryou' and 'following' are considered */
  const availin = ['foryou', 'following'];

  if (previous.nature && availin.indexOf(previous.nature.type) === -1) {
    // debug('No stitch for previous.nature %o', previous.nature);
    return null;
  }

  const descblock = envelop.jsdom.querySelector('[data-e2e="video-desc"]');
  const stitchel = descblock.querySelector('a[href^="/@"]');

  if (stitchel) {
    const stinfo = {
      name: stitchel.textContent.trim(),
      user: stitchel.getAttribute('href'),
    };
    debug('Stitch found with %j', stinfo);
    return { stitch: stinfo };
  }
  /* else, if stitchel === null, return undefined */
}

module.exports = stitch;
