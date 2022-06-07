import { DirectiveHooks } from '@shared/providers/puppeteer/DirectiveHook';
import { formatDateTime } from '@shared/utils/date.utils';
import differenceInSeconds from 'date-fns/differenceInSeconds';
import subSeconds from 'date-fns/subSeconds';
import D from 'debug';
import * as fs from 'fs';
import nconf from 'nconf';
import path from 'path';
import * as puppeteer from 'puppeteer-core';
import url from 'url';
import { GuardoniProfile } from '../types';

const debug = D('guardoni:youtube');
const logreqst = D('guardoni:requests');
const screendebug = D('guardoni:screenshots');
const bconsError = D('guardoni:error');

debug.enabled = logreqst.enabled = screendebug.enabled = true;

const SCREENSHOT_MARKER = 'SCREENSHOTMARKER';
const scrnshtrgxp = new RegExp(SCREENSHOT_MARKER);

interface GlobalConfig {
  lastScreenTime: Date;
  currentURLlabel: string | null;
  screenshotPrefix: string | null;
  interval: NodeJS.Timer | null;
  publicKeySpot: string | null;
}

const globalConfig: GlobalConfig = {
  lastScreenTime: subSeconds(new Date(), 4),
  currentURLlabel: null,
  screenshotPrefix: null,
  interval: null,
  publicKeySpot: null,
};

export function getScreenshotName(prefix: string): string {
  return `${prefix}-${formatDateTime(new Date())}.png`;
}

export function getMaybeScreenshotFilename(
  lastScreenTime: Date
): string | null {
  /* this function return null if no screenshot has to be taken,
   * and the criteria is to take max one screen every 5 seconds */
  const now = new Date();
  if (differenceInSeconds(now, lastScreenTime) < 5) return null;

  globalConfig.lastScreenTime = now;
  /* screenshotPrefix would exist as a directory */
  return path.join(
    globalConfig.screenshotPrefix ?? '',
    getScreenshotName(globalConfig.currentURLlabel as any)
  );
}

async function consoleLogParser(
  page: puppeteer.Page,
  message: puppeteer.ConsoleMessage
): Promise<void> {
  /* this function is primarly meant to collect the public key,
   * but it is also an indirect, pseudo-efficent way to communicate
   * between puppeteer evaluated selectors and action we had to do */
  const consoleline = message.text();
  if (globalConfig.publicKeySpot === null && consoleline.match(/publicKey/)) {
    const material = JSON.parse(consoleline);
    globalConfig.publicKeySpot = material.response.publicKey;
  }
  if (consoleline.match(scrnshtrgxp)) {
    const fdestname = getMaybeScreenshotFilename(globalConfig.lastScreenTime);
    // if the screenshot are less than 5 seconds close, the function
    // above would return null, so we don't take it.
    if (fdestname) {
      screendebug('Taking screenshot in [%s]', fdestname);
      await page.screenshot({
        path: fdestname,
        type: 'jpeg',
        fullPage: nconf.get('fullpage') || false,
      });
    }
  }
}

/* these advertising selectors comes from browser extension,
 * and they should be centralized in a piece of updated code */
const advSelectors = [
  '.video-ads.ytp-ad-module',
  '.ytp-ad-player-overlay',
  '.ytp-ad-player-overlay-instream-info',
  'ytd-promoted-sparkles-web-renderer',
  '.ytd-action-companion-ad-renderer',
  '.sparkles-light-cta',
  '[data-google-av-cxn]',
  '#ad-badge',
  'ytd-banner-promo-renderer',
  '.ytd-search-refinement-card-renderer',
  '.ytd-promoted-sparkles-text-search-renderer',
];

async function beforeDirectives(
  page: puppeteer.Page,
  profinfo: GuardoniProfile
): Promise<void> {
  page.on('console', (event) => {
    void consoleLogParser(page, event);
  });
  page.on('pageerror', (message) => bconsError('Error %s', message));
  page.on('requestfailed', (request) =>
    bconsError(`Requestfail: ${request.failure()?.errorText} ${request.url()}`)
  );

  // await page.setRequestInterception(true);
  if (nconf.get('3rd') === true) {
    page.on('request', (e) => manageRequest(profinfo, e));
    setInterval(print3rdParties, 60 * 1000);
  }

  if (!nconf.get('screenshots')) return;

  const screenshotsPath = nconf.get('screenshotsPath');
  if (!screenshotsPath) return;

  /* this is to monitor presence of special selectors that
   * should trigger screencapture */
  if (globalConfig.interval) clearInterval(globalConfig.interval);

  globalConfig.screenshotPrefix = path.join(
    screenshotsPath,
    `${profinfo.profileName}..${profinfo.execount}`
  );

  try {
    fs.mkdirSync(globalConfig.screenshotPrefix);
  } catch (error) {}

  globalConfig.interval = setInterval(function () {
    advSelectors.forEach((selector) => {
      try {
        /* variables from node need to be passed this way to pptr */
        void page.evaluate(
          (selector, SCREENSHOT_MARKER) => {
            const x = document.querySelector(selector);
            if (x) {
              // eslint-disable-next-line no-console
              console.log(SCREENSHOT_MARKER, selector);
            }
          },
          selector,
          SCREENSHOT_MARKER
        );
      } catch (error) {}
    });
  }, nconf.get('screenshotTime') || 5000);
}

/* this is the variable we populate of statistics
 * on third parties, and every minute, it is printed on terminal */
const thirdParties: { [key: string]: any } = {};
/* and this is the file where logging happen */
let reqlogfilename: undefined | string;

function manageThirdParty(
  profinfo: GuardoniProfile,
  reqpptr: puppeteer.HTTPRequest
): void {
  const up = new url.URL(reqpptr.url());
  const full3rdparty = {
    method: reqpptr.method(),
    host: up.host,
    pathname: up.pathname,
    search: up.search,
    type: reqpptr.resourceType(),
    when: new Date(),
    postData: undefined,
  };
  if (full3rdparty.method !== 'GET')
    full3rdparty.postData = reqpptr.postData() as any;

  reqlogfilename = path.join(
    'profiles',
    profinfo.profileName,
    'requestlog.json'
  );
  fs.appendFileSync(reqlogfilename, JSON.stringify(full3rdparty) + '\n');
  if (up.host !== 'www.youtube.com') {
    if (thirdParties[up.host]) thirdParties[up.host] = 1;
    else thirdParties[up.host] += 1;
  }
}

function manageRequest(
  profinfo: GuardoniProfile,
  reqpptr: puppeteer.HTTPRequest
): void {
  try {
    manageThirdParty(profinfo, reqpptr);
  } catch (error) {
    debug('Error in manageRequest function: %s', (error as any).message);
  }
}

function print3rdParties(): void {
  logreqst(
    'Logged third parties connections in [%s] to %o',
    reqlogfilename,
    thirdParties
  );
}

async function beforeLoad(page: puppeteer.Page, directive: any): Promise<void> {
  globalConfig.currentURLlabel = directive.urltag;
  return Promise.resolve();
}

async function completed(): Promise<string | null> {
  return globalConfig.publicKeySpot;
}

async function beforeWait(page: puppeteer.Page, directive: any): Promise<void> {
  // debug("Nothing in beforeWait but might be screencapture or ad checking");
  return Promise.resolve();
}

async function afterWait(page: puppeteer.Page, directive: any): Promise<void> {
  // const innerWidth = await page.evaluate(_ => { return window.innerWidth });
  // const innerHeight = await page.evaluate(_ => { return window.innerHeight });
  // let hasPlayer = false;

  if (directive.screenshot) {
    const screendumpf = getScreenshotName(directive.name);
    const fullpath = path.join(directive.profile, screendumpf);
    debug('afterWait: collecting screenshot in %s', fullpath);

    // if (hasPlayer) await state.player.screenshot({ path: fullpath });
    // else
    await page.screenshot({ path: fullpath, fullPage: true });
  }
}

type TKHooks = DirectiveHooks<'tiktok.com', {}>;

interface TKHooksContext {
  profile: GuardoniProfile;
}

export type GetTKHooks = (ctx: TKHooksContext) => TKHooks;
export const GetTKHooks: GetTKHooks = (ctx) => {
  return {
    common: {
      beforeDirectives: (p) => beforeDirectives(p, ctx.profile),
      beforeLoad,
      beforeWait,
      afterWait,
      completed,
    },
    customs: {},
    DOMAIN_NAME: 'tiktok.com',
  };
};
