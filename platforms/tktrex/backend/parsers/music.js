const _ = require('lodash');
const debug = require('debug')('parsers:music');

function music(envelop, previous) {
  /* 'foryou' 'following' and 'video' shares same pattern */
  const availin = ['foryou', 'following', 'video'];

  if (previous.nature && availin.indexOf(previous.nature.type) === -1) {
    // debug("No music for previous.nature %o", previous.nature);
    return null;
  }

  const elem = envelop.jsdom.querySelector('a[href^="/music/"]');

  if (!elem) {
    debug('No music in tiktok!? investigate');
    debugger;
    return null;
  }

  const url = elem.getAttribute('href');
  const name = elem.textContent;

  return {
    music: {
      url,
      name,
    },
  };
}

module.exports = music;
