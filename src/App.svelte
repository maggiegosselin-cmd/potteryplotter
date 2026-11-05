<script>
  import { liveQuery } from 'dexie';
  import { get } from 'svelte/store';
  import { db, clearFirstPot, changeStages, undoChanges, updateEntry, archivePots, restorePots, explainStorageError } from './lib/db.js';
  import { isFinished, newId, stageMap } from './lib/pots.js';
  import { moveNotes } from './lib/stageEdit.js';
  import { shrinkPhoto } from './lib/shrink.js';
  import { installed, currentPlatform } from './lib/install.js';
  import { isIosPlatform } from './lib/platform.js';
  import { FIRST_POT, coachStep } from './lib/firstPot.js';
  import PotList from './components/PotList.svelte';
  import AddPot from './components/AddPot.svelte';
  import PotScreen from './components/PotScreen.svelte';
  import StageList from './components/StageList.svelte';
  import GlazeSheet from './components/GlazeSheet.svelte';
  import FinishedPots from './components/FinishedPots.svelte';
  import InstallGuide from './components/InstallGuide.svelte';
  import FirstPotCoach from './components/FirstPotCoach.svelte';

  let stages = $state(null); // the stage rows from the database; null until read
  let glazes = $state([]); // the potter's glaze shelf
  let adding = $state(false);
  let editingStages = $state(false);
  let showFinished = $state(false);
  let sheetPotId = $state(null); // the pot whose glazes (and finished photo) are being recorded
  let openId = $state(null);
  let notice = $state('');
  let toast = $state(null); // { text, error?, undo?, photo? }
  let toastTimer = 0;
  let flag = $state(undefined); // the first-open flags row; gone once the first pot is saved
  let potCount = $state(null); // how many pots are stored; null until read
  let justSaved = $state(false); // the first pot was saved in this session: show the "move it along" note
  let skipped = $state(false); // "Not now" on the coach, for this session only
  let guide = $state(startGuide()); // null | 'welcome' | 'guard'
  let loggedAnyway = $state(false); // chose to log in an iPhone browser tab despite the warning
  let cameraInput;
  let photoTarget = null; // { potId, entryId } the next camera photo belongs to

  const platform = currentPlatform();
  const browserTab = $derived(!$installed && isIosPlatform(platform));
  const coach = $derived(coachStep({ flag, installed: $installed, potCount, adding, justSaved, skipped }));

  $effect(() => {
    const sub = liveQuery(() => db.stages.orderBy('order').toArray()).subscribe({
      next: (rows) => (stages = rows),
      error: (err) => (toast = { text: explainStorageError(err).message, error: true }),
    });
    return () => sub.unsubscribe();
  });

  $effect(() => {
    const sub = liveQuery(() => db.flags.get(FIRST_POT)).subscribe({
      next: (row) => (flag = row),
      error: () => (flag = undefined), // no flag, no coach: the app works without it
    });
    return () => sub.unsubscribe();
  });

  $effect(() => {
    const sub = liveQuery(() => db.pots.count()).subscribe({
      next: (n) => (potCount = n),
      error: () => (potCount = null),
    });
    return () => sub.unsubscribe();
  });

  // Pots that arrive any other way (the example pots) end the coach as well.
  $effect(() => {
    if (flag && potCount > 0) clearFirstPot().catch(() => {});
  });

  $effect(() => {
    const sub = liveQuery(() => db.glazes.toArray()).subscribe({
      next: (rows) => (glazes = rows),
      error: (err) => (toast = { text: explainStorageError(err).message, error: true }),
    });
    return () => sub.unsubscribe();
  });

  function show(next, ms = 10000) {
    clearTimeout(toastTimer);
    toast = next;
    if (next) toastTimer = setTimeout(() => (toast = null), ms);
  }

  // Visitors in a browser see the install guide first; the installed app never does.
  function startGuide() {
    if (get(installed) || currentPlatform() === 'desktop') return null;
    try {
      return sessionStorage.getItem('guideSeen') ? null : 'welcome';
    } catch {
      return 'welcome';
    }
  }

  function closeGuide() {
    try {
      sessionStorage.setItem('guideSeen', '1');
    } catch {
      /* the guide may open again next time; that is fine */
    }
    guide = null;
  }

  // On an iPhone browser tab the big button shows the install cards first: that tab's
  // store is not the home-screen app's, so a pot saved there would be left behind.
  function addPot() {
    notice = '';
    if (browserTab && !loggedAnyway) guide = 'guard';
    else adding = true;
  }

  function logHere() {
    loggedAnyway = true;
    closeGuide();
    adding = true;
  }

  function saved() {
    adding = false;
    notice = 'Pot saved ✓';
    if (flag && $installed) justSaved = true;
    clearFirstPot().catch(() => {});
  }

  function sheetClosed(text) {
    sheetPotId = null;
    if (text) show({ text }, 4000);
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
    justSaved = false;
    const changes = items.map(({ pot, to }) => ({ potId: pot.id, to, entryId: newId() }));
    const only = items.length === 1 ? map.get(items[0].to) : null;
    const target = { potId: changes[0].potId, entryId: changes[0].entryId };
    if (only?.photo === 'open') askPhoto(target); // a failed pot opens the camera; the photo is still optional
    try {
      const done = await changeStages(changes);
      const label = map.get(items[0].to).label;
      // A pot that is finished (or finished with a flaw) is offered its glazes and finished photo at once.
      if (done.length && isFinished(only)) sheetPotId = changes[0].potId;
      const who = items.length === 1 ? items[0].pot.name || `Pot ${items[0].pot.id}` : `${done.length} pots`;
      // Gentle note when a move skips a drying or glazing step; shown with the move and easy to dismiss.
      const notes = items.length === 1 ? moveNotes(items[0].pot, items[0].to, stages) : [];
      show({
        text: `${who} → ${label}`,
        note: notes.join(' '),
        photo: only?.photo === 'offer' ? target : null,
        glaze: only?.glaze === 'offer' ? changes[0].potId : null,
        undo: async () => {
          try {
            await undoChanges([...done].reverse());
            sheetPotId = null;
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

  /** pots: ended pots to archive. One write; the bar offers undo. */
  async function archive(pots) {
    try {
      const done = await archivePots(pots.map((p) => p.id));
      if (!done.length) return;
      const who = done.length === 1 ? pots.find((p) => p.id === done[0]).name || `Pot ${done[0]}` : `${done.length} pots`;
      show({
        text: `${who} moved to the archive`,
        undo: async () => {
          try {
            await restorePots(done);
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

  /** pots: archived pots to bring back to the main list. */
  async function restore(pots) {
    try {
      const done = await restorePots(pots.map((p) => p.id));
      if (!done.length) return;
      const who = done.length === 1 ? pots.find((p) => p.id === done[0]).name || `Pot ${done[0]}` : `${done.length} pots`;
      show({ text: `${who} restored` });
    } catch (err) {
      show({ text: err.message, error: true });
    }
  }
</script>

<input class="hidden-input" type="file" accept="image/*" capture="environment" bind:this={cameraInput} onchange={photoPicked} tabindex="-1" aria-hidden="true" />

{#if stages === null}
  <main class="screen"><p class="empty">Loading…</p></main>
{:else}
  <PotList {stages} {notice} {coach} onguide={() => (guide = 'welcome')} onadd={addPot} onopen={(id) => { justSaved = false; openId = id; }} onstages={() => (editingStages = true)} onmove={move} onarchive={archive} onrestore={restore} onfinished={() => (showFinished = true)} />

  {#if showFinished}
    <FinishedPots {stages} {glazes} onopen={(id) => (openId = id)} onback={() => (showFinished = false)} />
  {/if}

  {#if openId !== null}
    <PotScreen {stages} {glazes} potId={openId} onback={() => (openId = null)} onmove={move} onarchive={archive} onrestore={restore} {askPhoto} onglazes={(id) => (sheetPotId = id)} />
  {/if}

  {#if editingStages}
    <StageList {stages} onback={() => (editingStages = false)} />
  {/if}

  {#if coach === 'add' || coach === 'next'}
    <FirstPotCoach step={coach} float onstages={() => (editingStages = true)} onskip={coach === 'add' ? () => (skipped = true) : () => (justSaved = false)} />
  {/if}

  {#if adding}
    <AddPot {stages} {glazes} {coach} {browserTab} onsaved={saved} oncancel={() => (adding = false)} />
  {/if}

  {#if sheetPotId !== null}
    <GlazeSheet {stages} {glazes} potId={sheetPotId} onclose={sheetClosed} />
  {/if}
{/if}

{#if guide}
  <InstallGuide {platform} onclose={closeGuide} onlogHere={guide === 'guard' ? logHere : null} />
{/if}

{#if toast}
  <div class="toast" class:error={toast.error} role="status">
    <span class="msg">{toast.text}{#if toast.note}<span class="toast-note">{toast.note}</span>{/if}</span>
    {#if toast.photo}
      <button class="tbtn" onclick={() => askPhoto(toast.photo)}>📷 Add photo</button>
    {/if}
    {#if toast.glaze}
      <button class="tbtn" onclick={() => (sheetPotId = toast.glaze)}>🎨 Add glazes</button>
    {/if}
    {#if toast.undo}
      <button class="tbtn" onclick={toast.undo}>Undo</button>
    {/if}
    <button class="tbtn quiet" onclick={() => show(null)} aria-label="Dismiss">✕</button>
  </div>
{/if}
