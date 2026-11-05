<script>
  import { liveQuery } from 'dexie';
  import { db, explainStorageError, loadStages, movePot, undoMove, setPhoto, addSamplePots } from '../lib/db.js';
  import { persistence, checkPersistence } from '../lib/persist.js';
  import { shrinkPhoto } from '../lib/shrink.js';
  import { byId, groupByStage } from '../lib/stages.js';
  import InstallHelp from './InstallHelp.svelte';
  import PotCard from './PotCard.svelte';

  let { notice = '', onadd } = $props();

  let view = $state.raw(null); // { stages, pots } — null until the first read finishes
  let now = $state(Date.now());
  let loadError = $state('');
  let actionError = $state('');
  let busy = $state(false);
  let undo = $state(null); // { potId, text, enteredAt, askPhoto }
  let cameraInput;
  let photoFor = null;
  let timer;

  const groups = $derived(view ? groupByStage(view.stages, view.pots) : []);
  const count = $derived(view ? view.pots.length : 0);

  $effect(() => {
    checkPersistence();
    let urls = new Map();
    const sub = liveQuery(async () => ({ stages: await loadStages(), pots: await db.pots.toArray() })).subscribe({
      next({ stages, pots }) {
        const fresh = new Map();
        const rows = pots.map((pot) => {
          if (!pot.photo) return pot;
          const key = `${pot.id}:${pot.photo.size}`;
          const url = urls.get(key) ?? URL.createObjectURL(pot.photo);
          fresh.set(key, url);
          return { ...pot, url };
        });
        for (const [key, url] of urls) if (!fresh.has(key)) URL.revokeObjectURL(url);
        urls = fresh;
        now = Date.now();
        view = { stages, pots: rows };
        loadError = '';
      },
      error(err) {
        loadError = explainStorageError(err).message;
        view = { stages: [], pots: [] };
      },
    });
    return () => {
      sub.unsubscribe();
      clearTimeout(timer);
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  });

  function showUndo(next, ms) {
    clearTimeout(timer);
    undo = next;
    timer = setTimeout(() => (undo = null), ms);
  }

  async function move(pot, toId, kind) {
    if (busy) return;
    busy = true;
    actionError = '';
    try {
      const res = await movePot(pot.id, pot.stageId, toId);
      if (res) {
        const label = pot.name || `Pot ${pot.id}`;
        const to = byId(view.stages).get(toId);
        const failed = kind === 'failed';
        showUndo(
          { potId: pot.id, enteredAt: res.enteredAt, askPhoto: failed, text: failed ? `${label} marked failed.` : `${label}: ${to.name}` },
          failed ? 15000 : 8000,
        );
      }
    } catch (err) {
      actionError = err.message;
    } finally {
      busy = false;
    }
  }

  async function undoLast() {
    if (!undo || busy) return;
    const { potId, enteredAt } = undo;
    clearTimeout(timer);
    undo = null;
    try {
      await undoMove(potId, enteredAt);
    } catch (err) {
      actionError = err.message;
    }
  }

  function askPhoto(id) {
    photoFor = id;
    cameraInput.click();
  }

  async function picked(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || photoFor == null) return;
    clearTimeout(timer);
    undo = null;
    actionError = '';
    try {
      await setPhoto(photoFor, await shrinkPhoto(file));
    } catch (err) {
      actionError = err.message;
    }
  }

  async function loadSamples() {
    actionError = '';
    try {
      await addSamplePots();
    } catch (err) {
      actionError = err.message;
    }
  }
</script>

<main class="screen">
  <h1>My pots</h1>

  {#if notice}
    <div class="banner ok" role="status">{notice}</div>
  {/if}
  {#if loadError}
    <div class="banner error" role="alert">{loadError}</div>
  {/if}
  {#if actionError}
    <div class="banner error" role="alert">{actionError}</div>
  {/if}
  {#if $persistence === 'denied'}
    <div class="banner" role="status">
      Your phone hasn't promised to keep these pots if it runs low on space. Installing Pot Log to the home screen helps.
    </div>
  {/if}

  <InstallHelp />

  <input class="hidden-input" type="file" accept="image/*" capture="environment" bind:this={cameraInput} onchange={picked} tabindex="-1" aria-hidden="true" />

  {#if view === null}
    <p class="empty">Loading…</p>
  {:else if count === 0 && !loadError}
    <div class="empty">
      <p>No pots yet. Tap the big button to log your first one.</p>
      <button class="link" onclick={loadSamples}>Or fill the shelf with example pots</button>
    </div>
  {:else}
    {#each groups as group, i (group.stage.id)}
      {#if group.stage.kind === 'end' && (i === 0 || groups[i - 1].stage.kind !== 'end')}
        <h2 class="ended">Ended</h2>
      {/if}
      <section class="stage-group" class:ended={group.stage.kind === 'end'} aria-labelledby={`stage-${group.stage.id}`}>
        <h2 id={`stage-${group.stage.id}`} style:--band={group.stage.color}>
          {group.stage.name} <span class="count">{group.pots.length}</span>
        </h2>
        <ul class="pots">
          {#each group.pots as pot (pot.id)}
            <PotCard {pot} stage={group.stage} stages={view.stages} url={pot.url} {busy} {now} onmove={move} onphoto={(p) => askPhoto(p.id)} />
          {/each}
        </ul>
      </section>
    {/each}
  {/if}
</main>

{#if undo}
  <div class="undo-bar" role="status">
    <span class="undo-text">{undo.text}</span>
    <div class="undo-actions">
      {#if undo.askPhoto}
        <button class="btn small" onclick={() => askPhoto(undo.potId)}>📷 Photo of the failure</button>
      {/if}
      <button class="btn secondary small" onclick={undoLast}>↩ Undo</button>
      {#if undo.askPhoto}
        <button class="link" onclick={() => { clearTimeout(timer); undo = null; }}>Skip</button>
      {/if}
    </div>
  </div>
{/if}

<div class="fab-bar">
  <button class="btn" onclick={onadd}>＋ Add a pot</button>
</div>
