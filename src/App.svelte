<script>
  import { liveQuery } from 'dexie';
  import { db } from './lib/db.js';
  import { DEFAULT_STAGES } from './lib/stages.js';
  import PotList from './components/PotList.svelte';
  import PotScreen from './components/PotScreen.svelte';
  import AddPot from './components/AddPot.svelte';

  let adding = $state(false);
  let notice = $state('');
  let stages = $state(DEFAULT_STAGES); // replaced by the stored list as soon as it is read
  let route = $state(readRoute());

  // The pot screen lives at #/pot/<id>, so the phone's back button returns to the list.
  function readRoute() {
    const m = /^#\/pot\/(\d+)$/.exec(window.location.hash);
    return m ? { pot: Number(m[1]) } : { pot: null };
  }

  $effect(() => {
    const onHash = () => {
      route = readRoute();
      notice = '';
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    const sub = liveQuery(() => db.stages.orderBy('order').toArray()).subscribe({
      next(rows) {
        if (rows.length) stages = rows;
      },
      error() {
        /* the built-in list keeps the app usable; the lists show the storage problem */
      },
    });
    return () => {
      window.removeEventListener('hashchange', onHash);
      sub.unsubscribe();
    };
  });

  function saved() {
    adding = false;
    notice = 'Pot saved ✓';
  }
</script>

{#if route.pot !== null}
  <PotScreen id={route.pot} {stages} onback={() => (window.location.hash = '')} />
{:else}
  <PotList {stages} {notice} onadd={() => { notice = ''; adding = true; }} />
{/if}

{#if adding}
  <AddPot {stages} onsaved={saved} oncancel={() => (adding = false)} />
{/if}
