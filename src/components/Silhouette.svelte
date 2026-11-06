<script>
  import { BOX, fillTop, formOf } from '../lib/forms.js';

  // A thin-lined pot that fills with blue-grey from the bottom as it advances. The form
  // (bowl or mug) comes from the pot's id; `form` overrides it, for the illustration.
  let { progress = 0, muted = false, size = 56, potId = '', form: given = null } = $props();
  const id = `fill-${Math.random().toString(36).slice(2, 8)}`;
  const form = $derived(given ?? formOf(potId));
  const top = $derived(fillTop(form, progress));
</script>

<svg class="silhouette" class:muted viewBox="0 0 {BOX} {BOX}" width={size} height={size} aria-hidden="true">
  <defs>
    <clipPath id={id}><rect x="0" y={top} width={BOX} height={BOX - top} /></clipPath>
  </defs>
  <path d={form.outline} class="empty" />
  <path d={form.outline} class="full" clip-path="url(#{id})" />
  <path d={form.outline} class="line" />
  {#each form.details as d}<path {d} class="line detail" />{/each}
</svg>

<style>
  .empty { fill: var(--cream); }
  .full { fill: var(--blue-grey); }
  .line { fill: none; stroke: var(--ink); stroke-width: 2px; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  .detail { stroke-width: 1.5px; }
  .muted .full { fill: var(--sand-deep); }
  .muted .line { stroke: var(--ink-soft); }
</style>
