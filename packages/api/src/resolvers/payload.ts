import { Prisma } from "@peas/database";
import { GraphQLError } from "graphql";
import { ZodError } from "zod";

import { EMPTY_MUTATION_EFFECT, type MutationEffect } from "../effects.js";

export interface FailurePayload {
  success: false;
  message: string;
  effect: MutationEffect;
}

/**
 * Converts an expected mutation failure (validation, domain rule) into a payload the client can display. Authentication errors are rethrown so they surface as GraphQL errors. Database errors are logged and replaced with a plain message so query details never reach the browser.
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

const PRISMA_MESSAGES: Record<string, string> = {
  P2002: "That value is already in use",
  P2025: "That item no longer exists",
};

function isPrismaError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError
  );
}

function toFailureMessage(error: unknown): string {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return firstIssue
      ? `${firstIssue.path.join(".") || "input"}: ${firstIssue.message}`
      : "Invalid input";
  }

  console.error("Mutation failed:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_MESSAGES[error.code] ?? "The database rejected that change";
  }
  if (isPrismaError(error)) return "The database rejected that change";
  return error instanceof Error ? error.message : "Something went wrong";
}
