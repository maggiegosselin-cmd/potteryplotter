// A Svelte action for a card that can be swiped sideways or long-pressed,
// using pointer events (one code path for finger, pen and mouse).
// The card keeps `touch-action: pan-y`, so vertical scrolling still works.
//
// options: { enabled, onswipe(), onlongpress(), onmove?(dx), sideways? }
// `sideways: false` drops the swipe: a sideways drag just cancels the long press.
// A tap is left to the normal click event; `swallowClick` tells the click
// handler to ignore the click that follows a swipe or long press.
export const SWIPE_MIN_PX = 110; // wide, so a clumsy drag does not move a pot
export const SWIPE_FRACTION = 0.35;
const LONG_PRESS_MS = 550;
const SLOP_PX = 10;

export function swipeThreshold(width) {
  return Math.max(SWIPE_MIN_PX, width * SWIPE_FRACTION);
}

export function swipe(node, options) {
  let opts = options;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let timer = 0;
  let tracking = false;
  let dragging = false;
  let suppress = false;

  const clear = () => {
    clearTimeout(timer);
    timer = 0;
  };

  function reset(animate) {
    node.style.transition = animate ? 'transform .2s ease' : '';
    node.style.transform = '';
    node.style.removeProperty('--drag');
    opts.onmove?.(0);
  }

  function down(e) {
    if (!opts.enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    tracking = true;
    dragging = false;
    suppress = false;
    dx = 0;
    startX = e.clientX;
    startY = e.clientY;
    node.style.transition = '';
    timer = setTimeout(() => {
      timer = 0;
      if (!tracking || dragging) return;
      tracking = false;
      suppress = true;
      opts.onlongpress?.();
    }, LONG_PRESS_MS);
  }

  function move(e) {
    if (!tracking) return;
    const mx = e.clientX - startX;
    const my = e.clientY - startY;
    if (!dragging) {
      if (Math.abs(my) > SLOP_PX && Math.abs(my) > Math.abs(mx)) {
        tracking = false; // the potter is scrolling
        clear();
        return;
      }
      if (Math.abs(mx) <= SLOP_PX) return;
      if (opts.sideways === false) {
        tracking = false;
        suppress = true; // a sideways drag is not a tap
        clear();
        return;
      }
      dragging = true;
      clear();
      node.setPointerCapture?.(e.pointerId);
    }
    dx = mx;
    node.style.transform = `translateX(${dx}px)`;
    opts.onmove?.(Math.min(1, Math.abs(dx) / swipeThreshold(node.offsetWidth)));
  }

  function up() {
    clear();
    if (!tracking) return;
    tracking = false;
    if (!dragging) return;
    suppress = true;
    if (Math.abs(dx) >= swipeThreshold(node.offsetWidth)) {
      reset(true);
      opts.onswipe?.();
    } else {
      reset(true);
    }
  }

  function cancel() {
    clear();
    if (tracking && dragging) reset(true);
    tracking = false;
  }

  // Capture phase: runs before the card's own click handler.
  function click(e) {
    if (suppress) {
      suppress = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('click', click, true);
  node.addEventListener('contextmenu', (e) => opts.enabled && e.preventDefault());

  return {
    update(next) {
      opts = next;
    },
    destroy() {
      clear();
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('click', click, true);
    },
  };
}
