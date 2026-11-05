<script>
  // A stage stamp: a double-ring seal in the stage's ink colour.
  // state: 'plain' | 'now' (stamped solid) | 'past' | 'ahead' (faint)
  let { stage, size = 56, state = 'plain' } = $props();

  // A small fixed tilt per stage so the stamps look pressed by hand.
  const tilt = $derived(([...stage.key].reduce((n, c) => n + c.charCodeAt(0), 0) % 7) - 3);
</script>

<span class="seal ink-{stage.ink} {state}" style="--size:{size}px; --tilt:{tilt}deg" aria-hidden="true">
  <span class="glyph">{stage.glyph}</span>
</span>
