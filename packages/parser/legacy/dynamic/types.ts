export type GrammarRuleDefinitionType = "RULE" | "LIST";

export interface GrammarRuleDefinitionInput {
  type: GrammarRuleDefinitionType;
  order: number;
  example: string;
  rule: string;
  formatter: string;
  list: string[];
}

export interface GrammarRuleInput {
  name: string;
  label: string;
  order: number;
  definitions: GrammarRuleDefinitionInput[];
}

export interface GrammarCompileError {
  message: string;
  line?: number;
  column?: number;
}

/** Flat segment shape shared by the static v1 grammar and database grammars. */
export interface NormalizedSegment {
  rule: string;
  type: string;
  value: string;
}

export interface NormalizedParseResult {
  rule: string;
  type: string;
  values: NormalizedSegment[];
}

export interface DynamicParser {
  parse: (input: string) => NormalizedParseResult;
}

export type BuildParserResult =
  | { ok: true; parser: DynamicParser; warnings: GrammarCompileError[] }
  | { ok: false; errors: GrammarCompileError[] };

export interface GrammarTestExpectationInput {
  type: string;
  value: string;
}

export interface GrammarTestInput {
  id: string;
  reference: string;
  expectations: GrammarTestExpectationInput[];
}

export interface GrammarTestRunResult {
  id: string;
  reference: string;
  passed: boolean;
  /** Segments the parser produced; empty when parsing threw */
  actual: NormalizedSegment[];
  error?: string;
}

export interface GrammarTestSuiteResult {
  passed: number;
  total: number;
  results: GrammarTestRunResult[];
}
