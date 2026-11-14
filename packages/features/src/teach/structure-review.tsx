"use client";

import { type ReactNode, useId, useState } from "react";

import { Badge, Button, Label, cn } from "@peas/components";

import { AppLink, useAppNavigation } from "../app-navigation";
import { formatCount } from "../dashboard/components/stat-charts";
import {
  ConfirmDialog,
  type MutationAction,
  PageLinks,
  formatDate,
  useMutation,
} from "../shared";

export const STRUCTURE_LABELS = [
  "INGREDIENT",
  "INSTRUCTION",
  "SECTION_HEADING",
  "NOTE",
  "OTHER",
] as const;
export type StructureLabel = (typeof STRUCTURE_LABELS)[number];

const KIND_NAMES: Record<string, string> = {
  INGREDIENT: "ingredient",
  INSTRUCTION: "step",
  SECTION_HEADING: "heading",
  NOTE: "note",
  OTHER: "other text",
};

/** "heading", or for a split "heading + step". */
export function describeStructureLabel(label: string): string {
  return label
    .split("+")
    .map((kind) => KIND_NAMES[kind] ?? kind.toLowerCase())
    .join(" + ");
}

export interface StructureProposalData {
  id: string;
  noteId: string;
  noteTitle: string | null;
  contentIndex: number;
  text: string;
  assignedKind: string;
  proposalType: string;
  proposedLabel: string;
  parts: { kind: string; text: string }[];
  patternKey: string;
  margin: number;
  signals: { id: string; kind: string; weight: number; text?: string | null }[];
  status: string;
  decidedLabel: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  before: { contentIndex: number; text: string }[];
  after: { contentIndex: number; text: string }[];
}

export interface StructurePatternData {
  patternKey: string;
  proposedLabel: string;
  open: number;
  approved: number;
  rejected: number;
  changed: number;
  notes: number;
  precision: number | null;
  scope: string;
  topSourceLabel: string | null;
  topSourceShare: number | null;
  canAutoApply: boolean;
}

export interface StructureReviewData {
  counts: {
    open: number;
    decided: number;
    byPattern: { patternKey: string; open: number }[];
  };
  proposals: {
    items: StructureProposalData[];
    total: number;
    page: number;
    pageSize: number;
  };
  patterns: StructurePatternData[];
}

/**
 * @example
 * { action: "CHANGE", label: "NOTE" }
 */
export type StructureDecisionInput =
  | { action: "APPROVE" }
  | { action: "REJECT" }
  | { action: "CHANGE"; label: StructureLabel };

export interface StructureReviewActions {
  onDecide: MutationAction<
    [proposalId: string, decision: StructureDecisionInput]
  >;
  onUndo: MutationAction<[proposalId: string]>;
  onDecidePattern: MutationAction<
    [patternKey: string, decision: StructureDecisionInput]
  >;
}

const SCOPE_NAMES: Record<string, string> = {
  GENERAL: "across sources",
  SOURCE_SPECIFIC: "mostly one source",
  ONE_OFF: "one note",
  UNDECIDED: "too few decisions",
};

/**
 * Builds the tab's URL from its filters.
 *
 * @example
 * structureReviewHref("DECIDED", "SECTION_HEADING:COLON_HEADING", 2) // "/teach/structure?status=DECIDED&pattern=SECTION_HEADING%3ACOLON_HEADING&page=2"
 */
export function structureReviewHref(
  status: "OPEN" | "DECIDED",
  pattern: string | undefined,
  page = 1
): string {
  const params = new URLSearchParams();
  if (status === "DECIDED") params.set("status", status);
  if (pattern) params.set("pattern", pattern);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/teach/structure?${search}` : "/teach/structure";
}

/**
 * Structure review (Phase 8.5-D and 8.5-E): lines the validator thinks the importer misfiled, each with the lines around it, where the importer put it, what the validator proposes and why, and Approve, Not this, Change to, or Undo. A pattern filter groups proposals that fire for the same reason, with "Approve all" for the group; the patterns table shows how reviewers have answered each pattern, whether it holds across sources, and whether its precision earns automatic application.
 *
 * @example
 * <StructureReviewPageContent data={data} status="OPEN" onDecide={decide} onUndo={undo} onDecidePattern={decidePattern} />
 */
export function StructureReviewPageContent({
  data,
  status,
  pattern,
  onDecide,
  onUndo,
  onDecidePattern,
}: {
  data: StructureReviewData;
  status: "OPEN" | "DECIDED";
  pattern?: string;
} & StructureReviewActions): ReactNode {
  const { push } = useAppNavigation();
  const selectId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const patternOpen =
    data.counts.byPattern.find((row) => row.patternKey === pattern)?.open ?? 0;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-greyscale-900">Structure</h1>
        <p className="text-sm text-greyscale-700">
          Lines the importer may have put in the wrong place:{" "}
          {formatCount(data.counts.open)} to review,{" "}
          {formatCount(data.counts.decided)} decided.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <nav aria-label="Structure review status">
          <ul className="flex gap-3">
            {(["OPEN", "DECIDED"] as const).map((value) => (
              <li key={value}>
                <AppLink
                  href={structureReviewHref(value, pattern)}
                  aria-current={value === status ? "page" : undefined}
                  className={cn(
                    "text-sm underline-offset-4",
                    value === status
                      ? "font-medium text-primary underline decoration-2"
                      : "text-greyscale-600 hover:underline"
                  )}
                >
                  {value === "OPEN" ? "To review" : "Decided"}
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-1">
          <Label htmlFor={selectId} className="text-xs">
            Pattern
          </Label>
          <select
            id={selectId}
            value={pattern ?? ""}
            onChange={(event) =>
              push(structureReviewHref(status, event.target.value || undefined))
            }
            className="h-9 min-w-56 rounded-md border border-greyscale-300 bg-white px-2 text-sm"
          >
            <option value="">Every pattern</option>
            {data.counts.byPattern.map((row) => (
              <option key={row.patternKey} value={row.patternKey}>
                {row.patternKey} ({formatCount(row.open)})
              </option>
            ))}
          </select>
        </div>
        {pattern && status === "OPEN" && patternOpen > 0 ? (
          <ConfirmDialog
            trigger={
              <Button type="button" size="sm" variant="outline">
                Approve all {formatCount(patternOpen)}
              </Button>
            }
            title={`Approve every open ${pattern} proposal?`}
            description="Each line is changed as proposed, in its own step, and each can be undone from the Decided list."
            confirmLabel="Approve all"
            onConfirm={async () => {
              const result = await onDecidePattern(pattern, {
                action: "APPROVE",
              });
              setMessage(
                result.success ? (result.message ?? "Applied") : result.message
              );
              return result;
            }}
          />
        ) : null}
      </div>

      {message ? (
        <p role="status" className="text-sm text-greyscale-800">
          {message}
        </p>
      ) : null}

      {data.proposals.items.length === 0 ? (
        <p className="text-sm text-greyscale-700">
          {status === "OPEN" ? "Nothing to review." : "No decisions yet."}
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {data.proposals.items.map((proposal) => (
            <li key={proposal.id}>
              <ProposalCard
                proposal={proposal}
                onDecide={onDecide}
                onUndo={onUndo}
              />
            </li>
          ))}
        </ol>
      )}
      <PageLinks
        page={data.proposals.page}
        pageSize={data.proposals.pageSize}
        total={data.proposals.total}
        getHref={(page) => structureReviewHref(status, pattern, page)}
        label="Structure review pages"
      />

      <PatternTable patterns={data.patterns} />
    </div>
  );
}

function ProposalCard({
  proposal,
  onDecide,
  onUndo,
}: {
  proposal: StructureProposalData;
} & Pick<StructureReviewActions, "onDecide" | "onUndo">): ReactNode {
  const changeId = useId();
  const headingId = useId();
  const decide = useMutation(onDecide);
  const undo = useMutation(onUndo);
  const [changeTo, setChangeTo] = useState<StructureLabel>(
    proposal.proposalType === "SPLIT" ? "SECTION_HEADING" : "NOTE"
  );
  const isOpen = proposal.status === "OPEN";
  const strongest = [...proposal.signals]
    .filter((signal) => signal.id !== "IMPORTER_SECTION")
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 4);
  const error = decide.error ?? undo.error;

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-md border border-greyscale-200 p-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-base font-semibold">
          <AppLink
            href={`/notes/${proposal.noteId}`}
            className="text-primary underline underline-offset-2"
          >
            {proposal.noteTitle ?? "Untitled note"}
          </AppLink>
        </h2>
        <span className="text-xs text-greyscale-600">
          {proposal.patternKey}
        </span>
      </header>
      <ol
        className="flex flex-col gap-0.5 rounded bg-greyscale-50 p-3 font-mono text-sm"
        aria-label="The line in context"
      >
        {proposal.before.map((line) => (
          <li key={line.contentIndex} className="text-greyscale-600">
            {line.text}
          </li>
        ))}
        <li className="font-semibold text-greyscale-900">
          <mark className="rounded-sm bg-primary/15 px-0.5 text-inherit">
            {proposal.text}
          </mark>
        </li>
        {proposal.after.map((line) => (
          <li key={line.contentIndex} className="text-greyscale-600">
            {line.text}
          </li>
        ))}
      </ol>
      <p className="text-sm">
        Filed as{" "}
        <strong>{describeStructureLabel(proposal.assignedKind)}</strong>; looks
        like <strong>{describeStructureLabel(proposal.proposedLabel)}</strong>
        {proposal.parts.length > 0 ? (
          <span className="text-greyscale-700">
            {" "}
            ({proposal.parts.map((part) => `“${part.text}”`).join(" then ")})
          </span>
        ) : null}
        <span className="text-greyscale-600"> · lead {proposal.margin}</span>
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Evidence">
        {strongest.map((signal) => (
          <li key={`${signal.id}:${signal.text ?? ""}`}>
            <Badge variant="outline" className="font-normal">
              {signal.id.toLowerCase().replace(/_/g, " ")}
              {signal.text ? `: ${signal.text}` : ""}
            </Badge>
          </li>
        ))}
      </ul>

      {isOpen ? (
        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={decide.isPending}
            onClick={() => void decide.run(proposal.id, { action: "APPROVE" })}
          >
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={decide.isPending}
            onClick={() => void decide.run(proposal.id, { action: "REJECT" })}
          >
            Not this
          </Button>
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={changeId} className="text-xs">
                Change to
              </Label>
              <select
                id={changeId}
                value={changeTo}
                onChange={(event) =>
                  setChangeTo(event.target.value as StructureLabel)
                }
                className="h-8 rounded-md border border-greyscale-300 bg-white px-2 text-sm"
              >
                {STRUCTURE_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {describeStructureLabel(label)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={decide.isPending}
              onClick={() =>
                void decide.run(proposal.id, {
                  action: "CHANGE",
                  label: changeTo,
                })
              }
            >
              Apply
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            {proposal.status === "REJECTED"
              ? "Kept as filed"
              : `Filed as ${describeStructureLabel(proposal.decidedLabel ?? "")}`}
            {proposal.decidedBy ? ` by ${proposal.decidedBy}` : ""}
            {proposal.decidedAt ? ` on ${formatDate(proposal.decidedAt)}` : ""}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={undo.isPending}
            onClick={() => void undo.run(proposal.id)}
          >
            Undo
          </Button>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </article>
  );
}

function PatternTable({
  patterns,
}: {
  patterns: StructurePatternData[];
}): ReactNode {
  if (patterns.length === 0) return null;
  const percent = (value: number | null) =>
    value === null ? "—" : `${(value * 100).toFixed(0)}%`;
  return (
    <section
      aria-labelledby="structure-patterns"
      className="flex flex-col gap-2"
    >
      <h2
        id="structure-patterns"
        className="text-lg font-semibold text-greyscale-900"
      >
        Patterns
      </h2>
      <p className="text-sm text-greyscale-700">
        How reviewers have answered each pattern. A pattern may be applied
        automatically (yarn workspace @peas/database db:reclassify:structure)
        once 98% of at least 50 decisions approve it.
      </p>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Structure patterns</caption>
        <thead className="border-b border-greyscale-200 text-xs text-greyscale-600">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">
              Pattern
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Open
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Approved
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Rejected or changed
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Precision
            </th>
            <th scope="col" className="py-2 font-medium">
              Scope
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-greyscale-100">
          {patterns.map((row) => (
            <tr key={row.patternKey}>
              <th scope="row" className="py-1.5 pr-3 font-normal">
                {row.patternKey}
                {row.canAutoApply ? (
                  <Badge className="ml-2">can apply automatically</Badge>
                ) : null}
              </th>
              <td className="py-1.5 pr-3 text-right tabular-nums">
                {formatCount(row.open)}
              </td>
              <td className="py-1.5 pr-3 text-right tabular-nums">
                {formatCount(row.approved)}
              </td>
              <td className="py-1.5 pr-3 text-right tabular-nums">
                {formatCount(row.rejected + row.changed)}
              </td>
              <td className="py-1.5 pr-3 text-right tabular-nums">
                {percent(row.precision)}
              </td>
              <td className="py-1.5 text-greyscale-700">
                {SCOPE_NAMES[row.scope] ?? row.scope}
                {row.topSourceLabel && row.topSourceShare !== null
                  ? ` (${percent(row.topSourceShare)} ${row.topSourceLabel})`
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
