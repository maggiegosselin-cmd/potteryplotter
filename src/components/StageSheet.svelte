<script>
  import { addStage, countPotsAt, hideStage, saveStage, showStage } from '../lib/db.js';
  import { nextStageId, stageMap } from '../lib/pots.js';
  import { ROLES, SUGGESTIONS } from '../lib/stageEdit.js';

  // Edits one stage (`stageId`) or adds a new one after `afterId`.
  let { stages, stageId = null, afterId = null, onclose, onchanged } = $props();

  const stage = stageId ? stageMap(stages).get(stageId) : null;
  const adding = !stage;
  const after = afterId ? stageMap(stages).get(afterId) : null;

  let label = $state(stage?.label ?? '');
  let kind = $state(stage?.kind ?? 'path');
  let photo = $state(!!stage?.photo);
  let role = $state(stage?.role ?? '');
  let busy = $state(false);
  let error = $state('');
  let ask = $state(null); // { count, to } while asking what to do with the pots in a stage being hidden

  const waiting = stage?.kind === 'waiting';

  function suggest(s) {
    label = s.label;
    kind = s.kind;
    role = s.role;
  }

  async function run(fn) {
    busy = true;
    error = '';
    try {
      await fn();
      onchanged();
      onclose();
    } catch (err) {
      error = err.message;
      busy = false;
    }
  }

  function save() {
    if (!label.trim()) {
      error = 'Give the stage a name first.';
      return;
    }
    const fields = { label, kind, photo, role: role || null };
    run(() => (adding ? addStage(afterId, fields) : saveStage(stageId, fields)));
  }

  async function hide() {
    const count = await countPotsAt(stageId);
    const to = nextStageId({ stage: stageId, history: [] }, stages.map((s) => (s.id === stageId ? { ...s, hidden: true } : s)));
    if (count > 0 && to) ask = { count, to };
    else run(() => hideStage(stageId));
  }
</script>

<div class="add" role="dialog" aria-label={adding ? 'Add a stage' : 'Edit stage'}>
  <div class="screen">
    <h1>{adding ? 'Add a stage' : 'Edit stage'}</h1>
    {#if adding && after}<p class="sub">It will go right after “{after.label}”.</p>{/if}

    {#if error}<div class="banner error" role="alert">{error}</div>{/if}

    {#if ask}
      <div class="banner" role="alertdialog" aria-label="Pots in this stage">
        {ask.count === 1 ? '1 pot is' : `${ask.count} pots are`} in “{stage.label}”.
      </div>
      <button class="btn" disabled={busy} onclick={() => run(() => hideStage(stageId, ask.to))}>
        Move {ask.count === 1 ? 'it' : 'them'} to “{stages.find((s) => s.id === ask.to).label}”
      </button>
      <button class="btn secondary" disabled={busy} onclick={() => run(() => hideStage(stageId))}>
        Leave {ask.count === 1 ? 'it' : 'them'} here
      </button>
      <button class="btn secondary small" disabled={busy} onclick={() => (ask = null)}>Cancel</button>
    {:else}
      {#if adding}
        <h2>Quick picks</h2>
        <div class="stage-pick" role="group" aria-label="Suggestions">
          {#each SUGGESTIONS as s (s.label)}
            <button class="pick" class:on={label === s.label} onclick={() => suggest(s)}>{s.label}</button>
          {/each}
        </div>
      {/if}

      <label class="field">Name
        <input class="big-input" type="text" bind:value={label} placeholder="Stage name" autocomplete="off" />
      </label>

      <h2>What kind of stage?</h2>
      {#if waiting}
        <p class="sub">Waiting on staff is where pots wait between handing in and the kiln.</p>
      {:else}
        <div class="stage-pick" role="radiogroup" aria-label="Kind">
          <button class="pick" class:on={kind === 'path'} role="radio" aria-checked={kind === 'path'} onclick={() => (kind = 'path')}>On the path</button>
          <button class="pick" class:on={kind === 'end'} role="radio" aria-checked={kind === 'end'} onclick={() => (kind = 'end')}>Ends the pot</button>
        </div>
      {/if}

      <button class="pick switch" class:on={photo} role="switch" aria-checked={photo} onclick={() => (photo = !photo)}>
        {photo ? '✓ Offer a photo when a pot gets here' : 'Offer a photo when a pot gets here'}
      </button>

      <h2>Role tag</h2>
      <div class="stage-pick" role="radiogroup" aria-label="Role tag">
        {#each ROLES as r (r.id)}
          <button class="pick" class:on={role === r.id} role="radio" aria-checked={role === r.id} onclick={() => (role = r.id)}>{r.label}</button>
        {/each}
        <button class="pick" class:on={!role} role="radio" aria-checked={!role} onclick={() => (role = '')}>None</button>
      </div>

      <button class="btn" onclick={save} disabled={busy}>{busy ? 'Saving…' : '✓ Save stage'}</button>
      {#if !adding}
        {#if stage.hidden}
          <button class="btn secondary" disabled={busy} onclick={() => run(() => showStage(stageId))}>Show this stage again</button>
        {:else}
          <button class="btn secondary" disabled={busy} onclick={hide}>Hide this stage</button>
        {/if}
      {/if}
      <button class="btn secondary small" onclick={onclose} disabled={busy}>Cancel</button>
    {/if}
  </div>
</div>
