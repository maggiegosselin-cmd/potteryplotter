<script>
  import { addGlaze, renameGlaze, removeGlaze } from '../lib/db.js';
  import { COVERAGES, METHODS, glazeLine, moveItem, nameLookup, sortShelf, stackToLayers } from '../lib/glazes.js';
  import { newId } from '../lib/pots.js';
  import { reorder } from '../lib/reorder.js';

  // The potter's glaze shelf as big chips, and the pot's layers as cards.
  // `stack` is the editor order, top coat first (the way "A over B" reads); each
  // item is { key, glazeId, coverage, method }. The shelf is the potter's own: it
  // starts empty and glazes are added and removed here.
  let { glazes, stack = $bindable([]) } = $props();

  let newName = $state('');
  let error = $state('');
  let tidy = $state(false);

  const nameOf = $derived(nameLookup(glazes));
  const shelf = $derived(sortShelf(glazes));
  const line = $derived(glazeLine(stackToLayers(stack), nameOf));

  function addLayer(glazeId) {
    error = '';
    stack = [{ key: newId(), glazeId, coverage: '', method: '' }, ...stack];
  }

  function removeLayer(i) {
    stack = stack.filter((_, at) => at !== i);
  }

  function shift(i, by) {
    stack = moveItem(stack, i, i + by);
  }

  async function addNew() {
    error = '';
    try {
      const glaze = await addGlaze(newName);
      newName = '';
      addLayer(glaze.id);
    } catch (err) {
      error = err.message;
    }
  }

  async function rename(glaze, event) {
    const input = event.currentTarget;
    error = '';
    try {
      await renameGlaze(glaze.id, input.value);
    } catch (err) {
      error = err.message;
      input.value = glaze.name;
    }
  }

  async function remove(glaze) {
    error = '';
    if (stack.some((l) => l.glazeId === glaze.id)) {
      error = `${glaze.name} is in this pot's layers. Remove that layer first.`;
      return;
    }
    try {
      await removeGlaze(glaze.id);
    } catch (err) {
      error = err.message;
    }
  }

  function position(i, n) {
    if (n === 1) return '';
    if (i === 0) return 'Top coat';
    return i === n - 1 ? 'First coat' : 'Between';
  }
</script>

<section class="picker" aria-label="Glaze layers">
  <h2>Glazes</h2>
  <p class="glaze-line" aria-live="polite">{line || 'No glaze yet. Tap one below, or skip this.'}</p>

  {#if stack.length}
    <ul class="layers" use:reorder={{ onreorder: (from, to) => (stack = moveItem(stack, from, to)) }}>
      {#each stack as layer, i (layer.key)}
        <li class="layer">
          <div class="layer-head">
            <span class="grip" data-handle role="img" aria-label="Drag to change the order">⠿</span>
            <div class="layer-title">
              <span class="layer-name">{nameOf(layer.glazeId)}</span>
              {#if stack.length > 1}<small>{position(i, stack.length)}</small>{/if}
            </div>
            <button class="mini" disabled={i === 0} onclick={() => shift(i, -1)} aria-label="Move {nameOf(layer.glazeId)} up">▲</button>
            <button class="mini" disabled={i === stack.length - 1} onclick={() => shift(i, 1)} aria-label="Move {nameOf(layer.glazeId)} down">▼</button>
            <button class="mini" onclick={() => removeLayer(i)} aria-label="Remove {nameOf(layer.glazeId)} layer">✕</button>
          </div>
          <div class="layer-opts">
            <select bind:value={layer.coverage} aria-label="Where {nameOf(layer.glazeId)} goes">
              <option value="">Where? (optional)</option>
              {#each COVERAGES as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
            </select>
            <select bind:value={layer.method} aria-label="How {nameOf(layer.glazeId)} was applied">
              <option value="">How? (optional)</option>
              {#each METHODS as m (m.id)}<option value={m.id}>{m.label}</option>{/each}
            </select>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <h3>Your glaze shelf</h3>
  {#if !shelf.length}
    <p class="hint">Your shelf is empty. Add the glazes you use once; they stay here for every pot.</p>
  {:else if !tidy}
    <p class="hint">Tap a glaze to put it on the pot. Each new one goes on top.</p>
  {/if}

  <div class="shelf" role="group" aria-label="Glaze shelf">
    {#each shelf as glaze (glaze.id)}
      {#if tidy}
        <div class="shelf-edit">
          <input type="text" value={glaze.name} aria-label="Rename {glaze.name}" onchange={(e) => rename(glaze, e)} autocomplete="off" />
          <button class="mini" onclick={() => remove(glaze)} aria-label="Remove {glaze.name} from the shelf">✕</button>
        </div>
      {:else}
        <button class="glaze-chip" onclick={() => addLayer(glaze.id)}>{glaze.name}</button>
      {/if}
    {/each}
  </div>

  {#if error}
    <div class="banner error" role="alert">{error}</div>
  {/if}

  <div class="add-glaze">
    <input
      type="text"
      placeholder="Add a glaze"
      aria-label="Add a glaze"
      bind:value={newName}
      onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addNew())}
      autocomplete="off"
    />
    <button class="btn small" onclick={addNew}>Add</button>
  </div>

  {#if shelf.length}
    <button class="link center" onclick={() => (tidy = !tidy)}>{tidy ? 'Done tidying the shelf' : 'Rename or remove glazes'}</button>
  {/if}
</section>
