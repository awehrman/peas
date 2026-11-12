"use client";

import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  memo,
  useMemo,
  useState,
} from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@peas/components";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CookingPot,
  Loader2,
  XCircle,
} from "lucide-react";
import { FixedSizeList, areEqual } from "react-window";

import { AppLink } from "../../app-navigation";
import { formatCount } from "../../dashboard/components/stat-charts";
import {
  type ImportRow,
  type ImportRowStatus,
  type ImportRowStepState,
  type ImportSummary,
  formatSource,
} from "../utils/import-rows";

const ROW_HEIGHT = 64;
const MAX_LIST_HEIGHT = ROW_HEIGHT * 8;

type FilterKey = "all" | "active" | "attention" | "imported";

const FILTER_STATUSES: Record<FilterKey, readonly ImportRowStatus[] | null> = {
  all: null,
  active: ["uploading", "queued", "importing"],
  attention: ["needsAttention", "uploadFailed"],
  imported: ["imported"],
};

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All",
  active: "In progress",
  attention: "Needs a look",
  imported: "Imported",
};

const STEP_COLORS: Record<ImportRowStepState, string> = {
  done: "bg-primary-500",
  active: "bg-secondary-400 motion-safe:animate-pulse",
  error: "bg-warning-400",
  pending: "bg-greyscale-200",
};

interface ImportNoteListProps {
  rows: ImportRow[];
  summary: ImportSummary;
}

/** One compact row per note, windowed so large exports stay fast. */
export function ImportNoteList({ rows, summary }: ImportNoteListProps): ReactNode {
  const [filter, setFilter] = useState<FilterKey>("all");

  const visibleRows = useMemo(() => {
    const statuses = FILTER_STATUSES[filter];
    return statuses ? rows.filter((row) => statuses.includes(row.status)) : rows;
  }, [rows, filter]);

  const filterCounts: Record<FilterKey, number> = {
    all: summary.total,
    active: summary.counts.uploading + summary.counts.queued + summary.counts.importing,
    attention: summary.counts.needsAttention + summary.counts.uploadFailed,
    imported: summary.counts.imported,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Notes
        </CardTitle>
        <CardDescription>Notes that need a look come first, then the ones importing now</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          role="group"
          aria-label="Filter notes"
          className="inline-flex flex-wrap items-center self-start rounded-lg bg-muted p-1 text-muted-foreground"
        >
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === key && "bg-background text-foreground shadow-xs"
              )}
            >
              {FILTER_LABELS[key]}
              <span className="tabular-nums opacity-70">{formatCount(filterCounts[key])}</span>
            </button>
          ))}
        </div>

        {visibleRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No notes here right now.</p>
        ) : (
          <FixedSizeList<ImportRow[]>
            height={Math.min(visibleRows.length * ROW_HEIGHT, MAX_LIST_HEIGHT)}
            width="100%"
            itemCount={visibleRows.length}
            itemSize={ROW_HEIGHT}
            itemData={visibleRows}
            itemKey={(index, data) => data[index]?.id ?? index}
            overscanCount={6}
            outerElementType={ScrollRegion}
            innerElementType="ul"
            className="rounded-md border"
          >
            {NoteRow}
          </FixedSizeList>
        )}
      </CardContent>
    </Card>
  );
}

const ScrollRegion = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ScrollRegion(props, ref) {
    return <div ref={ref} role="region" tabIndex={0} aria-label="Note list" {...props} />;
  }
);

interface NoteRowProps {
  index: number;
  style: CSSProperties;
  data: ImportRow[];
}

const NoteRow = memo(function NoteRow({ index, style, data }: NoteRowProps): ReactNode {
  const row = data[index];
  if (!row) return null;

  const source = row.source ? formatSource(row.source) : null;
  const hasError = row.status === "needsAttention" || row.status === "uploadFailed";

  return (
    <li
      style={style}
      className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b px-3 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,14rem)_3.5rem]"
    >
      <Thumbnail url={row.thumbnailUrl} />

      <div className="min-w-0">
        <p className="truncate text-sm font-medium" title={row.title}>
          {row.noteId ? (
            <AppLink href={`/notes/${row.noteId}`} className="hover:underline">
              {row.title}
            </AppLink>
          ) : (
            row.title
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {hasError && row.errorMessage ? (
            <span className="text-error-700" title={row.errorMessage}>
              {row.errorMessage}
            </span>
          ) : (
            <>
              {source ? (
                source.href ? (
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {source.label}
                  </a>
                ) : (
                  <span>{source.label}</span>
                )
              ) : null}
              <span className="sm:hidden">
                {source ? " · " : ""}
                {row.activity}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="min-w-0 space-y-1.5 max-sm:hidden">
        <StepStrip steps={row.steps} />
        <p className="truncate text-xs text-muted-foreground" title={row.activity}>
          {row.activity}
        </p>
      </div>

      <StatusIndicator status={row.status} progress={row.progress} />
    </li>
  );
}, areEqual);

function Thumbnail({ url }: { url?: string }): ReactNode {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (url && failedUrl !== url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        width={40}
        height={40}
        onError={() => setFailedUrl(url)}
        className="h-10 w-10 rounded-md bg-greyscale-100 object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-md bg-greyscale-100 text-greyscale-400"
      aria-hidden="true"
    >
      <CookingPot className="h-5 w-5" />
    </div>
  );
}

function StepStrip({ steps }: { steps: ImportRow["steps"] }): ReactNode {
  return (
    <div className="flex gap-0.5" aria-hidden="true">
      {steps.map((step) => (
        <span
          key={step.key}
          title={`${step.label}: ${step.state}`}
          className={cn("h-1.5 flex-1 rounded-full", STEP_COLORS[step.state])}
        />
      ))}
    </div>
  );
}

function StatusIndicator({
  status,
  progress,
}: {
  status: ImportRowStatus;
  progress: number;
}): ReactNode {
  const iconClassName = "ml-auto h-5 w-5 shrink-0";

  switch (status) {
    case "imported":
      return <CheckCircle2 className={cn(iconClassName, "text-primary-600")} aria-label="Imported" />;
    case "needsAttention":
      return (
        <AlertTriangle className={cn(iconClassName, "text-warning-600")} aria-label="Needs a look" />
      );
    case "uploadFailed":
      return <XCircle className={cn(iconClassName, "text-error-600")} aria-label="Upload failed" />;
    case "uploading":
      return (
        <Loader2
          className={cn(iconClassName, "text-greyscale-500 motion-safe:animate-spin")}
          aria-label="Uploading"
        />
      );
    case "queued":
      return <Clock className={cn(iconClassName, "text-greyscale-400")} aria-label="Waiting" />;
    case "importing":
      return (
        <span className="ml-auto text-sm font-semibold tabular-nums text-secondary-700">
          {progress}%
        </span>
      );
  }
}
