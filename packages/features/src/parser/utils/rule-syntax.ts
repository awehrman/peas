export type RuleTokenKind =
  | "label"
  | "defined"
  | "missing"
  | "literal"
  | "class"
  | "code"
  | "syntax"
  | "space";

export interface RuleToken {
  text: string;
  kind: RuleTokenKind;
}

const TOKEN_PATTERN =
  /('(?:\\.|[^'\\])*'i?|"(?:\\.|[^"\\])*"i?|\[(?:\\.|[^\]\\])*\]i?|\{[^}]*\}|[A-Za-z_][A-Za-z0-9_]*:(?!:)|[A-Za-z_][A-Za-z0-9_]*|\s+|.)/g;

/** Valid Peggy rule identifier. */
export const RULE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function classify(text: string, ruleNames: ReadonlySet<string>): RuleTokenKind {
  if (/^\s+$/.test(text)) return "space";
  if (text.startsWith("'") || text.startsWith('"')) return "literal";
  if (text.startsWith("[")) return "class";
  if (text.startsWith("{")) return "code";
  if (/^[A-Za-z_][A-Za-z0-9_]*:$/.test(text)) return "label";
  if (RULE_NAME_PATTERN.test(text)) return ruleNames.has(text) ? "defined" : "missing";
  return "syntax";
}

/**
 * Splits a Peggy rule expression into tokens for highlighting. Identifiers
 * are marked `defined` or `missing` depending on whether a rule with that
 * name exists.
 */
export function tokenizeRule(rule: string, ruleNames: ReadonlySet<string>): RuleToken[] {
  return (rule.match(TOKEN_PATTERN) ?? []).map((text) => ({
    text,
    kind: classify(text, ruleNames),
  }));
}

export function getUndefinedReferences(
  rule: string,
  ruleNames: ReadonlySet<string>
): string[] {
  const missing = tokenizeRule(rule, ruleNames)
    .filter((token) => token.kind === "missing")
    .map((token) => token.text);
  return [...new Set(missing)];
}

/** Turns "amountKeyword" or "amount_keyword" into "Amount Keyword". */
export function toStartCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
