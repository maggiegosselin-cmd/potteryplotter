// A Svelte action for a wide drag handle that reorders the rows of a list, using
// pointer events like swipe.js (one code path for finger, pen and mouse).
// Only the handle has `touch-action: none`, so the rest of the row still scrolls.
//
// options: { enabled, rows(handle), maxGap?, onstart?(), onmove?(gap), ondrop?(gap), oncancel?() }
//   rows(handle)  the row elements of the list, in order (the handle's own row included)
//   gap      0..rows.length: the drop line sits before row `gap` (n = after the last)
// While the finger is within EDGE_PX of the top or bottom of the scrolling parent,
// the list scrolls on its own, faster the nearer the edge.
export const EDGE_PX = 90;
export const MAX_SCROLL = 18; // pixels per frame

/** The gap a pointer at `y` is over, given each row's {top, bottom}. */
export function dropGap(rects, y, maxGap = rects.length) {
  let gap = rects.length;
  for (let i = 0; i < rects.length; i++) {
    if (y < (rects[i].top + rects[i].bottom) / 2) {
      gap = i;
      break;
    }
  }
  return Math.min(gap, maxGap);
}

/** Pixels to scroll this frame: negative up, positive down, 0 away from the edges. */
export function edgeScroll(y, top, bottom, zone = EDGE_PX, max = MAX_SCROLL) {
  if (y < top + zone) return -Math.round(max * Math.min(1, (top + zone - y) / zone));
  if (y > bottom - zone) return Math.round(max * Math.min(1, (y - (bottom - zone)) / zone));
  return 0;
}

function scrollParent(node) {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return el;
  }
  return document.scrollingElement || document.documentElement;
}

export function dragRows(node, options) {
  let opts = options;
  let active = false;
  let y = 0;
  let gap = -1;
  let frame = 0;
  let scroller = null;

  function update() {
    const rects = opts.rows(node).map((el) => el.getBoundingClientRect());
    const next = dropGap(rects, y, opts.maxGap ?? rects.length);
    if (next !== gap) {
      gap = next;
      opts.onmove?.(gap);
    }
  }

  function tick() {
    if (!active) return;
    const box = scroller === document.scrollingElement ? { top: 0, bottom: innerHeight } : scroller.getBoundingClientRect();
    const dy = edgeScroll(y, box.top, box.bottom);
    if (dy) {
      scroller.scrollBy(0, dy);
      update();
    }
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    active = false;
    cancelAnimationFrame(frame);
    gap = -1;
  }

  function down(e) {
    if (!opts.enabled || active || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    active = true;
    y = e.clientY;
    scroller = scrollParent(node);
    node.setPointerCapture?.(e.pointerId);
    opts.onstart?.();
    update();
    frame = requestAnimationFrame(tick);
  }

  function move(e) {
    if (!active) return;
    y = e.clientY;
    update();
  }

  function up() {
    if (!active) return;
    const drop = gap;
    stop();
    opts.ondrop?.(drop);
  }

  function cancel() {
    if (!active) return;
    stop();
    opts.oncancel?.();
  }

  node.style.touchAction = 'none';
  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', cancel);

  return {
    update(next) {
      opts = next;
    },
    destroy() {
      stop();
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cancel);
    },
  };
}
