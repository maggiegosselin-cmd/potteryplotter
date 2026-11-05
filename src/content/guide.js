// Everything the install guide says, as data: edit the words here, or change which drawing
// (`art`, drawn in GuideArt.svelte) a step uses, without touching the components.
// In `text`, {browser} is replaced with the browser the visitor should open the page in.

export const GUIDE = {
  title: 'Put Pot Log on your phone',
  intro: 'Install first, then log your pots. It takes a minute.',
  lastLine: 'Then open Pot Log from your home screen.',

  // One list per way the link can be opened. `steps` are shown in order, one picture each.
  ios: {
    heading: 'iPhone: 3 taps',
    steps: [
      { art: 'share', title: '1. Tap Share', text: 'The square with an arrow, at the bottom of Safari.' },
      { art: 'add', title: '2. Add to Home Screen', text: 'Scroll the list a little, then tap Add to Home Screen.' },
      { art: 'webapp', title: '3. Open as Web App: on', text: 'Leave it switched on. Tap Add.' },
    ],
  },
  androidPrompt: {
    heading: 'Android: 1 tap',
    steps: [{ art: 'install', title: 'Tap Install', text: 'Your phone is ready to add Pot Log.' }],
  },
  androidMenu: {
    heading: 'Android: 2 taps',
    steps: [
      { art: 'menu', title: '1. Tap the menu', text: 'The three dots at the top right of Chrome.' },
      { art: 'menuInstall', title: '2. Install app', text: 'Tap Install app (or Add to Home screen).' },
    ],
  },
  installButton: 'Install',

  // Shown above the steps for an iPhone browser that is not Safari.
  safariNote: {
    title: 'Open this page in Safari',
    text: 'Installing works best from Safari on iPhone. Copy the link, open Safari and paste it.',
  },

  // Instagram, Facebook and Messenger open links in a small browser that cannot install.
  inApp: {
    heading: 'Open in your phone\u2019s browser',
    text: 'This {app} window cannot install Pot Log.',
    steps: [{ art: 'inApp', title: 'Tap the three dots, then Open in {browser}', text: 'Or copy the link and paste it in {browser}.' }],
    browser: { ios: 'Safari', android: 'Chrome' },
    copy: 'Copy link',
    copied: 'Link copied \u2713',
    copyFailed: 'Press and hold the link above to copy it.',
  },

  // Starting to log a pot inside a browser tab: the installed app has its own, empty store.
  tabWarning: {
    title: 'This pot will not show in the installed app',
    text: 'Pots saved in a browser tab stay in that tab. Install first, then log your pots.',
    steps: 'Show install steps',
  },

  // Welcome page for browser visitors, and the first screen of the installed app.
  welcome: { button: 'Log your first pot', skip: 'Just look around' },
  firstPot: {
    title: 'Pot Log',
    button: 'Log your first pot',
    line: 'It starts at the usual pottery stages. Change them any time in',
    stagesLink: 'My stages',
  },
};
