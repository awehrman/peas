"use client";

import { Fragment, type ReactNode } from "react";

import { cn } from "@peas/components";

import { AppLink } from "../app-navigation";

import { KNOWN_SEGMENT_TYPES, SEGMENT_TYPE_LABELS, getSegmentClassName } from "./segment-styles";
import type { ParsedLineSegment, ParsedLineStatus } from "./types";

interface ParsedLineProps {
  reference: string;
  segments: ParsedLineSegment[];
  parseStatus?: ParsedLineStatus;
  getIngredientHref?: (ingredientId: string) => string;
  className?: string;
}

/**
 * Renders a parsed ingredient line with each segment styled by type.
 * Falls back to the raw reference when the line has no segments.
 */
export function ParsedLine({
  reference,
  segments,
  parseStatus,
  getIngredientHref,
  className,
}: ParsedLineProps): ReactNode {
  const hasError = parseStatus === "COMPLETED_WITH_ERROR";
  const isPending = parseStatus === "AWAITING_PARSING";
  const ordered = [...segments].sort((a, b) => a.index - b.index);

  if (ordered.length === 0) {
    return (
      <span
        className={cn(
          hasError && "text-error-700 underline decoration-wavy decoration-error-400",
          isPending && "text-greyscale-500 italic",
          className
        )}
        title={hasError ? "This line could not be parsed" : undefined}
      >
        {reference}
      </span>
    );
  }

  return (
    <span className={className}>
      {ordered.map((segment, position) => {
        const needsSpace = position > 0 && !/^[,.;:)\]]/.test(segment.value);
        const segmentClassName = getSegmentClassName(segment.type);
        const label = SEGMENT_TYPE_LABELS[segment.type] ?? segment.type;
        const title = segment.rule ? `${label}: ${segment.rule}` : label;
        const href =
          segment.ingredientId && getIngredientHref
            ? getIngredientHref(segment.ingredientId)
            : undefined;

        return (
          <Fragment key={`${segment.index}-${segment.type}`}>
            {needsSpace ? " " : null}
            {href ? (
              <AppLink
                href={href}
                className={cn(segmentClassName, "hover:underline")}
              >
                <span title={title} data-segment-type={segment.type}>
                  {segment.value}
                </span>
              </AppLink>
            ) : (
              <span
                className={segmentClassName}
                title={title}
                data-segment-type={segment.type}
              >
                {segment.value}
              </span>
            )}
          </Fragment>
        );
      })}
    </span>
  );
}

export function ParsedLineLegend(): ReactNode {
  return (
    <ul className="flex flex-wrap gap-3 text-xs" aria-label="Segment types">
      {KNOWN_SEGMENT_TYPES.map((type) => (
        <li key={type} className={getSegmentClassName(type)}>
          {SEGMENT_TYPE_LABELS[type]}
        </li>
      ))}
    </ul>
  );
}
