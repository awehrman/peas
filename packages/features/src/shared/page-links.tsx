"use client";

import type { ReactNode } from "react";

import { buttonVariants, cn } from "@peas/components";

import { AppLink } from "../app-navigation";

interface PageLinksProps {
  page: number;
  pageSize: number;
  total: number;
  getHref: (page: number) => string;
  label: string;
}

/**
 * Previous/next links with a "Page x of y" summary.
 */
export function PageLinks({
  page,
  pageSize,
  total,
  getHref,
  label,
}: PageLinksProps): ReactNode {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  const linkClassName = cn(buttonVariants({ variant: "outline", size: "sm" }));
  const disabledClassName = cn(linkClassName, "pointer-events-none opacity-50");

  return (
    <nav aria-label={label} className="flex items-center gap-3">
      {hasPrevious ? (
        <AppLink href={getHref(page - 1)} className={linkClassName}>
          Previous
        </AppLink>
      ) : (
        <span className={disabledClassName} aria-disabled="true">
          Previous
        </span>
      )}
      <span className="text-sm text-greyscale-600">
        Page {page} of {totalPages}
      </span>
      {hasNext ? (
        <AppLink href={getHref(page + 1)} className={linkClassName}>
          Next
        </AppLink>
      ) : (
        <span className={disabledClassName} aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}
