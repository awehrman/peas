import {
  ApplyDecisionDocument,
  type ApplyDecisionMutation,
  DeferDiscoveryDocument,
  MarkDiscoveryAsNoiseDocument,
  PreviewDecisionDocument,
  RunExploratorySweepDocument,
  SearchConceptsDocument,
  StartReparseDocument,
  TakeHealthSnapshotDocument,
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

  const onMarkNoise = useMutationAction(MarkDiscoveryAsNoiseDocument, {
    variables: (id: string) => ({ id }),
    payload: (result) => result.markDiscoveryAsNoise,
    result: (result) => ({
      linesDeactivated: result.markDiscoveryAsNoise.linesDeactivated ?? 0,
    }),
  });

  const onPreviewDecision = useCallback(
    (payload: DecisionPayload) => previewDecision(client, payload),
    [client]
  );

  const onSearchConcepts = useCallback(
    (query: string) => searchConcepts(client, query),
    [client]
  );

  return {
    onApplyDecision,
    onDefer,
    onMarkNoise,
    onPreviewDecision,
    onSearchConcepts,
  };
}

/**
 * The Health tab's maintenance controls. A reparse's run id comes back as `effect.reprocessingJobId`, so the Knowledge layout's banner follows it.
 *
 * @example
 * const { onStartReparse, onRunSweep, onTakeSnapshot } = useHealthActions();
 */
export function useHealthActions() {
  const toMessage =
    (fallback: string) => (message: string | null | undefined) => ({
      message: message ?? fallback,
    });

  const onStartReparse = useMutationAction(StartReparseDocument, {
    variables: () => ({}),
    payload: (result) => result.startReparse,
    result: (result) =>
      toMessage("Reparse started")(result.startReparse.message),
  });

  const onRunSweep = useMutationAction(RunExploratorySweepDocument, {
    variables: () => ({}),
    payload: (result) => result.runExploratorySweep,
    result: (result) =>
      toMessage("Sweep started")(result.runExploratorySweep.message),
  });

  const onTakeSnapshot = useMutationAction(TakeHealthSnapshotDocument, {
    variables: () => ({}),
    payload: (result) => result.takeHealthSnapshot,
    result: (result) =>
      toMessage("Snapshot taken")(result.takeHealthSnapshot.message),
  });

  return { onStartReparse, onRunSweep, onTakeSnapshot };
}
