import type { ReactNode } from "react";

import { cn } from "@peas/components";

import { HighlightedLine } from "../../teach/highlighted-line";
import type { NoteMention } from "../../teach/mention-panel";
import type { SyntaxToken } from "../../teach/types";
import type { IngredientLineParseStatus } from "../types";

function uniqueTokens(mentions: readonly NoteMention[]): SyntaxToken[] {
  const seen = new Set<string>();
  const tokens: SyntaxToken[] = [];
  for (const token of mentions.flatMap((mention) => mention.tokens)) {
    const key = `${token.span.start}:${token.span.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(token);
  }
  return tokens;
}

/**
 * An ingredient line as written, with the words of its v2 mentions styled by role (food, attribute, preparation, unknown, ...). Before the line is parsed, or when it has no mentions, the raw text shows with its parse state.
 *
 * @example
 * <IngredientLineText reference="1 lb boneless chicken thighs" parseStatus="COMPLETED_SUCCESSFULLY" mentions={line.mentions} />
 */
export function IngredientLineText({
  reference,
  parseStatus,
  mentions = [],
  className,
}: {
  reference: string;
  parseStatus?: IngredientLineParseStatus;
  mentions?: readonly NoteMention[];
  className?: string;
}): ReactNode {
  const tokens = uniqueTokens(mentions);
  if (tokens.length > 0)
    return (
      <HighlightedLine text={reference} tokens={tokens} className={className} />
    );

  const hasError = parseStatus === "COMPLETED_WITH_ERROR";
  const isPending = parseStatus === "AWAITING_PARSING";
  return (
    <span
      className={cn(
        hasError &&
          "text-error-700 underline decoration-wavy decoration-error-400",
        isPending && "italic text-greyscale-600",
        className
      )}
      title={
        hasError
          ? "This line could not be parsed"
          : isPending
            ? "Waiting to be parsed"
            : undefined
      }
    >
      {reference}
      {hasError ? <span className="sr-only"> (could not be parsed)</span> : null}
      {isPending ? <span className="sr-only"> (waiting to be parsed)</span> : null}
    </span>
  );
}
