import {
  ApplyDecisionDocument,
  type ApplyDecisionMutation,
  DeferDiscoveryDocument,
  PreviewDecisionDocument,
  SearchConceptsDocument,
} from "~/graphql/generated";
import { useMutationAction } from "~/lib/apollo/cache-coordinator-provider";

import { useCallback } from "react";

import type { ApolloClient } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import type {
  ApplyDecisionResult,
  ConceptRef,
  DecisionPayload,
  DecisionPreview,
} from "@peas/features";

/** Impact of a decision without applying it; never cached, since every option change asks again. */
export async function previewDecision(
  client: ApolloClient,
  payload: DecisionPayload
): Promise<DecisionPreview> {
  const { data, error } = await client.query({
    query: PreviewDecisionDocument,
    variables: { payload },
    fetchPolicy: "no-cache",
  });
  if (!data) throw error ?? new Error("Could not preview this decision");
  return data.previewDecision;
}

export async function searchConcepts(
  client: ApolloClient,
  query: string
): Promise<ConceptRef[]> {
  const { data } = await client.query({
    query: SearchConceptsDocument,
    variables: { query },
    fetchPolicy: "network-only",
  });
  return data?.searchConcepts ?? [];
}

/** What the review screens show after a decision is applied. */
export function toApplyDecisionResult(
  data: ApplyDecisionMutation
): ApplyDecisionResult {
  return {
    summary: data.applyDecision.summary ?? "Taught",
    mentionsUpdated: data.applyDecision.mentionsUpdated ?? 0,
    needsBackgroundReinterpret: data.applyDecision.needsBackgroundReinterpret,
    reinterpretCommand: data.applyDecision.reinterpretCommand ?? null,
  };
}

/**
 * The cards around the current one in queue order. A card that already left the queue (deferred or decided) continues with the first open one.
 *
 * @example
 * queueNeighbors(["a", "b", "c"], "b") // { previousId: "a", nextId: "c" }
 * queueNeighbors(["a", "b"], "gone")   // { previousId: null, nextId: "a" }
 */
export function queueNeighbors(
  ids: readonly string[],
  currentId: string
): { previousId: string | null; nextId: string | null } {
  const index = ids.indexOf(currentId);
  if (index < 0) return { previousId: null, nextId: ids[0] ?? null };
  return {
    previousId: ids[index - 1] ?? null,
    nextId: ids[index + 1] ?? null,
  };
}

/**
 * The GraphQL-backed actions every Teach Peas screen shares: apply a decision (its effect goes through the cache coordinator), defer, preview without side effects, and search concepts.
 *
 * @example
 * const { onApplyDecision, onPreviewDecision, onSearchConcepts } = useTeachActions();
 */
export function useTeachActions() {
  const client = useApolloClient();

  const onApplyDecision = useMutationAction(ApplyDecisionDocument, {
    variables: (payload: DecisionPayload, discoveryId: string | null) => ({
      input: { payload, discoveryId },
    }),
    payload: (result) => result.applyDecision,
    result: toApplyDecisionResult,
  });

  const onDefer = useMutationAction(DeferDiscoveryDocument, {
    variables: (id: string) => ({ id }),
    payload: (result) => result.deferDiscovery,
  });

  const onPreviewDecision = useCallback(
    (payload: DecisionPayload) => previewDecision(client, payload),
    [client]
  );

  const onSearchConcepts = useCallback(
    (query: string) => searchConcepts(client, query),
    [client]
  );

  return { onApplyDecision, onDefer, onPreviewDecision, onSearchConcepts };
}
