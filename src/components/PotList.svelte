<script>
  import { liveQuery } from 'dexie';
  import { db, explainStorageError, addExamples } from '../lib/db.js';
  import { makeExamplePhotos } from '../lib/samplePhoto.js';
  import { persistence, checkPersistence } from '../lib/persist.js';
  import { swipe } from '../lib/swipe.js';
  import {
    agoLabel, canArchive, coverPhoto, countByStage, daysInStage, daysLabel, finishedView, isArchived, isDone, nextStageId, progressOf,
    sortNewestFirst, stageMap,
  } from '../lib/pots.js';
  import InstallHelp from './InstallHelp.svelte';
  import Silhouette from './Silhouette.svelte';

  let { stages, notice = '', onadd, onopen, onfinished, onmove, onarchive, onrestore } = $props();

  const ARCHIVE = 'archive'; // the filter that opens the archive; no stage has this id

  const map = $derived(stageMap(stages));
  let pots = $state(null); // null until the first read finishes
  let loadError = $state('');
  let filter = $state(null); // a stage id, ARCHIVE, or null for every pot that is not archived
  let selecting = $state(false);
  let selected = $state(new Set());
  let dragging = $state({}); // pot id -> 0..1, how far a card has been pulled

  $effect(() => {
    checkPersistence();
    let urls = [];
    const sub = liveQuery(() => db.pots.toArray()).subscribe({
      next(rows) {
        urls.forEach((u) => URL.revokeObjectURL(u));
        urls = [];
        pots = rows.map((pot) => {
          const photo = coverPhoto(pot);
          const url = photo ? URL.createObjectURL(photo) : '';
          if (url) urls.push(url);
          return { ...pot, url };
        });
        loadError = '';
      },
      error(err) {
        loadError = explainStorageError(err).message;
        pots = [];
      },
    });
    return () => {
      sub.unsubscribe();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  });

  // Archived pots stay out of the main list and the stage chips.
  const active = $derived((pots || []).filter((p) => !isArchived(p)));
  const archived = $derived((pots || []).filter(isArchived));
  const inArchive = $derived(filter === ARCHIVE);
  const counts = $derived(countByStage(active));
  const finished = $derived(finishedView(active).counts);
  const chips = $derived(stages.filter((s) => counts.has(s.id)).sort((a, b) => a.order - b.order));
  const shown = $derived(sortNewestFirst(inArchive ? archived : active.filter((p) => !filter || p.stage === filter)));
  const picked = $derived(shown.filter((p) => selected.has(p.id)));
  const toStaff = $derived(picked.filter((p) => map.get(p.stage)?.viaWaiting));
  const afterHandIn = $derived(picked.filter((p) => map.get(p.stage)?.kind === 'waiting'));
  // Archiving is offered only when every selected pot has ended.
  const allEnded = $derived(picked.length > 0 && picked.every((p) => canArchive(p, stages)));

  // A chip whose pots have all moved on (or been archived) is gone, so drop its filter.
  $effect(() => {
    if (filter && filter !== ARCHIVE && !counts.has(filter)) filter = null;
  });

  async function tryExamples() {
    await addExamples(await makeExamplePhotos());
  }

  function pick(next) {
    filter = next;
    stopSelecting();
  }

  function advance(pot) {
    const to = nextStageId(pot, stages);
    if (to) onmove([{ pot, to }]);
  }

  function startSelecting(pot) {
    selecting = true;
    selected = new Set([pot.id]);
    navigator.vibrate?.(30);
  }

  function tap(pot) {
    if (!selecting) return onopen(pot.id);
    const next = new Set(selected);
    if (!next.delete(pot.id)) next.add(pot.id);
    selected = next;
    if (next.size === 0) selecting = false;
  }

  function stopSelecting() {
    selecting = false;
    selected = new Set();
  }

  async function moveSelected(list) {
    const items = list.map((pot) => ({ pot, to: nextStageId(pot, stages) })).filter((i) => i.to);
    stopSelecting();
    if (items.length) await onmove(items);
  }

  async function archiveSelected() {
    const list = picked;
    stopSelecting();
    await onarchive(list);
  }

  async function restoreSelected() {
    const list = picked;
    stopSelecting();
    await onrestore(list);
  }
</script>


<main class="screen" class:selecting>
  <h1>My pots</h1>
  <p class="sub">Newest first. Swipe a card to move it on; press and hold to pick several.</p>

  {#if notice}
    <div class="banner ok" role="status">{notice}</div>
  {/if}
  {#if loadError}
    <div class="banner error" role="alert">{loadError}</div>
  {/if}
  {#if $persistence === 'denied'}
    <div class="banner" role="status">
      Your phone hasn't promised to keep these pots if it runs low on space. Installing Pot Log to the home screen helps.
    </div>
  {/if}

  <InstallHelp />

  {#if pots === null}
    <p class="empty">Loading…</p>
  {:else if pots.length === 0 && !loadError}
    <p class="empty">No pots yet. Tap the big button to log your first one.</p>
    <button class="link center" onclick={tryExamples}>Or try it with some example pots</button>
  {:else}
    {#if finished.all}
      <button class="btn secondary small finished-link" onclick={onfinished}>
        Finished pots ({finished.all}){finished.all - finished.complete ? ` · ${finished.all - finished.complete} need something` : ''} →
      </button>
    {/if}

    <div class="chips" role="group" aria-label="Show stage">
      <button class="chip" class:on={!filter} onclick={() => pick(null)}>All {active.length}</button>
      {#each chips as s (s.id)}
        <button class="chip" class:on={filter === s.id} onclick={() => pick(filter === s.id ? null : s.id)}>
          {s.label} {counts.get(s.id)}
        </button>
      {/each}
      <button class="chip archive" class:on={inArchive} onclick={() => pick(inArchive ? null : ARCHIVE)}>Archive {archived.length}</button>
    </div>

    {#if shown.length === 0}
      <p class="empty">
        {inArchive ? 'Nothing in the archive. Pots that have ended can be moved here to tidy the list.' : 'Every pot is in the archive.'}
      </p>
    {/if}

    <ul class="cards">
      {#each shown as pot (pot.id)}
        {@const stage = map.get(pot.stage)}
        {@const next = nextStageId(pot, stages)}
        <li class="swipe-row" style:--pull={dragging[pot.id] || 0}>
          <div class="reveal" aria-hidden="true">{next ? `→ ${map.get(next).label}` : 'Nothing further'}</div>
          <div
            class="card"
            class:selected={selected.has(pot.id)}
            class:done={isDone(stage)}
            role="button"
            tabindex="0"
            aria-label="{pot.name || `Pot ${pot.id}`}, {stage?.label}, {daysLabel(daysInStage(pot))}"
            aria-pressed={selecting ? selected.has(pot.id) : undefined}
            onclick={() => tap(pot)}
            onkeydown={(e) => e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap(pot))}
            use:swipe={{
              enabled: !selecting,
              onswipe: () => advance(pot),
              onlongpress: () => startSelecting(pot),
              onmove: (v) => (dragging[pot.id] = v),
            }}
          >
            <div class="photo" class:placeholder={!pot.url}>
              {#if pot.url}
                <img src={pot.url} alt="" loading="lazy" draggable="false" />
              {:else}
                <Silhouette progress={1} size={64} muted />
              {/if}
              {#if selecting}<span class="tick">{selected.has(pot.id) ? '✓' : ''}</span>{/if}
            </div>
            <div class="info">
              <div class="name">{pot.name || `Pot ${pot.id}`}</div>
              <div class="stage">{stage?.label} · {daysLabel(daysInStage(pot))}</div>
              <div class="when">{inArchive ? `archived ${agoLabel(pot.archivedAt)} · ` : ''}added {agoLabel(pot.createdAt)}{pot.clay ? ` · ${pot.clay}` : ''}</div>
              {#if !selecting && !inArchive && canArchive(pot, stages)}
                <button
                  class="card-btn"
                  onpointerdown={(e) => e.stopPropagation()}
                  onkeydown={(e) => e.stopPropagation()}
                  onclick={(e) => { e.stopPropagation(); onarchive([pot]); }}
                >Move to archive</button>
              {/if}
            </div>
            <Silhouette progress={progressOf(pot, stages)} muted={stage?.kind === 'end'} />
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</main>

{#if selecting}
  <div class="fab-bar select-bar" role="toolbar" aria-label="Move selected pots">
    <div class="count">{selected.size} selected</div>
    {#if inArchive}
      <button class="btn wide" onclick={restoreSelected}>Restore ({picked.length})</button>
    {:else}
      <button class="btn" disabled={toStaff.length === 0} onclick={() => moveSelected(toStaff)}>
        Waiting on staff{toStaff.length ? ` (${toStaff.length})` : ''}
      </button>
      <button class="btn" disabled={afterHandIn.length === 0} onclick={() => moveSelected(afterHandIn)}>
        Into the kiln{afterHandIn.length ? ` (${afterHandIn.length})` : ''}
      </button>
      {#if allEnded}
        <button class="btn wide" onclick={archiveSelected}>Move to archive ({picked.length})</button>
      {/if}
    {/if}
    <button class="btn secondary small" onclick={stopSelecting}>Cancel</button>
  </div>
{:else}
  <div class="fab-bar">
    <button class="btn" onclick={onadd}>＋ Add a pot</button>
  </div>
{/if}
