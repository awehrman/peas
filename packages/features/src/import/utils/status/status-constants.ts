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
  [STATUS.COMPLETED]: "bg-green-500",
  [STATUS.PROCESSING]: "bg-blue-500",
  [STATUS.FAILED]: "bg-red-500",
  [STATUS.PENDING]: "bg-gray-300",
} as const;

export const STATUS_TEXT = {
  [STATUS.COMPLETED]: "text-green-700",
  [STATUS.PROCESSING]: "text-blue-700",
  [STATUS.FAILED]: "text-red-700",
  [STATUS.PENDING]: "text-gray-500",
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
