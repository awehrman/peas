"use client";

import { type ReactNode, memo } from "react";

import { Badge, Button, cn } from "@peas/components";
import { AlertTriangle, ChevronRight, Pencil, Trash2 } from "lucide-react";

import { ConfirmDialog, type MutationResult } from "../../shared";
import type { GrammarRuleDraft, GrammarRuleView } from "../types";
import { getUndefinedReferences } from "../utils/rule-syntax";

import { HighlightedRule } from "./highlighted-rule";
import { RuleEditor } from "./rule-editor";

export interface RuleCardEditState {
  draft: GrammarRuleDraft;
  isPending: boolean;
  error: string | null;
  otherRuleNames: ReadonlySet<string>;
  onDraftChange: (draft: GrammarRuleDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}

interface RuleCardProps {
  rule: GrammarRuleView;
  ruleNames: ReadonlySet<string>;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onEdit: (rule: GrammarRuleView) => void;
  onDelete: (id: string) => Promise<MutationResult<unknown>>;
  edit: RuleCardEditState | null;
}

export function getRuleWarnings(rule: GrammarRuleView, ruleNames: ReadonlySet<string>): string[] {
  const missing = rule.definitions
    .filter((definition) => definition.type === "RULE")
    .flatMap((definition) => getUndefinedReferences(definition.rule, ruleNames));
  return [...new Set(missing)];
}

export const RuleCard = memo(function RuleCard({
  rule,
  ruleNames,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  edit,
}: RuleCardProps): ReactNode {
  const bodyId = `rule-${rule.id}-body`;
  const warnings = getRuleWarnings(rule, ruleNames);
  const showBody = isExpanded || edit !== null;

  return (
    <article
      aria-labelledby={`rule-${rule.id}-name`}
      className={cn("rounded-lg border bg-card", edit && "ring-2 ring-secondary-400")}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={showBody}
          aria-controls={bodyId}
          onClick={() => onToggle(rule.id)}
          disabled={edit !== null}
        >
          <ChevronRight
            aria-hidden="true"
            className={cn("h-4 w-4 shrink-0 transition-transform", showBody && "rotate-90")}
          />
          <span className="w-6 shrink-0 text-right text-xs text-greyscale-500">{rule.order + 1}</span>
          <span id={`rule-${rule.id}-name`} className="truncate font-mono font-semibold">
            {rule.name}
          </span>
          <span className="truncate text-sm text-greyscale-600">{rule.label}</span>
          <Badge variant="outline" className="shrink-0">
            {rule.definitions.length} {rule.definitions.length === 1 ? "alternative" : "alternatives"}
          </Badge>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {warnings.length > 0 ? (
            <span
              className="flex items-center text-amber-700"
              title={`References undefined rules: ${warnings.join(", ")}`}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">References undefined rules: {warnings.join(", ")}</span>
            </span>
          ) : null}
          {edit === null ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit rule ${rule.name}`}
                onClick={() => onEdit(rule)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <ConfirmDialog
                title={`Delete rule "${rule.name}"?`}
                description="Rules that reference it will stop compiling until you fix them."
                confirmLabel="Delete rule"
                onConfirm={() => onDelete(rule.id)}
                trigger={
                  <Button type="button" variant="ghost" size="icon" aria-label={`Delete rule ${rule.name}`}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                }
              />
            </>
          ) : null}
        </div>
      </header>

      {showBody ? (
        <div id={bodyId} className="border-t px-4 py-3">
          {edit ? (
            <RuleEditor
              idPrefix={`rule-${rule.id}`}
              draft={edit.draft}
              onDraftChange={edit.onDraftChange}
              ruleNames={ruleNames}
              otherRuleNames={edit.otherRuleNames}
              submitLabel="Save rule"
              isPending={edit.isPending}
              error={edit.error}
              onSubmit={edit.onSave}
              onCancel={edit.onCancel}
            />
          ) : (
            <ol className="flex flex-col gap-3">
              {[...rule.definitions]
                .sort((a, b) => a.order - b.order)
                .map((definition, index) => (
                  <li key={definition.id ?? index} className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-greyscale-500">
                      {index === 0 ? "=" : "/"} Alternative {index + 1}
                      {definition.type === "LIST" ? " (keyword list)" : ""}
                    </span>
                    {definition.example ? (
                      <span className="text-sm text-greyscale-600">Example: “{definition.example}”</span>
                    ) : null}
                    {definition.type === "LIST" ? (
                      <code className="whitespace-pre-wrap break-words font-mono text-sm">
                        {definition.list.join(" / ")}
                      </code>
                    ) : (
                      <HighlightedRule rule={definition.rule} ruleNames={ruleNames} />
                    )}
                    {definition.type === "RULE" && definition.formatter.trim() ? (
                      <pre className="overflow-x-auto rounded bg-greyscale-50 p-2 font-mono text-xs text-greyscale-700">
                        {definition.formatter}
                      </pre>
                    ) : null}
                  </li>
                ))}
            </ol>
          )}
        </div>
      ) : null}
    </article>
  );
});
