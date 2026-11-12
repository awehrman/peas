"use server";

import { revalidatePath } from "next/cache";

import { publishGrammarVersion, setActiveParser } from "@peas/database";
import type { ActiveParserOption, MutationResult } from "@peas/features";
import { z } from "zod";

import { parserPath } from "@/paths";

import { requireAdmin } from "../../auth/queries/require-admin";
import { toMutationError } from "../../shared/to-mutation-error";
import { compileDatabaseGrammar } from "../compile-database-grammar";
import { runGrammarTestComparison } from "../run-grammar-tests";

/**
 * Freezes the current database rules into a grammar version the import
 * queue can use. Only grammars that compile can be published.
 */
export async function publishGrammarAction(): Promise<
  MutationResult<{ versionId: string; testsPassed: number; testsTotal: number }>
> {
  try {
    const { user } = await requireAdmin();
    const grammar = await compileDatabaseGrammar();

    if (!grammar.build) {
      return { success: false, message: "Add some rules before publishing" };
    }
    if (!grammar.build.ok) {
      return { success: false, message: "Fix the compile errors before publishing" };
    }

    const comparison = await runGrammarTestComparison(grammar);
    const testsPassed = comparison.database?.passed ?? 0;
    const testsTotal = comparison.database?.total ?? 0;

    const version = await publishGrammarVersion({
      source: grammar.source,
      ruleCount: grammar.rules.length,
      testsPassed,
      testsTotal,
    });

    console.log(`${user.email} published grammar version ${version.id} (${testsPassed}/${testsTotal} tests)`);
    revalidatePath(parserPath());
    return { success: true, data: { versionId: version.id, testsPassed, testsTotal } };
  } catch (error) {
    return toMutationError(error);
  }
}

const settingsSchema = z
  .object({
    activeParser: z.enum(["STATIC_V1", "DATABASE"]),
    grammarVersionId: z.string().min(1).nullable(),
  })
  .refine((input) => input.activeParser === "STATIC_V1" || input.grammarVersionId, {
    message: "Choose a published grammar version",
    path: ["grammarVersionId"],
  });

/**
 * Chooses which parser the import queue uses. The queue picks up the change
 * within a few seconds.
 */
export async function setActiveParserAction(
  activeParser: ActiveParserOption,
  grammarVersionId: string | null
): Promise<MutationResult> {
  try {
    const { user } = await requireAdmin();
    const input = settingsSchema.parse({ activeParser, grammarVersionId });
    await setActiveParser(input.activeParser, input.grammarVersionId);

    console.log(
      `${user.email} switched the import parser to ${input.activeParser}` +
        (input.grammarVersionId ? ` (${input.grammarVersionId})` : "")
    );
    revalidatePath(parserPath());
    return { success: true };
  } catch (error) {
    return toMutationError(error);
  }
}
