"use client";

import { ReactNode } from "react";

import { PaginationControls } from "../pagination-controls";

interface ActivityPaginationProps {
  showPagination: boolean;
  totalItems: number;
  itemsPerPage: number;
  className?: string;
}

export function ActivityPagination({
  showPagination,
  totalItems,
  itemsPerPage,
  className = "",
}: ActivityPaginationProps): ReactNode {
  if (!showPagination || totalItems <= itemsPerPage) {
    return null;
  }

  return (
    <div className={`mt-6 ${className}`}>
      <PaginationControls totalItems={totalItems} />
    </div>
  );
}
