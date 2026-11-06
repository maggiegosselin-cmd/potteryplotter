<script>
  import Silhouette from './Silhouette.svelte';
  import { FORMS } from '../lib/forms.js';

  // The thin-lined picture of pots on a shelf: My pots, its empty states and the install guide.
  // The owner's own drawing is read from ILLUSTRATION_SRC (a file in public/, so it is bundled and
  // precached with the app). Until it loads, or if there is no file, the drawn shelf below shows.
  // `variant` is 'banner' (large) or 'small'.
  let { variant = 'banner' } = $props();
  const ILLUSTRATION_SRC = '/art/pots.png';
  const shelf = [
    { form: FORMS[1], progress: 1 },
    { form: FORMS[0], progress: 0.6 },
    { form: FORMS[0], progress: 1 },
    { form: FORMS[1], progress: 0.3 },
  ];
  let loaded = $state(false);
</script>

<div class="illustration {variant}" aria-hidden="true">
  <div class="shelf" class:covered={loaded}>
    {#each shelf as pot}<Silhouette form={pot.form} progress={pot.progress} size={variant === 'small' ? 56 : 80} />{/each}
  </div>
  <img src={ILLUSTRATION_SRC} alt="" class:loaded onload={() => (loaded = true)} onerror={() => (loaded = false)} />
</div>

<style>
  .illustration { position: relative; margin: 4px 0 12px; }
  .shelf {
    display: flex; align-items: flex-end; justify-content: space-around; padding: 0 12px;
    border-bottom: 3px solid var(--ink); border-radius: 2px 6px 3px 5px / 3px 2px 4px 2px;
  }
  .shelf.covered { visibility: hidden; }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; }
  img.loaded { opacity: 1; }
</style>
