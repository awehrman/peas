import type { StatusMetadata } from "../../types/core";
import { STATUS_CONTEXT } from "../status-contexts";
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
  sourceIds: string[];
}

export const BASE_STEP_DEFS: StepDef[] = [
  {
    id: "cleaning",
    name: "Cleaning",
    sourceIds: ["clean_html", "file_cleaning"],
  },
  {
    id: "saving_note",
    name: "Saving Note",
    sourceIds: ["save_note", "note_creation"],
  },
  {
    id: "ingredient_processing",
    name: "Ingredient Processing",
    sourceIds: ["ingredient_processing"],
  },
  {
    id: "instruction_processing",
    name: "Instruction Processing",
    sourceIds: ["instruction_processing"],
  },
  {
    id: "connecting_source",
    name: "Connecting Source",
    sourceIds: [
      STATUS_CONTEXT.PROCESS_SOURCE,
      STATUS_CONTEXT.SOURCE_CONNECTION,
    ],
  },
  {
    id: "adding_images",
    name: "Adding Images",
    sourceIds: ["image_processing"],
  },
  {
    id: "adding_categories",
    name: "Adding Categories",
    sourceIds: ["categorization_save_complete", "categorization_save"],
  },
  {
    id: "adding_tags",
    name: "Adding Tags",
    sourceIds: ["tag_save_complete", "tag_save"],
  },
  {
    id: "check_duplicates",
    name: "Check Duplicates",
    sourceIds: [
      STATUS_CONTEXT.CHECK_DUPLICATES,
      STATUS_CONTEXT.CHECK_DUPLICATES_LEGACY,
    ],
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
