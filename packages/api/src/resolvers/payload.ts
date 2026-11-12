import { GraphQLError } from "graphql";
import { ZodError } from "zod";

import { EMPTY_MUTATION_EFFECT, type MutationEffect } from "../effects";

export interface FailurePayload {
  success: false;
  message: string;
  effect: MutationEffect;
}

/**
 * Converts an expected mutation failure (validation, domain rule) into a
 * payload the client can display. Authentication errors are rethrown so they
 * surface as GraphQL errors.
 */
export function toFailurePayload(error: unknown): FailurePayload {
  if (error instanceof GraphQLError) throw error;

  return {
    success: false,
    message: toFailureMessage(error),
    effect: EMPTY_MUTATION_EFFECT,
  };
}

export function failure(message: string): FailurePayload {
  return { success: false, message, effect: EMPTY_MUTATION_EFFECT };
}

function toFailureMessage(error: unknown): string {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return firstIssue
      ? `${firstIssue.path.join(".") || "input"}: ${firstIssue.message}`
      : "Invalid input";
  }

  console.error("Mutation failed:", error);
  return error instanceof Error ? error.message : "Something went wrong";
}
