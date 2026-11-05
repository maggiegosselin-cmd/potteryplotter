<script>
  import { GUIDE } from '../content/guide.js';
  import { detectCase } from '../lib/install.js';
  import InstallGuide from './InstallGuide.svelte';

  // First screen for a visitor in a browser (not the installed app): every install step on one scroll,
  // then one big button. Pots logged from here stay in the browser; AddPot warns about that.
  let { onlog, onskip } = $props();
  const inApp = detectCase() === 'in-app'; // cannot install from here, so no button to log in this window
</script>

<main class="screen welcome">
  <h1 class="ink">{GUIDE.title}</h1>
  <p class="sub">{GUIDE.intro}</p>

  <InstallGuide />

  {#if !inApp}
    <div class="fab-bar">
      <button class="btn" onclick={onlog}>{GUIDE.welcome.button}</button>
    </div>
  {/if}
  <button class="link center" onclick={onskip}>{GUIDE.welcome.skip}</button>
</main>
