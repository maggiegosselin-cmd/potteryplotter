<script>
  import { bowlPath, rimLinePath, mugPath } from '../lib/shapes.js';

  // The potter's table in thin ink lines: stacked bowls, one cream bowl and two
  // leaning mugs. With `image`, a picture dropped in at public/pots-illustration.png
  // takes its place; until that file exists (or if it fails to load) the drawing shows.
  // The box has a fixed height, so nothing moves when the picture arrives or fails.
  let { height = 120, image = false } = $props();

  const IMAGE = '/pots-illustration.png';
  let hasImage = $state(image);

  const stack = [
    { cx: 38, rim: 90, a: 28, depth: 14, foot: 12, footH: 4, tone: 'sand' },
    { cx: 38, rim: 79, a: 27, depth: 11, foot: 12, footH: 0, tone: 'blue' },
    { cx: 38, rim: 68, a: 26, depth: 11, foot: 12, footH: 0, tone: 'cream' },
  ].map((b) => ({ ...b, d: bowlPath(b), rimLine: rimLinePath({ ...b, lip: 4 }) }));

  const cream = { cx: 98, rim: 84, a: 28, depth: 20, foot: 12, footH: 4 };
  const creamBowl = bowlPath(cream);
  const creamRim = rimLinePath({ ...cream, lip: 5 });
  const creamBand = rimLinePath({ ...cream, a: cream.a - 1, lip: 12 });

  const mugs = [
    { ...mugPath({ x: 146, base: 108, w: 28, h: 44, handle: 'left' }), tone: 'blue', turn: 7, pivot: 160 },
    { ...mugPath({ x: 178, base: 108, w: 26, h: 36, handle: 'right' }), tone: 'sand', turn: -7, pivot: 191 },
  ];
</script>

<div class="art" style:height="{height}px" aria-hidden="true">
  {#if hasImage}
    <img src={IMAGE} alt="" onerror={() => (hasImage = false)} />
  {:else}
    <svg viewBox="0 0 240 120" focusable="false">
      <path d="M6 108.5H234" class="line" />
      {#each stack as b}
        <path d={b.d} class="line {b.tone}" />
        <path d={b.rimLine} class="line thin" />
      {/each}
      <path d={creamBowl} class="line cream" />
      <path d={creamRim} class="line thin" />
      <path d={creamBand} class="line band" />
      {#each mugs as m}
        <g transform="rotate({m.turn} {m.pivot} 108)">
          <path d={m.grip} class="line" />
          <path d={m.body} class="line {m.tone}" />
        </g>
      {/each}
    </svg>
  {/if}
</div>

<style>
  .art { display: flex; justify-content: center; margin: 0 auto 8px; }
  svg, img { height: 100%; width: auto; max-width: 100%; }
  img { object-fit: contain; }
  .line { fill: none; stroke: var(--ink); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .thin { stroke-width: 1.5; }
  .band { stroke: var(--blue-grey); }
  .cream { fill: var(--cream); }
  .sand { fill: var(--sand); }
  .blue { fill: var(--blue-grey); }
</style>
