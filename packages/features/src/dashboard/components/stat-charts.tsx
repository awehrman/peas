import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@peas/components";

import { AppLink } from "../../app-navigation";

const numberFormat = new Intl.NumberFormat("en-US");

/** Locale-fixed so server and client render identical text. */
export function formatCount(value: number): string {
  return numberFormat.format(value);
}

/** Whole-number percentage, or an em dash when there is nothing to divide. */
export function formatPercent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: ReactNode;
}): ReactNode {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tabular-nums">
          {formatCount(value)}
        </p>
        {detail ? (
          <div className="text-xs text-muted-foreground">{detail}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function StatCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {title}
        </CardTitle>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export interface BarSegment {
  label: string;
  count: number;
  /** Tailwind background class, e.g. "bg-primary-500". */
  colorClassName: string;
  href?: string;
}

/**
 * One horizontal bar split into proportional segments, with a legend that
 * carries the numbers for screen readers and sighted users alike.
 */
export function StackedBar({
  label,
  segments,
}: {
  label: string;
  segments: BarSegment[];
}): ReactNode {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const visible = segments.filter((segment) => segment.count > 0);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-greyscale-100"
        aria-hidden="true"
      >
        {visible.map((segment) => (
          <div
            key={segment.label}
            className={`${segment.colorClassName} transition-[width] duration-500 ease-out`}
            style={{ width: `${(segment.count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul
        aria-label={label}
        className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3"
      >
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${segment.colorClassName}`}
              aria-hidden="true"
            />
            {segment.href && segment.count > 0 ? (
              <AppLink href={segment.href} className="hover:underline">
                {segment.label}
              </AppLink>
            ) : (
              <span>{segment.label}</span>
            )}
            <span className="ml-auto tabular-nums text-muted-foreground">
              {formatCount(segment.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface RankedItem {
  key: string;
  label: string;
  count: number;
  href?: string;
}

/** A top-N list with bars scaled to the largest count. */
export function RankedList({
  label,
  items,
  unit,
  emptyLabel,
}: {
  label: string;
  items: RankedItem[];
  /** Singular and plural noun for the count, e.g. ["line", "lines"]. */
  unit: [string, string];
  emptyLabel: string;
}): ReactNode {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((item) => item.count));

  return (
    <ol aria-label={label} className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {item.href ? (
              <AppLink href={item.href} className="truncate hover:underline">
                {item.label}
              </AppLink>
            ) : (
              <span className="truncate">{item.label}</span>
            )}
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatCount(item.count)}{" "}
              {item.count === 1 ? unit[0] : unit[1]}
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-greyscale-100"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-primary-400"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Vertical bars per year; each bar's label carries its count. */
export function YearChart({
  label,
  years,
}: {
  label: string;
  years: { year: number; count: number }[];
}): ReactNode {
  const max = Math.max(1, ...years.map((entry) => entry.count));

  return (
    <ol aria-label={label} className="flex h-40 items-end gap-1.5">
      {years.map(({ year, count }) => (
        <li
          key={year}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
        >
          <span
            className="text-[10px] tabular-nums text-muted-foreground"
            aria-hidden="true"
          >
            {formatCount(count)}
          </span>
          <div
            className="w-full max-w-10 rounded-t bg-primary-400"
            style={{ height: `${(count / max) * 100}%` }}
            title={`${year}: ${formatCount(count)}`}
            aria-hidden="true"
          />
          <span className="text-[10px] tabular-nums text-muted-foreground">
            <span className="sr-only">
              {formatCount(count)} {count === 1 ? "note" : "notes"} saved in{" "}
            </span>
            {year}
          </span>
        </li>
      ))}
    </ol>
  );
}
