<script>
  import { savePot } from '../lib/db.js';
  import { shrinkPhoto } from '../lib/shrink.js';
  import { requestPersistence } from '../lib/persist.js';
  import { makeSamplePhoto } from '../lib/samplePhoto.js';
  import { railStages, endStages, findStage } from '../lib/stages.js';
  import { msToDate, dateToMs } from '../lib/dates.js';
  import Seal from './Seal.svelte';

  let { stages, onsaved, oncancel } = $props();

  // The camera never opens by itself: a photo is something you ask for.
  let cameraInput;
  let libraryInput;
  let busy = $state(''); // '' | 'shrinking' | 'saving'
  let photo = $state(null); // { blob, width, height }
  let previewUrl = $state('');
  let name = $state('');
  let clay = $state('');
  let stageKey = $state('lump');
  let when = $state(msToDate(Date.now()));
  let earlier = $state({}); // path stage key -> 'YYYY-MM-DD' for the earlier stages you remember
  let error = $state('');

  const choices = $derived([...railStages(stages), ...endStages(stages).filter((s) => s.default)]);
  const target = $derived(findStage(stages, stageKey));
  const before = $derived(railStages(stages).filter((s) => s.kind === 'path' && target && s.order < target.order));

  async function handleFile(file) {
    if (!file) return;
    error = '';
    busy = 'shrinking';
    try {
      const result = await shrinkPhoto(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      photo = result;
      previewUrl = URL.createObjectURL(result.blob);
    } catch (err) {
      error = err.message;
    }
    busy = '';
  }

  function picked(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    input.value = ''; // lets the same photo be chosen again after an error
    handleFile(file);
  }

  async function useSample() {
    try {
      await handleFile(await makeSamplePhoto());
    } catch {
      error = "Couldn't make a test photo on this device.";
    }
  }

  function dropPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    photo = null;
    previewUrl = '';
  }

  async function save() {
    if (busy) return;
    error = '';
    busy = 'saving';
    const now = Date.now();
    const remembered = {};
    for (const [key, value] of Object.entries(earlier)) {
      const ms = dateToMs(value, now);
      if (ms && before.some((s) => s.key === key)) remembered[key] = ms;
    }
    try {
      await savePot({
        name,
        clay,
        photo: photo && photo.blob,
        width: photo && photo.width,
        height: photo && photo.height,
        stage: stageKey,
        stageAt: dateToMs(when, now) ?? now,
        earlier: remembered,
      });
    } catch (err) {
      error = err.message;
      busy = '';
      return;
    }
    requestPersistence(); // after the first save; a refusal is shown on the list
    onsaved();
  }
</script>

<div class="add" role="dialog" aria-label="Add a pot">
  <div class="screen">
    <h1>Add a pot</h1>

    <input class="hidden-input" type="file" accept="image/*" capture="environment" bind:this={cameraInput} onchange={picked} tabindex="-1" aria-hidden="true" />
    <input class="hidden-input" type="file" accept="image/*" bind:this={libraryInput} onchange={picked} tabindex="-1" aria-hidden="true" />

    {#if error}
      <div class="banner error" role="alert">{error}</div>
    {/if}

    <input type="text" placeholder="Name (optional)" aria-label="Pot name" bind:value={name} enterkeyhint="next" autocomplete="off" />
    <input type="text" placeholder="Clay (optional)" aria-label="Clay" bind:value={clay} enterkeyhint="done" autocomplete="off" />

    <h2>Where is it now?</h2>
    <div class="choice-grid" role="radiogroup" aria-label="Stage">
      {#each choices as s (s.key)}
        <button type="button" class="choice" role="radio" aria-checked={stageKey === s.key} onclick={() => (stageKey = s.key)}>
          <Seal stage={s} size={48} state={stageKey === s.key ? 'now' : 'plain'} />
          <span>{s.label}</span>
        </button>
      {/each}
    </div>

    <label class="field">
      <span>When did it get there?</span>
      <input type="date" bind:value={when} max={msToDate(Date.now())} />
    </label>

    {#if before.length}
      <details class="earlier">
        <summary>Earlier stages I remember (optional)</summary>
        <p class="hint">Leave a date empty if you don't remember it.</p>
        {#each before as s (s.key)}
          <label class="field">
            <span>{s.label}</span>
            <input type="date" bind:value={earlier[s.key]} max={msToDate(Date.now())} />
          </label>
        {/each}
      </details>
    {/if}

    <h2>Photo <small>(optional)</small></h2>
    {#if busy === 'shrinking'}
      <p class="banner" role="status">Getting the photo ready…</p>
    {:else if photo}
      <img class="preview" src={previewUrl} alt="Your pot" />
      <button class="btn secondary small" onclick={dropPhoto} disabled={busy === 'saving'}>Remove photo</button>
    {:else}
      <button class="btn secondary" onclick={() => cameraInput.click()}>📷 Take a photo</button>
      <button class="btn secondary small" onclick={() => libraryInput.click()}>Choose from photos</button>
      <button class="link" onclick={useSample}>No camera? Use a test photo</button>
    {/if}

    <button class="btn" onclick={save} disabled={busy !== ''}>
      {busy === 'saving' ? 'Saving…' : '✓ Save pot'}
    </button>
    <button class="btn secondary small" onclick={oncancel} disabled={busy !== ''}>Cancel</button>
  </div>
</div>
