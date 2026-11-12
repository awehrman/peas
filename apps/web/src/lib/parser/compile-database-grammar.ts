import "server-only";

import { type GrammarRuleRecord, getGrammarRules } from "@peas/database";
import {
  type BuildParserResult,
  buildParser,
  compileGrammar,
} from "@peas/parser/dynamic";

export interface CompiledDatabaseGrammar {
  rules: GrammarRuleRecord[];
  source: string;
  build: BuildParserResult | null;
}

/**
 * Loads the database rules and compiles them. `build` is null when there
 * are no rules yet.
 */
export async function compileDatabaseGrammar(): Promise<CompiledDatabaseGrammar> {
  const rules = await getGrammarRules();
  if (rules.length === 0) return { rules, source: "", build: null };

  const source = compileGrammar(rules);
  return { rules, source, build: buildParser(source) };
}
