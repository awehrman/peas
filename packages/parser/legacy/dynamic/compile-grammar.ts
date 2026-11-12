import type { GrammarRuleDefinitionInput, GrammarRuleInput } from "./types.js";

/** Rule that becomes the start rule when present. */
export const DEFAULT_START_RULE = "ingredientLine";

/** Placeholder in formatters that is replaced with the 1-based alternative number. */
export const ORDER_PLACEHOLDER = "${ORDER}";

function toCamelCase(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  return words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
}

/**
 * Formatter template for a new rule definition. The returned object matches
 * the `{ rule, type, values }` shape the normalizer understands.
 */
export function getDefaultFormatter(ruleName: string, values = "[]"): string {
  const name = toCamelCase(ruleName) || ruleName;
  return `{
  return {
    rule: \`#${ORDER_PLACEHOLDER}_${name}\`,
    type: '${name}',
    values: ${values}
  };
}`;
}

function insertOrder(formatter: string, order: number): string {
  return formatter.split(ORDER_PLACEHOLDER).join(String(order));
}

function sanitizeComment(text: string): string {
  return text.replace(/[\r\n]+/g, " ");
}

function escapeLabel(label: string): string {
  return label.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Lines for one alternative, without the leading `=` or `/`. */
function compileDefinition(
  definition: GrammarRuleDefinitionInput,
  alternative: number
): string[] {
  if (definition.type === "LIST") {
    return [definition.list.join(" / ")];
  }

  const lines: string[] = [];
  if (definition.example.trim()) {
    lines.push(`// '${sanitizeComment(definition.example)}'`);
  }
  lines.push(definition.rule);
  if (definition.formatter.trim()) {
    lines.push(...insertOrder(definition.formatter.trim(), alternative).split("\n"));
  }
  return lines;
}

/**
 * Peggy source for a single rule, with alternatives in definition order:
 *
 *   name "Label"
 *     = first alternative
 *     / second alternative
 */
export function compileRule(rule: GrammarRuleInput): string {
  const alternatives = [...rule.definitions]
    .sort((a, b) => a.order - b.order)
    .map((definition, index) => {
      const [first = "", ...rest] = compileDefinition(definition, index + 1);
      const prefix = index === 0 ? "  = " : "  / ";
      return [`${prefix}${first}`, ...rest.map((line) => `    ${line}`)].join("\n");
    });

  const label = rule.label.trim() ? ` "${escapeLabel(rule.label)}"` : "";
  return [`${rule.name}${label}`, ...alternatives].join("\n");
}

/**
 * Peggy source for all rules in order. `ingredientLine` is the start rule
 * when it exists; otherwise Peggy starts from the first rule.
 */
export function compileGrammar(rules: GrammarRuleInput[]): string {
  const ordered = [...rules].sort((a, b) => a.order - b.order);
  const hasStartRule = ordered.some((rule) => rule.name === DEFAULT_START_RULE);
  const header = hasStartRule ? `start = ${DEFAULT_START_RULE}\n\n` : "";

  return `${header}${ordered.map(compileRule).join("\n\n")}\n`;
}
