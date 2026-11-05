<script>
  import { liveQuery } from 'dexie';
  import { db, moveMany, addSamplePots, explainStorageError } from '../lib/db.js';
  import { persistence, checkPersistence } from '../lib/persist.js';
  import { groupByStage, waitingPots, daysIn, sortStages, findStage } from '../lib/stages.js';
  import { daysLabel } from '../lib/dates.js';
  import HoldButton from './HoldButton.svelte';
  import Seal from './Seal.svelte';
  import InstallHelp from './InstallHelp.svelte';

  let { stages, notice = '', onadd } = $props();

  let pots = $state(null); // null until the first read finishes
  let loadError = $state('');
  let error = $state('');
  let selecting = $state(false);
  let picked = $state(new Set());
  let target = $state(''); // '' means each pot's own next stage
  let now = $state(Date.now());

  $effect(() => {
    checkPersistence();
    let urls = [];
    const sub = liveQuery(() => db.pots.toArray()).subscribe({
      next(rows) {
        urls.forEach((u) => URL.revokeObjectURL(u));
        urls = [];
        now = Date.now();
        pots = rows.map((pot) => {
          let url = '';
          if (pot.photo) {
            url = URL.createObjectURL(pot.photo);
            urls.push(url);
          }
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

  const waiting = $derived(pots ? waitingPots(stages, pots) : []);
  const groups = $derived(pots ? groupByStage(stages, pots) : []);
  const names = (pot) => pot.name || `Pot ${pot.id}`;

  function toggle(id) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    picked = next;
  }

  function pickGroup(group) {
    const next = new Set(picked);
    group.pots.forEach((p) => next.add(p.id));
    picked = next;
  }

  function stopSelecting() {
    selecting = false;
    picked = new Set();
    target = '';
  }

  async function moveSelected() {
    if (!picked.size) return;
    error = '';
    try {
      await moveMany([...picked], target || null);
      stopSelecting();
    } catch (err) {
      error = err.message;
    }
  }

  async function loadSamples() {
    error = '';
    try {
      await addSamplePots();
    } catch (err) {
      error = err.message;
    }
  }
</script>

{#snippet row(pot)}
  {@const stage = findStage(stages, pot.stage)}
  {#if selecting}
    <button type="button" class="pot" class:picked={picked.has(pot.id)} aria-pressed={picked.has(pot.id)} onclick={() => toggle(pot.id)}>
      {@render rowBody(pot, stage)}
    </button>
  {:else}
    <a class="pot" href="#/pot/{pot.id}">
      {@render rowBody(pot, stage)}
    </a>
  {/if}
{/snippet}

{#snippet rowBody(pot, stage)}
  {#if pot.url}
    <img src={pot.url} alt="" loading="lazy" />
  {:else if stage}
    <Seal {stage} size={64} />
  {/if}
  <span class="pot-text">
    <span class="name">{names(pot)}</span>
    <span class="when">{daysLabel(daysIn(pot, now))}{daysIn(pot, now) > 0 ? ' at this stage' : ''}{pot.clay ? ` · ${pot.clay}` : ''}</span>
  </span>
  {#if selecting}<span class="tick" aria-hidden="true">{picked.has(pot.id) ? '✓' : ''}</span>{/if}
{/snippet}

<main class="screen">
  <div class="title-row">
    <h1 class="lettered">My pots</h1>
    {#if pots && pots.length}
      <button class="link" onclick={() => (selecting ? stopSelecting() : (selecting = true))}>{selecting ? 'Done' : 'Select'}</button>
    {/if}
  </div>

  {#if notice}
    <div class="banner ok" role="status">{notice}</div>
  {/if}
  {#if loadError}
    <div class="banner error" role="alert">{loadError}</div>
  {/if}
  {#if error}
    <div class="banner error" role="alert">{error}</div>
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
    <button class="link center" onclick={loadSamples}>Or fill the shelves with sample pots</button>
  {:else}
    {#if waiting.length}
      <section class="strip" aria-label="Waiting on studio staff">
        <h2 class="lettered">Waiting on studio staff</h2>
        <ul class="strip-list">
          {#each waiting as pot (pot.id)}
            <li>
              {#if selecting}
                <button type="button" class="strip-card" class:picked={picked.has(pot.id)} aria-pressed={picked.has(pot.id)} onclick={() => toggle(pot.id)}>
                  <strong>{daysIn(pot, now)}</strong><span>{daysIn(pot, now) === 1 ? 'day' : 'days'} waiting</span>
                  <em>{names(pot)}</em>
                </button>
              {:else}
                <a class="strip-card" href="#/pot/{pot.id}">
                  <strong>{daysIn(pot, now)}</strong><span>{daysIn(pot, now) === 1 ? 'day' : 'days'} waiting</span>
                  <em>{names(pot)}</em>
                </a>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#each groups as group (group.stage.key)}
      <details class="stage-group ink-{group.stage.ink}" open={group.stage.kind !== 'end'}>
        <summary>
          <Seal stage={group.stage} size={40} state="now" />
          <span class="group-title lettered">{group.stage.label}</span>
          <span class="count">{group.pots.length}</span>
        </summary>
        {#if selecting}
          <button class="link small" onclick={() => pickGroup(group)}>Select all {group.pots.length}</button>
        {/if}
        <ul class="pots">
          {#each group.pots as pot (pot.id)}
            <li>{@render row(pot)}</li>
          {/each}
        </ul>
      </details>
    {/each}
  {/if}
</main>

<div class="fab-bar">
  {#if selecting}
    <div class="move-bar">
      <label class="field">
        <span>{picked.size} selected, move to</span>
        <select bind:value={target} aria-label="Move selected pots to">
          <option value="">Each one's next stage</option>
          {#each sortStages(stages) as s (s.key)}
            <option value={s.key}>{s.label}</option>
          {/each}
        </select>
      </label>
      <HoldButton class="primary" disabled={!picked.size} label="Move {picked.size} pots" onhold={moveSelected}>
        <span class="primary-text">
          <small>Hold to move</small>
          <strong>{picked.size} {picked.size === 1 ? 'pot' : 'pots'}</strong>
        </span>
      </HoldButton>
    </div>
  {:else}
    <button class="btn" onclick={onadd}>＋ Add a pot</button>
  {/if}
</div>
