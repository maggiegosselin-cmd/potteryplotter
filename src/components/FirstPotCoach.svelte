<script>
  import { COACH, UI } from '../content/guide.js';

  // One of the three coach notes (see src/lib/firstPot.js). `float` pins it above the Add button.
  let { step, float = false, onstages = null, onskip = null } = $props();

  const note = $derived(COACH[step]);
</script>

{#if note}
  <div class="coach" class:float role="status">
    <strong>{note.title}</strong>
    <p>{note.text}</p>
    {#if (note.stages && onstages) || onskip}
      <div class="coach-actions">
        {#if note.stages && onstages}
          <button class="btn secondary small" onclick={onstages}>{note.stages}</button>
        {/if}
        {#if onskip}
          <button class="link" onclick={onskip}>{note.done || UI.notNow}</button>
        {/if}
      </div>
    {/if}
  </div>
{/if}
