import { ReactNode } from "react";

import { getGrammarTests, getParserSettings } from "@peas/database";
import { ParserPageContent, ParserSwitchCard } from "@peas/features";

import { requireAdminOrRedirect } from "../../../lib/auth/queries/require-admin";
import {
  createGrammarTestAction,
  deleteGrammarTestAction,
  previewStaticParseAction,
  runGrammarTestsAction,
  updateGrammarTestAction,
} from "../../../lib/parser/actions/grammar-test-actions";
import {
  createRuleAction,
  deleteRuleAction,
  reorderRulesAction,
  resetRulesAction,
  seedRulesAction,
  updateRuleAction,
} from "../../../lib/parser/actions/rule-actions";
import {
  publishGrammarAction,
  setActiveParserAction,
} from "../../../lib/parser/actions/parser-settings-actions";
import { compileDatabaseGrammar } from "../../../lib/parser/compile-database-grammar";
import { runGrammarTestComparison } from "../../../lib/parser/run-grammar-tests";

export const dynamic = "force-dynamic";

export default async function ParserPage(): Promise<ReactNode> {
  await requireAdminOrRedirect();

  const [grammar, tests, settings] = await Promise.all([
    compileDatabaseGrammar(),
    getGrammarTests(),
    getParserSettings(),
  ]);
  const testComparison = await runGrammarTestComparison(grammar, tests);
  const { rules, source, build } = grammar;

  return (
    <ParserPageContent
      settings={
        <ParserSwitchCard
          settings={settings}
          canPublish={build?.ok === true}
          onPublish={publishGrammarAction}
          onSetActiveParser={setActiveParserAction}
        />
      }
      rules={rules}
      compiledGrammar={source}
      compileErrors={build && !build.ok ? build.errors : []}
      tests={tests}
      testComparison={testComparison}
      ruleActions={{
        onCreateRule: createRuleAction,
        onUpdateRule: updateRuleAction,
        onDeleteRule: deleteRuleAction,
        onReorderRules: reorderRulesAction,
        onSeedRules: seedRulesAction,
        onResetRules: resetRulesAction,
      }}
      testActions={{
        onCreateTest: createGrammarTestAction,
        onUpdateTest: updateGrammarTestAction,
        onDeleteTest: deleteGrammarTestAction,
        onRunTests: runGrammarTestsAction,
        onPreviewStaticParse: previewStaticParseAction,
      }}
    />
  );
}
