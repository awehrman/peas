import type { ReactNode } from "react";

/**
 * Text with one span marked, e.g. the words of a recipe line that named a food. A missing span, or one that does not fit the text, shows the text unmarked.
 *
 * @example
 * <HighlightedText text="1 lb chicken thighs" span={{ start: 5, end: 19 }} />
 */
export function HighlightedText({
  text,
  span,
}: {
  text: string;
  span: { start: number; end: number } | null | undefined;
}): ReactNode {
  if (
    !span ||
    span.start < 0 ||
    span.end > text.length ||
    span.start >= span.end
  )
    return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, span.start)}
      <mark className="rounded-sm bg-primary/15 px-0.5 text-inherit">
        {text.slice(span.start, span.end)}
      </mark>
      {text.slice(span.end)}
    </span>
  );
}
