// A Svelte action for a list whose rows are reordered by dragging a handle, using
// pointer events (one code path for finger, pen and mouse). Put it on the <ul>;
// a row's handle is any element inside the <li> marked `data-handle`, which should
// have `touch-action: none` so the page does not scroll while it is dragged.
//
// options: { onreorder(from, to) } — called once, on release, with row positions.
import { dropIndex } from './glazes.js';

export function reorder(node, options) {
  let opts = options;
  let drag = null;

  function finish(apply) {
    if (!drag) return;
    const { item, items, from, to, handle, id } = drag;
    drag = null;
    item.style.transform = '';
    item.classList.remove('dragging');
    items.forEach((el) => el.classList.remove('drop-here'));
    if (handle.hasPointerCapture?.(id)) handle.releasePointerCapture(id);
    if (apply && to !== from) opts.onreorder?.(from, to);
  }

  function down(e) {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const handle = e.target.closest?.('[data-handle]');
    if (!handle || !node.contains(handle)) return;
    const items = [...node.children];
    const item = items.find((el) => el.contains(handle));
    if (!item) return;
    const from = items.indexOf(item);
    drag = {
      item, items, from, to: from, handle, id: e.pointerId, startY: e.clientY,
      centers: items.map((el) => el.offsetTop + el.offsetHeight / 2),
    };
    handle.setPointerCapture?.(e.pointerId);
    item.classList.add('dragging');
    e.preventDefault();
  }

  function move(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.startY;
    drag.item.style.transform = `translateY(${dy}px)`;
    drag.to = dropIndex(drag.centers, drag.centers[drag.from] + dy);
    drag.items.forEach((el, i) => el.classList.toggle('drop-here', i === drag.to && i !== drag.from));
  }

  const up = (e) => drag && e.pointerId === drag.id && finish(true);
  const cancel = () => finish(false);

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', cancel);

  return {
    update(next) {
      opts = next;
    },
    destroy() {
      finish(false);
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cancel);
    },
  };
}
