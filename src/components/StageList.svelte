<script>
  import { moveStage } from '../lib/db.js';
  import { kindLabel, orderNotes } from '../lib/stageEdit.js';
  import StageSheet from './StageSheet.svelte';

  let { stages, onback } = $props();

  let sheet = $state(null); // { stageId } or { afterId }
  let error = $state('');
  let touched = $state(false); // notes only appear once the potter has changed something
  let dismissed = $state(false);

  const notes = $derived(touched && !dismissed ? orderNotes(stages) : []);

  function changed() {
    touched = true;
    dismissed = false;
  }

  async function move(id, dir) {
    error = '';
    try {
      await moveStage(id, dir);
      changed();
    } catch (err) {
      error = err.message;
    }
  }
</script>

<div class="add" role="dialog" aria-label="My stages">
  <div class="screen">
    <button class="btn secondary small" onclick={onback}>← My pots</button>
    <h1>My stages</h1>
    <p class="sub">Pots follow this list from top to bottom. Tap a name to change it.</p>

    {#if error}<div class="banner error" role="alert">{error}</div>{/if}
    {#if notes.length}
      <div class="banner note" role="status">
        <ul>{#each notes as n}<li>{n}</li>{/each}</ul>
        <button class="btn secondary small" onclick={() => (dismissed = true)}>OK, got it</button>
      </div>
    {/if}

    <ol class="stage-rows">
      {#each stages as s, i (s.id)}
        <li class="stage-row" class:hidden-stage={s.hidden}>
          <div class="stage-line">
            <button class="move" aria-label="Earlier: {s.label}" disabled={i === 0} onclick={() => move(s.id, -1)}>▲</button>
            <button class="stage-name" onclick={() => (sheet = { stageId: s.id })}>
              <span class="n">{s.label}</span>
              <span class="k">{kindLabel(s.kind)}{s.role ? ` · ${s.role}` : ''}{s.hidden ? ' · hidden' : ''}</span>
            </button>
            <button class="move" aria-label="Later: {s.label}" disabled={i === stages.length - 1} onclick={() => move(s.id, 1)}>▼</button>
          </div>
          <button class="add-after" onclick={() => (sheet = { afterId: s.id })}>＋ Add after “{s.label}”</button>
        </li>
      {/each}
    </ol>
  </div>
</div>

{#if sheet}
  <StageSheet {stages} {...sheet} onclose={() => (sheet = null)} onchanged={changed} />
{/if}
