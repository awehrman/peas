import { type DbClient, parseOrThrow, toJson, uuidv7 } from "./helpers.js";
import { bumpRevision } from "./revision.js";

import {
  type DecisionEffects,
  DecisionEffectsSchema,
  type DecisionPayload,
  DecisionPayloadSchema,
  EMPTY_DECISION_EFFECTS,
} from "@peas/parser/v2";

/**
 * @example
 * { payload: { type: "MAP_TO_CONCEPT", phrase: "spring onions", conceptId, kind: "REGIONAL" }, userId, discoveryId }
 */
export interface DecisionRecordInput {
  payload: DecisionPayload;
  userId: string;
  discoveryId?: string | null;
  effects?: DecisionEffects;
}

/**
 * Records a reviewed decision with its own revision ("decision:<id>") in the caller's transaction, and closes the discovery it answers (REJECTED for REJECT, RESOLVED otherwise). Applying the decision's side effects (entries, concepts, merges) is Phase 4.
 *
 * @example
 * const { id, revision } = await prisma.$transaction((tx) => recordDecision(tx, input));
 */
export async function recordDecision(
  tx: DbClient,
  input: DecisionRecordInput
): Promise<{ id: string; revision: number }> {
  const payload = parseOrThrow(
    DecisionPayloadSchema,
    input.payload,
    "LexiconDecision.payload"
  );
  const effects = parseOrThrow(
    DecisionEffectsSchema,
    input.effects ?? EMPTY_DECISION_EFFECTS,
    "LexiconDecision.effects"
  );

  const id = uuidv7();
  const revision = await bumpRevision(tx, `decision:${id}`);
  await tx.lexiconDecision.create({
    data: {
      id,
      type: payload.type,
      payload: toJson(payload),
      effects: toJson(effects),
      discoveryId: input.discoveryId ?? null,
      userId: input.userId,
      revision,
    },
  });

  if (input.discoveryId) {
    await tx.discovery.update({
      where: { id: input.discoveryId },
      data: {
        status: payload.type === "REJECT" ? "REJECTED" : "RESOLVED",
        resolvedByDecisionId: id,
      },
    });
  }

  return { id, revision };
}
