<script>
  import { onMount } from 'svelte';
  import { savePot, loadStages } from '../lib/db.js';
  import { shrinkPhoto } from '../lib/shrink.js';
  import { requestPersistence } from '../lib/persist.js';
  import { makeSamplePhoto } from '../lib/samplePhoto.js';
  import { DEFAULT_STAGES, FIRST_STAGE_ID, bySort, byId, dateInputToTime, earlierStages } from '../lib/stages.js';

  let { onsaved, oncancel } = $props();

  let cameraInput;
  let libraryInput;
  let step = $state('choose'); // choose | shrinking | form | saving
  let picking = $state(false); // true when starting at a chosen stage
  let stages = $state(DEFAULT_STAGES);
  let photo = $state(null); // optional: { blob, width, height }
  let previewUrl = $state('');
  let name = $state('');
  let clay = $state('');
  let notes = $state('');
  let stageId = $state(FIRST_STAGE_ID);
  let earlier = $state([]);
  let when = $state(dateInput(Date.now()));
  let error = $state('');

  const choices = $derived(bySort(stages).filter((s) => s.kind !== 'end'));
  const history = $derived(earlierStages(stages, stageId));
  const stage = $derived(byId(stages).get(stageId));
  const today = dateInput(Date.now());

  function dateInput(t) {
    const d = new Date(t);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // The camera opens only when asked for, never on its own.
  onMount(() => {
    loadStages().then((rows) => (stages = rows));
    return () => previewUrl && URL.revokeObjectURL(previewUrl);
  });

  function pickStage(id) {
    stageId = id;
    earlier = earlierStages(stages, id).map((s) => s.id);
  }

  function toggleEarlier(id, on) {
    earlier = on ? [...earlier, id] : earlier.filter((x) => x !== id);
  }

  async function handleFile(file) {
    if (!file) return;
    error = '';
    const back = step === 'form' ? 'form' : 'choose';
    step = 'shrinking';
    try {
      const result = await shrinkPhoto(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      photo = result;
      previewUrl = URL.createObjectURL(result.blob);
      step = 'form';
    } catch (err) {
      error = err.message;
      step = back;
    }
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
    } catch (err) {
      error = "Couldn't make a test photo on this device.";
    }
  }

  function startPicking() {
    picking = true;
    step = 'form';
  }

  function removePhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    photo = null;
    if (!picking) step = 'choose';
  }

  async function save(blank = false) {
    if (step === 'saving') return;
    error = '';
    const back = step;
    step = 'saving';
    try {
      await savePot(
        blank
          ? {}
          : {
              name,
              clay,
              notes,
              stageId: picking ? stageId : FIRST_STAGE_ID,
              stageDate: picking ? dateInputToTime(when) : undefined,
              earlier: picking ? earlier : [],
              photo: photo?.blob,
              width: photo?.width,
              height: photo?.height,
            },
      );
    } catch (err) {
      error = err.message;
      step = back;
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

    {#if step === 'shrinking'}
      <p class="banner" role="status">Getting the photo ready…</p>
    {:else if step === 'choose'}
      <button class="btn" onclick={() => cameraInput.click()}>📷 Take a photo</button>
      <button class="btn secondary" onclick={() => save(true)}>Blank pot, no photo</button>
      <button class="btn secondary" onclick={startPicking}>Start at a later stage…</button>
      <button class="link" onclick={() => libraryInput.click()}>Choose from photos</button>
      <button class="link" onclick={useSample}>No camera? Use a test photo</button>
    {:else}
      {#if photo}
        <img class="preview" src={previewUrl} alt="Your pot" />
      {/if}

      {#if picking}
        <fieldset class="stage-pick">
          <legend>Where is it now?</legend>
          {#each choices as s (s.id)}
            <label class="choice" class:on={stageId === s.id} style:--band={s.color}>
              <input type="radio" name="stage" value={s.id} checked={stageId === s.id} onchange={() => pickStage(s.id)} />
              <span>{s.name}</span>
            </label>
          {/each}
        </fieldset>

        {#if history.length}
          <fieldset class="stage-pick">
            <legend>Already been through (untick any you don't remember)</legend>
            {#each history as s (s.id)}
              <label class="choice check" class:on={earlier.includes(s.id)} style:--band={s.color}>
                <input type="checkbox" checked={earlier.includes(s.id)} onchange={(e) => toggleEarlier(s.id, e.currentTarget.checked)} />
                <span>{s.name}</span>
              </label>
            {/each}
          </fieldset>
        {/if}

        <label class="field">
          <span>When did it get to “{stage?.name}”?</span>
          <input type="date" bind:value={when} max={today} />
        </label>
      {/if}

      <input type="text" placeholder="Name (optional)" aria-label="Pot name" bind:value={name} enterkeyhint="done" autocomplete="off" />
      <details class="more">
        <summary>Clay and notes</summary>
        <input type="text" placeholder="Clay (optional)" aria-label="Clay" bind:value={clay} autocomplete="off" />
        <input type="text" placeholder="Notes (optional)" aria-label="Notes" bind:value={notes} autocomplete="off" />
      </details>

      <button class="btn" onclick={() => save()} disabled={step === 'saving'}>
        {step === 'saving' ? 'Saving…' : '✓ Save pot'}
      </button>
      {#if photo}
        <button class="btn secondary small" onclick={() => cameraInput.click()} disabled={step === 'saving'}>Retake photo</button>
        <button class="btn secondary small" onclick={removePhoto} disabled={step === 'saving'}>No photo after all</button>
      {:else}
        <button class="btn secondary small" onclick={() => cameraInput.click()} disabled={step === 'saving'}>📷 Add a photo (optional)</button>
      {/if}
    {/if}

    <button class="btn secondary small" onclick={oncancel} disabled={step === 'saving' || step === 'shrinking'}>Cancel</button>
  </div>
</div>
