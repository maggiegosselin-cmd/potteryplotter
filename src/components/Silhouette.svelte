<script>
  // A thin-lined pot that fills with blue-grey from the bottom as it advances.
  // `form` picks the drawing (see FORMS); an unknown form draws a bowl.
  // To add a form: add an entry here and its name to POT_FORMS in lib/pots.js.
  //   body   closed path(s): filled and outlined
  //   lines  open paths: outlined only (rim, handle)
  //   top / bottom  where the fill starts and ends, in viewBox units
  const FORMS = {
    bowl: {
      body: 'M6 20h52c0 18-10 32-26 32S6 38 6 20zM25 51l-1 7h16l-1-7z',
      lines: ['M6 20q26 7 52 0'],
      top: 20,
      bottom: 58,
    },
    mug: {
      body: 'M10 12h34v34q0 12-12 12H22q-12 0-12-12z',
      lines: ['M44 20h5a7 7 0 0 1 0 14h-5'],
      top: 12,
      bottom: 58,
    },
  };

  let { progress = 0, muted = false, size = 56, form = 'bowl' } = $props();
  const id = `fill-${Math.random().toString(36).slice(2, 8)}`;
  const shape = $derived(FORMS[form] || FORMS.bowl);
  const top = $derived(shape.top + (shape.bottom - shape.top) * (1 - Math.min(1, Math.max(0, progress))));
</script>

<svg class="silhouette" class:muted viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
  <defs>
    <clipPath id={id}><rect x="0" y={top} width="64" height={64 - top} /></clipPath>
  </defs>
  <path d={shape.body} class="empty" />
  <path d={shape.body} class="full" clip-path="url(#{id})" />
  <path d={shape.body} class="line" />
  {#each shape.lines as d}<path {d} class="line" />{/each}
</svg>

<style>
  .empty { fill: var(--sand-light); }
  .full { fill: var(--blue); }
  .line { fill: none; stroke: var(--ink); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  .muted .full { fill: var(--sand-deep); }
  .muted .line { stroke: var(--muted); }
</style>
