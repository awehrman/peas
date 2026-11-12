"use client";

import { type FormEvent, type ReactNode, useState } from "react";

import { Button, Input, Label, cn } from "@peas/components";
import { getDefaultFormatter } from "@peas/parser/dynamic/compile";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { InlineError } from "../../shared";
import type { GrammarDefinitionType, GrammarRuleDraft } from "../types";
import {
  createDefinitionDraft,
  hasRuleDraftErrors,
  renameRuleDraft,
  validateRuleDraft,
} from "../utils/rule-draft";
import { getUndefinedReferences } from "../utils/rule-syntax";

import { FormatterEditor } from "./formatter-editor";
import { HighlightedRule } from "./highlighted-rule";
import { KeywordListEditor } from "./keyword-list-editor";

type DraftDefinition = GrammarRuleDraft["definitions"][number];

interface RuleEditorProps {
  idPrefix: string;
  draft: GrammarRuleDraft;
  onDraftChange: (draft: GrammarRuleDraft) => void;
  ruleNames: ReadonlySet<string>;
  otherRuleNames: ReadonlySet<string>;
  submitLabel: string;
  isPending: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function RuleEditor({
  idPrefix,
  draft,
  onDraftChange,
  ruleNames,
  otherRuleNames,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: RuleEditorProps): ReactNode {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const errors = validateRuleDraft(draft, otherRuleNames);
  const showErrors = hasSubmitted;
  const fieldId = (field: string) => `${idPrefix}-${field}`;
  const namesIncludingDraft = new Set([...ruleNames, draft.name.trim()]);

  function updateDefinition(index: number, changes: Partial<DraftDefinition>) {
    onDraftChange({
      ...draft,
      definitions: draft.definitions.map((definition, position) =>
        position === index ? { ...definition, ...changes } : definition
      ),
    });
  }

  function moveDefinition(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.definitions.length) return;
    const definitions = [...draft.definitions];
    const [moved] = definitions.splice(index, 1);
    if (!moved) return;
    definitions.splice(target, 0, moved);
    onDraftChange({ ...draft, definitions });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    if (hasRuleDraftErrors(errors)) return;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("name")}>Rule name</Label>
          <Input
            id={fieldId("name")}
            value={draft.name}
            className="font-mono"
            autoComplete="off"
            aria-invalid={showErrors && !!errors.name}
            aria-describedby={showErrors && errors.name ? fieldId("name-error") : undefined}
            onChange={(event) => onDraftChange(renameRuleDraft(draft, event.target.value))}
          />
          {showErrors && errors.name ? (
            <p id={fieldId("name-error")} className="text-xs text-error-700">
              {errors.name}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("label")}>Label</Label>
          <Input
            id={fieldId("label")}
            value={draft.label}
            aria-invalid={showErrors && !!errors.label}
            aria-describedby={showErrors && errors.label ? fieldId("label-error") : undefined}
            onChange={(event) => onDraftChange({ ...draft, label: event.target.value })}
          />
          {showErrors && errors.label ? (
            <p id={fieldId("label-error")} className="text-xs text-error-700">
              {errors.label}
            </p>
          ) : null}
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        {draft.definitions.map((definition, index) => {
          const definitionId = fieldId(`definition-${index}`);
          const definitionError = errors.definitions[index];
          const missing =
            definition.type === "RULE"
              ? getUndefinedReferences(definition.rule, namesIncludingDraft)
              : [];

          return (
            <li key={index}>
              <fieldset className="flex flex-col gap-3 rounded-md border p-3">
                <legend className="px-1 text-sm font-medium">Alternative {index + 1}</legend>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <DefinitionTypeToggle
                    name={`${definitionId}-type`}
                    value={definition.type}
                    onChange={(type) => updateDefinition(index, { type })}
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move alternative ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => moveDefinition(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move alternative ${index + 1} down`}
                      disabled={index === draft.definitions.length - 1}
                      onClick={() => moveDefinition(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove alternative ${index + 1}`}
                      disabled={draft.definitions.length === 1}
                      onClick={() =>
                        onDraftChange({
                          ...draft,
                          definitions: draft.definitions.filter((_, position) => position !== index),
                        })
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {definition.type === "RULE" ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${definitionId}-example`}>Example</Label>
                      <Input
                        id={`${definitionId}-example`}
                        value={definition.example}
                        placeholder="2 cups flour"
                        onChange={(event) => updateDefinition(index, { example: event.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${definitionId}-rule`}>Rule expression</Label>
                      <Input
                        id={`${definitionId}-rule`}
                        value={definition.rule}
                        className="font-mono"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="amt:amount _ ing:ingredient"
                        aria-invalid={showErrors && !!definitionError}
                        aria-describedby={`${definitionId}-preview`}
                        onChange={(event) => updateDefinition(index, { rule: event.target.value })}
                      />
                      <div id={`${definitionId}-preview`} className="flex flex-col gap-1">
                        {definition.rule.trim() ? (
                          <HighlightedRule rule={definition.rule} ruleNames={namesIncludingDraft} />
                        ) : null}
                        {missing.length > 0 ? (
                          <p className="text-xs text-error-700">
                            Undefined {missing.length === 1 ? "rule" : "rules"}: {missing.join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Formatter</span>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() =>
                            updateDefinition(index, {
                              formatter: getDefaultFormatter(draft.name || "rule"),
                            })
                          }
                        >
                          Reset to default
                        </Button>
                      </div>
                      <FormatterEditor
                        label={`Formatter for alternative ${index + 1}`}
                        value={definition.formatter}
                        onChange={(formatter) => updateDefinition(index, { formatter })}
                      />
                      <p className="text-xs text-greyscale-600">
                        Return {"{ rule, type, values }"}. {"${ORDER}"} becomes the alternative number.
                      </p>
                    </div>
                  </>
                ) : (
                  <KeywordListEditor
                    id={`${definitionId}-list`}
                    list={definition.list}
                    onChange={(list) => updateDefinition(index, { list })}
                  />
                )}

                {showErrors && definitionError ? (
                  <p className="text-xs text-error-700">{definitionError}</p>
                ) : null}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onDraftChange({
              ...draft,
              definitions: [...draft.definitions, createDefinitionDraft(draft.name)],
            })
          }
        >
          <Plus aria-hidden="true" />
          Add alternative
        </Button>
      </div>

      <InlineError message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DefinitionTypeToggle({
  name,
  value,
  onChange,
}: {
  name: string;
  value: GrammarDefinitionType;
  onChange: (value: GrammarDefinitionType) => void;
}): ReactNode {
  const options: { value: GrammarDefinitionType; label: string }[] = [
    { value: "RULE", label: "Rule" },
    { value: "LIST", label: "Keyword list" },
  ];

  return (
    <div role="radiogroup" aria-label="Alternative type" className="inline-flex rounded-md border p-0.5">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "cursor-pointer rounded px-3 py-1 text-sm focus-within:ring-2 focus-within:ring-ring",
            value === option.value ? "bg-primary text-primary-foreground" : "hover:bg-accent"
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
