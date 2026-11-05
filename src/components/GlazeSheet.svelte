<script>
  import { db, finishPot, setGlazeLayers } from '../lib/db.js';
  import { layersToStack, stackToLayers } from '../lib/glazes.js';
  import { isFinished, newId, photoOptions, stageMap } from '../lib/pots.js';
  import { shrinkPhoto } from '../lib/shrink.js';
  import { makeSamplePhoto } from '../lib/samplePhoto.js';
  import GlazePicker from './GlazePicker.svelte';

  // Records a pot's glaze layers. On a finished pot (Finished, or Finished with a
  // flaw) the same sheet also holds the camera and the pot's own photos, and the
  // layers and the finished photo choice are saved together in one write.
  // onclose(text?) is called after a save (with a message) or when skipped.
  let { stages, glazes, potId, onclose } = $props();

  const map = $derived(stageMap(stages));
  let pot = $state(undefined); // undefined while loading, null if it is gone
  let stack = $state([]);
  let options = $state([]); // the pot's own photos, each with an object URL
  let selected = $state(null); // key of the chosen finished photo, or null for none
  let newPhoto = $state(null); // { blob, url } just taken or picked
  let step = $state('form'); // form | shrinking | saving
  let error = $state('');
  let cameraInput;
  let libraryInput;

  const finished = $derived(pot ? isFinished(map.get(pot.stage)) : false);
  const choices = $derived([
    ...options.filter((o) => !(newPhoto && o.key === 'camera')),
    ...(newPhoto ? [{ key: 'camera', label: 'New finished photo', url: newPhoto.url }] : []),
  ]);
  const selectedUrl = $derived(choices.find((c) => c.key === selected)?.url || '');

  $effect(() => {
    let alive = true;
    const urls = [];
    db.pots
      .get(potId)
      .then((row) => {
        if (!alive) return;
        if (!row) {
          pot = null;
          return;
        }
        stack = layersToStack(row.glazeLayers).map((l) => ({ ...l, key: newId() }));
        selected = row.finishedPhoto ? row.finishedFrom : null;
        options = photoOptions(row, (id) => map.get(id)?.label ?? id).map((o) => {
          const url = URL.createObjectURL(o.blob);
          urls.push(url);
          return { ...o, url };
        });
        pot = row;
      })
      .catch(() => alive && (pot = null));
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  });

  $effect(() => () => newPhoto && URL.revokeObjectURL(newPhoto.url));

  async function handleFile(file) {
    if (!file) return;
    error = '';
    step = 'shrinking';
    try {
      const { blob } = await shrinkPhoto(file);
      if (newPhoto) URL.revokeObjectURL(newPhoto.url);
      newPhoto = { blob, url: URL.createObjectURL(blob) };
      selected = 'camera';
    } catch (err) {
      error = err.message;
    }
    step = 'form';
  }

  function picked(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    input.value = '';
    handleFile(file);
  }

  async function useSample() {
    try {
      await handleFile(await makeSamplePhoto());
    } catch {
      error = "Couldn't make a test photo on this device.";
    }
  }

  // undefined keeps the saved photo; null removes it; otherwise a choice the pot can check.
  function photoChoice() {
    if (selected === null) return pot.finishedPhoto ? null : undefined;
    if (selected === 'camera') return newPhoto ? { blob: newPhoto.blob } : undefined;
    if (selected === 'initial') return { initial: true };
    return { entryId: selected };
  }

  async function save() {
    if (step !== 'form') return;
    error = '';
    step = 'saving';
    try {
      const layers = stackToLayers(stack);
      if (finished) await finishPot(potId, { layers, photo: photoChoice() });
      else await setGlazeLayers(potId, layers);
    } catch (err) {
      error = err.message;
      step = 'form';
      return;
    }
    onclose(finished ? 'Glazes and photo saved ✓' : 'Glazes saved ✓');
  }
</script>

<div class="add sheet" role="dialog" aria-label={finished ? 'Glazes and finished photo' : 'Glazes'}>
  <div class="screen">
    {#if pot === undefined}
      <p class="empty">Loading…</p>
    {:else if pot === null}
      <p class="empty">This pot is no longer here.</p>
      <button class="btn secondary" onclick={() => onclose()}>Close</button>
    {:else}
      <h1>{pot.name || `Pot ${pot.id}`}</h1>
      <p class="sub">{finished ? 'Add its finished photo and the glazes you used. You can skip either and come back.' : 'Which glazes went on? You can skip this and add them later.'}</p>

      {#if error}
        <div class="banner error" role="alert">{error}</div>
      {/if}

      {#if finished}
        <input class="hidden-input" type="file" accept="image/*" capture="environment" bind:this={cameraInput} onchange={picked} tabindex="-1" aria-hidden="true" />
        <input class="hidden-input" type="file" accept="image/*" bind:this={libraryInput} onchange={picked} tabindex="-1" aria-hidden="true" />

        <h2>Finished photo</h2>
        {#if step === 'shrinking'}
          <p class="banner" role="status">Getting the photo ready…</p>
        {:else if selectedUrl}
          <img class="preview" src={selectedUrl} alt="Finished pot" />
        {/if}
        <button class="btn" onclick={() => cameraInput.click()} disabled={step !== 'form'}>📷 Take the finished photo</button>
        <button class="btn secondary small" onclick={() => libraryInput.click()} disabled={step !== 'form'}>Choose from photos</button>
        <button class="link" onclick={useSample}>No camera? Use a test photo</button>

        {#if choices.length}
          <h3>Or pick one of this pot's photos</h3>
          <div class="thumbs" role="radiogroup" aria-label="Finished photo">
            {#each choices as c (c.key)}
              <button class="thumb" class:on={selected === c.key} role="radio" aria-checked={selected === c.key} onclick={() => (selected = c.key)}>
                <img src={c.url} alt="" />
                <span>{c.label}</span>
              </button>
            {/each}
          </div>
        {/if}
        {#if selected !== null}
          <button class="btn secondary small" onclick={() => (selected = null)}>No finished photo</button>
        {/if}
      {/if}

      <GlazePicker {glazes} bind:stack />

      <button class="btn" onclick={save} disabled={step !== 'form'}>{step === 'saving' ? 'Saving…' : '✓ Save'}</button>
      <button class="btn secondary small" onclick={() => onclose()} disabled={step !== 'form'}>Skip for now</button>
    {/if}
  </div>
</div>
