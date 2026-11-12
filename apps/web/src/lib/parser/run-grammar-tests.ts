import "server-only";

import { type GrammarTestRecord, getGrammarTests } from "@peas/database";
import type { GrammarTestComparison } from "@peas/features";
import { normalizeParseResult, runGrammarTests } from "@peas/parser/dynamic";
import { parse as parseStaticV1 } from "@peas/parser/v1";

import { type CompiledDatabaseGrammar, compileDatabaseGrammar } from "./compile-database-grammar";

export function parseWithStaticV1(line: string) {
  return normalizeParseResult(parseStaticV1(line));
}

/**
 * Runs every grammar test against the static v1 grammar and, when it
 * compiles, the grammar built from the database rules.
 */
export async function runGrammarTestComparison(
  grammar?: CompiledDatabaseGrammar,
  tests?: GrammarTestRecord[]
): Promise<GrammarTestComparison> {
  const [compiled, allTests] = await Promise.all([
    grammar ?? compileDatabaseGrammar(),
    tests ?? getGrammarTests(),
  ]);

  const staticV1 = runGrammarTests(parseWithStaticV1, allTests);

  if (!compiled.build) {
    return { staticV1, database: null, databaseErrors: [] };
  }
  if (!compiled.build.ok) {
    return { staticV1, database: null, databaseErrors: compiled.build.errors };
  }

  return {
    staticV1,
    database: runGrammarTests(compiled.build.parser.parse, allTests),
    databaseErrors: [],
  };
}
