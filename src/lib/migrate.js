// Version 1 pots had a name, a photo and createdAt. Version 2 adds a stage, a
// dated stage history, clay and notes. Pure so it can be tested in Node.

/** The fields version 2 adds to a saved pot. Never overwrites a field the pot already has. */
export function v2Fields(pot) {
  const createdAt = pot.createdAt || Date.now();
  return {
    stageId: pot.stageId || 'lump',
    history: Array.isArray(pot.history) && pot.history.length
      ? pot.history
      : [{ stageId: 'lump', stageDate: createdAt, enteredAt: createdAt }],
    clay: pot.clay ?? '',
    notes: pot.notes ?? '',
  };
}
