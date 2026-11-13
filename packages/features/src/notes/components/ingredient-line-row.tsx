"use client";

import type { ReactNode } from "react";

import { Button, cn } from "@peas/components";
import { Check, X } from "lucide-react";

import { type MutationAction, useMutation } from "../../shared";
import {
  type MentionCorrectionActions,
  MentionPanel,
} from "../../teach/mention-panel";
import type { LineReviewStatus, NoteIngredientLine } from "../types";

import { IngredientLineText } from "./ingredient-line-text";

export interface IngredientLineActions extends MentionCorrectionActions {
  onSetReviewStatus?: MutationAction<
    [lineId: string, status: LineReviewStatus]
  >;
}

interface IngredientLineRowProps extends IngredientLineActions {
  line: NoteIngredientLine;
}

const REVIEW_LABELS: Record<LineReviewStatus, string> = {
  UNREVIEWED: "Not reviewed",
  CORRECT: "Marked correct",
  INCORRECT: "Marked incorrect",
};

export function IngredientLineRow({
  line,
  onSetReviewStatus,
  onCorrectMention,
  onSearchConcepts,
}: IngredientLineRowProps): ReactNode {
  const review = useMutation(onSetReviewStatus);

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
        <IngredientLineText
          reference={line.reference}
          parseStatus={line.parseStatus}
          mentions={line.mentions}
        />
        <div className="flex shrink-0 items-center gap-1">
          <span className="sr-only">{REVIEW_LABELS[line.reviewStatus]}</span>
          {onSetReviewStatus ? (
            <>
              <Button
                type="button"
                size="icon"
                variant={
                  line.reviewStatus === "CORRECT" ? "secondary" : "ghost"
                }
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
                variant={
                  line.reviewStatus === "INCORRECT" ? "secondary" : "ghost"
                }
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
        </div>
      </div>
      {line.mentions.length ? (
        <MentionPanel
          lineText={line.reference}
          mentions={line.mentions}
          onCorrectMention={onCorrectMention}
          onSearchConcepts={onSearchConcepts}
        />
      ) : null}
      {review.error ? (
        <p role="alert" className="text-xs text-error-700">
          {review.error}
        </p>
      ) : null}
    </li>
  );
}
