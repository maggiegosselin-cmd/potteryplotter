<script>
  import { liveQuery } from 'dexie';
  import { db, explainStorageError } from '../lib/db.js';
  import { persistence, checkPersistence } from '../lib/persist.js';
  import InstallHelp from './InstallHelp.svelte';

  let { notice = '', onadd } = $props();

  let pots = $state(null); // null until the first read finishes
  let loadError = $state('');

  $effect(() => {
    checkPersistence();
    let urls = [];
    const sub = liveQuery(() => db.pots.orderBy('createdAt').reverse().toArray()).subscribe({
      next(rows) {
        urls.forEach((u) => URL.revokeObjectURL(u));
        urls = [];
        pots = rows.map((pot) => {
          const url = URL.createObjectURL(pot.photo);
          urls.push(url);
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

  const when = (t) =>
    new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
</script>

<main class="screen">
  <h1>My pots</h1>

  {#if notice}
    <div class="banner ok" role="status">{notice}</div>
  {/if}
  {#if loadError}
    <div class="banner error" role="alert">{loadError}</div>
  {/if}
  {#if $persistence === 'denied'}
    <div class="banner" role="status">
      Your phone hasn't promised to keep these pots if it runs low on space. Installing Pot Log to the home screen helps.
    </div>
  {/if}

  <InstallHelp />

  {#if pots === null}
    <p class="empty">Loading…</p>
  {:else if pots.length === 0 && !loadError}
    <p class="empty">No pots yet. Tap the big button to log your first one.</p>
  {:else}
    <ul class="pots">
      {#each pots as pot (pot.id)}
        <li class="pot">
          <img src={pot.url} alt={pot.name || 'Pot photo'} />
          <div>
            <div class="name">{pot.name || `Pot ${pot.id}`}</div>
            <div class="when">{when(pot.createdAt)}</div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<div class="fab-bar">
  <button class="btn" onclick={onadd}>📷 Add a pot</button>
</div>
