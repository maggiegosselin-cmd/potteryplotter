// Fictional pots for trying the app with an empty shelf. Pure and deterministic:
// the same `now` always gives the same pots. None of them has a photo.
import { DAY, applyMove, findStage, sortStages } from './stages.js';

// [name, clay, notes, [[stage key, days ago it happened], ...] oldest first, optional cause]
const POTS = [
  ['Speckled mug', 'Speckled stoneware', 'Pulled handle, a bit thick.', [['lump', 40], ['formed', 39], ['leather_hard', 36], ['bone_dry', 30], ['waiting_firing', 27]]],
  ['Tall bud vase', 'White stoneware', '', [['lump', 30], ['formed', 29], ['leather_hard', 26], ['bone_dry', 20], ['waiting_firing', 12], ['bisque_fired', 6], ['glazed', 4], ['waiting_firing', 3]]],
  ['Pinch bowl set (1 of 3)', 'Red earthenware', 'Test the blue glaze on this one.', [['lump', 22], ['formed', 21], ['leather_hard', 19], ['bone_dry', 14], ['waiting_firing', 9]]],
  ['Fern plate', 'Speckled stoneware', 'Fern pressed in while soft.', [['formed', 5], ['leather_hard', 3]]],
  ['Lidded jar', 'White stoneware', 'Lid must match: measure again.', [['lump', 16], ['formed', 15], ['leather_hard', 13]]],
  ['Small lump for a spoon rest', 'Red earthenware', '', [['lump', 1]]],
  ['Coil planter', 'Grogged buff', 'Drainage hole done.', [['lump', 12], ['formed', 11], ['leather_hard', 9], ['bone_dry', 2]]],
  ['Slab tray', 'White stoneware', '', [['formed', 10], ['leather_hard', 8], ['bone_dry', 4]]],
  ['Teal soup bowl', 'White stoneware', 'Two coats of teal.', [['formed', 50], ['bone_dry', 40], ['bisque_fired', 26], ['glazed', 8]]],
  ['Ash-glaze cup', 'Speckled stoneware', '', [['lump', 45], ['formed', 44], ['bone_dry', 35], ['bisque_fired', 20], ['glazed', 15], ['glaze_fired', 3]]],
  ['Wide serving bowl', 'White stoneware', 'Bisqued fine, needs glaze.', [['lump', 38], ['formed', 37], ['bone_dry', 28], ['waiting_firing', 25], ['bisque_fired', 14]]],
  ['Blue mug', 'Speckled stoneware', 'Glaze came out deeper than the test tile.', [['lump', 80], ['formed', 79], ['bone_dry', 70], ['bisque_fired', 55], ['glazed', 48], ['glaze_fired', 40], ['out_of_kiln', 38], ['finished', 38]]],
  ['Gift bowl for Sam', 'Red earthenware', 'Rim chipped slightly after unloading.', [['lump', 70], ['formed', 69], ['bone_dry', 60], ['bisque_fired', 46], ['glazed', 40], ['glaze_fired', 30], ['out_of_kiln', 28], ['finished_flaw', 28]]],
  ['Teapot attempt', 'White stoneware', 'Spout cracked off while drying.', [['lump', 33], ['formed', 32], ['leather_hard', 28], ['bone_dry', 22], ['failed', 21]], 'Handle or part came off'],
  ['Crawled glaze plate', 'Speckled stoneware', 'Glaze pulled back into islands.', [['lump', 60], ['formed', 59], ['bone_dry', 50], ['bisque_fired', 36], ['glazed', 30], ['glaze_fired', 18], ['failed', 17]], 'Glaze crawled'],
  ['Dry-cracked dish', 'Grogged buff', 'Base cracked; clay goes back in the bucket.', [['lump', 24], ['formed', 23], ['reclaimed', 20]]],
  ['Half-made vase', 'White stoneware', 'Lost interest, lopsided.', [['lump', 90], ['formed', 89], ['abandoned', 70]]],
];

export function samplePots(stages, now = Date.now()) {
  const known = new Set(sortStages(stages).map((s) => s.key));
  return POTS.map(([name, clay, notes, steps, cause], i) => {
    const created = now - steps[0][1] * DAY;
    let pot = { name, clay, notes, createdAt: created, stage: steps[0][0], stageAt: created, history: [] };
    steps.forEach(([key, ago], n) => {
      if (!known.has(key)) throw new Error(`sample pot uses unknown stage ${key}`);
      const when = now - ago * DAY;
      const isLast = n === steps.length - 1;
      pot = applyMove(pot, key, {
        occurredAt: when,
        // Typed in a day or two after it happened, as when a pot is logged from memory.
        enteredAt: Math.min(now, when + ((i + n) % 3) * DAY),
        cause: isLast && cause && findStage(stages, key)?.failure ? cause : undefined,
      });
    });
    return pot;
  });
}
