<script>
  import { installPrompt, installed, currentPlatform, promptInstall } from '../lib/install.js';
  import { HELP, UI } from '../content/guide.js';

  // `onguide` opens the card-by-card guide (InstallGuide.svelte).
  let { onguide } = $props();

  const platform = currentPlatform();
  const help = HELP[platform];
</script>

{#if !$installed}
  {#if $installPrompt}
    <div class="banner">
      <strong>Put Pot Log on your home screen</strong>
      <button class="btn gold small" style="margin-top:10px" onclick={promptInstall}>Install</button>
    </div>
  {:else}
    <div class="banner">
      <strong>{help.title}</strong>
      <p style="margin:6px 0 0">{help.text}</p>
      <button class="btn gold small" style="margin-top:10px" onclick={onguide}>{UI.help}</button>
    </div>
  {/if}
{/if}
