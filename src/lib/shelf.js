// Pure grouping and ordering for the shelf walk. Everything is derived from the
// pots and stages at display time; nothing here is saved.
import { DAY, isDone, nextStageId, stageMap } from './pots.js';
import { HANDED_IN_STAGES, LONG_WAIT_FACTOR, TYPICAL_DAYS } from './stages.js';

/** Whole days a pot has been in its stage, or null when the date is missing. */
export function waitDays(pot, now = Date.now()) {
  return Number.isFinite(pot.stageSince) ? Math.max(0, Math.floor((now - pot.stageSince) / DAY)) : null;
}

/** True when a pot has waited well above its stage's typical time. */
export function waitedLong(pot, now = Date.now(), typical = TYPICAL_DAYS, factor = LONG_WAIT_FACTOR) {
  const days = waitDays(pot, now);
  const usual = typical[pot.stage];
  return days !== null && usual > 0 && days >= usual * factor;
}

// Longest wait first (earliest stageSince). A pot with no date goes last; ties
// fall back to the older pot, then the lower id, so the order never jumps.
function byLongestWait(a, b) {
  const sa = Number.isFinite(a.stageSince) ? a.stageSince : Infinity;
  const sb = Number.isFinite(b.stageSince) ? b.stageSince : Infinity;
  if (sa !== sb) return sa < sb ? -1 : 1;
  return (a.createdAt || 0) - (b.createdAt || 0) || (a.id || 0) - (b.id || 0);
}

export const sortLongestWaiting = (pots) => [...pots].sort(byLongestWait);

/**
 * Splits pots for the shelf walk:
 *   strip:    pots with staff or in a kiln stage, longest wait first
 *   sections: [{ stage, pots }] for the other path stages in stage order,
 *             longest wait first, empty stages left out
 *   ended:    finished pots and every end state, by stage order then wait
 */
export function groupForWalk(pots, stages, handedIn = HANDED_IN_STAGES) {
  const map = stageMap(stages);
  const strip = [];
  const ended = [];
  const byStage = new Map();
  for (const pot of pots) {
    const stage = map.get(pot.stage);
    if (handedIn.includes(pot.stage)) strip.push(pot);
    else if (!stage || isDone(stage)) ended.push(pot);
    else byStage.set(pot.stage, [...(byStage.get(pot.stage) || []), pot]);
  }
  const order = (id) => map.get(id)?.order ?? Infinity;
  const sections = [...byStage.keys()]
    .sort((a, b) => order(a) - order(b))
    .map((id) => ({ stage: map.get(id), pots: sortLongestWaiting(byStage.get(id)) }));
  ended.sort((a, b) => order(a.stage) - order(b.stage) || byLongestWait(a, b));
  return { strip: sortLongestWaiting(strip), sections, ended };
}

/** Pots a hand-in can take: those at the stage before a kiln, longest wait first. */
export function handInCandidates(pots, stages) {
  const map = stageMap(stages);
  return sortLongestWaiting(pots.filter((p) => map.get(p.stage)?.viaWaiting));
}

/** The moves one hand-in makes: each checked candidate to its next stage (waiting on staff). */
export function handInMoves(pots, checkedIds, stages) {
  return handInCandidates(pots, stages)
    .filter((p) => checkedIds.has(p.id))
    .map((pot) => ({ pot, to: nextStageId(pot, stages) }))
    .filter((m) => m.to);
}
