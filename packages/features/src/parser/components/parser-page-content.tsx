"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@peas/components";

import type {
  GrammarCompileErrorView,
  GrammarRuleView,
  GrammarTestComparison,
  GrammarTestView,
} from "../types";

import { CompileErrorsAlert, CompiledGrammarPanel } from "./compiled-grammar-panel";
import { type GrammarTestActions, GrammarTestsPanel } from "./grammar-tests-panel";
import { RuleBuilder, type RuleBuilderActions } from "./rule-builder";

interface ParserPageContentProps {
  rules: GrammarRuleView[];
  compiledGrammar: string;
  compileErrors: GrammarCompileErrorView[];
  tests: GrammarTestView[];
  testComparison: GrammarTestComparison;
  ruleActions: RuleBuilderActions;
  testActions: GrammarTestActions;
  /** Rendered above the tabs, e.g. the import parser switch */
  settings?: ReactNode;
}

export function ParserPageContent({
  rules,
  compiledGrammar,
  compileErrors,
  tests,
  testComparison,
  ruleActions,
  testActions,
  settings,
}: ParserPageContentProps): ReactNode {
  const { staticV1, database } = testComparison;

  return (
    <div className="flex flex-col gap-6">
      {settings}
      {rules.length > 0 ? <CompileErrorsAlert errors={compileErrors} /> : null}

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="tests">
            Tests (v1 {staticV1.passed}/{staticV1.total}
            {database ? `, db ${database.passed}/${database.total}` : ""})
          </TabsTrigger>
          <TabsTrigger value="grammar">Compiled grammar</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <RuleBuilder rules={rules} {...ruleActions} />
        </TabsContent>
        <TabsContent value="tests">
          <GrammarTestsPanel tests={tests} comparison={testComparison} {...testActions} />
        </TabsContent>
        <TabsContent value="grammar">
          <CompiledGrammarPanel source={compiledGrammar} errors={compileErrors} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
