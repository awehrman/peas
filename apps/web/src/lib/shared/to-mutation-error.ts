import type { MutationResult } from "@peas/features";
import { ZodError } from "zod";

/**
 * Converts anything thrown inside a server action into a failed result the
 * client can display.
 */
export function toMutationError(error: unknown): MutationResult<never> {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return {
      success: false,
      message: firstIssue
        ? `${firstIssue.path.join(".") || "input"}: ${firstIssue.message}`
        : "Invalid input",
    };
  }

  console.error("Server action failed:", error);

  return {
    success: false,
    message: error instanceof Error ? error.message : "Something went wrong",
  };
}
