// Home-screen install help. iPhone has no install prompt, so we show the Share
// menu steps; Android Chrome fires beforeinstallprompt, so we offer a button.

export function detectPlatform(userAgent, platform, maxTouchPoints) {
  // iPadOS 13+ reports itself as a Mac with a touch screen.
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const android = /Android/.test(userAgent);
  return { ios, android };
}

export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/**
 * els: { panel, button, iosSteps, androidHint } (all elements, initially hidden)
 */
export function initInstallHelp(els) {
  if (isInstalled()) return;

  const { ios, android } = detectPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  let deferred = null;

  const show = (...shown) => {
    for (const el of [els.button, els.iosSteps, els.androidHint]) el.hidden = !shown.includes(el);
    els.panel.hidden = false;
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    show(els.button);
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    els.panel.hidden = true;
  });

  els.button.addEventListener('click', async () => {
    if (!deferred) return;
    const prompt = deferred;
    deferred = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') {
        els.panel.hidden = true;
        return;
      }
    } catch {
      // The browser refused to show the prompt.
    }
    // A prompt can be used once, so after a refusal fall back to the by-hand hint.
    show(els.androidHint);
  });

  if (ios) {
    show(els.iosSteps);
  } else if (android) {
    // Chrome fires beforeinstallprompt quickly when it can. If it has not, say how to do it by hand.
    setTimeout(() => {
      if (els.panel.hidden) show(els.androidHint);
    }, 2000);
  }
}
