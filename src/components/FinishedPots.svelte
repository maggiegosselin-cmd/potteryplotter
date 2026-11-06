<script>
  import { liveQuery } from 'dexie';
  import { db, explainStorageError } from '../lib/db.js';
  import { finishGaps, finishedPots, isIncomplete, potsWithGlaze, stageMap } from '../lib/pots.js';
  import { layersToStack, nameLookup } from '../lib/glazes.js';
  import Silhouette from './Silhouette.svelte';
  import Illustration from './Illustration.svelte';

  // Finished pots (Finished, and Finished with a flaw) as a two-column photo grid
  // with glaze captions. Pots missing a finished photo or a glaze come first and
  // say what is missing. Tapping a glaze name shows only pots with it in any layer.
  let { stages, glazes, onopen, onback } = $props();

  const map = $derived(stageMap(stages));
  const nameOf = $derived(nameLookup(glazes));
  let pots = $state(null); // null until the first read finishes
  let loadError = $state('');
  let glazeId = $state(null); // the glaze the grid is filtered to

  $effect(() => {
    let urls = [];
    const sub = liveQuery(() => db.pots.toArray()).subscribe({
      next(rows) {
        urls.forEach((u) => URL.revokeObjectURL(u));
        urls = [];
        pots = rows.map((pot) => {
          const url = pot.finishedPhoto ? URL.createObjectURL(pot.finishedPhoto) : '';
          if (url) urls.push(url);
          return { ...pot, url };
        });
        loadError = '';
      },
      error(err) {
        loadError = explainStorageError(err).message;
        pots = [];
      },
    });
    return () => {
      sub.unsubscribe();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  });

  const finished = $derived(finishedPots(pots || [], stages));
  const incomplete = $derived(finished.filter(isIncomplete).length);
  const filter = $derived(glazes.find((g) => g.id === glazeId) || null);
  const shown = $derived(filter ? potsWithGlaze(finished, filter.id) : finished);

  const title = (pot) => pot.name || `Pot ${pot.id}`;
  const glazesOf = (pot) => layersToStack(pot.glazeLayers).map((l) => ({ id: l.glazeId, name: nameOf(l.glazeId) }));
</script>

<div class="add" role="dialog" aria-label="Finished pots">
  <div class="screen">
    <button class="btn secondary small" onclick={onback}>← My pots</button>
    <h1>Finished pots</h1>

    {#if loadError}
      <div class="banner error" role="alert">{loadError}</div>
    {/if}

    {#if pots === null}
      <p class="empty">Loading…</p>
    {:else if finished.length === 0}
      <Illustration />
      <p class="empty">No finished pots yet. When a pot is finished, its photo and glazes show up here.</p>
    {:else}
      <p class="sub">
        {#if incomplete}
          {incomplete} of {finished.length} {incomplete === 1 ? 'is' : 'are'} missing a finished photo or a glaze, shown first. Tap a glaze name to see every pot with it.
        {:else}
          All {finished.length} have a finished photo and a glaze. Tap a glaze name to see every pot with it.
        {/if}
      </p>

      {#if filter}
        <div class="banner filter-note" role="status">
          <span>Pots with {filter.name} in any layer: {shown.length}</span>
          <button class="chip on" onclick={() => (glazeId = null)}>Show all ✕</button>
        </div>
      {/if}

      <ul class="grid">
        {#each shown as pot (pot.id)}
          {@const gaps = finishGaps(pot)}
          <li class="tile" class:incomplete={gaps.photo || gaps.glaze}>
            <button class="tile-open" onclick={() => onopen(pot.id)} aria-label="Open {title(pot)}">
              <span class="tile-photo" class:placeholder={!pot.url}>
                {#if pot.url}
                  <img src={pot.url} alt="Finished {title(pot)}" loading="lazy" />
                {:else}
                  <Silhouette potId={pot.id} progress={1} size={72} muted />
                  <span class="flag">No finished photo</span>
                {/if}
              </span>
            </button>
            <div class="tile-cap">
              <div class="name">{title(pot)}</div>
              {#if map.get(pot.stage)?.kind === 'end'}<div class="when">{map.get(pot.stage).label}</div>{/if}
              {#if gaps.glaze}
                <div class="flag">No glaze recorded</div>
              {:else}
                <div class="glaze-cap">
                  {#each glazesOf(pot) as g, i}{#if i > 0}<span class="over"> over </span>{/if}<button class="glaze-name" onclick={() => (glazeId = g.id)}>{g.name}</button>{/each}
                </div>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
