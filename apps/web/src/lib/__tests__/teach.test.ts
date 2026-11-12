import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { of } from "rxjs";
import { describe, expect, it } from "vitest";

import { cacheConfig } from "../apollo/cache-config";
import {
  previewDecision,
  queueNeighbors,
  searchConcepts,
  toApplyDecisionResult,
} from "../teach";

function clientAnswering(
  data: Record<string, unknown> | null,
  seen: { variables?: unknown }[] = []
) {
  return new ApolloClient({
    cache: new InMemoryCache(cacheConfig),
    link: new ApolloLink((operation) => {
      seen.push({ variables: operation.variables });
      return of(
        data
          ? { data }
          : { errors: [{ message: "Only admins can teach Peas" }] }
      );
    }),
  });
}

const preview = {
  __typename: "DecisionPreview",
  revision: 4,
  truncated: false,
  counts: {
    __typename: "DecisionPreviewCounts",
    scanned: 1,
    affected: 1,
    newlyResolved: 1,
    conceptChanged: 1,
    attributesChanged: 0,
    becameAmbiguous: 0,
    becameUnresolved: 0,
    verifiedConflicts: 0,
  },
  examples: [],
};

describe("teach actions", () => {
  it("previews a decision without caching it", async () => {
    const seen: { variables?: unknown }[] = [];
    const client = clientAnswering({ previewDecision: preview }, seen);
    const payload = { type: "IGNORE_TOKEN" as const, token: "organic" };

    expect(await previewDecision(client, payload)).toMatchObject({
      revision: 4,
      counts: { affected: 1 },
    });
    await previewDecision(client, payload);
    expect(seen).toEqual([
      { variables: { payload } },
      { variables: { payload } },
    ]);
  });

  it("reports preview failures as errors", async () => {
    await expect(
      previewDecision(clientAnswering(null), {
        type: "IGNORE_TOKEN",
        token: "x",
      })
    ).rejects.toThrow("Only admins can teach Peas");
  });

  it("searches concepts, and lets the picker handle server errors", async () => {
    const found = await searchConcepts(
      clientAnswering({
        searchConcepts: [
          {
            __typename: "ConceptRef",
            id: "c1",
            canonicalName: "milk",
            status: "VERIFIED",
          },
        ],
      }),
      "mil"
    );
    expect(found).toEqual([
      {
        __typename: "ConceptRef",
        id: "c1",
        canonicalName: "milk",
        status: "VERIFIED",
      },
    ]);
    await expect(searchConcepts(clientAnswering(null), "x")).rejects.toThrow(
      "Only admins can teach Peas"
    );
  });

  it("maps applied decisions to the confirmation the review screens show", () => {
    const base = {
      __typename: "ApplyDecisionPayload" as const,
      success: true,
      message: null,
      effect: {
        __typename: "MutationEffect" as const,
        changed: [],
        evicted: [],
        invalidatedDomains: [],
        lexiconRevision: 5,
        reprocessingJobId: null,
      },
      decisionId: "d1",
      revision: 5,
    };
    expect(
      toApplyDecisionResult({
        applyDecision: {
          ...base,
          summary: "Taught: x",
          mentionsUpdated: 3,
          needsBackgroundReinterpret: false,
          reinterpretCommand: null,
        },
      })
    ).toEqual({
      summary: "Taught: x",
      mentionsUpdated: 3,
      needsBackgroundReinterpret: false,
      reinterpretCommand: null,
    });
    expect(
      toApplyDecisionResult({
        applyDecision: {
          ...base,
          summary: null,
          mentionsUpdated: null,
          needsBackgroundReinterpret: true,
          reinterpretCommand: "yarn reinterpret",
        },
      })
    ).toEqual({
      summary: "Taught",
      mentionsUpdated: 0,
      needsBackgroundReinterpret: true,
      reinterpretCommand: "yarn reinterpret",
    });
  });

  it("finds the cards around the current one", () => {
    expect(queueNeighbors(["a", "b", "c"], "b")).toEqual({
      previousId: "a",
      nextId: "c",
    });
    expect(queueNeighbors(["a", "b"], "a")).toEqual({
      previousId: null,
      nextId: "b",
    });
    expect(queueNeighbors(["a", "b"], "gone")).toEqual({
      previousId: null,
      nextId: "a",
    });
    expect(queueNeighbors([], "gone")).toEqual({
      previousId: null,
      nextId: null,
    });
  });
});
