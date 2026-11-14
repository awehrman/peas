import { InMemoryCache, gql } from "@apollo/client";
import { describe, expect, it } from "vitest";

import { cacheConfig } from "../apollo/cache-config";
import { conceptHref } from "../concepts";

describe("conceptHref", () => {
  it("links to the concept page or its occurrences, carrying the switches", () => {
    const off = { includeMadeFrom: false, includeNeedsReview: false };
    expect(conceptHref("c1", off)).toBe("/concepts/c1");
    expect(
      conceptHref("c1", { includeMadeFrom: true, includeNeedsReview: false })
    ).toBe("/concepts/c1?madeFrom=1");
    expect(
      conceptHref(
        "c1",
        { includeMadeFrom: true, includeNeedsReview: true },
        "usage"
      )
    ).toBe("/concepts/c1/usage?madeFrom=1&review=1");
  });
});

describe("conceptOccurrences cache policy", () => {
  const PAGE = gql`
    query Page(
      $conceptId: ID!
      $filter: ConceptOccurrenceFilter
      $after: String
    ) {
      conceptOccurrences(
        conceptId: $conceptId
        filter: $filter
        after: $after
      ) {
        total
        nextCursor
        items {
          mentionId
        }
      }
    }
  `;

  function page(ids: string[], nextCursor: string | null) {
    return {
      conceptOccurrences: {
        __typename: "ConceptOccurrencePage",
        total: 3,
        nextCursor,
        items: ids.map((mentionId) => ({
          __typename: "ConceptOccurrence",
          mentionId,
        })),
      },
    };
  }

  it("appends later pages and starts over for a first page or another filter", () => {
    const cache = new InMemoryCache(cacheConfig);
    const read = (filter: Record<string, unknown> | null) =>
      cache.readQuery<ReturnType<typeof page>>({
        query: PAGE,
        variables: { conceptId: "c1", filter, after: null },
      });

    cache.writeQuery({
      query: PAGE,
      variables: { conceptId: "c1", filter: null, after: null },
      data: page(["m1", "m2"], "x"),
    });
    cache.writeQuery({
      query: PAGE,
      variables: { conceptId: "c1", filter: null, after: "x" },
      data: page(["m3"], null),
    });
    expect(
      read(null)?.conceptOccurrences.items.map((item) => item.mentionId)
    ).toEqual(["m1", "m2", "m3"]);
    expect(read(null)?.conceptOccurrences.nextCursor).toBeNull();

    cache.writeQuery({
      query: PAGE,
      variables: {
        conceptId: "c1",
        filter: { preparationKey: "dice" },
        after: null,
      },
      data: page(["m2"], null),
    });
    expect(
      read({ preparationKey: "dice" })?.conceptOccurrences.items
    ).toHaveLength(1);
    expect(read(null)?.conceptOccurrences.items).toHaveLength(3);

    cache.writeQuery({
      query: PAGE,
      variables: { conceptId: "c1", filter: null, after: null },
      data: page(["m1"], "y"),
    });
    expect(
      read(null)?.conceptOccurrences.items.map((item) => item.mentionId)
    ).toEqual(["m1"]);
  });
});
