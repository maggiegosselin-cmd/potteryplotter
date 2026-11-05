<script>
  import { liveQuery } from 'dexie';
  import { db, explainStorageError, addExamples } from '../lib/db.js';
  import { persistence, checkPersistence } from '../lib/persist.js';
  import { swipe } from '../lib/swipe.js';
  import {
    coverPhoto, countByStage, daysInStage, daysLabel, nextStageId, progressOf, sortOldestFirst, stageMap, isDone,
  } from '../lib/pots.js';
  import InstallHelp from './InstallHelp.svelte';
  import Silhouette from './Silhouette.svelte';

  let { stages, notice = '', onadd, onopen, onmove } = $props();

  const map = $derived(stageMap(stages));
  let pots = $state(null); // null until the first read finishes
  let loadError = $state('');
  let filter = $state(null); // a stage id, or null for every pot
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

  const counts = $derived(countByStage(pots || []));
  const chips = $derived(stages.filter((s) => counts.has(s.id)).sort((a, b) => a.order - b.order));
  const shown = $derived(sortOldestFirst((pots || []).filter((p) => !filter || p.stage === filter), stages));
  const toStaff = $derived(shown.filter((p) => selected.has(p.id) && map.get(p.stage)?.viaWaiting));
  const afterFiring = $derived(shown.filter((p) => selected.has(p.id) && map.get(p.stage)?.kind === 'waiting'));

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
</script>


<main class="screen" class:selecting>
  <h1>My pots</h1>
  <p class="sub">Longest-waiting first. Swipe a card to move it on; press and hold to pick several.</p>

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
      <button class="chip" class:on={!filter} onclick={() => (filter = null)}>All {pots.length}</button>
      {#each chips as s (s.id)}
        <button class="chip" class:on={filter === s.id} onclick={() => (filter = filter === s.id ? null : s.id)}>
          {s.label} {counts.get(s.id)}
        </button>
      {/each}
    </div>

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
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap(pot))}
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
              <div class="stage">{stage?.label}</div>
              <div class="when">{daysLabel(daysInStage(pot))}{pot.clay ? ` · ${pot.clay}` : ''}</div>
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
    <button class="btn" disabled={toStaff.length === 0} onclick={() => moveSelected(toStaff)}>
      Waiting on staff{toStaff.length ? ` (${toStaff.length})` : ''}
    </button>
    <button class="btn" disabled={afterFiring.length === 0} onclick={() => moveSelected(afterFiring)}>
      On after firing{afterFiring.length ? ` (${afterFiring.length})` : ''}
    </button>
    <button class="btn secondary small" onclick={stopSelecting}>Cancel</button>
  </div>
{:else}
  <div class="fab-bar">
    <button class="btn" onclick={onadd}>＋ Add a pot</button>
  </div>
{/if}
