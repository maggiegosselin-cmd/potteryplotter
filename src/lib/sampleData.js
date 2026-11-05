// A shelf of fictional pots for trying the app with nothing logged yet.
// Pure: fixed data, no randomness. Each trail is [stageId, daysAgo] pairs; the
// stage dates are in the past but every entry is "entered" at `now`, like a
// back-filled log.
import { buildPot, moveToStage } from './stages.js';

const DAY = 86_400_000;

const SAMPLES = [
  { name: 'Test tile 7', clay: 'Stoneware, speckled', notes: 'Wedged 1 kg.', trail: [['lump', 1]] },
  { name: 'Pinch pot set', clay: 'Stoneware, speckled', notes: '', trail: [['lump', 6], ['formed', 2]] },
  { name: 'Slab mug', clay: 'Porcelain', notes: 'Handle joined with slip.', trail: [['lump', 9], ['formed', 8], ['leather-hard', 3]] },
  { name: 'Coil vase', clay: 'Red earthenware', notes: 'Dry slowly under plastic.', trail: [['lump', 20], ['formed', 18], ['leather-hard', 14], ['bone-dry', 9]] },
  { name: 'Small bowl', clay: 'Stoneware, white', notes: '', trail: [['lump', 30], ['formed', 28], ['leather-hard', 24], ['bone-dry', 20], ['waiting', 17]] },
  { name: 'Teapot lid', clay: 'Stoneware, white', notes: 'Handed in with the studio load.', trail: [['lump', 35], ['formed', 33], ['leather-hard', 29], ['bone-dry', 25], ['waiting', 4]] },
  { name: 'Planter', clay: 'Red earthenware', notes: '', trail: [['lump', 40], ['formed', 38], ['leather-hard', 34], ['bone-dry', 30], ['waiting', 26], ['bisque', 12]] },
  { name: 'Berry bowl', clay: 'Porcelain', notes: 'Celadon over white.', trail: [['lump', 50], ['formed', 48], ['leather-hard', 44], ['bone-dry', 40], ['waiting', 36], ['bisque', 30], ['glazed', 5]] },
  { name: 'Salt cellar', clay: 'Stoneware, speckled', notes: 'Two dips of the oatmeal glaze.', trail: [['lump', 55], ['formed', 53], ['leather-hard', 49], ['bone-dry', 45], ['waiting', 41], ['bisque', 35], ['glazed', 20], ['waiting', 14]] },
  { name: 'Dinner plate', clay: 'Stoneware, white', notes: '', trail: [['lump', 60], ['formed', 58], ['leather-hard', 54], ['bone-dry', 50], ['waiting', 46], ['bisque', 40], ['glazed', 25], ['waiting', 21], ['glaze-fired', 2]] },
  { name: 'Morning mug', clay: 'Porcelain', notes: 'Keeper. Handle sits well.', trail: [['lump', 80], ['formed', 78], ['leather-hard', 74], ['bone-dry', 70], ['waiting', 66], ['bisque', 60], ['glazed', 45], ['waiting', 41], ['glaze-fired', 30], ['finished', 28]] },
  { name: 'Bud vase', clay: 'Stoneware, speckled', notes: 'Glaze crawled near the rim.', trail: [['lump', 70], ['formed', 68], ['leather-hard', 64], ['bone-dry', 60], ['waiting', 56], ['bisque', 50], ['glazed', 35], ['waiting', 31], ['glaze-fired', 20], ['finished-flawed', 18]] },
  { name: 'Wide platter', clay: 'Red earthenware', notes: 'S-crack from the base while drying.', trail: [['lump', 45], ['formed', 43], ['leather-hard', 39], ['failed', 36]] },
  { name: 'Wonky jug', clay: 'Stoneware, white', notes: 'Collapsed. Back into the slop bucket.', trail: [['lump', 25], ['formed', 24], ['reclaimed', 22]] },
  { name: 'Sugar bowl', clay: 'Porcelain', notes: 'Lost interest.', trail: [['lump', 90], ['formed', 88], ['abandoned', 60]] },
  { name: 'Birthday cup', clay: 'Stoneware, speckled', notes: 'For Sam.', trail: [['lump', 100], ['formed', 98], ['leather-hard', 94], ['bone-dry', 90], ['waiting', 86], ['bisque', 80], ['glazed', 65], ['waiting', 61], ['glaze-fired', 50], ['finished', 48], ['given', 40]] },
];

/** Pot records (without ids) with the trail's stage dates and a single entry time. */
export function samplePots(stages, now = Date.now()) {
  return SAMPLES.map(({ name, clay, notes, trail }) => {
    const [[firstId, firstAgo], ...rest] = trail;
    let pot = buildPot({ name, clay, notes, stageId: firstId, stageDate: now - firstAgo * DAY }, stages, now);
    pot.createdAt = now - firstAgo * DAY;
    for (const [stageId, ago] of rest) pot = moveToStage(pot, stageId, { now, stageDate: now - ago * DAY });
    return pot;
  });
}
