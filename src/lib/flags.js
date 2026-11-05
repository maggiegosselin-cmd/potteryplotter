// The gentle order-skip note: pure checks, plus the on/off switch kept on this
// phone. Nothing here blocks a move; App.svelte shows the result beside the undo bar.
import { SKIP_RULES } from './stages.js';

const KEY = 'pot-log:skip-notes';

/**
 * The rules a move to `to` breaks for this pot. A rule whose needed stage is
 * hidden (or gone) is not checked: the potter has turned that step off.
 */
export function skippedSteps(pot, to, stages) {
  const byId = new Map(stages.map((s) => [s.id, s]));
  return SKIP_RULES.filter((rule) => {
    if (rule.to !== to) return false;
    const needed = byId.get(rule.needs);
    if (!needed || needed.hidden) return false;
    return !pot.history.some((e) => e.stage === rule.needs);
  });
}

/** One quiet sentence per rule, using the stage names as the potter has them now. */
export function flagText(items, stages) {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const counts = new Map();
  for (const { pot, to } of items) {
    for (const rule of skippedSteps(pot, to, stages)) counts.set(rule, (counts.get(rule) || 0) + 1);
  }
  return [...counts]
    .map(([rule, n]) => {
      const needs = byId.get(rule.needs).label;
      const to = byId.get(rule.to).label;
      return n === 1 ? `${needs} was skipped before ${to}.` : `${needs} was skipped for ${n} pots before ${to}.`;
    })
    .join(' ');
}

export function flagsOn() {
  try {
    return globalThis.localStorage?.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setFlagsOn(on) {
  try {
    globalThis.localStorage?.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* the switch then lasts until the page is closed */
  }
}
