import type { DiscoveryType } from "./schemas.js";

/** Added when a discovery has several plausible readings (AMBIGUOUS_MATCH, ATTRIBUTE_INTERPRETATION). */
export const AMBIGUITY_BONUS = 1;

/** Added when nothing in the lexicon explains the phrase (UNKNOWN_FOOD_PHRASE, UNKNOWN_MODIFIER). */
export const UNRESOLVED_BONUS = 2;

export interface PriorityInput {
  distinctNotes: number;
  mentions: number;
  isAmbiguous: boolean;
  isUnresolved: boolean;
}

/**
 * Review-queue priority (decision D18): spread across notes counts double, raw frequency counts once, and logarithms keep one very common phrase from drowning out everything else.
 *
 * priority = log2(1 + distinctNotes) * 2 + log2(1 + mentions) + ambiguityBonus + unresolvedBonus
 *
 * @example
 * discoveryPriority({ distinctNotes: 7, mentions: 9, isAmbiguous: false, isUnresolved: true })
 * // log2(8) * 2 + log2(10) + 0 + 2 = 6 + 3.32 + 2 = 11.32
 */
export function discoveryPriority({
  distinctNotes,
  mentions,
  isAmbiguous,
  isUnresolved,
}: PriorityInput): number {
  const spread = Math.log2(1 + Math.max(0, distinctNotes)) * 2;
  const frequency = Math.log2(1 + Math.max(0, mentions));
  return (
    spread +
    frequency +
    (isAmbiguous ? AMBIGUITY_BONUS : 0) +
    (isUnresolved ? UNRESOLVED_BONUS : 0)
  );
}

const AMBIGUOUS_TYPES: readonly DiscoveryType[] = [
  "AMBIGUOUS_MATCH",
  "ATTRIBUTE_INTERPRETATION",
];
const UNRESOLVED_TYPES: readonly DiscoveryType[] = [
  "UNKNOWN_FOOD_PHRASE",
  "UNKNOWN_MODIFIER",
];

/**
 * Priority for a discovery row from its type and evidence counts.
 *
 * @example
 * priorityForDiscovery("AMBIGUOUS_MATCH", { distinctNotes: 1, mentions: 1 }) // 2 + 1 + 1 = 4
 */
export function priorityForDiscovery(
  type: DiscoveryType,
  counts: { distinctNotes: number; mentions: number }
): number {
  return discoveryPriority({
    ...counts,
    isAmbiguous: AMBIGUOUS_TYPES.includes(type),
    isUnresolved: UNRESOLVED_TYPES.includes(type),
  });
}
