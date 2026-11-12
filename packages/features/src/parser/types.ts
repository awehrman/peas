export type GrammarDefinitionType = "RULE" | "LIST";

export interface GrammarRuleDefinitionView {
  id?: string;
  type: GrammarDefinitionType;
  order: number;
  example: string;
  rule: string;
  formatter: string;
  list: string[];
}

export interface GrammarRuleView {
  id: string;
  name: string;
  label: string;
  order: number;
  definitions: GrammarRuleDefinitionView[];
}

export interface GrammarRuleDraft {
  name: string;
  label: string;
  definitions: Omit<GrammarRuleDefinitionView, "id" | "order">[];
}

export interface GrammarCompileErrorView {
  message: string;
  line?: number;
  column?: number;
}

export interface GrammarTestExpectationView {
  type: string;
  value: string;
}

export interface GrammarTestView {
  id: string;
  reference: string;
  expectations: GrammarTestExpectationView[];
}

export interface GrammarTestDraft {
  reference: string;
  expectations: GrammarTestExpectationView[];
}

export interface GrammarSegmentView {
  rule: string;
  type: string;
  value: string;
}

export interface GrammarTestResultView {
  id: string;
  reference: string;
  passed: boolean;
  actual: GrammarSegmentView[];
  error?: string;
}

export interface GrammarTestSuiteView {
  passed: number;
  total: number;
  results: GrammarTestResultView[];
}

/** Results for both parsers so the rebuilt grammar can be compared to v1. */
export interface GrammarTestComparison {
  staticV1: GrammarTestSuiteView;
  database: GrammarTestSuiteView | null;
  databaseErrors: GrammarCompileErrorView[];
}

export type ActiveParserOption = "STATIC_V1" | "DATABASE";

export interface GrammarVersionView {
  id: string;
  hash: string;
  ruleCount: number;
  testsPassed: number;
  testsTotal: number;
  publishedAt: string;
}

export interface ParserSettingsView {
  activeParser: ActiveParserOption;
  activeGrammarVersion: GrammarVersionView | null;
  versions: GrammarVersionView[];
}
