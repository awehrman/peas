import type { ProcessingStep } from "../status-parser";

export const STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const STATUS_ICON = {
  [STATUS.COMPLETED]: "✓",
  [STATUS.PROCESSING]: "...",
  [STATUS.FAILED]: "✗",
  [STATUS.PENDING]: "○",
  DUPLICATE: "!",
} as const;

export const STATUS_COLOR = {
  [STATUS.COMPLETED]: "bg-success-500",
  [STATUS.PROCESSING]: "bg-info-500",
  [STATUS.PENDING]: "bg-greyscale-300",
  [STATUS.FAILED]: "bg-error-500",
} as const;

export const STATUS_TEXT = {
  [STATUS.COMPLETED]: "text-success-700",
  [STATUS.PROCESSING]: "text-info-700",
  [STATUS.PENDING]: "text-greyscale-500",
  [STATUS.FAILED]: "text-error-700",
} as const;

export interface StepDef {
  id: string;
  name: string;
}

export const BASE_STEP_DEFS: StepDef[] = [
  {
    id: "cleaning",
    name: "Cleaning",
  },
  {
    id: "saving_note",
    name: "Saving Note",
  },
  {
    id: "ingredient_processing",
    name: "Ingredient Processing",
  },
  {
    id: "instruction_processing",
    name: "Instruction Processing",
  },
  {
    id: "connecting_source",
    name: "Connecting Source",
  },
  {
    id: "adding_images",
    name: "Adding Images",
  },
  {
    id: "adding_categories",
    name: "Adding Categories",
  },
  {
    id: "adding_tags",
    name: "Adding Tags",
  },
  {
    id: "check_duplicates",
    name: "Check Duplicates",
  },
];

export function getDefaultStatusMessage(
  stepName: string,
  status: ProcessingStep["status"]
): string {
  switch (status) {
    case STATUS.PENDING:
      return `${stepName} not started`;
    case STATUS.PROCESSING:
      return `${stepName} is processing`;
    case STATUS.FAILED:
      return `${stepName} failed`;
    case STATUS.COMPLETED:
    default:
      return `${stepName} completed`;
  }
}
