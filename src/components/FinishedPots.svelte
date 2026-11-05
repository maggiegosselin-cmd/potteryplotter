<script>
  import { liveQuery } from 'dexie';
  import { db, explainStorageError } from '../lib/db.js';
  import { finishedView, gapsText } from '../lib/pots.js';
  import { glazeLine } from '../lib/glaze.js';
  import Silhouette from './Silhouette.svelte';

  let { stages, onback, onopen } = $props();

  let pots = $state(null); // null until the first read finishes
  let loadError = $state('');
  let filter = $state('all'); // all | glaze | photo | complete
  let query = $state('');

  $effect(() => {
    let urls = [];
    const sub = liveQuery(() => db.pots.toArray()).subscribe({
      next(rows) {
        urls.forEach((u) => URL.revokeObjectURL(u));
        urls = [];
        // Only the finished photo is shown here, so a pot without one reads as missing it.
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

  const view = $derived(finishedView(pots || [], { filter, query }));
  const chips = $derived([
    { id: 'all', label: 'All', n: view.counts.all },
    { id: 'glaze', label: 'No glaze', n: view.counts.glaze },
    { id: 'photo', label: 'No photo', n: view.counts.photo },
    { id: 'complete', label: 'Complete', n: view.counts.complete },
  ]);
  const label = (stageId) => stages.find((s) => s.id === stageId)?.label ?? stageId;
</script>

<div class="add" role="dialog" aria-label="Finished pots">
  <div class="screen">
    <button class="btn secondary small" onclick={onback}>← My pots</button>
    <h1>Finished pots</h1>
    <p class="sub">Pots with a gap in their record come first.</p>

    {#if loadError}
      <div class="banner error" role="alert">{loadError}</div>
    {/if}

    {#if pots === null}
      <p class="empty">Loading…</p>
    {:else if view.counts.all === 0}
      <p class="empty">No finished pots yet. Pots that are Finished, or Finished with a flaw, are listed here.</p>
    {:else}
      <input class="search" type="search" placeholder="Search by glaze name" aria-label="Search by glaze" autocomplete="off" bind:value={query} />

      <div class="chips" role="group" aria-label="Show">
        {#each chips as c (c.id)}
          <button class="chip" class:on={filter === c.id} aria-pressed={filter === c.id} onclick={() => (filter = c.id)}>{c.label} {c.n}</button>
        {/each}
      </div>

      {#if view.rows.length === 0}
        <p class="empty">No finished pots match{query.trim() ? ` “${query.trim()}”` : ' this filter'}.</p>
      {/if}

      <ul class="rows">
        {#each view.rows as row (row.pot.id)}
          <li>
            <button class="row" class:incomplete={row.incomplete} onclick={() => onopen(row.pot.id)}>
              <span class="thumb" class:placeholder={!row.pot.url}>
                {#if row.pot.url}
                  <img src={row.pot.url} alt="" loading="lazy" />
                {:else}
                  <Silhouette progress={1} size={32} muted />
                {/if}
              </span>
              <span class="body">
                <span class="name">{row.pot.name || `Pot ${row.pot.id}`}</span>
                <span class="glaze" class:missing={row.gaps.glaze}>{row.gaps.glaze ? 'No glaze recorded' : glazeLine(row.pot.glazeLayers)}</span>
                <span class="when">{label(row.pot.stage)}</span>
              </span>
              {#if row.incomplete}
                <span class="flag" aria-label="Missing {gapsText(row.gaps)}">Needs {gapsText(row.gaps)}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
