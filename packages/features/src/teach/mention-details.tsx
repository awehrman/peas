import { HighlightedLine } from "./highlighted-line";
import {
  MENTION_STATUS_LABELS,
  type MentionStatus,
  type ResolutionCandidateView,
  type ResolutionView,
  type SyntaxToken,
  type TextSpan,
} from "./types";

import type { ReactNode } from "react";

import { Badge, cn } from "@peas/components";

const STATUS_STYLES: Record<MentionStatus, string> = {
  AUTO_RESOLVED: "bg-success-50 text-success-900 border-success-300",
  VERIFIED: "bg-success-100 text-success-900 border-success-400",
  NEEDS_REVIEW: "bg-amber-50 text-amber-900 border-amber-300",
  UNRESOLVED: "bg-error-50 text-error-900 border-error-300",
};

export function MentionStatusBadge({
  status,
}: {
  status: MentionStatus;
}): ReactNode {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap", STATUS_STYLES[status])}
    >
      {MENTION_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * How v2 read one segment: highlighted words, quantity, the chosen reading, and every candidate with the resolver's reasons.
 */
export function MentionDetails({
  lineText,
  tokens,
  quantity,
  summary,
  candidates,
  unresolved,
}: {
  lineText: string;
  tokens: SyntaxToken[];
  quantity: string | null;
  summary: ResolutionView;
  candidates: ResolutionCandidateView[];
  unresolved: TextSpan[];
}): ReactNode {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        <HighlightedLine text={lineText} tokens={tokens} />
      </p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        <dt className="text-greyscale-600">Quantity</dt>
        <dd>{quantity ?? "none"}</dd>
        <dt className="text-greyscale-600">Reading</dt>
        <dd className="font-medium text-greyscale-900">{summary.text}</dd>
        {summary.preparations.length > 0 ? (
          <>
            <dt className="text-greyscale-600">Preparations</dt>
            <dd>{summary.preparations.join(", ")}</dd>
          </>
        ) : null}
        {unresolved.length > 0 ? (
          <>
            <dt className="text-greyscale-600">Not understood</dt>
            <dd>{unresolved.map((span) => span.text).join(", ")}</dd>
          </>
        ) : null}
      </dl>
      {candidates.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-semibold uppercase text-greyscale-600">
            Candidates
          </h4>
          <ol className="flex flex-col gap-1">
            {candidates.map((candidate) => (
              <li
                key={candidate.conceptId}
                className="rounded-md bg-greyscale-50 p-2"
              >
                <span className="font-medium">{candidate.conceptName}</span>{" "}
                <span className="text-xs text-greyscale-600">
                  score {candidate.score.toFixed(2)}
                </span>
                {candidate.attributes.length > 0 ? (
                  <span className="ml-2 text-xs">
                    {candidate.attributes.join(", ")}
                  </span>
                ) : null}
                <ul className="mt-1 flex flex-wrap gap-1" aria-label="Reasons">
                  {candidate.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="rounded bg-white px-1 font-mono text-xs text-greyscale-700 ring-1 ring-greyscale-200"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
