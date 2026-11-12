"use server";

import { revalidatePath } from "next/cache";

import {
  createGrammarTest,
  createGrammarTestFromIngredientLine,
  deleteGrammarTest,
  updateGrammarTest,
} from "@peas/database";
import type {
  GrammarSegmentView,
  GrammarTestComparison,
  GrammarTestDraft,
  MutationResult,
} from "@peas/features";
import { z } from "zod";

import { parserPath } from "@/paths";

import { requireAdmin } from "../../auth/queries/require-admin";
import { toMutationError } from "../../shared/to-mutation-error";
import { parseWithStaticV1, runGrammarTestComparison } from "../run-grammar-tests";

const draftSchema = z.object({
  reference: z.string().trim().min(1, "Enter the line to test").max(500),
  expectations: z
    .array(
      z.object({
        type: z.string().trim().min(1, "Every expectation needs a type").max(50),
        value: z.string().trim().min(1, "Every expectation needs a value").max(500),
      })
    )
    .min(1, "Add at least one expected segment")
    .max(100),
});

const idSchema = z.string().min(1);

export async function createGrammarTestAction(
  draft: GrammarTestDraft
): Promise<MutationResult> {
  try {
    await requireAdmin();
    await createGrammarTest(draftSchema.parse(draft));
    revalidatePath(parserPath());
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function updateGrammarTestAction(
  id: string,
  draft: GrammarTestDraft
): Promise<MutationResult> {
  try {
    await requireAdmin();
    await updateGrammarTest(idSchema.parse(id), draftSchema.parse(draft));
    revalidatePath(parserPath());
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function deleteGrammarTestAction(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();
    await deleteGrammarTest(idSchema.parse(id));
    revalidatePath(parserPath());
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}

/**
 * Saves an imported line as a test, using its current segments as the
 * starting expectations.
 */
export async function createGrammarTestFromLineAction(
  lineId: string
): Promise<MutationResult> {
  try {
    await requireAdmin();
    await createGrammarTestFromIngredientLine(idSchema.parse(lineId));
    revalidatePath(parserPath());
    return { success: true, message: "Added to grammar tests" };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function runGrammarTestsAction(): Promise<MutationResult<GrammarTestComparison>> {
  try {
    await requireAdmin();
    return { success: true, data: await runGrammarTestComparison() };
  } catch (error) {
    return toMutationError(error);
  }
}

/**
 * Parses a line with the static v1 grammar so a new test can start from
 * its output.
 */
export async function previewStaticParseAction(
  reference: string
): Promise<MutationResult<GrammarSegmentView[]>> {
  try {
    await requireAdmin();
    const line = z.string().trim().min(1).max(500).parse(reference);
    return { success: true, data: parseWithStaticV1(line).values };
  } catch (error) {
    return toMutationError(error);
  }
}
