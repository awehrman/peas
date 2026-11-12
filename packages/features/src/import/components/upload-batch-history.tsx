"use client";

import { cn } from "@peas/components";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { VariableSizeList, areEqual } from "react-window";

import type { UploadBatch } from "../types/import-types";

const SINGLE_LINE_ROW_HEIGHT = 32;
const FAILURE_ROW_HEIGHT = 48;
const MAX_LIST_HEIGHT = 256;

type RowState = "uploading" | "failed" | "uploaded";

interface HistoryRow {
  batch: UploadBatch;
  state: RowState;
}

interface UploadBatchHistoryProps {
  batches: UploadBatch[];
  /** The note being uploaded right now, shown as the first row */
  currentBatch?: UploadBatch;
  className?: string;
}

/**
 * Compact, windowed list of uploaded notes. The note in flight sits on top,
 * then failures so they don't get lost, then the most recent uploads.
 */
export function UploadBatchHistory({
  batches,
  currentBatch,
  className,
}: UploadBatchHistoryProps) {
  const rows = useMemo(() => orderRows(batches, currentBatch), [batches, currentBatch]);
  const failedCount = useMemo(
    () => rows.filter((row) => row.state === "failed").length,
    [rows]
  );

  const listRef = useRef<VariableSizeList<HistoryRow[]>>(null);

  const getItemSize = useCallback(
    (index: number) => getRowHeight(rows[index]),
    [rows]
  );

  useLayoutEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [rows]);

  if (rows.length === 0) return null;

  const contentHeight = rows.reduce((sum, row) => sum + getRowHeight(row), 0);
  const uploadedCount = batches.length - failedCount;

  return (
    <div className={cn("mt-4 flex min-h-0 flex-col gap-2", className)}>
      <p className="text-sm text-greyscale-600" aria-live="polite">
        {uploadedCount} uploaded
        {failedCount > 0 ? (
          <span className="text-error-700">, {failedCount} failed</span>
        ) : null}
      </p>
      <VariableSizeList<HistoryRow[]>
        ref={listRef}
        height={Math.min(contentHeight, MAX_LIST_HEIGHT)}
        width="100%"
        itemCount={rows.length}
        itemSize={getItemSize}
        itemData={rows}
        itemKey={(index, data) => data[index]?.batch.importId ?? index}
        overscanCount={8}
        outerElementType={ScrollRegion}
        innerElementType="ul"
        className="rounded-md border text-sm"
      >
        {BatchRow}
      </VariableSizeList>
    </div>
  );
}

const ScrollRegion = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ScrollRegion(props, ref) {
    return <div ref={ref} tabIndex={0} aria-label="Uploaded notes" {...props} />;
  }
);

interface BatchRowProps {
  index: number;
  style: CSSProperties;
  data: HistoryRow[];
}

const BatchRow = memo(function BatchRow({ index, style, data }: BatchRowProps): ReactNode {
  const row = data[index];
  if (!row) return null;

  const { batch, state } = row;
  const label = batch.directoryName ?? `${batch.numberOfFiles} files`;

  return (
    <li style={style} className="flex items-start gap-2 border-b px-3 py-1.5 last:border-b-0">
      <RowIcon state={state} />
      <span className="min-w-0 flex-1">
        <span className="block truncate" title={label}>
          {label}
        </span>
        {state === "failed" ? (
          <span className="block truncate text-xs text-error-700" title={batch.errorMessage}>
            {batch.errorMessage}
          </span>
        ) : null}
      </span>
      {state === "uploading" ? (
        <span className="shrink-0 text-xs text-greyscale-500">Uploading…</span>
      ) : null}
    </li>
  );
}, areEqual);

function RowIcon({ state }: { state: RowState }): ReactNode {
  const className = "mt-0.5 h-4 w-4 shrink-0";

  if (state === "uploading") {
    return (
      <Loader2
        className={cn(className, "text-greyscale-500 motion-safe:animate-spin")}
        aria-label="Uploading"
      />
    );
  }
  if (state === "failed") {
    return <XCircle className={cn(className, "text-error-600")} aria-label="Failed" />;
  }
  return <CheckCircle2 className={cn(className, "text-success-700")} aria-label="Uploaded" />;
}

function getRowHeight(row: HistoryRow | undefined): number {
  return row?.state === "failed" ? FAILURE_ROW_HEIGHT : SINGLE_LINE_ROW_HEIGHT;
}

function orderRows(batches: UploadBatch[], currentBatch?: UploadBatch): HistoryRow[] {
  const failed: HistoryRow[] = [];
  const uploaded: HistoryRow[] = [];

  for (let i = batches.length - 1; i >= 0; i--) {
    const batch = batches[i];
    if (!batch) continue;
    if (batch.errorMessage) failed.push({ batch, state: "failed" });
    else uploaded.push({ batch, state: "uploaded" });
  }

  const inFlight: HistoryRow[] = currentBatch ? [{ batch: currentBatch, state: "uploading" }] : [];
  return [...inFlight, ...failed, ...uploaded];
}
