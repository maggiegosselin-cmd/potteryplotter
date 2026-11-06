<script>
  import { liveQuery } from 'dexie';
  import { db, editPot, updateEntry } from '../lib/db.js';
  import {
    canArchive, canGlaze, coverPhoto, currentEntry, daysInStage, daysLabel, endStages, fromDateInput, isArchived, isFinished, nextStageId, progressOf,
    stageMap, toDateInput, DAY,
  } from '../lib/pots.js';
  import { potNotes } from '../lib/stageEdit.js';
  import { glazeLine, layerDetail, layersToStack, nameLookup } from '../lib/glazes.js';
  import Silhouette from './Silhouette.svelte';

  let { stages, glazes, potId, onback, onmove, onarchive, onrestore, askPhoto, onglazes } = $props();

  const map = $derived(stageMap(stages));
  let pot = $state(undefined); // undefined while loading, null if it is gone
  let url = $state('');
  let entryUrls = $state({}); // history entry id -> object URL of its photo

  $effect(() => {
    let current = '';
    let extra = [];
    const sub = liveQuery(() => db.pots.get(potId)).subscribe({
      next(row) {
        if (current) URL.revokeObjectURL(current);
        extra.forEach((u) => URL.revokeObjectURL(u));
        extra = [];
        const urls = {};
        for (const e of row ? row.history : []) {
          if (e.photo) extra.push((urls[e.id] = URL.createObjectURL(e.photo)));
        }
        entryUrls = urls;
        const photo = row ? coverPhoto(row) : null;
        current = photo ? URL.createObjectURL(photo) : '';
        url = current;
        pot = row || null;
      },
      error() {
        pot = null;
      },
    });
    return () => {
      sub.unsubscribe();
      if (current) URL.revokeObjectURL(current);
      extra.forEach((u) => URL.revokeObjectURL(u));
    };
  });

  const next = $derived(pot ? nextStageId(pot, stages) : null);
  const stage = $derived(pot ? map.get(pot.stage) : null);
  let notesDismissed = $state(false);
  const notes = $derived(pot && !notesDismissed ? potNotes(pot, stages) : []);
  const nameOf = $derived(nameLookup(glazes));
  const layers = $derived(pot ? layersToStack(pot.glazeLayers) : []); // top coat first

  const shortDate = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  function savedText(field) {
    return (event) => editPot(potId, { [field]: event.currentTarget.value });
  }

  function changeDate(entry, event) {
    const at = fromDateInput(event.currentTarget.value);
    if (at) updateEntry(potId, entry.id, { occurredAt: at });
  }
</script>

<div class="add" role="dialog" aria-label="Pot">
  <div class="screen">
    <button class="btn secondary small" onclick={onback}>← My pots</button>

    {#if pot === undefined}
      <p class="empty">Loading…</p>
    {:else if pot === null}
      <p class="empty">This pot is no longer here.</p>
    {:else}
      <div class="hero" class:placeholder={!url}>
        {#if url}
          <img src={url} alt={pot.name || 'Pot photo'} />
        {:else}
          <Silhouette potId={pot.id} progress={1} size={96} muted />
        {/if}
      </div>

      <div class="status">
        <Silhouette potId={pot.id} progress={progressOf(pot, stages)} muted={stage?.kind === 'end'} size={48} />
        <div>
          <div class="stage-now">{stage?.label}</div>
          <div class="when">{daysLabel(daysInStage(pot))} in this stage</div>
        </div>
      </div>

      {#if notes.length}
        <div class="banner pot-note" role="status">
          {#each notes as n}<div>{n}</div>{/each}
          <button class="btn secondary small" onclick={() => (notesDismissed = true)}>OK, got it</button>
        </div>
      {/if}

      {#if next}
        <button class="btn big" onclick={() => onmove([{ pot, to: next }])}>
          Next: {map.get(next).label} →
        </button>
      {:else}
        <div class="banner">This pot has reached its last stage.</div>
      {/if}

      {#if isArchived(pot)}
        <div class="banner">In the archive since {shortDate(pot.archivedAt)}. Its record, photos and history are kept.</div>
        <button class="btn secondary" onclick={() => onrestore([pot])}>Restore from archive</button>
      {:else if canArchive(pot, stages)}
        <button class="btn secondary" onclick={() => onarchive([pot])}>Move to archive</button>
      {/if}

      <button class="btn secondary" onclick={() => askPhoto({ potId, entryId: currentEntry(pot).id })}>
        📷 {url ? 'Add another photo' : 'Add a photo'}
      </button>

      {#if canGlaze(pot, stages)}
        <h2>{isFinished(stage) ? 'Glazes and finished photo' : 'Glazes'}</h2>
        {#if layers.length}
          <p class="glaze-line">{glazeLine(pot.glazeLayers, nameOf)}</p>
          <ol class="layer-list" aria-label="Glaze layers, top coat first">
            {#each layers as layer, i (i)}
              <li><strong>{nameOf(layer.glazeId)}</strong>{layerDetail(layer) ? ` · ${layerDetail(layer)}` : ''}</li>
            {/each}
          </ol>
        {:else}
          <p class="gap">No glaze recorded yet</p>
        {/if}
        {#if isFinished(stage)}
          {#if pot.finishedPhoto}
            <p class="when">The finished photo is the one shown at the top.</p>
          {:else}
            <p class="gap">No finished photo yet</p>
          {/if}
        {/if}
        <button class="btn secondary" onclick={() => onglazes(potId)}>
          🎨 {isFinished(stage) ? 'Edit glazes and finished photo' : layers.length ? 'Edit glazes' : 'Add glazes'}
        </button>
      {/if}

      <h2>End it differently</h2>
      <div class="ends">
        {#each endStages(stages).filter((e) => !e.hidden) as end (end.id)}
          <button class="btn secondary" disabled={pot.stage === end.id} onclick={() => onmove([{ pot, to: end.id }])}>
            {end.label}
          </button>
        {/each}
      </div>

      <h2>About this pot</h2>
      <label class="field">Name
        <input type="text" value={pot.name} placeholder="Name (optional)" onchange={savedText('name')} autocomplete="off" />
      </label>
      <label class="field">Clay
        <input type="text" value={pot.clay || ''} placeholder="Clay type (optional)" onchange={savedText('clay')} autocomplete="off" />
      </label>
      <label class="field">Notes
        <textarea rows="3" value={pot.notes || ''} placeholder="Notes (optional)" onchange={savedText('notes')}></textarea>
      </label>

      <h2>History</h2>
      <ol class="history">
        {#each pot.history as entry (entry.id)}
          <li>
            <div class="h-stage">{map.get(entry.stage)?.label ?? entry.stage}</div>
            <input type="date" value={toDateInput(entry.occurredAt)} aria-label="Date of {map.get(entry.stage)?.label}" onchange={(e) => changeDate(entry, e)} />
            <input type="text" value={entry.note || ''} placeholder="Note" aria-label="Note for {map.get(entry.stage)?.label}" onchange={(e) => updateEntry(potId, entry.id, { note: e.currentTarget.value })} />
            {#if Math.abs(entry.enteredAt - entry.occurredAt) > DAY}
              <div class="when">Entered {shortDate(entry.enteredAt)}</div>
            {/if}
            {#if entryUrls[entry.id]}
              <img class="h-photo" src={entryUrls[entry.id]} alt="Photo at {map.get(entry.stage)?.label}" />
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</div>
