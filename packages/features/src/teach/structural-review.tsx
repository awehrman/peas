"use client";

import { type ReactNode, useState } from "react";

import { Button } from "@peas/components";

import { ConfirmDialog, type MutationAction } from "../shared";

export const STRUCTURAL_REASON_LABELS: Record<string, string> = {
  UNPARSED: "Part of the line could not be parsed.",
  QUANTITY_IN_PHRASE: "A number or unit is stranded inside the food phrase.",
  HEADING: "This looks like a heading rather than an ingredient line.",
};

export type MarkDiscoveryAsNoise = MutationAction<
  [discoveryId: string],
  { linesDeactivated: number }
>;

export interface StructuralPatternPanelProps {
  discoveryId: string;
  signature: string;
  reason: string | null;
  fixtureBlock: string | null;
  mentionCount: number;
  onMarkNoise?: MarkDiscoveryAsNoise;
  onMarked: (message: string) => void;
  /** The card's Defer button, so it keeps its shortcut and pending state. */
  deferButton: ReactNode;
}

/**
 * The review card for a structural pattern (Phase 6a). Structure can't be taught from the queue, so the card offers the grammar loop's first step instead: export the examples as golden cases, mark the lines as noise when they aren't ingredient lines, or defer.
 *
 * @example
 * <StructuralPatternPanel discoveryId={id} signature="W U" reason="QUANTITY_IN_PHRASE" fixtureBlock={json} mentionCount={2} onMarked={go} deferButton={<Button>Defer</Button>} />
 */
export function StructuralPatternPanel({
  discoveryId,
  signature,
  reason,
  fixtureBlock,
  mentionCount,
  onMarkNoise,
  onMarked,
  deferButton,
}: StructuralPatternPanelProps): ReactNode {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const command = `yarn workspace @peas/parser pull:fixtures --discovery ${discoveryId}`;
  const lineCount = `${mentionCount} ${mentionCount === 1 ? "line" : "lines"}`;

  async function copyBlock(text: string) {
    try {
      await window.navigator.clipboard.writeText(text);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Could not copy; select the block and copy it");
    }
  }

  return (
    <section
      aria-labelledby="structure-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="structure-heading"
          className="text-base font-semibold text-greyscale-900"
        >
          Teach the grammar
        </h2>
        <p className="text-sm text-greyscale-700">
          {reason && STRUCTURAL_REASON_LABELS[reason]
            ? `${STRUCTURAL_REASON_LABELS[reason]} `
            : null}
          Structure can&apos;t be fixed from the review queue: add these lines
          as golden cases, change the grammar, bump the parser version, check
          the dry-run reparse, then reparse from the Health tab.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            id="fixture-heading"
            className="text-sm font-medium text-greyscale-900"
          >
            Export as fixtures
          </h3>
          {fixtureBlock ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyBlock(fixtureBlock)}
            >
              Copy fixtures
            </Button>
          ) : null}
        </div>
        {fixtureBlock ? (
          <pre
            aria-labelledby="fixture-heading"
            tabIndex={0}
            className="max-h-72 overflow-auto rounded-md bg-greyscale-50 p-3 text-xs text-greyscale-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {fixtureBlock}
          </pre>
        ) : (
          <p className="text-sm text-greyscale-600">
            No stored line shows “{signature}” any more.
          </p>
        )}
        <p role="status" className="text-xs text-greyscale-700">
          {copyStatus}
        </p>
        <p className="text-xs text-greyscale-600">
          Paste the cases into{" "}
          <code>packages/parser/fixtures/golden/structural.dev.json</code> and
          fill in each expected value, or write them to a pending file with{" "}
          <code>{command}</code>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onMarkNoise ? (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="outline">
                Mark as noise
              </Button>
            }
            title={`Mark “${signature}” as noise?`}
            description={`Its ${lineCount} are set aside as not ingredient lines (a heading or an OCR artifact): they leave mentions, counts, and reparsing, and the pattern leaves the queue.`}
            confirmLabel="Mark as noise"
            onConfirm={async () => {
              const result = await onMarkNoise(discoveryId);
              if (result.success) {
                const count = result.data?.linesDeactivated ?? 0;
                onMarked(
                  `Marked “${signature}” as noise; ${count} ${count === 1 ? "line" : "lines"} set aside`
                );
              }
              return result;
            }}
          />
        ) : null}
        {deferButton}
      </div>
    </section>
  );
}
