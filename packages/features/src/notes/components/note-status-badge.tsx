import type { ReactNode } from "react";

import { Badge, cn } from "@peas/components";

import type { NoteStatus } from "../types";

const STATUS_STYLES: Record<NoteStatus, string> = {
  PENDING: "bg-greyscale-100 text-greyscale-700",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-success-100 text-success-800",
  FAILED: "bg-error-100 text-error-800",
  DUPLICATE: "bg-amber-100 text-amber-800",
};

const STATUS_LABELS: Record<NoteStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DUPLICATE: "Duplicate",
};

interface NoteStatusBadgeProps {
  status: NoteStatus;
  duplicateConfidence?: number | null;
}

export function getNoteStatusLabel(status: NoteStatus): string {
  return STATUS_LABELS[status];
}

export function NoteStatusBadge({
  status,
  duplicateConfidence,
}: NoteStatusBadgeProps): ReactNode {
  const confidence =
    status === "DUPLICATE" && typeof duplicateConfidence === "number"
      ? ` (${Math.round(duplicateConfidence * 100)}%)`
      : "";

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", STATUS_STYLES[status])}
    >
      {STATUS_LABELS[status]}
      {confidence}
    </Badge>
  );
}
