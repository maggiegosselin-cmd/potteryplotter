<script>
  import { installed } from '../lib/install.js';
  import { GUIDE } from '../content/guide.js';
  import InstallGuide from './InstallGuide.svelte';
</script>

{#if !$installed}
  <details class="banner install-help">
    <summary>{GUIDE.title}</summary>
    <InstallGuide />
  </details>
{/if}
