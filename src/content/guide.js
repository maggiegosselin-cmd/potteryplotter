// Everything the install guide and the first-pot coach say or show, as plain data.
// Change a word, a step or a mock-up here; no component needs to change.
//
// A step is { id, title, text, mock?, copyLink?, install? }:
//   copyLink — the card shows a big "Copy link" button
//   install  — the card shows the Install button when the browser offers one
//   mock     — the phone picture, drawn by PhoneMock.svelte:
//     { kind: 'toolbar', position: 'top' | 'bottom', items: [{ label, icon? }], highlight }
//     { kind: 'sheet' | 'menu', title?, items: [{ label, icon? }], highlight }
//     { kind: 'dialog', title, field, items: [{ label }], highlight }
//     { kind: 'home', items: [{ label, icon }], highlight }
//   `highlight` names the item (by its label) that is picked out. The labels are the
//   words the phone shows.

export const UI = {
  next: 'Next',
  back: 'Back',
  done: 'Got it',
  install: 'Install Pot Log',
  copyLink: '📋 Copy link',
  copied: 'Link copied ✓',
  copyFailed: 'Could not copy. Press and hold the address bar instead.',
  notNow: 'Not now',
  step: (n, of) => `Step ${n} of ${of}`,
  help: 'Show me how',
  logAnyway: 'Log a pot here anyway',
};

// Shown when a pot is started in an iPhone browser tab, which has its own store.
export const WARNING = {
  title: 'Log here anyway?',
  text: "Pots saved in this browser tab stay in this tab. The home screen app starts empty, so they won't be there.",
  install: 'Show me how to install',
  anyway: 'Log here anyway',
  banner: "Saved in this browser tab only. The home screen app won't see this pot.",
};

// What the small help banner on the list says for each way of opening the link.
export const HELP = {
  'ios-safari': { title: 'Install on iPhone first', text: "Pots saved in Safari don't move to the home-screen app, so install before logging pots." },
  'ios-browser': { title: 'Open this in Safari first', text: 'Only Safari can put Pot Log on an iPhone home screen. Install before logging pots.' },
  'ios-inapp': { title: "This window can't install Pot Log", text: 'Open the link in Safari first, then install before logging pots.' },
  android: { title: 'Install on Android', text: 'In Chrome, open the ⋮ menu and tap Install app (or Add to Home screen).' },
  'android-inapp': { title: "This window can't install Pot Log", text: 'Open the link in Chrome first, then install it from the ⋮ menu.' },
  desktop: { title: 'Install Pot Log', text: 'Pot Log is made for phones. Open this link on your phone to install it.' },
};

const IOS_WELCOME = {
  id: 'welcome',
  title: 'Hi, welcome to Pot Log',
  text: 'I made this to keep track of my own pots. Put it on your home screen first, then log. Pots saved in Safari never move across, so please install before your first pot.',
};

const SAFARI_STEPS = [
  {
    id: 'share',
    title: 'Tap Share',
    text: 'The square with an arrow, along the bottom of Safari.',
    mock: {
      kind: 'toolbar',
      position: 'bottom',
      items: [
        { label: 'Back', icon: '‹' },
        { label: 'Forward', icon: '›' },
        { label: 'Share', icon: '⬆︎' },
        { label: 'Bookmarks', icon: '📖' },
        { label: 'Tabs', icon: '❐' },
      ],
      highlight: 'Share',
    },
  },
  {
    id: 'add-to-home',
    title: 'Tap Add to Home Screen',
    text: "Slide the list up if you can't see it.",
    mock: {
      kind: 'sheet',
      title: 'Pot Log',
      items: [{ label: 'Copy' }, { label: 'Add Bookmark' }, { label: 'Add to Home Screen', icon: '＋' }, { label: 'Find on Page' }],
      highlight: 'Add to Home Screen',
    },
  },
  {
    id: 'add',
    title: 'Tap Add',
    text: 'Top right corner. Leave the name as it is.',
    mock: { kind: 'dialog', title: 'Add to Home Screen', field: 'Pot Log', items: [{ label: 'Cancel' }, { label: 'Add' }], highlight: 'Add' },
  },
  {
    id: 'open',
    title: 'Open it from your home screen',
    text: "Use the new Pot Log icon, not Safari. That's where your first pot goes.",
    mock: {
      kind: 'home',
      items: [{ label: 'Photos', icon: '🌼' }, { label: 'Pot Log', icon: '🏺' }, { label: 'Notes', icon: '📝' }, { label: 'Clock', icon: '🕐' }],
      highlight: 'Pot Log',
    },
  },
];

const OPEN_SAFARI = {
  id: 'open-safari',
  title: 'Open it in Safari',
  text: "This isn't Safari, and only Safari can install Pot Log on an iPhone. Tap Copy link, open Safari, then paste it in the address bar.",
  copyLink: true,
  mock: { kind: 'toolbar', position: 'top', items: [{ label: 'Address', icon: '🔒', wide: true }], highlight: 'Address' },
};

const LEAVE_APP_IOS = {
  id: 'leave-app',
  title: 'Open it in Safari',
  text: "This window can't install apps. Open the ••• or compass button, then tap Open in Safari. Or copy the link and paste it into Safari.",
  copyLink: true,
  mock: {
    kind: 'menu',
    title: 'Page options',
    items: [{ label: 'Open in Safari', icon: '🧭' }, { label: 'Copy link' }, { label: 'Share…' }],
    highlight: 'Open in Safari',
  },
};

const ANDROID_WELCOME = {
  id: 'welcome',
  title: 'Hi, welcome to Pot Log',
  text: 'I made this to keep track of my own pots. Put it on your home screen so it opens like any other app and works with no signal.',
};

const ANDROID_STEPS = [
  {
    id: 'menu',
    title: 'Open the ⋮ menu',
    text: 'Three dots, top right corner of Chrome.',
    mock: {
      kind: 'toolbar',
      position: 'top',
      items: [{ label: 'Address', icon: '🔒', wide: true }, { label: 'Menu', icon: '⋮' }],
      highlight: 'Menu',
    },
  },
  {
    id: 'install-app',
    title: 'Tap Install app',
    text: 'Some phones say Add to Home screen. Tap that, then Install.',
    install: true,
    mock: {
      kind: 'menu',
      title: 'Chrome menu',
      items: [{ label: 'New tab' }, { label: 'Add to Home screen' }, { label: 'Install app', icon: '⤓' }, { label: 'Settings' }],
      highlight: 'Install app',
    },
  },
];

const LEAVE_APP_ANDROID = {
  id: 'leave-app',
  title: 'Open it in Chrome',
  text: "This window can't install apps. Open its ⋮ menu and tap Open in browser. Or copy the link and paste it into Chrome.",
  copyLink: true,
  mock: {
    kind: 'menu',
    title: 'Page options',
    items: [{ label: 'Open in browser', icon: '🌐' }, { label: 'Copy link' }, { label: 'Share…' }],
    highlight: 'Open in browser',
  },
};

/** The card sequence for each way of opening the link (ids as in platform.js). */
export const GUIDE = {
  'ios-safari': [IOS_WELCOME, ...SAFARI_STEPS],
  'ios-browser': [IOS_WELCOME, OPEN_SAFARI, ...SAFARI_STEPS],
  'ios-inapp': [IOS_WELCOME, LEAVE_APP_IOS, ...SAFARI_STEPS],
  android: [ANDROID_WELCOME, ...ANDROID_STEPS],
  'android-inapp': [ANDROID_WELCOME, LEAVE_APP_ANDROID, ...ANDROID_STEPS],
  desktop: [
    {
      id: 'phone',
      title: 'Pot Log is made for phones',
      text: 'Open this link on your phone to put it on the home screen. Copy it and send it to yourself.',
      copyLink: true,
      install: true,
    },
  ],
};

// The first-open coach: three short notes, one per step (see firstPot.js).
// `stages` adds a button to My stages; `ring` is where the pulsing ring goes.
export const COACH = {
  add: {
    title: 'Your first pot',
    text: 'Tap ＋ Add a pot. It starts from my list of stages, Lump of clay through Finished. Change them any time.',
    stages: 'My stages',
  },
  photo: {
    title: 'Add a photo',
    text: "Tap the camera button. A photo is optional. It starts at Formed; pick another stage if it's further along. Then Save pot.",
  },
  next: {
    title: 'Saved. Now move it along',
    text: 'Swipe the card to the next stage, or open the pot and tap the big button. Add a photo at any stage.',
    done: 'Got it',
  },
};
