import { getDefaultFormatter } from "@peas/parser/dynamic/compile";

import type { GrammarRuleDraft, GrammarRuleView } from "../types";

import { RULE_NAME_PATTERN, toStartCase } from "./rule-syntax";

type DraftDefinition = GrammarRuleDraft["definitions"][number];

export interface RuleDraftErrors {
  name?: string;
  label?: string;
  definitions: Record<number, string>;
}

export function createDefinitionDraft(ruleName: string): DraftDefinition {
  return {
    type: "RULE",
    example: "",
    rule: "",
    formatter: getDefaultFormatter(ruleName || "rule"),
    list: [],
  };
}

export function createRuleDraft(): GrammarRuleDraft {
  return { name: "", label: "", definitions: [createDefinitionDraft("")] };
}

export function ruleToDraft(rule: GrammarRuleView): GrammarRuleDraft {
  return {
    name: rule.name,
    label: rule.label,
    definitions: [...rule.definitions]
      .sort((a, b) => a.order - b.order)
      .map(({ type, example, rule: expression, formatter, list }) => ({
        type,
        example,
        rule: expression,
        formatter,
        list,
      })),
  };
}

/**
 * Renames a draft, keeping the label and untouched default formatters in
 * step with the new name.
 */
export function renameRuleDraft(draft: GrammarRuleDraft, name: string): GrammarRuleDraft {
  const labelWasAuto = draft.label === "" || draft.label === toStartCase(draft.name);
  const previousDefault = getDefaultFormatter(draft.name || "rule");
  const nextDefault = getDefaultFormatter(name || "rule");

  return {
    name,
    label: labelWasAuto ? toStartCase(name) : draft.label,
    definitions: draft.definitions.map((definition) =>
      definition.formatter === previousDefault
        ? { ...definition, formatter: nextDefault }
        : definition
    ),
  };
}

export function validateRuleDraft(
  draft: GrammarRuleDraft,
  otherRuleNames: ReadonlySet<string>
): RuleDraftErrors {
  const errors: RuleDraftErrors = { definitions: {} };
  const name = draft.name.trim();

  if (!name) errors.name = "Name is required";
  else if (!RULE_NAME_PATTERN.test(name))
    errors.name = "Use letters, numbers and underscores, starting with a letter or underscore";
  else if (otherRuleNames.has(name)) errors.name = "A rule with this name already exists";

  if (!draft.label.trim()) errors.label = "Label is required";

  if (draft.definitions.length === 0) {
    errors.definitions[0] = "Add at least one alternative";
  }

  draft.definitions.forEach((definition, index) => {
    if (definition.type === "RULE" && !definition.rule.trim()) {
      errors.definitions[index] = "Rule expression is required";
    }
    if (definition.type === "LIST" && definition.list.length === 0) {
      errors.definitions[index] = "Add at least one keyword";
    }
  });

  return errors;
}

export function hasRuleDraftErrors(errors: RuleDraftErrors): boolean {
  return !!errors.name || !!errors.label || Object.keys(errors.definitions).length > 0;
}
