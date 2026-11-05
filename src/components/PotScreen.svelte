<script>
  import { untrack } from 'svelte';
  import { liveQuery } from 'dexie';
  import { db, editPot, updateEntry, saveFinishing, glazeNameSuggestions } from '../lib/db.js';
  import {
    canArchive, coverPhoto, currentEntry, daysInStage, daysLabel, endStages, finishedGaps, fromDateInput, gapsText, isArchived, isFinishedStatus,
    newId, nextStageId, progressOf, stageMap, toDateInput, DAY,
  } from '../lib/pots.js';
  import { COVERAGES, METHODS, cleanLayers, cloneLayers, glazeLine, makeLayer, moveLayer, removeLayer, suggest } from '../lib/glaze.js';
  import Silhouette from './Silhouette.svelte';

  let { stages, potId, onback, onmove, onarchive, onrestore, askPhoto } = $props();

  const map = $derived(stageMap(stages));
  let pot = $state(undefined); // undefined while loading, null if it is gone
  let url = $state('');
  let entryUrls = $state({}); // history entry id -> object URL of its photo
  let finishedUrl = $state(''); // object URL of the pot's finished photo, if it has one
  let draft = $state(null); // the glaze layers being edited (a copy; saved with the button)
  let syncedKey = '';
  let glazeError = $state('');
  let glazeSaved = $state(false);
  let glazeNamesSeen = $state([]); // names used on other pots, read when a name field gets focus
  let suggestFor = $state(null); // id of the layer whose name field is showing suggestions

  $effect(() => {
    let current = '';
    let finished = '';
    let extra = [];
    const sub = liveQuery(() => db.pots.get(potId)).subscribe({
      next(row) {
        if (current) URL.revokeObjectURL(current);
        extra.forEach((u) => URL.revokeObjectURL(u));
        extra = [];
        if (finished) URL.revokeObjectURL(finished);
        finished = row?.finishedPhoto ? URL.createObjectURL(row.finishedPhoto) : '';
        finishedUrl = finished;
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
      if (finished) URL.revokeObjectURL(finished);
      extra.forEach((u) => URL.revokeObjectURL(u));
    };
  });

  // The draft follows the saved glaze unless the potter has unsaved edits.
  $effect(() => {
    if (!pot) return;
    const key = JSON.stringify(cloneLayers(pot.glazeLayers));
    if (key === syncedKey) return;
    syncedKey = key;
    if (untrack(() => draft === null || !dirty)) draft = cloneLayers(pot.glazeLayers);
  });

  const next = $derived(pot ? nextStageId(pot, stages) : null);
  const stage = $derived(pot ? map.get(pot.stage) : null);
  const finishedStatus = $derived(pot ? isFinishedStatus(pot) : false);
  const gaps = $derived(pot ? finishedGaps(pot) : null);
  const dirty = $derived(!!pot && draft !== null && JSON.stringify(draft) !== JSON.stringify(cloneLayers(pot.glazeLayers)));
  const hints = $derived(suggest(glazeNamesSeen, draft?.find((l) => l.id === suggestFor)?.name));

  const shortDate = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  function savedText(field) {
    return (event) => editPot(potId, { [field]: event.currentTarget.value });
  }

  function addLayer() {
    glazeSaved = false;
    draft = [...draft, makeLayer({ id: newId() })];
  }

  function edited(next) {
    glazeSaved = false;
    glazeError = '';
    draft = next;
  }

  function choose(layer, key, id) {
    glazeSaved = false;
    layer[key] = layer[key] === id ? '' : id; // tapping the chosen chip again clears it
  }

  async function showSuggestions(layer) {
    suggestFor = layer.id;
    try {
      glazeNamesSeen = await glazeNameSuggestions(potId);
    } catch {
      glazeNamesSeen = [];
    }
  }

  function takeSuggestion(layer, name) {
    layer.name = name;
    suggestFor = null;
    glazeSaved = false;
  }

  /**
   * One write for the glaze and/or the finished photo choice. Unsaved glaze edits
   * go with a star, so the two never disagree; a layer without a name stops it all.
   */
  async function commit(changes) {
    glazeError = '';
    try {
      const layers = changes.layers ?? (dirty ? draft : undefined);
      const saved = await saveFinishing(potId, { ...changes, layers: layers && cleanLayers($state.snapshot(layers)) });
      if (layers) {
        syncedKey = JSON.stringify(cloneLayers(saved.glazeLayers));
        draft = cloneLayers(saved.glazeLayers);
        glazeSaved = true;
      }
    } catch (err) {
      glazeError = err.message;
    }
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
          <Silhouette progress={1} size={96} muted />
        {/if}
      </div>

      <div class="status">
        <Silhouette progress={progressOf(pot, stages)} muted={stage?.kind === 'end'} size={48} />
        <div>
          <div class="stage-now">{stage?.label}</div>
          <div class="when">{daysLabel(daysInStage(pot))} in this stage</div>
        </div>
      </div>

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

      {#if gaps && (gaps.glaze || gaps.photo)}
        <div class="banner reminder" role="status">Still to add: {gapsText(gaps)}.</div>
      {/if}

      <button class="btn secondary" onclick={() => askPhoto({ potId, entryId: currentEntry(pot).id })}>
        📷 {url ? 'Add another photo' : 'Add a photo'}
      </button>

      {#if finishedStatus}
        <h2>Finished photo</h2>
        {#if finishedUrl}
          <img class="finished-photo" src={finishedUrl} alt="Finished photo of {pot.name || 'this pot'}" />
          <button class="btn secondary small" onclick={() => commit({ starEntryId: null })}>Remove finished photo</button>
        {:else}
          <p class="sub">No finished photo yet. A photo taken now becomes it, or tap ☆ on a photo in the history below.</p>
        {/if}
      {/if}

      <h2>Glaze</h2>
      <p class="sub">Layers in the order they went on: 1 is the bottom, the last one is on top.</p>
      {#if draft}
        {#if draft.length}
          <ol class="layers">
            {#each draft as layer, i (layer.id)}
              <li class="layer">
                <div class="layer-head">
                  <span class="layer-no" aria-hidden="true">{i + 1}</span>
                  <input
                    type="text"
                    class="layer-name"
                    placeholder="Glaze name"
                    aria-label="Glaze name, layer {i + 1}"
                    autocomplete="off"
                    bind:value={layer.name}
                    oninput={() => { glazeSaved = false; glazeError = ''; suggestFor = layer.id; }}
                    onfocus={() => showSuggestions(layer)}
                    onblur={() => (suggestFor = null)}
                  />
                </div>
                {#if suggestFor === layer.id && hints.length}
                  <div class="chips hints" role="group" aria-label="Glazes used on other pots">
                    {#each hints as name (name)}
                      <button class="chip" onmousedown={(e) => e.preventDefault()} onclick={() => takeSuggestion(layer, name)}>{name}</button>
                    {/each}
                  </div>
                {/if}
                <div class="chips small" role="group" aria-label="Where it goes, layer {i + 1}">
                  {#each COVERAGES as c (c.id)}
                    <button class="chip" class:on={layer.coverage === c.id} aria-pressed={layer.coverage === c.id} onclick={() => choose(layer, 'coverage', c.id)}>{c.label}</button>
                  {/each}
                </div>
                <div class="chips small" role="group" aria-label="How it was put on, layer {i + 1}">
                  {#each METHODS as m (m.id)}
                    <button class="chip" class:on={layer.method === m.id} aria-pressed={layer.method === m.id} onclick={() => choose(layer, 'method', m.id)}>{m.label}</button>
                  {/each}
                </div>
                <div class="layer-actions">
                  <button class="chip" disabled={i === 0} aria-label="Move layer {i + 1} up the list (put on earlier)" onclick={() => edited(moveLayer(draft, layer.id, -1))}>↑</button>
                  <button class="chip" disabled={i === draft.length - 1} aria-label="Move layer {i + 1} down the list (put on later)" onclick={() => edited(moveLayer(draft, layer.id, 1))}>↓</button>
                  <button class="chip remove" aria-label="Remove layer {i + 1}" onclick={() => edited(removeLayer(draft, layer.id))}>Remove</button>
                </div>
              </li>
            {/each}
          </ol>
          {#if draft.length > 1}
            <p class="sub">Read as: {glazeLine(draft)}</p>
          {/if}
        {/if}
        <button class="btn secondary small" onclick={addLayer}>＋ Add a glaze layer</button>
        {#if glazeError}
          <div class="banner error" role="alert">{glazeError}</div>
        {/if}
        <button class="btn small" disabled={!dirty} onclick={() => commit({ layers: draft })}>
          {dirty ? 'Save glaze' : glazeSaved ? 'Glaze saved ✓' : 'Nothing to save'}
        </button>
      {/if}

      <h2>End it differently</h2>
      <div class="ends">
        {#each endStages(stages) as end (end.id)}
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
              {#if finishedStatus}
                {@const starred = pot.finishedPhotoFrom === entry.id}
                <button class="chip star" class:on={starred} aria-pressed={starred} onclick={() => !starred && commit({ starEntryId: entry.id })}>
                  {starred ? '★ Finished photo' : '☆ Make this the finished photo'}
                </button>
              {/if}
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</div>
