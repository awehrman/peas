import {
  DecideStructurePatternDocument,
  DecideStructureProposalDocument,
  UndoStructureDecisionDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";

import type {
  StructureDecisionInput,
  StructureReviewActions,
} from "@peas/features";

/**
 * The Structure tab's decisions, through the cache coordinator: each invalidates the review lists and the note and recipe pages that show the line.
 *
 * @example
 * const actions = useStructureActions();
 * <StructureReviewPageContent data={data} status="OPEN" {...actions} />
 */
export function useStructureActions(): StructureReviewActions {
  const onDecide = useMutationAction(DecideStructureProposalDocument, {
    variables: (id: string, decision: StructureDecisionInput) => ({
      id,
      input: decision,
    }),
    payload: (data) => data.decideStructureProposal,
  });
  const onUndo = useMutationAction(UndoStructureDecisionDocument, {
    variables: (id: string) => ({ id }),
    payload: (data) => data.undoStructureDecision,
  });
  const onDecidePattern = useMutationAction(DecideStructurePatternDocument, {
    variables: (patternKey: string, decision: StructureDecisionInput) => ({
      patternKey,
      input: decision,
    }),
    payload: (data) => data.decideStructurePattern,
  });
  return { onDecide, onUndo, onDecidePattern };
}
