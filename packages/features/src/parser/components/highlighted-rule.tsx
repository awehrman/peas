import type { ReactNode } from "react";

import { cn } from "@peas/components";

import { type RuleTokenKind, tokenizeRule } from "../utils/rule-syntax";

const TOKEN_STYLES: Record<RuleTokenKind, string> = {
  label: "text-greyscale-500",
  defined: "font-semibold text-primary-700",
  missing: "font-semibold text-error-700 underline decoration-wavy",
  literal: "text-amber-800",
  class: "text-indigo-700",
  code: "text-greyscale-500",
  syntax: "text-greyscale-600",
  space: "",
};

interface HighlightedRuleProps {
  rule: string;
  ruleNames: ReadonlySet<string>;
  className?: string;
}

/**
 * Peggy rule expression with references to existing rules highlighted and
 * references to missing rules marked in red.
 */
export function HighlightedRule({ rule, ruleNames, className }: HighlightedRuleProps): ReactNode {
  return (
    <code className={cn("whitespace-pre-wrap break-words font-mono text-sm", className)}>
      {tokenizeRule(rule, ruleNames).map((token, index) => (
        <span
          key={`${index}-${token.text}`}
          className={TOKEN_STYLES[token.kind]}
          title={token.kind === "missing" ? `No rule named "${token.text}"` : undefined}
        >
          {token.text}
        </span>
      ))}
    </code>
  );
}
