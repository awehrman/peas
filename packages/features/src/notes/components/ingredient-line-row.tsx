"use client";

import { type ReactNode, useState } from "react";

import { Button, cn } from "@peas/components";
import { Check, FlaskConical, X } from "lucide-react";

import { ParsedLine } from "../../parsed-line";
import { type MutationAction, useMutation } from "../../shared";
import type { LineReviewStatus, NoteIngredientLine } from "../types";

export interface IngredientLineActions {
  onSetReviewStatus?: MutationAction<[lineId: string, status: LineReviewStatus]>;
  onCreateGrammarTest?: MutationAction<[lineId: string]>;
}

interface IngredientLineRowProps extends IngredientLineActions {
  line: NoteIngredientLine;
  getIngredientHref?: (ingredientId: string) => string;
}

const REVIEW_LABELS: Record<LineReviewStatus, string> = {
  UNREVIEWED: "Not reviewed",
  CORRECT: "Marked correct",
  INCORRECT: "Marked incorrect",
};

export function IngredientLineRow({
  line,
  getIngredientHref,
  onSetReviewStatus,
  onCreateGrammarTest,
}: IngredientLineRowProps): ReactNode {
  const review = useMutation(onSetReviewStatus);
  const grammarTest = useMutation(onCreateGrammarTest);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const error = review.error ?? grammarTest.error;

  async function addGrammarTest() {
    setTestMessage(null);
    const result = await grammarTest.run(line.id);
    if (result.success) setTestMessage(result.message ?? "Added to grammar tests");
  }

  function toggleReview(status: LineReviewStatus) {
    const next = line.reviewStatus === status ? "UNREVIEWED" : status;
    void review.run(line.id, next);
  }

  return (
    <li
      className={cn(
        "group flex flex-col gap-1 rounded-md px-2 py-1",
        line.reviewStatus === "INCORRECT" && "bg-error-50",
        line.reviewStatus === "CORRECT" && "bg-success-50",
        !line.isActive && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <ParsedLine
          reference={line.reference}
          segments={line.segments}
          parseStatus={line.parseStatus}
          getIngredientHref={getIngredientHref}
        />
        <div className="flex shrink-0 items-center gap-1">
          <span className="sr-only">{REVIEW_LABELS[line.reviewStatus]}</span>
          {onSetReviewStatus ? (
            <>
              <Button
                type="button"
                size="icon"
                variant={line.reviewStatus === "CORRECT" ? "secondary" : "ghost"}
                aria-label={`Mark "${line.reference}" as parsed correctly`}
                aria-pressed={line.reviewStatus === "CORRECT"}
                disabled={review.isPending}
                onClick={() => toggleReview("CORRECT")}
                className="h-7 w-7"
              >
                <Check aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={line.reviewStatus === "INCORRECT" ? "secondary" : "ghost"}
                aria-label={`Mark "${line.reference}" as parsed incorrectly`}
                aria-pressed={line.reviewStatus === "INCORRECT"}
                disabled={review.isPending}
                onClick={() => toggleReview("INCORRECT")}
                className="h-7 w-7"
              >
                <X aria-hidden="true" />
              </Button>
            </>
          ) : null}
          {onCreateGrammarTest ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Add "${line.reference}" as a grammar test`}
              disabled={grammarTest.isPending}
              onClick={addGrammarTest}
              className="h-7 w-7"
            >
              <FlaskConical aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error-700">
          {error}
        </p>
      ) : null}
      {testMessage ? (
        <p role="status" className="text-xs text-greyscale-600">
          {testMessage}
        </p>
      ) : null}
    </li>
  );
}
