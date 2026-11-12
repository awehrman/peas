"use client";

import { ConceptPicker } from "./concept-picker";
import { MentionDetails, MentionStatusBadge } from "./mention-details";
import type {
  ApplyDecisionResult,
  ConceptRef,
  DecisionPayload,
  MentionStatus,
  ResolutionCandidateView,
  ResolutionView,
  SearchConcepts,
  SyntaxToken,
  TextSpan,
} from "./types";

import { type ReactNode, useState } from "react";

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@peas/components";
import { ChevronDown } from "lucide-react";

import { InlineError, type MutationAction, useMutation } from "../shared";

/** A stored v2 mention, as the note page shows it. */
export interface NoteMention {
  id: string;
  segmentIndex: number;
  rawText: string;
  status: MentionStatus;
  concept: ConceptRef | null;
  quantity: string | null;
  verified: boolean;
  summary: ResolutionView;
  tokens: SyntaxToken[];
  candidates: ResolutionCandidateView[];
  unresolved: TextSpan[];
}

export interface MentionCorrectionActions {
  onCorrectMention?: MutationAction<
    [payload: DecisionPayload, discoveryId: string | null],
    ApplyDecisionResult
  >;
  onSearchConcepts?: SearchConcepts;
}

/**
 * The v2 reading of a line, collapsed to a status and a one-line summary. Admins can correct it: the mention becomes verified, and optionally the phrase is taught as an alias.
 */
export function MentionPanel({
  lineText,
  mentions,
  onCorrectMention,
  onSearchConcepts,
}: {
  lineText: string;
  mentions: NoteMention[];
} & MentionCorrectionActions): ReactNode {
  if (mentions.length === 0) return null;
  return (
    <ul
      className="flex flex-col gap-1"
      aria-label={`Peas reading of "${lineText}"`}
    >
      {mentions.map((mention) => (
        <MentionRow
          key={mention.id}
          lineText={lineText}
          mention={mention}
          onCorrectMention={onCorrectMention}
          onSearchConcepts={onSearchConcepts}
        />
      ))}
    </ul>
  );
}

function MentionRow({
  lineText,
  mention,
  onCorrectMention,
  onSearchConcepts,
}: {
  lineText: string;
  mention: NoteMention;
} & MentionCorrectionActions): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [concept, setConcept] = useState<ConceptRef | null>(mention.concept);
  const [teach, setTeach] = useState(false);
  const correct = useMutation(onCorrectMention);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function handleCorrect() {
    if (!concept) return;
    const result = await correct.run(
      {
        type: "CORRECT_MENTION",
        mentionId: mention.id,
        conceptId: concept.id,
        attributeValueIds: [],
        ...(teach ? { teachPhrase: mention.rawText } : {}),
      },
      null
    );
    if (result.success) {
      setIsCorrecting(false);
      setConfirmation(result.data?.summary ?? "Corrected");
    }
  }

  return (
    <li className="rounded-md border border-greyscale-200 bg-white text-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1 text-left">
          <MentionStatusBadge status={mention.status} />
          <span className="flex-1 truncate">
            <span className="sr-only">Peas reads this as </span>
            {mention.summary.text}
          </span>
          <ChevronDown
            className={isOpen ? "h-4 w-4 rotate-180" : "h-4 w-4"}
            aria-hidden="true"
          />
          <span className="sr-only">
            {isOpen ? "Hide details" : "Show details"}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-3 border-t border-greyscale-200 p-2">
          <MentionDetails
            lineText={lineText}
            tokens={mention.tokens}
            quantity={mention.quantity}
            summary={mention.summary}
            candidates={mention.candidates}
            unresolved={mention.unresolved}
          />
          {confirmation ? (
            <p role="status" className="text-success-900">
              {confirmation}
            </p>
          ) : null}
          {onCorrectMention && onSearchConcepts ? (
            isCorrecting ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCorrect();
                }}
              >
                <ConceptPicker
                  label="Correct concept"
                  value={concept}
                  onChange={setConcept}
                  onSearch={onSearchConcepts}
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={teach}
                    onChange={(event) => setTeach(event.target.checked)}
                  />
                  Also teach “{mention.rawText}” as a name for it
                </label>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!concept || correct.isPending}
                  >
                    {correct.isPending ? "Saving…" : "Save correction"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsCorrecting(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <InlineError message={correct.error} />
              </form>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="self-start"
                onClick={() => setIsCorrecting(true)}
              >
                Correct
              </Button>
            )
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
