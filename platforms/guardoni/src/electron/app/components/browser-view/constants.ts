import PropTypes from 'prop-types';

export const events = [
  'load-commit',
  'did-attach',
  'did-finish-load',
  'did-fail-load',
  'did-frame-finish-load',
  'did-start-loading',
  'did-stop-loading',
  'did-get-response-details',
  'did-get-redirect-request',
  'dom-ready',
  'page-title-set', // deprecated event
  'page-title-updated',
  'page-favicon-updated',
  'enter-html-full-screen',
  'leave-html-full-screen',
  'console-message',
  'found-in-page',
  'new-window',
  'will-navigate',
  'did-navigate',
  'did-navigate-in-page',
  'close',
  'ipc-message',
  'crashed',
  'gpu-crashed',
  'plugin-crashed',
  'destroyed',
  'media-started-playing',
  'media-paused',
  'did-change-theme-color',
  'update-target-url',
  'devtools-opened',
  'devtools-closed',
  'devtools-focused',
];

export const methods = [
  'loadURL',
  'getURL',
  'getTitle',
  'isLoading',
  'isWaitingForResponse',
  'stop',
  'reload',
  'reloadIgnoringCache',
  'canGoBack',
  'canGoForward',
  'canGoToOffset',
  'clearHistory',
  'goBack',
  'goForward',
  'goToIndex',
  'goToOffset',
  'isCrashed',
  'setUserAgent',
  'getUserAgent',
  'insertCSS',
  'executeJavaScript',
  'openDevTools',
  'closeDevTools',
  'isDevToolsOpened',
  'isDevToolsFocused',
  'inspectElement',
  'inspectServiceWorker',
  'setAudioMuted',
  'isAudioMuted',
  'undo',
  'redo',
  'cut',
  'copy',
  'paste',
  'pasteAndMatchStyle',
  'delete',
  'selectAll',
  'unselect',
  'replace',
  'replaceMisspelling',
  'insertText',
  'findInPage',
  'stopFindInPage',
  'print',
  'printToPDF',
  'capturePage',
  'send',
  'sendInputEvent',
  'setZoomFactor',
  'setZoomLevel',
  'showDefinitionForSelection',
  'getWebContents',
  'focus',
  'destroy',
];

export const props = {
  src: PropTypes.string,
  autosize: PropTypes.bool,
  preload: PropTypes.string,
  httpreferrer: PropTypes.string,
  useragent: PropTypes.string,
  disablewebsecurity: PropTypes.bool,
  partition: PropTypes.string,
  allowpopups: PropTypes.bool,
  webpreferences: PropTypes.string,
  blinkfeatures: PropTypes.string,
  disableblinkfeatures: PropTypes.string,
  // guestinstance: PropTypes.number,
  // disableguestresize: PropTypes.bool,
  devtools: PropTypes.bool,
  muted: PropTypes.bool,
  update: PropTypes.any,
};

export const changableProps = {
  src: 'loadURL',
  useragent: 'setUserAgent',
  devtools: 'openDevTools',
  muted: 'setAudioMuted',
  autosize: 'setAutoResize',
  zoom: 'setZoomFactor',
};

export const webPreferences = [
  'devTools',
  'nodeIntegration',
  'nodeIntegrationInWorker',
  'nodeIntegrationInSubFrames',
  'preload',
  'sandbox',
  'enableRemoteModule',
  'session',
  'partition',
  'affinity',
  'zoomFactor',
  'javascript',
  'webSecurity',
  'allowRunningInsecureContent',
  'images',
  'textAreasAreResizable',
  'webgl',
  'plugins',
  'experimentalFeatures',
  'scrollBounce',
  'enableBlinkFeatures',
  'disableBlinkFeatures',
  'standard',
  'serif',
  'sansSerif',
  'monospace',
  'cursive',
  'fantasy',
  'defaultFontSize',
  'defaultMonospaceFontSize',
  'minimumFontSize',
  'defaultEncoding',
  'backgroundThrottling',
  'offscreen',
  'contextIsolation',
  'nativeWindowOpen',
  'webviewTag',
  'additionalArguments',
  'safeDialogs',
  'safeDialogsMessage',
  'navigateOnDragDrop',
  'autoplayPolicy',
  'disableHtmlFullscreenWindowResize',
];

// Events that should trigger an update of the BrowserView bounds
export const resizeEvents = ['scroll', 'resize'];

export const elementResizeEvents = [
  'animationend',
  'animationiteration',
  'transitionend',
];
