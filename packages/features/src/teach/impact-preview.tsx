import { HighlightedLine } from "./highlighted-line";
import type { DecisionPreview } from "./types";

import type { ReactNode } from "react";

import { cn } from "@peas/components";

import { AppLink } from "../app-navigation";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Before/after impact of the chosen decision. The region is `aria-live="polite"`, so screen readers hear the new counts after each change of option.
 *
 * @example
 * <ImpactPreview preview={preview} isLoading={false} error={null} />
 */
export function ImpactPreview({
  preview,
  isLoading,
  error,
}: {
  preview: DecisionPreview | null;
  isLoading: boolean;
  error: string | null;
}): ReactNode {
  return (
    <section
      aria-labelledby="impact-heading"
      className="flex flex-col gap-3 rounded-lg border border-greyscale-200 p-4"
    >
      <h3
        id="impact-heading"
        className="text-base font-semibold text-greyscale-900"
      >
        Impact
      </h3>
      <div
        aria-live="polite"
        aria-busy={isLoading}
        className="flex flex-col gap-3 text-sm"
      >
        {error ? (
          <p className="text-error-700">{error}</p>
        ) : isLoading && !preview ? (
          <p className="text-greyscale-600">Working out the impact…</p>
        ) : !preview ? (
          <p className="text-greyscale-600">
            Choose an option to see what it would change.
          </p>
        ) : (
          <>
            <p data-testid="impact-summary" className="text-greyscale-900">
              {preview.counts.affected === 0
                ? `No stored mentions change (${plural(preview.counts.scanned, "mention")} checked).`
                : `${plural(preview.counts.affected, "mention")} would change: ${preview.counts.newlyResolved} newly resolved, ${preview.counts.conceptChanged} with a different concept, ${preview.counts.attributesChanged} with different attributes.`}
              {preview.truncated ? " Only the first matches were checked." : ""}
            </p>
            {preview.counts.becameAmbiguous + preview.counts.becameUnresolved >
            0 ? (
              <p className="text-amber-900">
                {preview.counts.becameAmbiguous} would become ambiguous and{" "}
                {preview.counts.becameUnresolved} unresolved.
              </p>
            ) : null}
            {preview.counts.verifiedConflicts > 0 ? (
              <p className="font-medium text-error-700">
                {plural(preview.counts.verifiedConflicts, "verified mention")}{" "}
                would read differently. Verified mentions are never changed
                automatically.
              </p>
            ) : null}
            {preview.examples.length > 0 ? (
              <ul
                aria-label="Examples of the change"
                className="flex flex-col gap-2"
              >
                {preview.examples.map((example) => (
                  <li
                    key={example.mentionId}
                    className={cn(
                      "rounded-md bg-greyscale-50 p-2",
                      example.verifiedConflict &&
                        "bg-error-50 ring-1 ring-error-400"
                    )}
                  >
                    <HighlightedLine
                      text={example.lineText}
                      marks={example.after.highlights}
                    />
                    <p className="text-xs text-greyscale-700">
                      <span className="line-through decoration-greyscale-500">
                        {example.before.text}
                      </span>
                      <span aria-hidden="true"> → </span>
                      <span className="sr-only"> becomes </span>
                      <span className="font-medium text-greyscale-900">
                        {example.after.text}
                      </span>
                      {example.verifiedConflict ? (
                        <span className="ml-2 font-medium text-error-700">
                          verified, will not change
                        </span>
                      ) : null}
                    </p>
                    {example.noteId ? (
                      <AppLink
                        href={`/notes/${example.noteId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {example.noteTitle ?? "Open note"}
                      </AppLink>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
