// Core worker infrastructure
export * from "./core";

// Shared utilities
export * from "./shared";

// Domain-specific workers
export * from "./note";
export * from "./instruction";
export * from "./ingredient";
export * from "./pattern-tracking";

// Explicitly re-export BaseJobData to avoid conflicts
export type { BaseJobData } from "./types";

// Factory functions
export { createNoteWorker } from "./note";
export { createInstructionWorker } from "./instruction";
export { createIngredientWorker } from "./ingredient";
export { createPatternTrackingWorker } from "./pattern-tracking";
