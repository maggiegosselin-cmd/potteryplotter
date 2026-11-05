<script>
  import { installPrompt, detectCase, detectInAppName } from '../lib/install.js';
  import { GUIDE } from '../content/guide.js';
  import GuideArt from './GuideArt.svelte';

  // Only the steps for this phone: chosen from the user agent and the install prompt, nothing stored.
  const kind = detectCase();
  const app = detectInAppName();
  const link = typeof location === 'undefined' ? '' : location.href;
  const ios = kind === 'ios-safari' || kind === 'ios-other';
  const browser = GUIDE.inApp.browser[ios ? 'ios' : 'android'];
  const fill = (text) => text.replace('{browser}', browser).replace('{app}', app || 'app');

  const list = $derived(kind === 'in-app' ? GUIDE.inApp : ios ? GUIDE.ios : $installPrompt ? GUIDE.androidPrompt : GUIDE.androidMenu);

  let copy = $state(''); // '' | 'done' | 'failed'
  let linkInput;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      copy = 'done';
    } catch {
      linkInput?.select();
      copy = 'failed';
    }
  }

  async function install() {
    const event = $installPrompt;
    if (!event) return;
    event.prompt();
    await event.userChoice;
    installPrompt.set(null);
  }
</script>

<div class="guide" data-case={kind}>
  {#if kind === 'ios-other'}
    <div class="banner note guide-note">
      <strong class="ink">{GUIDE.safariNote.title}</strong>
      <p>{GUIDE.safariNote.text}</p>
    </div>
  {/if}

  <h2 class="ink">{list.heading}</h2>
  {#if kind === 'in-app'}
    <p class="guide-lead">{fill(list.text)}</p>
  {/if}

  <ol class="guide-steps">
    {#each list.steps as step (step.art)}
      <li class="guide-step">
        <GuideArt art={step.art} />
        <h3 class="ink">{fill(step.title)}</h3>
        <p>{fill(step.text)}</p>
        {#if step.art === 'install' && $installPrompt}
          <button class="btn" onclick={install}>{GUIDE.installButton}</button>
        {/if}
      </li>
    {/each}
  </ol>

  {#if kind === 'in-app' || kind === 'ios-other'}
    <input class="guide-link" type="text" readonly value={link} bind:this={linkInput} onfocus={(e) => e.currentTarget.select()} aria-label="Link to this page" />
    <button class="btn secondary" onclick={copyLink}>{copy === 'done' ? GUIDE.inApp.copied : GUIDE.inApp.copy}</button>
    {#if copy === 'failed'}<p class="hint" role="status">{GUIDE.inApp.copyFailed}</p>{/if}
  {/if}

  {#if kind !== 'in-app'}
    <p class="guide-last ink">{GUIDE.lastLine}</p>
  {/if}
</div>
