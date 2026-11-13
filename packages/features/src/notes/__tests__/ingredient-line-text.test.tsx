import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { NoteMention } from "../../teach/mention-panel";
import { IngredientLineText } from "../components/ingredient-line-text";

function mention(overrides: Partial<NoteMention>): NoteMention {
  return {
    id: "m1",
    segmentIndex: 0,
    rawText: "salt",
    status: "AUTO_RESOLVED",
    concept: { id: "c1", canonicalName: "salt", status: "VERIFIED" },
    quantity: null,
    verified: false,
    summary: {
      status: "AUTO_RESOLVED",
      conceptId: "c1",
      conceptName: "salt",
      attributes: [],
      preparations: [],
      candidateCount: 1,
      score: 0.9,
      text: "salt",
      highlights: [],
    },
    tokens: [],
    candidates: [],
    unresolved: [],
    ...overrides,
  };
}

describe("IngredientLineText", () => {
  it("styles the words of every part's mention once", () => {
    const salt = mention({
      tokens: [
        {
          span: { start: 0, end: 4, text: "salt" },
          kind: "LEXEME",
          roles: ["FOOD"],
          zone: "MAIN",
        },
      ],
    });
    const pepper = mention({
      id: "m2",
      rawText: "pepper",
      tokens: [
        {
          span: { start: 9, end: 15, text: "pepper" },
          kind: "LEXEME",
          roles: ["FOOD"],
          zone: "MAIN",
        },
        {
          span: { start: 0, end: 4, text: "salt" },
          kind: "LEXEME",
          roles: ["FOOD"],
          zone: "MAIN",
        },
      ],
    });
    const { container } = render(
      <IngredientLineText
        reference="salt and pepper"
        parseStatus="COMPLETED_SUCCESSFULLY"
        mentions={[salt, pepper]}
      />
    );
    expect(container).toHaveTextContent("salt (food) and pepper (food)");
    expect(screen.getAllByText("(food)")).toHaveLength(2);
  });

  it("falls back to the raw line with its parse state", () => {
    const { rerender } = render(
      <IngredientLineText reference="a pinch of ???" parseStatus="COMPLETED_WITH_ERROR" />
    );
    expect(screen.getByTitle("This line could not be parsed")).toHaveTextContent(
      "a pinch of ??? (could not be parsed)"
    );

    rerender(
      <IngredientLineText reference="2 eggs" parseStatus="AWAITING_PARSING" mentions={[]} />
    );
    expect(screen.getByTitle("Waiting to be parsed")).toHaveTextContent(
      "2 eggs (waiting to be parsed)"
    );

    rerender(<IngredientLineText reference="2 eggs" parseStatus="COMPLETED_SUCCESSFULLY" />);
    expect(screen.getByText("2 eggs")).not.toHaveAttribute("title");
  });
});
