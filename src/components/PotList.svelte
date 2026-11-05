<script>
  import { liveQuery } from 'dexie';
  import { db, explainStorageError, addExamples } from '../lib/db.js';
  import { persistence, checkPersistence } from '../lib/persist.js';
  import { swipe } from '../lib/swipe.js';
  import {
    canArchive, coverPhoto, countByStage, daysInStage, daysLabel, groupByStage, isArchived, isDone, nextStageId, selectGroup,
    shelfWalk, stageMap, waitLevel,
  } from '../lib/pots.js';
  import InstallHelp from './InstallHelp.svelte';
  import Silhouette from './Silhouette.svelte';

  let { stages, notice = '', onadd, onopen, onmove, onarchive, onrestore } = $props();

  const ARCHIVE = 'archive'; // the filter that opens the archive; no stage has this id

  const map = $derived(stageMap(stages));
  let pots = $state(null); // null until the first read finishes
  let loadError = $state('');
  let filter = $state(null); // a stage id, ARCHIVE, or null for every pot that is not archived
  let selecting = $state(false);
  let selected = $state(new Set());

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
  const chips = $derived(stages.filter((s) => counts.has(s.id)).sort((a, b) => a.order - b.order));
  // The walk leaves out finished and ended pots; they show only under their own chip or Archive.
  const sections = $derived(
    inArchive ? groupByStage(archived, stages) : filter ? groupByStage(active.filter((p) => p.stage === filter), stages) : shelfWalk(active, stages),
  );
  const shown = $derived(sections.flatMap((g) => g.pots));
  const picked = $derived(shown.filter((p) => selected.has(p.id)));
  const toStaff = $derived(picked.filter((p) => map.get(p.stage)?.viaWaiting));
  const afterHandIn = $derived(picked.filter((p) => map.get(p.stage)?.kind === 'waiting'));
  // Archiving is offered only when every selected pot has ended.
  const allEnded = $derived(picked.length > 0 && picked.every((p) => canArchive(p, stages)));

  // A chip whose pots have all moved on (or been archived) is gone, so drop its filter.
  $effect(() => {
    if (filter && filter !== ARCHIVE && !counts.has(filter)) filter = null;
  });

  function pick(next) {
    filter = next;
    stopSelecting();
  }

  function startSelecting(pot) {
    selecting = true;
    selected = new Set([pot.id]);
    navigator.vibrate?.(30);
  }

  function selectAll(group) {
    selected = selectGroup(selecting ? selected : new Set(), group);
    selecting = true;
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
  <p class="sub">Longest-waiting first, stage by stage. Tap a pot to open it; press and hold, or use Select all, to pick several.</p>

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
    <button class="link center" onclick={() => addExamples()}>Or try it with some example pots</button>
  {:else}
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

    {#each sections as group (group.stage.id)}
      <section class="shelf" aria-label={group.stage.label}>
        <header class="shelf-head">
          <h2>{group.stage.label} <span class="shelf-count">{group.pots.length}</span></h2>
          <span class="shelf-wait">longest {daysLabel(group.maxDays)}</span>
          <button class="shelf-all" onclick={() => selectAll(group)}>Select all</button>
        </header>
        <ul class="wall">
          {#each group.pots as pot (pot.id)}
            {@const stage = map.get(pot.stage)}
            {@const days = daysInStage(pot)}
            <li>
              <div
                class="tile {waitLevel(days) ? `wait-${waitLevel(days)}` : ''}"
                class:selected={selected.has(pot.id)}
                class:done={isDone(stage)}
                role="button"
                tabindex="0"
                aria-label="{pot.name || `Pot ${pot.id}`}, {stage?.label}, {daysLabel(days)}"
                aria-pressed={selecting ? selected.has(pot.id) : undefined}
                onclick={() => tap(pot)}
                onkeydown={(e) => e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap(pot))}
                use:swipe={{ enabled: !selecting, sideways: false, onlongpress: () => startSelecting(pot) }}
              >
                <div class="shot" class:placeholder={!pot.url}>
                  {#if pot.url}
                    <img src={pot.url} alt="" loading="lazy" draggable="false" />
                  {:else}
                    <Silhouette progress={1} size={72} muted />
                  {/if}
                  <span class="badge">{stage?.label}</span>
                  <span class="days">{daysLabel(days)}</span>
                  {#if selecting}<span class="tick">{selected.has(pot.id) ? '✓' : ''}</span>{/if}
                </div>
                <div class="tile-name">{pot.name || `Pot ${pot.id}`}</div>
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
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
