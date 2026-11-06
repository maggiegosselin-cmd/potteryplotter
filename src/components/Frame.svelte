<script>
  import { framePath } from '../lib/drawn.js';

  // A drawn ink frame, used as the background of its parent (which must be `.framed`).
  // It is taken out of the flow, so the parent keeps its padding and min-height. The drawing
  // stretches to the parent (preserveAspectRatio none) while the stroke stays `weight` px wide.
  // `aspect` is the parent's usual width / height, so the corners look round; `seed` gives each
  // frame its own slightly uneven hand. The fill is the parent's --frame-fill.
  let { seed = 'frame', weight = 2, aspect = 3 } = $props();
  const width = $derived(Math.round(aspect * 100));
  const d = $derived(framePath(seed, width, 100));
</script>

<svg class="frame" style:--frame-w="{weight}px" viewBox="0 0 {width} 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path {d} />
</svg>

<style>
  .frame {
    position: absolute; z-index: -1; pointer-events: none; overflow: visible;
    inset: calc(var(--frame-w) / 2); width: calc(100% - var(--frame-w)); height: calc(100% - var(--frame-w));
  }
  path {
    fill: var(--frame-fill, var(--cream)); stroke: var(--ink); stroke-width: var(--frame-w);
    stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke;
  }
</style>
