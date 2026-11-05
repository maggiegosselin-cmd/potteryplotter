<script>
  import { GUIDE } from '../content/guide.js';

  // The installed app's first open, with no pots yet: one big button and a line pointing to My stages.
  let { onadd, onstages } = $props();
  const text = GUIDE.firstPot;
</script>

<main class="screen first-pot">
  <h1 class="ink">{text.title}</h1>
  <button class="btn first-btn" onclick={onadd}>{text.button}</button>
  <p class="first-line">{text.line} <button class="link inline" onclick={onstages}>{text.stagesLink}</button>.</p>
</main>
