<script>
  import { onMount } from 'svelte';
  import { savePot } from '../lib/db.js';
  import { shrinkPhoto } from '../lib/shrink.js';
  import { requestPersistence } from '../lib/persist.js';
  import { makeSamplePhoto } from '../lib/samplePhoto.js';

  let { onsaved, oncancel } = $props();

  let cameraInput;
  let libraryInput;
  let step = $state('pick'); // pick | shrinking | ready | saving
  let photo = $state(null); // { blob, width, height }
  let previewUrl = $state('');
  let name = $state('');
  let error = $state('');

  // Camera first: the tap on "Add a pot" is the gesture that lets us open it at once.
  onMount(() => {
    try {
      cameraInput?.click();
    } catch {
      /* the big Take photo button is still there */
    }
    return () => previewUrl && URL.revokeObjectURL(previewUrl);
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
      step = 'ready';
    } catch (err) {
      photo = null;
      error = err.message;
      step = 'pick';
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

  async function save() {
    if (!photo || step === 'saving') return;
    error = '';
    step = 'saving';
    try {
      await savePot({ name, photo: photo.blob, width: photo.width, height: photo.height });
    } catch (err) {
      error = err.message;
      step = 'ready';
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
    {:else if step === 'pick'}
      <button class="btn" onclick={() => cameraInput.click()}>📷 Take photo</button>
      <button class="btn secondary" onclick={() => libraryInput.click()}>Choose from photos</button>
      <button class="link" onclick={useSample}>No camera? Use a test photo</button>
    {:else}
      <img class="preview" src={previewUrl} alt="Your pot" />
      <input type="text" placeholder="Name (optional)" aria-label="Pot name" bind:value={name} enterkeyhint="done" autocomplete="off" />
      <button class="btn" onclick={save} disabled={step === 'saving'}>
        {step === 'saving' ? 'Saving…' : '✓ Save pot'}
      </button>
      <button class="btn secondary small" onclick={() => cameraInput.click()} disabled={step === 'saving'}>Retake photo</button>
    {/if}

    <button class="btn secondary small" onclick={oncancel} disabled={step === 'saving' || step === 'shrinking'}>Cancel</button>
  </div>
</div>
