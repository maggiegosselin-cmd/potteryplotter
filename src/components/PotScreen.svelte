<script>
  import { liveQuery } from 'dexie';
  import { db, moveStage, undoMove, editEntry, updatePot, explainStorageError } from '../lib/db.js';
  import { shrinkPhoto } from '../lib/shrink.js';
  import { FAILURE_CAUSES, railStages, endStages, findStage, nextStageKey, daysIn, weeksOfUse } from '../lib/stages.js';
  import { msToDate, dateToMs, shortDate, daysLabel } from '../lib/dates.js';
  import HoldButton from './HoldButton.svelte';
  import Seal from './Seal.svelte';

  let { id, stages, onback } = $props();

  let pot = $state(undefined); // undefined while loading, null if there is no such pot
  let urls = $state({ photo: '', entries: {} });
  let loadError = $state('');
  let error = $state('');
  let hint = $state('');
  let undoable = $state(''); // label of the stage the last move went to
  let skipFailure = $state(false);
  let editing = $state(null); // { id, date, note }
  let draft = $state({ name: '', clay: '', notes: '' });
  let loadedId = null;
  let photoInput;
  let failInput;
  let now = $state(Date.now());

  $effect(() => {
    let made = [];
    const sub = liveQuery(() => db.pots.get(id)).subscribe({
      next(row) {
        made.forEach((u) => URL.revokeObjectURL(u));
        made = [];
        const next = { photo: '', entries: {} };
        if (row && row.photo) made.push((next.photo = URL.createObjectURL(row.photo)));
        for (const e of (row && row.history) || []) if (e.photo) made.push((next.entries[e.id] = URL.createObjectURL(e.photo)));
        urls = next;
        pot = row || null;
        now = Date.now();
        if (row && loadedId !== id) {
          loadedId = id;
          draft = { name: row.name || '', clay: row.clay || '', notes: row.notes || '' };
        }
      },
      error(err) {
        loadError = explainStorageError(err).message;
        pot = null;
      },
    });
    return () => {
      sub.unsubscribe();
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  });

  const current = $derived(
    pot ? findStage(stages, pot.stage) || { key: pot.stage, label: pot.stage, glyph: '?', ink: 'charcoal', kind: 'path', order: 0 } : null,
  );
  const nextKey = $derived(pot ? nextStageKey(stages, pot) : null);
  const next = $derived(nextKey ? findStage(stages, nextKey) : null);
  const rail = $derived(railStages(stages));
  const ends = $derived(endStages(stages));
  const weeks = $derived(pot ? weeksOfUse(stages, pot, now) : null);
  const failedEntry = $derived(pot && current && current.failure ? pot.history[pot.history.length - 1] : null);
  const history = $derived(pot ? [...pot.history].reverse() : []);

  const title = $derived(pot ? pot.name || `Pot ${pot.id}` : '');

  async function attempt(work) {
    error = '';
    try {
      await work();
      return true;
    } catch (err) {
      error = err.message;
      return false;
    }
  }

  async function go(key) {
    if (!pot || key === pot.stage) return;
    hint = '';
    const stage = findStage(stages, key);
    if (await attempt(() => moveStage(pot.id, key))) {
      undoable = stage.label;
      skipFailure = false;
    }
  }

  async function undo() {
    if (await attempt(() => undoMove(pot.id))) undoable = '';
  }

  const early = () => (hint = 'Keep your finger down for half a second.');

  const saveField = (field) => () => {
    const value = draft[field].trim();
    if (value !== (pot[field] || '')) attempt(() => updatePot(pot.id, { [field]: value }));
  };

  function setCause(cause) {
    const value = failedEntry.cause === cause ? '' : cause;
    attempt(() => editEntry(pot.id, failedEntry.id, { cause: value }));
  }

  async function pickPhoto(event, apply) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    await attempt(async () => {
      const result = await shrinkPhoto(file);
      await apply(result);
    });
  }

  const setMainPhoto = (e) =>
    pickPhoto(e, (r) => updatePot(pot.id, { photo: r.blob, photoType: r.blob.type, width: r.width, height: r.height }));
  const setFailPhoto = (e) =>
    pickPhoto(e, (r) => editEntry(pot.id, failedEntry.id, { photo: r.blob, photoType: r.blob.type }));

  const startEdit = (e) => (editing = { id: e.id, date: msToDate(e.occurredAt), note: e.note || '' });

  async function saveEdit(entry) {
    const patch = { note: editing.note.trim() };
    if (editing.date !== msToDate(entry.occurredAt)) {
      const ms = dateToMs(editing.date);
      if (ms) patch.occurredAt = ms;
    }
    if (await attempt(() => editEntry(pot.id, entry.id, patch))) editing = null;
  }

  // Keeps the current stage's seal in view on the rail.
  function centre(node) {
    node.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }
</script>

<main class="screen pot-screen">
  <button class="link back" onclick={onback}>← All pots</button>

  {#if pot === undefined}
    <p class="empty">Loading…</p>
  {:else if pot === null}
    <div class="banner error" role="alert">{loadError || "That pot isn't on this phone."}</div>
  {:else}
    <h1 class="lettered">{title}</h1>

    {#if error}
      <div class="banner error" role="alert">{error}</div>
    {/if}

    <section class="now ink-{current.ink}" aria-label="Current stage">
      {#if urls.photo}
        <img class="hero" src={urls.photo} alt={title} />
      {/if}
      <div class="now-row">
        <Seal stage={current} size={72} state="now" />
        <div>
          <div class="now-label">{current.label}</div>
          <div class="when">
            {daysLabel(daysIn(pot, now))}{daysIn(pot, now) > 0 ? ' so far' : ''} · since {shortDate(pot.stageAt)}
          </div>
          {#if weeks !== null}
            <div class="when">Out of the kiln {weeks} {weeks === 1 ? 'week' : 'weeks'} ago</div>
          {/if}
        </div>
      </div>
    </section>

    {#if failedEntry && !skipFailure}
      <section class="failure" aria-label="What went wrong">
        <h2 class="lettered">Marked as failed</h2>
        <p class="hint">What went wrong? Tap one, or skip. Nothing here is required.</p>
        <div class="chips">
          {#each FAILURE_CAUSES as cause (cause)}
            <button type="button" class="chip" aria-pressed={failedEntry.cause === cause} onclick={() => setCause(cause)}>{cause}</button>
          {/each}
        </div>
        <input class="hidden-input" type="file" accept="image/*" capture="environment" bind:this={failInput} onchange={setFailPhoto} tabindex="-1" aria-hidden="true" />
        <button class="btn secondary small" onclick={() => failInput.click()}>
          📷 {failedEntry.photo ? 'Replace the photo of the failure' : 'Add a photo of the failure'}
        </button>
        <button class="link" onclick={() => (skipFailure = true)}>Skip for now</button>
      </section>
    {/if}

    <h2 class="lettered">Stage rail</h2>
    <p class="hint">Hold a seal to move the pot there, forwards or back.</p>
    <div class="rail" role="group" aria-label="Stages">
      {#each rail as s (s.key)}
        {@const here = s.key === pot.stage}
        <HoldButton round class="rail-seal" label="Move to {s.label}" disabled={here} onhold={() => go(s.key)} onearly={early}>
          {#if here}<span use:centre></span>{/if}
          <Seal stage={s} size={52} state={here ? 'now' : s.order < current.order ? 'past' : 'ahead'} />
          <span class="rail-label">{s.label}</span>
        </HoldButton>
      {/each}
    </div>

    <h2 class="lettered">Ends</h2>
    <div class="ends">
      {#each ends as s (s.key)}
        <HoldButton class="end ink-{s.ink}" label="Mark as {s.label}" disabled={s.key === pot.stage} onhold={() => go(s.key)} onearly={early}>
          <Seal stage={s} size={44} state={s.key === pot.stage ? 'now' : 'plain'} />
          <span>{s.label}</span>
        </HoldButton>
      {/each}
    </div>

    <h2 class="lettered">Clay and notes</h2>
    <input type="text" placeholder="Name" aria-label="Pot name" bind:value={draft.name} onchange={saveField('name')} autocomplete="off" />
    <input type="text" placeholder="Clay" aria-label="Clay" bind:value={draft.clay} onchange={saveField('clay')} autocomplete="off" />
    <textarea placeholder="Notes" aria-label="Notes" rows="4" bind:value={draft.notes} onchange={saveField('notes')}></textarea>

    <input class="hidden-input" type="file" accept="image/*" capture="environment" bind:this={photoInput} onchange={setMainPhoto} tabindex="-1" aria-hidden="true" />
    <button class="btn secondary small" onclick={() => photoInput.click()}>
      📷 {pot.photo ? 'Replace photo' : 'Add a photo'}
    </button>

    <h2 class="lettered">History</h2>
    <ol class="history">
      {#each history as e (e.id)}
        {@const s = findStage(stages, e.stage)}
        <li class="line">
          {#if s}<Seal stage={s} size={36} />{/if}
          <div class="line-body">
            <div class="line-title">{s ? s.label : e.stage}</div>
            {#if editing && editing.id === e.id}
              <label class="field">
                <span>Date it happened</span>
                <input type="date" bind:value={editing.date} max={msToDate(now)} />
              </label>
              <input type="text" placeholder="Note" aria-label="Note" bind:value={editing.note} />
              <div class="row">
                <button class="btn small" onclick={() => saveEdit(e)}>Save</button>
                <button class="btn secondary small" onclick={() => (editing = null)}>Cancel</button>
              </div>
            {:else}
              <div class="when">
                {shortDate(e.occurredAt)}{#if msToDate(e.enteredAt) !== msToDate(e.occurredAt)}, noted {shortDate(e.enteredAt)}{/if}
              </div>
              {#if e.cause}<div class="cause">{e.cause}</div>{/if}
              {#if e.note}<div class="note">{e.note}</div>{/if}
              {#if urls.entries[e.id]}<img class="line-photo" src={urls.entries[e.id]} alt="Photo of the failure" />{/if}
              <button class="link small" onclick={() => startEdit(e)}>Edit</button>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</main>

{#if pot}
  <div class="fab-bar">
    {#if hint}<p class="hint-bar" role="status">{hint}</p>{/if}
    {#if undoable}
      <div class="undo" role="status">
        <span>Moved to {undoable}.</span>
        <button class="btn secondary small" onclick={undo}>Undo</button>
      </div>
    {/if}
    {#if next}
      <HoldButton class="primary" label="Move to {next.label}" onhold={() => go(next.key)} onearly={early}>
        <span class="primary-text">
          <small>Hold to move to</small>
          <strong>{next.label}</strong>
        </span>
      </HoldButton>
    {:else if !undoable}
      <p class="hint-bar">This pot has reached its end. Hold a seal on the rail to reopen it.</p>
    {/if}
  </div>
{/if}
