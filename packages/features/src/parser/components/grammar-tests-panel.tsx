"use client";

import { Fragment, type ReactNode, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Placeholder,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@peas/components";
import { CheckCircle2, ChevronRight, FlaskConical, Pencil, Play, Plus, Trash2, XCircle } from "lucide-react";

import { getSegmentClassName } from "../../parsed-line";
import { ConfirmDialog, InlineError, type MutationAction, useMutation } from "../../shared";
import type {
  GrammarTestComparison,
  GrammarTestDraft,
  GrammarTestExpectationView,
  GrammarTestResultView,
  GrammarTestSuiteView,
  GrammarTestView,
} from "../types";

import { formatCompileError } from "./compiled-grammar-panel";
import { GrammarTestDialog, type PreviewStaticParse } from "./grammar-test-dialog";

export interface GrammarTestActions {
  onCreateTest: MutationAction<[draft: GrammarTestDraft]>;
  onUpdateTest: MutationAction<[id: string, draft: GrammarTestDraft]>;
  onDeleteTest: MutationAction<[id: string]>;
  onRunTests: MutationAction<[], GrammarTestComparison>;
  onPreviewStaticParse: PreviewStaticParse;
}

interface GrammarTestsPanelProps extends GrammarTestActions {
  tests: GrammarTestView[];
  comparison: GrammarTestComparison;
}

export function GrammarTestsPanel({
  tests,
  comparison: initialComparison,
  onCreateTest,
  onUpdateTest,
  onDeleteTest,
  onRunTests,
  onPreviewStaticParse,
}: GrammarTestsPanelProps): ReactNode {
  const [rerun, setRerun] = useState<{ basis: GrammarTestComparison; result: GrammarTestComparison } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const run = useMutation(onRunTests);

  // Server data wins after a refresh; a manual re-run only applies to the data it ran against.
  const comparison =
    rerun && rerun.basis === initialComparison ? rerun.result : initialComparison;

  async function handleRun() {
    const result = await run.run();
    if (result.success && result.data) setRerun({ basis: initialComparison, result: result.data });
  }

  const firstCompileError = comparison.databaseErrors[0];
  const staticById = new Map(comparison.staticV1.results.map((result) => [result.id, result]));
  const databaseById = new Map(comparison.database?.results.map((result) => [result.id, result]) ?? []);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>
          <h2>Grammar tests ({tests.length})</h2>
        </CardTitle>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleRun} disabled={run.isPending || tests.length === 0}>
            <Play aria-hidden="true" />
            {run.isPending ? "Running..." : "Run tests"}
          </Button>
          <GrammarTestDialog
            idPrefix="new-test"
            title="Add grammar test"
            initialDraft={{ reference: "", expectations: [] }}
            onSave={onCreateTest}
            onPreview={onPreviewStaticParse}
            trigger={
              <Button type="button">
                <Plus aria-hidden="true" />
                Add test
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <InlineError message={run.error} />
        <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
          <SuiteSummary title="Static v1 grammar" suite={comparison.staticV1} />
          <SuiteSummary
            title="Database grammar"
            suite={comparison.database}
            emptyMessage={
              firstCompileError
                ? `Doesn't compile: ${formatCompileError(firstCompileError)}`
                : "No rules yet"
            }
          />
        </div>

        {tests.length === 0 ? (
          <Placeholder
            label="No tests yet. Add one here, or use the flask button on a note's ingredient line."
            icon={<FlaskConical />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <span className="sr-only">Details</span>
                </TableHead>
                <TableHead>Line</TableHead>
                <TableHead>Static v1</TableHead>
                <TableHead>Database</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => {
                const isExpanded = expandedId === test.id;
                const staticResult = staticById.get(test.id);
                const databaseResult = databaseById.get(test.id);
                return (
                  <Fragment key={test.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-expanded={isExpanded}
                          aria-controls={`test-${test.id}-details`}
                          aria-label={`${isExpanded ? "Hide" : "Show"} details for "${test.reference}"`}
                          onClick={() => setExpandedId(isExpanded ? null : test.id)}
                        >
                          <ChevronRight
                            aria-hidden="true"
                            className={cn("transition-transform", isExpanded && "rotate-90")}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono">{test.reference}</TableCell>
                      <TableCell>
                        <ResultBadge result={staticResult} />
                      </TableCell>
                      <TableCell>
                        <ResultBadge result={databaseResult} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <GrammarTestDialog
                            idPrefix={`test-${test.id}`}
                            title="Edit grammar test"
                            initialDraft={{ reference: test.reference, expectations: test.expectations }}
                            onSave={(draft) => onUpdateTest(test.id, draft)}
                            onPreview={onPreviewStaticParse}
                            trigger={
                              <Button type="button" variant="ghost" size="icon" aria-label={`Edit test "${test.reference}"`}>
                                <Pencil aria-hidden="true" />
                              </Button>
                            }
                          />
                          <ConfirmDialog
                            title="Delete this test?"
                            description={`"${test.reference}" will no longer be checked.`}
                            confirmLabel="Delete test"
                            onConfirm={() => onDeleteTest(test.id)}
                            trigger={
                              <Button type="button" variant="ghost" size="icon" aria-label={`Delete test "${test.reference}"`}>
                                <Trash2 aria-hidden="true" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded ? (
                      <TableRow id={`test-${test.id}-details`}>
                        <TableCell />
                        <TableCell colSpan={4}>
                          <div className="grid gap-4 py-2 md:grid-cols-3">
                            <SegmentColumn title="Expected" segments={test.expectations} />
                            <ResultColumn title="Static v1 returned" result={staticResult} />
                            <ResultColumn title="Database grammar returned" result={databaseResult} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SuiteSummary({
  title,
  suite,
  emptyMessage,
}: {
  title: string;
  suite: GrammarTestSuiteView | null;
  emptyMessage?: string;
}): ReactNode {
  const allPassed = suite !== null && suite.total > 0 && suite.passed === suite.total;
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm text-greyscale-600">{title}</p>
      {suite ? (
        <p className={cn("text-2xl font-semibold", allPassed ? "text-success-800" : "text-greyscale-900")}>
          {suite.passed} / {suite.total} passing
        </p>
      ) : (
        <p className="text-sm text-greyscale-700">{emptyMessage}</p>
      )}
    </div>
  );
}

function ResultBadge({ result }: { result?: GrammarTestResultView }): ReactNode {
  if (!result) return <span className="text-sm text-greyscale-500">Not run</span>;

  return result.passed ? (
    <span className="inline-flex items-center gap-1 text-sm text-success-800">
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      Pass
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm text-error-700">
      <XCircle className="h-4 w-4" aria-hidden="true" />
      {result.error ? "Error" : "Fail"}
    </span>
  );
}

function SegmentColumn({
  title,
  segments,
}: {
  title: string;
  segments: GrammarTestExpectationView[];
}): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium uppercase tracking-wide text-greyscale-600">{title}</h3>
      {segments.length === 0 ? (
        <p className="text-sm text-greyscale-500">Nothing</p>
      ) : (
        <ol className="flex flex-col gap-0.5 text-sm">
          {segments.map((segment, index) => (
            <li key={`${index}-${segment.type}-${segment.value}`} className="flex gap-2">
              <span className="w-24 shrink-0 text-xs text-greyscale-500">{segment.type}</span>
              <span className={getSegmentClassName(segment.type)}>{segment.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ResultColumn({ title, result }: { title: string; result?: GrammarTestResultView }): ReactNode {
  if (!result) {
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-greyscale-600">{title}</h3>
        <p className="text-sm text-greyscale-500">Not run</p>
      </div>
    );
  }
  if (result.error) {
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-greyscale-600">{title}</h3>
        <p className="text-sm text-error-700">{result.error}</p>
      </div>
    );
  }
  return <SegmentColumn title={title} segments={result.actual} />;
}
