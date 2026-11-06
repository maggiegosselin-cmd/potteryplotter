<script>
  import { FORMS, SILHOUETTE } from '../lib/shapes.js';

  // A thin-lined bowl that fills with blue-grey from the bottom as the pot advances.
  let { progress = 0, muted = false, size = 56 } = $props();
  const id = `fill-${Math.random().toString(36).slice(2, 8)}`;
  const outline = FORMS.bowl.body;
  const top = $derived(SILHOUETTE.top + (SILHOUETTE.bottom - SILHOUETTE.top) * (1 - Math.min(1, Math.max(0, progress))));
</script>

<svg class="silhouette" class:muted viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
  <defs>
    <clipPath id={id}><rect x="0" y={top} width="64" height={64 - top} /></clipPath>
  </defs>
  <path d={outline} class="empty" />
  <path d={outline} class="full" clip-path="url(#{id})" />
  <path d={outline} class="line" />
  <path d={FORMS.bowl.rim} class="line rim" />
</svg>

<style>
  .empty { fill: var(--cream); }
  .full { fill: var(--blue-grey); }
  .line { fill: none; stroke: var(--ink); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .rim { stroke-width: 1.5; }
  .muted .full { fill: var(--muted-fill); }
  .muted .line { stroke: var(--ink-soft); }
</style>
