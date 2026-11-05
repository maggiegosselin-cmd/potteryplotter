<script>
  import { installPrompt, installed, isIos } from '../lib/install.js';

  const ios = isIos();

  async function install() {
    const event = $installPrompt;
    if (!event) return;
    event.prompt();
    await event.userChoice;
    installPrompt.set(null);
  }
</script>

{#if !$installed}
  {#if $installPrompt}
    <div class="banner">
      <strong>Put Pot Log on your home screen</strong>
      <button class="btn small" style="margin-top:10px" onclick={install}>Install</button>
    </div>
  {:else if ios}
    <div class="banner">
      <strong>Install on iPhone first</strong>
      <ol>
        <li>Open this page in Safari.</li>
        <li>Tap the Share button.</li>
        <li>Tap <em>Add to Home Screen</em>, then <em>Add</em>.</li>
        <li>Open Pot Log from your home screen.</li>
      </ol>
      <p style="margin:8px 0 0">Pots saved in Safari don't move to the home-screen app, so install before logging pots.</p>
    </div>
  {:else}
    <div class="banner">
      <strong>Install on Android</strong>
      <p style="margin:6px 0 0">In Chrome, open the ⋮ menu and tap <em>Install app</em> (or <em>Add to Home screen</em>).</p>
    </div>
  {/if}
{/if}
