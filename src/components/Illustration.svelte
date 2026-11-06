<script>
  // The pottery line drawing for the My pots header, empty states and install guide.
  // Vite bundles whichever image is present at build time: the owner's own drawing if
  // src/assets/owner-illustration.(png|jpg|jpeg|webp|svg) exists, otherwise the redrawn
  // SVG. Either way the file is emitted and precached, so there is nothing to check at runtime.
  import fallback from '../assets/pottery-line.svg';

  const owned = import.meta.glob('../assets/owner-illustration.{png,jpg,jpeg,webp,svg}', { eager: true, query: '?url', import: 'default' });
  const src = Object.values(owned)[0] ?? fallback;

  // 160 x 96 is the drawing's own size, where its lines are 2px.
  let { width = 160 } = $props();
</script>

<img class="illustration" {src} alt="" {width} height={Math.round(width * 0.6)} draggable="false" />
