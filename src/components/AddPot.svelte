<script>
  import { onMount } from 'svelte';
  import { savePot } from '../lib/db.js';
  import { shrinkPhoto } from '../lib/shrink.js';
  import { requestPersistence } from '../lib/persist.js';
  import { makeSamplePhoto } from '../lib/samplePhoto.js';
  import { earlierStages, fromDateInput, isFinished, pathStages, startStages, toDateInput } from '../lib/pots.js';
  import { stackToLayers } from '../lib/glazes.js';
  import GlazePicker from './GlazePicker.svelte';
  import WeightField from './WeightField.svelte';
  import { parseWeight } from '../lib/weight.js';
  import FirstPotCoach from './FirstPotCoach.svelte';
  import { WARNING } from '../content/guide.js';

  let { stages, glazes, coach = null, browserTab = false, onsaved, oncancel } = $props();

  // New pots start at Formed unless the potter has hidden it.
  function startStage(rows) {
    const open = pathStages(rows).filter((s) => !s.hidden);
    return (open.find((s) => s.id === 'formed') || open[0])?.id;
  }

  let cameraInput;
  let libraryInput;
  let finishedCameraInput;
  let finishedLibraryInput;
  let step = $state('form'); // form | shrinking | saving
  let photo = $state(null); // { blob, width, height } — optional
  let previewUrl = $state('');
  let name = $state('');
  let clay = $state('');
  let weightInput = $state({ amount: '', unit: null }); // the clay weight as typed, offered at Lump of clay
  let notes = $state('');
  let stage = $state(startStage(stages));
  let when = $state(toDateInput(Date.now()));
  let earlier = $state({}); // earlier stage id -> yyyy-mm-dd, only the ones remembered
  let error = $state('');
  // A pot recorded as finished gets its finished photo and glaze layers here too.
  let finishedPhoto = $state(null); // { blob, url } — optional
  let useSame = $state(false); // use the pot photo above as the finished photo
  let stack = $state([]); // glaze layers, top coat first

  // Hidden stages are not offered for a new pot.
  const finishing = $derived(isFinished(stages.find((s) => s.id === stage)));
  const options = $derived(startStages(stages).filter((s) => !s.hidden));
  const before = $derived(earlierStages(stage, stages).filter((s) => !s.hidden));

  // The camera stays closed until the potter asks for it.
  onMount(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (finishedPhoto) URL.revokeObjectURL(finishedPhoto.url);
  });

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

  async function handleFinishedFile(file) {
    if (!file) return;
    error = '';
    step = 'shrinking';
    try {
      const { blob } = await shrinkPhoto(file);
      if (finishedPhoto) URL.revokeObjectURL(finishedPhoto.url);
      finishedPhoto = { blob, url: URL.createObjectURL(blob) };
      useSame = false;
    } catch (err) {
      error = err.message;
    }
    step = 'form';
  }

  function pickedFinished(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    input.value = '';
    handleFinishedFile(file);
  }

  async function useFinishedSample() {
    try {
      await handleFinishedFile(await makeSamplePhoto());
    } catch {
      error = "Couldn't make a test photo on this device.";
    }
  }

  function removeFinishedPhoto() {
    if (finishedPhoto) URL.revokeObjectURL(finishedPhoto.url);
    finishedPhoto = null;
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
    useSame = false;
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
        weight: stage === 'lump' ? parseWeight(weightInput.amount, weightInput.unit) : null,
        notes,
        photo: photo?.blob,
        width: photo?.width,
        height: photo?.height,
        stage,
        occurredAt: fromDateInput(when) ?? Date.now(),
        earlier: dates,
        layers: finishing ? stackToLayers(stack) : undefined,
        finishedPhoto: finishing ? (useSame && photo ? { initial: true } : finishedPhoto ? { blob: finishedPhoto.blob } : undefined) : undefined,
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
    <input class="hidden-input" type="file" accept="image/*" capture="environment" bind:this={finishedCameraInput} onchange={pickedFinished} tabindex="-1" aria-hidden="true" />
    <input class="hidden-input" type="file" accept="image/*" bind:this={finishedLibraryInput} onchange={pickedFinished} tabindex="-1" aria-hidden="true" />

    {#if browserTab}
      <div class="banner note" role="status">{WARNING.banner}</div>
    {/if}
    <FirstPotCoach step={coach} />
    {#if error}
      <div class="banner error" role="alert">{error}</div>
    {/if}

    <h2>Where is it now?</h2>
    <div class="stage-pick" role="radiogroup" aria-label="Stage">
      {#each options as s (s.id)}
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
    {#if stage === 'lump'}
      <WeightField amount={weightInput.amount} unit={weightInput.unit} onchange={(w) => (weightInput = w)} />
    {/if}
    <input type="text" placeholder="Clay type (optional)" aria-label="Clay type" bind:value={clay} autocomplete="off" />
    <textarea rows="2" placeholder="Notes (optional)" aria-label="Notes" bind:value={notes}></textarea>

    {#if finishing}<h2>Pot photo</h2>{/if}
    {#if step === 'shrinking'}
      <p class="banner" role="status">Getting the photo ready…</p>
    {:else if photo}
      <img class="preview" src={previewUrl} alt="Your pot" />
      <button class="btn secondary small" onclick={removePhoto}>Remove photo</button>
    {:else}
      <button class="btn secondary" class:coach-ring={coach === 'photo'} onclick={() => cameraInput.click()}>📷 Add a photo (optional)</button>
      <button class="btn secondary small" onclick={() => libraryInput.click()}>Choose from photos</button>
      <button class="link" onclick={useSample}>No camera? Use a test photo</button>
    {/if}

    {#if finishing}
      <h2>Finished photo</h2>
      {#if finishedPhoto}
        <img class="preview" src={finishedPhoto.url} alt="Finished pot" />
        <button class="btn secondary small" onclick={removeFinishedPhoto}>Remove finished photo</button>
      {:else if useSame && photo}
        <p class="banner">The pot photo above will be its finished photo.</p>
        <button class="btn secondary small" onclick={() => (useSame = false)}>Don't use it</button>
      {:else}
        <button class="btn secondary" onclick={() => finishedCameraInput.click()} disabled={step !== 'form'}>📷 Take the finished photo (optional)</button>
        <button class="btn secondary small" onclick={() => finishedLibraryInput.click()} disabled={step !== 'form'}>Choose from photos</button>
        {#if photo}
          <button class="btn secondary small" onclick={() => (useSame = true)}>Use the pot photo above</button>
        {/if}
        <button class="link" onclick={useFinishedSample}>No camera? Use a test photo</button>
      {/if}

      <GlazePicker {glazes} bind:stack />
    {/if}

    <button class="btn" onclick={save} disabled={step !== 'form'}>
      {step === 'saving' ? 'Saving…' : '✓ Save pot'}
    </button>
    <button class="btn secondary small" onclick={oncancel} disabled={step !== 'form'}>Cancel</button>
  </div>
</div>
