<script>
  import { liveQuery } from 'dexie';
  import { db, changeStages, undoChanges, updateEntry, explainStorageError } from './lib/db.js';
  import { newId, stageMap } from './lib/pots.js';
  import { shrinkPhoto } from './lib/shrink.js';
  import PotList from './components/PotList.svelte';
  import AddPot from './components/AddPot.svelte';
  import PotScreen from './components/PotScreen.svelte';

  let stages = $state(null); // the stage rows from the database; null until read
  let adding = $state(false);
  let openId = $state(null);
  let notice = $state('');
  let toast = $state(null); // { text, error?, undo?, photo? }
  let toastTimer = 0;
  let cameraInput;
  let photoTarget = null; // { potId, entryId } the next camera photo belongs to

  $effect(() => {
    const sub = liveQuery(() => db.stages.orderBy('order').toArray()).subscribe({
      next: (rows) => (stages = rows),
      error: (err) => (toast = { text: explainStorageError(err).message, error: true }),
    });
    return () => sub.unsubscribe();
  });

  function show(next, ms = 10000) {
    clearTimeout(toastTimer);
    toast = next;
    if (next) toastTimer = setTimeout(() => (toast = null), ms);
  }

  function saved() {
    adding = false;
    notice = 'Pot saved ✓';
  }

  // Must run straight from a tap: that is what lets the camera open.
  function askPhoto(target) {
    photoTarget = target;
    cameraInput.click();
  }

  async function photoPicked(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    input.value = '';
    const target = photoTarget;
    if (!file || !target) return; // cancelled: the pot keeps going without a photo
    try {
      const { blob } = await shrinkPhoto(file);
      await updateEntry(target.potId, target.entryId, { photo: blob });
      show({ text: 'Photo kept ✓' }, 4000);
    } catch (err) {
      show({ text: err.message, error: true });
    }
  }

  /** items: [{ pot, to }]. One write for all of them; the bar offers undo. */
  async function move(items) {
    const map = stageMap(stages);
    const changes = items.map(({ pot, to }) => ({ potId: pot.id, to, entryId: newId() }));
    const only = items.length === 1 ? map.get(items[0].to) : null;
    const target = { potId: changes[0].potId, entryId: changes[0].entryId };
    if (only?.photo === 'open') askPhoto(target); // a failed pot opens the camera; the photo is still optional
    try {
      const done = await changeStages(changes);
      const label = map.get(items[0].to).label;
      const who = items.length === 1 ? items[0].pot.name || `Pot ${items[0].pot.id}` : `${done.length} pots`;
      show({
        text: `${who} → ${label}`,
        photo: only?.photo === 'offer' ? target : null,
        undo: async () => {
          try {
            await undoChanges([...done].reverse());
            show(null);
          } catch (err) {
            show({ text: err.message, error: true });
          }
        },
      });
    } catch (err) {
      show({ text: err.message, error: true });
    }
  }
</script>

<input class="hidden-input" type="file" accept="image/*" capture="environment" bind:this={cameraInput} onchange={photoPicked} tabindex="-1" aria-hidden="true" />

{#if stages === null}
  <main class="screen"><p class="empty">Loading…</p></main>
{:else}
  <PotList {stages} {notice} onadd={() => { notice = ''; adding = true; }} onopen={(id) => (openId = id)} onmove={move} />

  {#if openId !== null}
    <PotScreen {stages} potId={openId} onback={() => (openId = null)} onmove={move} {askPhoto} />
  {/if}

  {#if adding}
    <AddPot {stages} onsaved={saved} oncancel={() => (adding = false)} />
  {/if}
{/if}

{#if toast}
  <div class="toast" class:error={toast.error} role="status">
    <span class="msg">{toast.text}</span>
    {#if toast.photo}
      <button class="tbtn" onclick={() => askPhoto(toast.photo)}>📷 Add photo</button>
    {/if}
    {#if toast.undo}
      <button class="tbtn" onclick={toast.undo}>Undo</button>
    {/if}
    <button class="tbtn quiet" onclick={() => show(null)} aria-label="Dismiss">✕</button>
  </div>
{/if}
