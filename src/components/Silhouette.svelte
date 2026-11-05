<script>
  // A pot outline that fills with clay colour from the bottom as it advances.
  let { progress = 0, muted = false, size = 56 } = $props();
  const id = `fill-${Math.random().toString(36).slice(2, 8)}`;
  const outline = 'M22 6h20v8c0 4 12 8 12 24 0 14-8 20-22 20S10 52 10 38c0-16 12-20 12-24z';
  const top = $derived(6 + 52 * (1 - Math.min(1, Math.max(0, progress))));
</script>

<svg class="silhouette" class:muted viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
  <defs>
    <clipPath id={id}><rect x="0" y={top} width="64" height={64 - top} /></clipPath>
  </defs>
  <path d={outline} class="empty" />
  <path d={outline} class="full" clip-path="url(#{id})" />
  <path d={outline} class="line" />
</svg>

<style>
  .empty { fill: #eadbc3; }
  .full { fill: var(--clay); }
  .line { fill: none; stroke: var(--clay-dark); stroke-width: 2; stroke-linejoin: round; }
  .muted .full { fill: #9a8c80; }
  .muted .line { stroke: #6b5b50; }
</style>
