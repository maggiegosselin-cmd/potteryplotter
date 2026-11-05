<script>
  import { onMount } from 'svelte';
  import { savePot } from '../lib/db.js';
  import { shrinkPhoto } from '../lib/shrink.js';
  import { requestPersistence } from '../lib/persist.js';
  import { makeSamplePhoto } from '../lib/samplePhoto.js';
  import { fromDateInput, pathStages, toDateInput } from '../lib/pots.js';

  let { stages, onsaved, oncancel } = $props();

  let cameraInput;
  let libraryInput;
  let step = $state('form'); // form | shrinking | saving
  let photo = $state(null); // { blob, width, height } — optional
  let previewUrl = $state('');
  let name = $state('');
  let clay = $state('');
  let notes = $state('');
  let stage = $state('formed');
  let when = $state(toDateInput(Date.now()));
  let earlier = $state({}); // earlier stage id -> yyyy-mm-dd, only the ones remembered
  let error = $state('');

  const path = $derived(pathStages(stages));
  const before = $derived(path.slice(0, Math.max(0, path.findIndex((s) => s.id === stage))));

  // The camera stays closed until the potter asks for it.
  onMount(() => () => previewUrl && URL.revokeObjectURL(previewUrl));

  async function handleFile(file) {
    if (!file) return;
    error = '';
    step = 'shrinking';
    try {
      const result = await shrinkPhoto(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      photo = result;
      previewUrl = URL.createObjectURL(result.blob);
    } catch (err) {
      error = err.message;
    }
    step = 'form';
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

  function removePhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    photo = null;
    previewUrl = '';
  }

  async function save() {
    if (step !== 'form') return;
    error = '';
    step = 'saving';
    const dates = {};
    for (const s of before) dates[s.id] = fromDateInput(earlier[s.id]);
    try {
      await savePot({
        name,
        clay,
        notes,
        photo: photo?.blob,
        width: photo?.width,
        height: photo?.height,
        stage,
        occurredAt: fromDateInput(when) ?? Date.now(),
        earlier: dates,
      });
    } catch (err) {
      error = err.message;
      step = 'form';
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

    <h2>Where is it now?</h2>
    <div class="stage-pick" role="radiogroup" aria-label="Stage">
      {#each path as s (s.id)}
        <button class="pick" class:on={stage === s.id} role="radio" aria-checked={stage === s.id} onclick={() => (stage = s.id)}>
          {s.label}
        </button>
      {/each}
    </div>
    <label class="field">Reached this stage on
      <input type="date" bind:value={when} max={toDateInput(Date.now())} />
    </label>

    {#if before.length}
      <details class="earlier">
        <summary>Earlier stages I remember</summary>
        {#each before as s (s.id)}
          <label class="field">{s.label}
            <input type="date" bind:value={earlier[s.id]} max={when} />
          </label>
        {/each}
      </details>
    {/if}

    <input type="text" placeholder="Name (optional)" aria-label="Pot name" bind:value={name} autocomplete="off" />
    <input type="text" placeholder="Clay type (optional)" aria-label="Clay type" bind:value={clay} autocomplete="off" />
    <textarea rows="2" placeholder="Notes (optional)" aria-label="Notes" bind:value={notes}></textarea>

    {#if step === 'shrinking'}
      <p class="banner" role="status">Getting the photo ready…</p>
    {:else if photo}
      <img class="preview" src={previewUrl} alt="Your pot" />
      <button class="btn secondary small" onclick={removePhoto}>Remove photo</button>
    {:else}
      <button class="btn secondary" onclick={() => cameraInput.click()}>📷 Add a photo (optional)</button>
      <button class="btn secondary small" onclick={() => libraryInput.click()}>Choose from photos</button>
      <button class="link" onclick={useSample}>No camera? Use a test photo</button>
    {/if}

    <button class="btn" onclick={save} disabled={step !== 'form'}>
      {step === 'saving' ? 'Saving…' : '✓ Save pot'}
    </button>
    <button class="btn secondary small" onclick={oncancel} disabled={step !== 'form'}>Cancel</button>
  </div>
</div>
