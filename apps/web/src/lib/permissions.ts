/** Who may curate food knowledge: the Knowledge section (review queue, concepts, lexicon, health) and correcting mentions on notes. Open to every signed-in user for now; return `viewer.isAdmin` to restrict it again, together with `canCurateKnowledge` in packages/api/src/context.ts. */
export function canCurateKnowledge(_viewer: { isAdmin: boolean }): boolean {
  return true;
}
