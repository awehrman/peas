"use server";

import { revalidatePath } from "next/cache";

import {
  createGrammarRule,
  deleteGrammarRule,
  reorderGrammarRules,
  resetGrammarRules,
  seedGrammarRules,
  updateGrammarRule,
} from "@peas/database";
import type { GrammarRuleDraft, MutationResult } from "@peas/features";
import { BASIC_GRAMMAR_RULES } from "@peas/parser/dynamic";
import { z } from "zod";

import { parserPath } from "@/paths";

import { requireAdmin } from "../../auth/queries/require-admin";
import { toMutationError } from "../../shared/to-mutation-error";

const definitionSchema = z.object({
  type: z.enum(["RULE", "LIST"]),
  example: z.string().max(500),
  rule: z.string().max(5000),
  formatter: z.string().max(20000),
  list: z.array(z.string().trim().min(1).max(500)).max(2000),
});

const draftSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Rule names must be valid Peggy identifiers"),
  label: z.string().trim().min(1, "Label is required").max(200),
  definitions: z.array(definitionSchema).min(1, "Add at least one alternative").max(100),
});

const idSchema = z.string().min(1);

function revalidateParser() {
  revalidatePath(parserPath());
}

export async function createRuleAction(draft: GrammarRuleDraft): Promise<MutationResult> {
  try {
    await requireAdmin();
    await createGrammarRule(draftSchema.parse(draft));
    revalidateParser();
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function updateRuleAction(
  id: string,
  draft: GrammarRuleDraft
): Promise<MutationResult> {
  try {
    await requireAdmin();
    await updateGrammarRule(idSchema.parse(id), draftSchema.parse(draft));
    revalidateParser();
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function deleteRuleAction(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();
    await deleteGrammarRule(idSchema.parse(id));
    revalidateParser();
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function reorderRulesAction(orderedIds: string[]): Promise<MutationResult> {
  try {
    await requireAdmin();
    await reorderGrammarRules(z.array(idSchema).min(1).parse(orderedIds));
    revalidateParser();
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function seedRulesAction(): Promise<MutationResult<{ created: number }>> {
  try {
    await requireAdmin();
    const result = await seedGrammarRules(BASIC_GRAMMAR_RULES);
    revalidateParser();
    return { success: true, data: result };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function resetRulesAction(): Promise<MutationResult<{ deleted: number }>> {
  try {
    const { user } = await requireAdmin();
    console.warn(`${user.email} deleted all grammar rules`);
    const result = await resetGrammarRules();
    revalidateParser();
    return { success: true, data: result };
  } catch (error) {
    return toMutationError(error);
  }
}
