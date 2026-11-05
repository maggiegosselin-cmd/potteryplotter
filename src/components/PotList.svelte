<script>
  import { liveQuery } from 'dexie';
  import { db, explainStorageError, addExamples } from '../lib/db.js';
  import { persistence, checkPersistence } from '../lib/persist.js';
  import { swipe } from '../lib/swipe.js';
  import {
    agoLabel, canArchive, coverPhoto, countByStage, daysInStage, daysLabel, isArchived, isDone, nextStageId, progressOf,
    sortNewestFirst, stageMap,
  } from '../lib/pots.js';
  import { groupForWalk, handInCandidates, handInMoves, waitedLong } from '../lib/shelf.js';
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
  let dragging = $state({}); // pot id -> 0..1, how far a card has been pulled
  let endedOpen = $state(false); // the "Finished and ended" section starts closed
  let handingIn = $state(false);
  let checked = $state(new Set()); // pot ids ticked in hand-in mode

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
  const shown = $derived(inArchive ? sortNewestFirst(archived) : []);
  const walk = $derived(groupForWalk(active.filter((p) => !filter || p.stage === filter), stages));
  const walkCount = $derived(walk.strip.length + walk.sections.reduce((n, g) => n + g.pots.length, 0) + walk.ended.length);
  const handIn = $derived(handInCandidates(active, stages));
  const picked = $derived((inArchive ? shown : [...walk.strip, ...walk.sections.flatMap((g) => g.pots), ...(endedOpen ? walk.ended : [])]).filter((p) => selected.has(p.id)));
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
    // Asking for a finished or ended stage by name opens the section that holds it.
    if (next && next !== ARCHIVE && isDone(map.get(next))) endedOpen = true;
    stopSelecting();
    stopHandIn();
  }

  function startHandIn() {
    stopSelecting();
    handingIn = true;
    checked = new Set();
  }

  function stopHandIn() {
    handingIn = false;
    checked = new Set();
  }

  function toggleChecked(pot) {
    const next = new Set(checked);
    if (!next.delete(pot.id)) next.add(pot.id);
    checked = next;
  }

  async function handInChecked() {
    const moves = handInMoves(active, checked, stages);
    stopHandIn();
    if (moves.length) await onmove(moves);
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


{#snippet potCard(pot)}
    {@const stage = map.get(pot.stage)}
    {@const next = nextStageId(pot, stages)}
    {@const long = waitedLong(pot)}
    <li class="swipe-row" style:--pull={dragging[pot.id] || 0}>
      <div class="reveal" aria-hidden="true">{next ? `→ ${map.get(next).label}` : 'Nothing further'}</div>
      <div
        class="card"
        class:selected={selected.has(pot.id)}
        class:done={isDone(stage)}
        class:long
        role="button"
        tabindex="0"
        aria-label="{pot.name || `Pot ${pot.id}`}, {stage?.label}, {daysLabel(daysInStage(pot))}{long ? ', longer than usual' : ''}"
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
          <div class="stage">{stage?.label} · {daysLabel(daysInStage(pot))}{#if long}<span class="long-mark">longer than usual</span>{/if}</div>
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
{/snippet}

<main class="screen" class:selecting={selecting || handingIn}>
  <h1>My pots</h1>
  <p class="sub">Longest waiting first. Swipe a card to move it on; press and hold to pick several.</p>

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

    {#if inArchive && shown.length === 0}
      <p class="empty">Nothing in the archive. Pots that have ended can be moved here to tidy the list.</p>
    {/if}

    {#if !inArchive && !handingIn && handIn.length}
      <button class="btn secondary small hand-in-open" onclick={startHandIn}>Hand in ({handIn.length} ready)</button>
    {/if}

    {#if handingIn}
      <section class="group" aria-labelledby="g-handin">
        <h2 id="g-handin">Hand in <span class="n">{handIn.length}</span></h2>
        <p class="sub">Tick the pots you are giving to staff for the kiln.</p>
        {#if handIn.length === 0}
          <p class="empty">Nothing is ready to hand in.</p>
        {/if}
        <ul class="cards">
          {#each handIn as pot (pot.id)}
            {@const stage = map.get(pot.stage)}
            <li>
              <button class="hand-row" class:on={checked.has(pot.id)} role="checkbox" aria-checked={checked.has(pot.id)} onclick={() => toggleChecked(pot)}>
                <span class="bigcheck" aria-hidden="true">{checked.has(pot.id) ? '✓' : ''}</span>
                <span class="info">
                  <span class="name">{pot.name || `Pot ${pot.id}`}</span>
                  <span class="stage">{stage?.label} · {daysLabel(daysInStage(pot))}</span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {:else if inArchive}
      <ul class="cards">
        {#each shown as pot (pot.id)}
          {@render potCard(pot)}
        {/each}
      </ul>
    {:else}
      {#if walkCount === 0}
        <p class="empty">Every pot is in the archive.</p>
      {/if}

      {#if walk.strip.length}
        <section class="group strip" aria-labelledby="g-strip">
          <h2 id="g-strip">With staff or in a kiln <span class="n">{walk.strip.length}</span></h2>
          <ul class="cards">
            {#each walk.strip as pot (pot.id)}
              {@render potCard(pot)}
            {/each}
          </ul>
        </section>
      {/if}

      {#each walk.sections as group (group.stage.id)}
        <section class="group" aria-labelledby="g-{group.stage.id}">
          <h2 id="g-{group.stage.id}">{group.stage.label} <span class="n">{group.pots.length}</span></h2>
          <ul class="cards">
            {#each group.pots as pot (pot.id)}
              {@render potCard(pot)}
            {/each}
          </ul>
        </section>
      {/each}

      {#if walk.ended.length}
        <section class="group ended">
          <h2>
            <button class="fold" aria-expanded={endedOpen} aria-controls="g-ended" onclick={() => (endedOpen = !endedOpen)}>
              <span class="caret" aria-hidden="true">{endedOpen ? '▾' : '▸'}</span> Finished and ended <span class="n">{walk.ended.length}</span>
            </button>
          </h2>
          {#if endedOpen}
            <ul class="cards" id="g-ended">
              {#each walk.ended as pot (pot.id)}
                {@render potCard(pot)}
              {/each}
            </ul>
          {/if}
        </section>
      {/if}
    {/if}
  {/if}
</main>

{#if handingIn}
  <div class="fab-bar select-bar" role="toolbar" aria-label="Hand in checked pots">
    <button class="btn wide" disabled={checked.size === 0} onclick={handInChecked}>Hand in{checked.size ? ` (${checked.size})` : ''}</button>
    <button class="btn secondary small" onclick={stopHandIn}>Cancel</button>
  </div>
{:else if selecting}
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
