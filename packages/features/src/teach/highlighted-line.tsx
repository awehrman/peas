import type { SyntaxToken, TextSpan } from "./types";

import type { ReactNode } from "react";

import { cn } from "@peas/components";

/** Each role has a text style plus an underline pattern, so color is never the only cue. */
const ROLE_STYLES: Record<string, { className: string; label: string }> = {
  FOOD: {
    className:
      "font-semibold text-greyscale-900 underline decoration-2 underline-offset-4",
    label: "food",
  },
  ATTRIBUTE: {
    className:
      "text-blue-800 underline decoration-dotted decoration-2 underline-offset-4",
    label: "attribute",
  },
  PREPARATION: {
    className:
      "italic text-amber-900 underline decoration-dashed underline-offset-4",
    label: "preparation",
  },
  DEGREE: { className: "italic text-amber-800", label: "degree" },
  MEASUREMENT_MODIFIER: {
    className: "text-indigo-800 underline decoration-double underline-offset-4",
    label: "measurement modifier",
  },
  INSTRUCTION: { className: "text-greyscale-700 italic", label: "instruction" },
  UNKNOWN: {
    className:
      "text-error-800 underline decoration-wavy decoration-error-600 underline-offset-4",
    label: "unknown",
  },
};

function styleFor(token: SyntaxToken) {
  if (token.kind === "UNKNOWN") return ROLE_STYLES.UNKNOWN;
  const role =
    token.roles.find((candidate) => ROLE_STYLES[candidate]) ?? token.roles[0];
  return role ? ROLE_STYLES[role] : undefined;
}

interface Piece {
  text: string;
  end: number;
  token?: SyntaxToken;
  marked: boolean;
}

function pieces(
  text: string,
  tokens: readonly SyntaxToken[],
  marks: readonly TextSpan[]
): Piece[] {
  const boundaries = new Set<number>([0, text.length]);
  for (const span of [...tokens.map((token) => token.span), ...marks]) {
    boundaries.add(Math.max(0, Math.min(text.length, span.start)));
    boundaries.add(Math.max(0, Math.min(text.length, span.end)));
  }
  const sorted = [...boundaries].sort((a, b) => a - b);
  const result: Piece[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index] as number;
    const end = sorted[index + 1] as number;
    if (start === end) continue;
    result.push({
      text: text.slice(start, end),
      end,
      token: tokens.find(
        (token) =>
          token.span.start <= start &&
          token.span.end >= end &&
          token.kind !== "PUNCT"
      ),
      marked: marks.some((span) => span.start <= start && span.end >= end),
    });
  }
  return result;
}

/**
 * A raw line with its words styled by lexicon role (food, attribute, preparation, unknown, ...) and optional marked spans, such as the phrase a discovery is about. Screen readers hear each role after the word.
 *
 * @example
 * <HighlightedLine text="1 lb boneless chicken thighs" tokens={mention.tokens} />
 * <HighlightedLine text={example.lineText} marks={[example.span]} />
 */
export function HighlightedLine({
  text,
  tokens = [],
  marks = [],
  className,
}: {
  text: string;
  tokens?: readonly SyntaxToken[];
  marks?: readonly TextSpan[];
  className?: string;
}): ReactNode {
  return (
    <span className={cn("leading-7", className)}>
      {pieces(text, tokens, marks).map((piece, index) => {
        const style = piece.token ? styleFor(piece.token) : undefined;
        const content = (
          <span className={style?.className}>
            {piece.text}
            {style && piece.token?.span.end === piece.end ? (
              <span className="sr-only"> ({style.label})</span>
            ) : null}
          </span>
        );
        return piece.marked ? (
          <mark
            key={index}
            className="rounded-sm bg-amber-100 px-0.5 text-inherit ring-1 ring-amber-400"
          >
            {content}
          </mark>
        ) : (
          <span key={index}>{content}</span>
        );
      })}
    </span>
  );
}

/** What each highlight style means. */
export function RoleLegend(): ReactNode {
  return (
    <dl
      aria-label="Highlight legend"
      className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-greyscale-700"
    >
      {Object.entries(ROLE_STYLES).map(([role, style]) => (
        <div key={role} className="flex items-center gap-1">
          <dt className={style.className}>Abc</dt>
          <dd>{style.label}</dd>
        </div>
      ))}
    </dl>
  );
}
