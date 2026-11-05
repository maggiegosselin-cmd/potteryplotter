<script>
  import PotList from './components/PotList.svelte';
  import AddPot from './components/AddPot.svelte';

  let adding = $state(false);
  let notice = $state('');

  function saved() {
    adding = false;
    notice = 'Pot saved ✓';
  }
</script>

<PotList {notice} onadd={() => { notice = ''; adding = true; }} />

{#if adding}
  <AddPot onsaved={saved} oncancel={() => (adding = false)} />
{/if}
