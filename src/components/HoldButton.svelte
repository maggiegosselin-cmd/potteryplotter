<script>
  // A button that acts only after a half-second hold, so a clay-covered finger brushing it
  // does nothing. A ring fills while holding; sliding off the button, or letting go early,
  // cancels. A keyboard or screen-reader activation acts at once.
  let { onhold, onearly, holdMs = 500, disabled = false, label = '', round = false, class: cls = '', children } = $props();

  let holding = $state(false);
  let timer = null;
  let el;

  function start(event) {
    if (disabled || holding || event.button > 0) return;
    holding = true;
    timer = setTimeout(() => {
      timer = null;
      holding = false;
      if (navigator.vibrate) navigator.vibrate(30);
      onhold();
    }, holdMs);
  }

  function cancel() {
    if (timer) clearTimeout(timer);
    timer = null;
    holding = false;
  }

  function release() {
    const early = holding;
    cancel();
    if (early && onearly) onearly();
  }

  function slide(event) {
    if (!holding) return;
    const r = el.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) cancel();
  }

  // Keyboard and screen-reader activation arrive as a click with no pointer (detail 0): act at once.
  function activate(event) {
    if (disabled || event.detail !== 0) return;
    onhold();
  }
</script>

<button
  bind:this={el}
  type="button"
  class="hold {cls}"
  class:holding
  class:round
  style="--hold-ms:{holdMs}ms"
  aria-label={label || undefined}
  {disabled}
  onpointerdown={start}
  onpointerup={release}
  onpointercancel={cancel}
  onpointermove={slide}
  onclick={activate}
  oncontextmenu={(e) => e.preventDefault()}
>
  <svg class="ring" viewBox="0 0 40 40" aria-hidden="true">
    <circle class="ring-bed" cx="20" cy="20" r="16" />
    <circle class="ring-fill" cx="20" cy="20" r="16" pathLength="100" />
  </svg>
  {@render children?.()}
</button>
