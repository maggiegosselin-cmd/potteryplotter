<script>
  import { describeDays, daysInStage, endStages, nextStage, reopenStage } from '../lib/stages.js';

  let { pot, stage, stages, url = '', busy = false, now, onmove, onphoto } = $props();

  let ending = $state(false);

  const next = $derived(nextStage(stages, pot));
  const reopen = $derived(reopenStage(stages, pot));
  const isEnd = $derived(stage.kind === 'end');
  const others = $derived(endStages(stages).filter((s) => s.id !== 'failed' && s.id !== pot.stageId));
  const failed = $derived(stages.find((s) => s.id === 'failed'));
  const label = $derived(pot.name || `Pot ${pot.id}`);

  function move(to, kind) {
    ending = false;
    onmove(pot, to, kind);
  }
</script>

<li class="pot" style:--band={stage.color}>
  <div class="pot-top">
    {#if url}
      <img src={url} alt={label} loading="lazy" decoding="async" />
    {:else}
      <button class="thumb" onclick={() => onphoto(pot)} aria-label={`Add a photo to ${label}`}>📷</button>
    {/if}
    <div class="pot-info">
      <div class="name">{label}</div>
      <div class="when">
        {describeDays(daysInStage(pot, now))} in {stage.name.toLowerCase()}{pot.clay ? ` · ${pot.clay}` : ''}
      </div>
      {#if pot.notes}<div class="notes">{pot.notes}</div>{/if}
    </div>
    {#if !isEnd && failed}
      <button class="fail" disabled={busy} onclick={() => move(failed.id, 'failed')}>Failed</button>
    {/if}
  </div>

  {#if !isEnd && others.length}
    <button class="link end-link" aria-expanded={ending} onclick={() => (ending = !ending)}>
      {ending ? 'Close' : 'Other ending…'}
    </button>
    {#if ending}
      <div class="ends">
        {#each others as s (s.id)}
          <button class="btn secondary small" disabled={busy} onclick={() => move(s.id, 'end')}>{s.name}</button>
        {/each}
      </div>
    {/if}
  {/if}

  {#if next}
    <button class="next" disabled={busy} onclick={() => move(next.id, 'next')}>
      <span class="next-hint">Move on to</span>
      <span class="next-name">{next.name} <span aria-hidden="true">→</span></span>
    </button>
  {:else if isEnd && reopen}
    <button class="next reopen" disabled={busy} onclick={() => move(reopen.id, 'reopen')}>
      <span class="next-hint">Changed your mind?</span>
      <span class="next-name"><span aria-hidden="true">↩</span> Back to {reopen.name}</span>
    </button>
  {:else}
    <div class="done">✓ {stage.name}</div>
  {/if}
</li>
