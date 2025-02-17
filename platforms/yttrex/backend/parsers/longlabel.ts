import D from 'debug';
import _ from 'lodash';
import moment from 'moment';

// logger
const debug = D('parser:longlabel');
const debuge = debug.extend('error');

const unrecognizedWordList: string[] = [];

/* ****************************** * functions included above * ******************************** */
export const relativeConMapping = [
  {
    amount: 1,
    unit: 'seconds',
    words: [
      'секунд',
      'секунда',
      'секунды',
      'seconds',
      'secondi',
      'second',
      'secondo',
      'segundos',
      'másodperc',
      'sekund',
      '秒钟',
    ],
  },
  {
    amount: 1,
    unit: 'minutes',
    words: [
      'minuti',
      'minutos',
      'minutes',
      'минут',
      'месяцев',
      'минуты',
      'минут',
      'Minuten',
      'minutter',
      'minute',
      'minuto',
      'minuty',
      'perc',
      'minut',
      'minuta',
      '分钟',
    ],
  },
  {
    amount: 1,
    unit: 'hour',
    words: [
      'horas',
      'heure',
      'hores',
      'hora',
      'ora',
      'ore',
      'uur',
      'hours',
      'hour',
      'timer',
      'Stunde',
      'Stunden',
      'heures',
      'час',
      'часа',
      'часов',
      'time',
      'órája',
      'godzina',
      'godzin',
      '小时',
    ],
  },
  {
    amount: 1,
    unit: 'day',
    words: [
      'dias',
      'dia',
      'dies',
      'días',
      'día',
      'dag',
      'dager',
      'dagen',
      'dage',
      'giorni',
      'giorno',
      'days',
      'day',
      'jours',
      'jour',
      'uge',
      'Tagen',
      'Tag',
      'дня',
      'день',
      'дней',
      'døgn',
      'dni',
      'dzień',
    ],
  },
  {
    amount: 7,
    unit: 'day',
    words: [
      'settimana',
      'settimane',
      'setmana',
      'setmanes',
      'week',
      'weeks',
      'uger',
      'weken',
      'semana',
      'semanas',
      'semaines',
      'semaine',
      'Woche',
      'Wochen',
      'uke',
      'uker',
      'недели',
      'неделю',
      'hét',
      'tydzień',
    ],
  },
  {
    amount: 1,
    unit: 'month',
    words: [
      'md.',
      'mes',
      'mesos',
      'mês',
      'mese',
      'mesi',
      'mois',
      'maand',
      'maanden',
      'meses',
      'month',
      'months',
      'miesięcy',
      'miesiąc',
      'miesiące',
      'måned',
      'måneder',
      'Monaten',
      'Monat',
      'месяц',
      'месяца',
      'hónap',
    ],
  },
  {
    amount: 1,
    unit: 'year',
    words: [
      'year',
      'years',
      'jaar',
      'año',
      'Jahren',
      'Jahr',
      'lat',
      'lata',
      'rok',
      'anni',
      'anno',
      'años',
      'anos',
      'ano',
      'ans',
      'any',
      'anys',
      'an',
      'år',
      'года',
      'лет',
      'год',
    ],
  },
];

interface LongLabelLanguage {
  separator: string;
  locale: string;
}

interface LongLabelResult {
  views: number;
  isLive: boolean;
  reducedLabel: string;
}

function chinesecomma(
  label: string,
  sosta: string,
  isLive: boolean
): LongLabelResult {
  // call as { views, liveStatus } = langi.viewcount(l, langi.sostantivo, isLive);
  const regmap = {
    variation: new RegExp(`\\d{4}${sosta}$`),
    hundred: new RegExp(`\\d{1,3}${sosta}$`),
    thousand: new RegExp(`\\d{1,3},\\d{3}${sosta}$`),
    million: new RegExp(`\\d{1,3},\\d{3},\\d{3}${sosta}$`),
    gangamstyle: new RegExp(`\\d{1,2},\\d{3},\\d{3},\\d{3}${sosta}$`),
    // some language (only chinese at the moment) don't need the space
    // between the number and the sostantivo 'views'
  };
  const unexpected = '：';
  const splitted = label.split(unexpected);
  const lastChunk = splitted.pop() as string;
  const reducedLabel = splitted.join(unexpected);
  // console.log(label, "\n", reducedLabel, "\n", lastChunk);
  label.split(unexpected).pop();
  const views = _.reduce(
    regmap,
    function (memo, rge, name) {
      const match = rge.exec(lastChunk);
      if (match) {
        memo = _.parseInt(match[0].replace(sosta, '').replace(/,/g, '').trim());
        // debug("comma,match <%s> %s memo %s reduced %s", name, match, memo, label.substr(0, match.index));
      }
      return memo;
    },
    -1
  );
  if (views < 0) throw new Error('failure in regexp parsing (chinesecomma)');
  // console.log("reduced: ",reducedLabel);
  return { views, isLive, reducedLabel };
}

function comma(label: string, sosta: string, isLive: boolean): LongLabelResult {
  // call as { views, liveStatus } = langi.viewcount(l, langi.sostantivo, isLive);
  const regmap = {
    variation: new RegExp(` \\d{4} ${sosta}$`),
    hundred: new RegExp(` \\d{1,3} ${sosta}$`),
    thousand: new RegExp(` \\d{1,3},\\d{3} ${sosta}$`),
    million: new RegExp(` \\d{1,3},\\d{3},\\d{3} ${sosta}$`),
    gangamstyle: new RegExp(` \\d{1,2},\\d{3},\\d{3},\\d{3} ${sosta}$`),
  };
  let reducedLabel: string | null = null;
  const views = _.reduce(
    regmap,
    function (memo, rge, name) {
      const match = rge.exec(label);
      if (match) {
        memo = _.parseInt(match[0].replace(sosta, '').replace(/,/g, '').trim());
        // debug("comma,match <%s> %s memo %s reduced %s", name, match, memo, label.substr(0, match.index));
        reducedLabel = label.substr(0, match.index);
      }
      return memo;
    },
    -1
  );
  if (views < 0) throw new Error('failure in regexp parsing (comma)');
  return { views, isLive, reducedLabel: reducedLabel as any as string };
}
function empty(label: string, sosta: string, isLive: boolean): LongLabelResult {
  /* because of the strange charCodeAt = 8239 or 160 
       which are space (like 0x20) but some kind of unicode alphabe ?
     * we should transform it */
  const fixedlabel = _.reduce(
    _.times(_.size(label) * 2),
    function (memo, number) {
      /* the +10 above is due to labels apparently returning smaller than source, it is
       * fully dependent from the number of unicode chars. .charAt($toolong) return '' */
      const val = label.charCodeAt(number);
      // debug("%d (%s)", val, label.charAt(number));
      if (val === 8239 || val === 160) memo += ' ';
      else memo += label.charAt(number);
      return memo;
    },
    ''
  ).trim();
  // debug("fixedlabel: %s (%d|%d)", fixedlabel, _.size(fixedlabel), _.size(label));
  const regmap = {
    hundred: new RegExp(` \\d{1,3} ${sosta}$`),
    thousand: new RegExp(` \\d{1,3} \\d{3} ${sosta}$`),
    million: new RegExp(` \\d{1,3} \\d{3} \\d{3} ${sosta}$`),
    gangamstyle: new RegExp(` \\d{1,2} \\d{3} \\d{3} \\d{3} ${sosta}$`),
  };
  let reducedLabel: string | null = null;
  const views = _.reduce(
    regmap,
    function (memo, rge, name) {
      const match = rge.exec(fixedlabel);
      if (match) {
        // debug("empty,match value in %s (%s)", name, rge);
        memo = _.parseInt(
          match[0].replace(sosta, '').replace(/\s/g, '').trim()
        );
        reducedLabel = fixedlabel.substr(0, match.index);
      }
      return memo;
    },
    -1
  );
  if (views < 0) throw new Error('failure in regexp parsing (empty)');
  return { views, isLive, reducedLabel: reducedLabel as any as string };
}

function dots(label: string, sosta: string, isLive: boolean): LongLabelResult {
  const regmap = {
    hundred: new RegExp(` \\d{1,4} ${sosta}$`),
    thousand: new RegExp(` \\d{1,3}\\.\\d{3} ${sosta}$`),
    million: new RegExp(` \\d{1,3}\\.\\d{3}\\.\\d{3} ${sosta}$`),
    gangamstyle: new RegExp(` \\d{1,2}\\.\\d{3}\\.\\d{3}\\.\\d{3} ${sosta}$`),
  };
  let reducedLabel: string | null = null;
  const views = _.reduce(
    regmap,
    function (memo, rge, name) {
      const match = rge.exec(label);
      if (match) {
        memo = _.parseInt(
          match[0].replace(sosta, '').replace(/\./g, '').trim()
        );
        reducedLabel = label.substr(0, match.index);
      }
      return memo;
    },
    -1
  );
  if (views < 0) throw new Error('failure in regexp parsing (dots)');
  return { views, isLive, reducedLabel: reducedLabel as any as string };
}

const langopts = [
  { sostantivo: 'views', separator: 'by', locale: 'en', viewcount: comma },
  { sostantivo: 'view', separator: 'by', locale: 'en', viewcount: comma },
  { sostantivo: 'vistas', separator: 'de', locale: 'es', viewcount: comma },
  {
    sostantivo: 'visualitzacions',
    separator: 'de:',
    locale: 'ct',
    viewcount: dots,
  }, // spanish catalan
  {
    sostantivo: 'visualizzazioni',
    separator: 'di',
    locale: 'it',
    viewcount: dots,
  },
  {
    sostantivo: 'visualizzazione',
    separator: 'di',
    locale: 'it',
    viewcount: dots,
  },
  { sostantivo: 'visualizações', separator: '', locale: 'pt', viewcount: dots },
  { sostantivo: 'visualização', separator: '', locale: 'pt', viewcount: dots },
  {
    sostantivo: 'visualizaciones',
    separator: 'de',
    locale: 'es',
    viewcount: dots,
  }, // spanish (otro?)
  {
    sostantivo: 'visualización',
    separator: 'de',
    locale: 'es',
    viewcount: dots,
  }, // spanish | mexican
  { sostantivo: 'visninger', separator: 'af', locale: 'nn', viewcount: dots }, // norvegian
  {
    sostantivo: 'avspillinger',
    separator: 'af',
    locale: 'nn',
    viewcount: dots,
  }, // norvegian
  {
    sostantivo: '次',
    separator: '上傳者',
    locale: 'cn',
    viewcount: chinesecomma,
  },
  // { sostantivo: '次', separator: '上上傳傳者者', locale: 'cn', viewcount: chinesecomma },
  { sostantivo: 'vues', separator: 'de', locale: 'fr', viewcount: empty },
  { sostantivo: 'vue', separator: 'de', locale: 'fr', viewcount: empty },
  { sostantivo: 'ganger', separator: 'av', locale: 'nn', viewcount: empty }, // it is "times" not visualization in norwegian
  { sostantivo: 'weergaven', separator: 'door', locale: 'nl', viewcount: dots }, // Dutch
  { sostantivo: 'Aufrufe', separator: 'von', locale: 'de', viewcount: dots },
  { sostantivo: 'Aufruf', separator: 'von', locale: 'de', viewcount: dots },
  {
    sostantivo: 'просмотров',
    separator: 'Автор:',
    locale: 'ru',
    viewcount: empty,
  },
  {
    sostantivo: 'просмотра',
    separator: 'Автор:',
    locale: 'ru',
    viewcount: empty,
  },
  {
    sostantivo: 'просмотр',
    separator: 'Автор:',
    locale: 'ru',
    viewcount: empty,
  },
  {
    sostantivo: 'wyświetleń',
    separator: 'Autor:',
    locale: 'pl',
    viewcount: empty,
  }, // Polish
  {
    sostantivo: 'wyświetlenia',
    separator: 'Autor:',
    locale: 'pl',
    viewcount: empty,
  }, // Polish
  {
    sostantivo: 'megtekintés',
    separator: 'készítette:',
    locale: 'hu',
    viewcount: empty,
  }, // Hungarian
  {
    sostantivo: 'zhliadnutí',
    separator: 'z kanála',
    locale: 'sk',
    viewcount: empty,
  }, // Slovak
];

function sanityCheck(l: string): void {
  if (_.size(l) < 20) throw new Error(`Given ${l.toString()} has length < 20`);
}

function NoViewsReplacer(l: string, sosta: string): string {
  /* i.e.:| Write Time at 9 is BACK! by The Goulet Pen Company 9 minutes ago No views |
       should return 0 views */
  const x = ['No', 'Nessuna', 'Ingen', 'Keine', 'Nenhuma', 'Aucune'];
  return _.reduce(
    x,
    function (memo, wordThatMeansNothing) {
      const parseable = ` 0 ${sosta}`;
      const r = new RegExp(`\\s${wordThatMeansNothing}\\s${sosta}\\.?$`);
      return _.replace(memo, r, parseable);
    },
    l
  );
}

export function guessLanguageByViews(candidates): LongLabelLanguage {
  if (!_.size(candidates))
    throw new Error('guessLanguageByViews E1 has not candidates!');
  /* 'views', 'vues' or what else? here is guessed a language */
  const likelyness = _.map(candidates, function (word) {
    const match = _.find(langopts, { sostantivo: word });
    return match ? match.locale : null;
  });
  const probable = _.map(
    _.countBy(_.compact(likelyness)),
    function (amount, locale) {
      return { amount, locale };
    }
  );
  const ordered = _.sortBy(probable, 'amount');
  if (!_.size(probable))
    throw new Error('guessLanguageByViews E2 has no probable choices');
  if (!_.size(ordered))
    throw new Error('guessLanguageByViews E3 has no ordered');

  const isReliable = _.size(candidates) / 10 < (_.first(ordered)?.amount ?? 0);
  if (!isReliable)
    debuge(
      'With this list of candidates %j, we pick %j probable match and is less than 10%',
      _.countBy(candidates),
      _.first(ordered)
    );

  const foundLocale = _.first(probable)?.locale;
  return {
    separator: _.find(langopts, { locale: foundLocale })?.separator as string,
    locale: foundLocale as string,
  };
}

// const timeRegExpList = [
//   /\s?(\d+)\s(\D+)\s?/,
//   /\s?(\d+)\s(\D+)\s\D+?/,
//   /\s?\D+\s(\d+)\s(\D+)\s?/,
//   /\s?\D+\s(\d+)\s(\D+)\s?/,
// ];

function relativeTimeMap(word: string): [number, string] | null {
  return relativeConMapping.reduce((memo: null | [number, string], e) => {
    if (memo) return memo;

    if (e.words.includes(word)) {
      // debug('Word %s match! unit %s', word, e.unit);
      memo = [e.amount, e.unit];
    }

    return memo;
  }, null);
}

const recoChannelEndings = [
  {
    matchable: 'channel',
    sostantivo: 'views',
    full: 'viewers also watch this channel',
  },
  {
    matchable: 'chaîne',
    sostantivo: 'vues',
    full: 'regarde aussi cette chaîne',
  },
];

const timeRegExpList = [
  /\s?(\d+)\s(\D+)\s?/,
  /\s?(\d+)\s(\D+)\s\D+?/,
  /\s?\D+\s(\d+)\s(\D+)\s?/,
];

export function getPublicationTime(timeinfo: string): moment.Duration {
  const timeago = _.reduce(
    timeRegExpList,
    function (memo, rge) {
      const m = timeinfo.match(rge);
      return memo ?? m;
      // this priority on existing 'memo' matter, because the 3rd regexp (longer)
      // might otherwise overwrite the first success and include dirty data.
    },
    null
  );
  if (!timeago) {
    debuge(
      "Can't regexp timeago [%s] --might be due to lang separator?",
      timeinfo
    );
    throw new Error(
      `can't regexp timeago [${timeinfo}] (check language separator)`
    );
  }

  const convertedNumber = _.parseInt(timeago[0]);
  const duration = _.reduce(
    timeago[0].split(' '),
    function (memo, word) {
      if (_.endsWith(word, ',')) word = word.slice(0, -1);
      const momentinfo = relativeTimeMap(word);
      if (_.isNull(momentinfo)) return memo;

      const total = convertedNumber * momentinfo[0];
      const mabbe = moment.duration(total, momentinfo[1] as any); /*
        debug("(OK getPublicationTime) |%s| to be [%j]  parsed %d total %d",
            word, momentinfo, convertedNumber, total); */
      return mabbe;
    },
    null
  );

  if (_.isNull(duration)) {
    /* necessary to report what's didn't get processed */
    const fullwordlist = _.flatten(_.map(relativeConMapping, 'words'));
    const missing = _.filter(timeago[0].split(' '), function (labelword) {
      if (!_.isNaN(_.parseInt(labelword))) return false;
      return !fullwordlist.includes(labelword);
    });
    const updated = _.uniq(_.concat(unrecognizedWordList, missing));
    if (_.size(updated) > _.size(unrecognizedWordList)) {
      _.each(missing, function (mw) {
        if (!unrecognizedWordList.includes(mw)) unrecognizedWordList.push(mw);
      });
      debug(
        'Found %d unrecognized words, now extended the list of %j',
        _.size(missing),
        unrecognizedWordList
      );
    }
    throw new Error(
      `Lack of time mapping relativeConMapping ${timeago} |${timeinfo}|`
    );
  }

  if (!duration.isValid())
    throw new Error(`Invalid duration! from ${timeago} to ${timeinfo}`);

  // debug("getPublicationTime: %s from |%s|", duration.humanize(), timeinfo);
  return duration;
}

export function parser(
  l: string,
  source: any,
  isLive: boolean
): {
  views: number;
  locale: string;
  title?: string;
  timeago: moment.Duration | null;
  isLive: boolean;
} {
  /* logic:
        1) find which language is the locale, by pattern matching 'sostantivo' and 'separator'
            - found? proceeed
            - not found? throw an exception, as part of the exception the last word
        2) get the view, and the label updated string. 'viewcount' return an integer. if is a livestream, it's different */
  if (!_.size(source)) throw new Error('No source');

  sanityCheck(l);
  // this works for latin words
  const viewssost = _.last(l.split(' ')) as string;
  // and this for chinese
  const chinasost = l.split('').pop();

  let langi = _.find(langopts, { sostantivo: viewssost });
  if (!langi) langi = _.find(langopts, { sostantivo: chinasost });

  if (!langi) {
    /* investigated when this happen and document it */
    const specialfinal = viewssost.substr(_.size(viewssost) - 4, 4);
    langi = _.find(langopts, { sostantivo: specialfinal });
  }

  // debug("<sostantivo> %s, <langi> %j", viewssost, langi);
  // if(!langi) debugger;

  const recoinfo: {
    channelLinked?: string;
  } = {
    channelLinked: undefined,
  };
  if (!langi) {
    /* the recommendation by channels ---
      'Italy has FINALLY been Fixed In Hearts Of Iron 4 by iSorrowproductions 
      49 minutes ago 14 minutes, 39 seconds 26,167 views 
      Bokoen1 viewers also watch this channel'
    */
    const recdet = recoChannelEndings.find((c) => c.matchable === viewssost);
    if (recdet) {
      debug('found %j', recdet);
      const reg = new RegExp(`${recdet.sostantivo}\\ (.*)\\ ${recdet.full}`);
      const result = reg.exec(l);
      debug(result);
      if (result?.index) {
        recoinfo.channelLinked = result[1];
        // 'Bokoen1'
        // l.substr(0, 116)
        l = l.substr(0, result.index) + `${recdet.sostantivo}`;
        // 'Italy has FINALLY been Fixed In Hearts Of Iron 4 by iSorrowproductions 49 minutes ago 14 minutes, 39 seconds 26,167 '
        langi = _.find(langopts, { sostantivo: recdet.sostantivo });
      }
    }
  }

  if (!langi) {
    debuge("Not seen any known 'sostantivo' in %s", l);
    throw new Error('1> locale not found! [' + viewssost + ']');
  }

  l = NoViewsReplacer(l, langi.sostantivo);
  const { views, reducedLabel } = langi.viewcount(l, langi.sostantivo, isLive);
  if (_.isNaN(views)) {
    debuge('Failure in extracting with %s from %s', viewssost, l);
    throw new Error('2> ' + viewssost);
  }

  /* logic:
        3) by $authorName it is guarantee come at last, after every user controller input and
           before the timing info. We retrive the time info and parse the duration and relative */
  const halfsep = `${_.size(langi.separator) ? ' ' : ''}${
    langi.separator
  } ${source}`;
  const separatorCheck = _.size(reducedLabel.split(halfsep));
  const timeinfo = _.last(reducedLabel.split(halfsep));
  // debug('Time info %O', timeinfo);
  const title = _.first(reducedLabel.split(halfsep));
  // moment.locale(langi.locale);
  // parsing do not depends on this
  // debug(reducedLabel.split(halfsep));
  if (separatorCheck < 2) {
    debuge('checking [%s] <separator fails as %s>', halfsep, langi.locale);
    throw new Error('Separator Error locale: ' + langi.locale);
  }

  let timeago: moment.Duration | null = null;
  // let liveVideo = isLive;

  if (!timeinfo || !timeinfo.length) {
    debuge('Failure in picking timeinfo from splitting [%s]', reducedLabel);
    if (!isLive) debug('Assuming [%s] is a live video', l);
    // liveVideo = true;
  } else {
    /*  4) because time ago (e.g. 1 week ago) is always expressed with one unit, one amount, 
           and optionally a stop-word like 'ago', then we pick before this and the leftover 
           it is the remaining text to parse */
    timeago = getPublicationTime(timeinfo);
  }

  /*  5) to simplify this, duration of the video is take somewhere else */
  // debug("Completed %s with %d %s %s", title, views, timeago.humanize(), langi.locale);
  return {
    ...recoinfo,
    views,
    title,
    timeago, // it is a moment.duration() object
    isLive,
    locale: langi.locale,
  };
}

export const unrecognized = unrecognizedWordList;
