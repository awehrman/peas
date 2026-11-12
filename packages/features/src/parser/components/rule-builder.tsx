"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Placeholder,
} from "@peas/components";
import { ListOrdered, Plus, Settings2, Workflow } from "lucide-react";

import { ConfirmDialog, InlineError, type MutationAction, useMutation } from "../../shared";
import type { GrammarRuleDraft, GrammarRuleView } from "../types";
import { createRuleDraft, ruleToDraft } from "../utils/rule-draft";

import { ReorderRuleList } from "./reorder-rule-list";
import type { RuleCardEditState } from "./rule-card";
import { RuleEditor } from "./rule-editor";
import { VirtualizedRuleList } from "./virtualized-rule-list";

export interface RuleBuilderActions {
  onCreateRule: MutationAction<[draft: GrammarRuleDraft]>;
  onUpdateRule: MutationAction<[id: string, draft: GrammarRuleDraft]>;
  onDeleteRule: MutationAction<[id: string]>;
  onReorderRules: MutationAction<[orderedIds: string[]]>;
  onSeedRules: MutationAction<[], { created: number }>;
  onResetRules: MutationAction<[], { deleted: number }>;
}

interface RuleBuilderProps extends RuleBuilderActions {
  rules: GrammarRuleView[];
}

export function RuleBuilder({
  rules,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onReorderRules,
  onSeedRules,
  onResetRules,
}: RuleBuilderProps): ReactNode {
  const ruleNames = useMemo(() => new Set(rules.map((rule) => rule.name)), [rules]);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; draft: GrammarRuleDraft } | null>(null);
  const [newRule, setNewRule] = useState<GrammarRuleDraft | null>(null);
  const [reorderDraft, setReorderDraft] = useState<GrammarRuleView[] | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const create = useMutation(onCreateRule);
  const update = useMutation(onUpdateRule);
  const reorder = useMutation(onReorderRules);
  const seed = useMutation(onSeedRules);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startEditing = useCallback((rule: GrammarRuleView) => {
    setEditing({ id: rule.id, draft: ruleToDraft(rule) });
  }, []);

  const handleDelete = useCallback((id: string) => onDeleteRule(id), [onDeleteRule]);

  const editingRuleName = rules.find((rule) => rule.id === editing?.id)?.name;
  const edit: RuleCardEditState | null = editing
    ? {
        draft: editing.draft,
        isPending: update.isPending,
        error: update.error,
        otherRuleNames: new Set([...ruleNames].filter((name) => name !== editingRuleName)),
        onDraftChange: (draft) => setEditing({ id: editing.id, draft }),
        onSave: async () => {
          const result = await update.run(editing.id, editing.draft);
          if (result.success) setEditing(null);
        },
        onCancel: () => {
          update.clearError();
          setEditing(null);
        },
      }
    : null;

  async function handleCreate() {
    if (!newRule) return;
    const result = await create.run(newRule);
    if (result.success) setNewRule(null);
  }

  async function finishReordering() {
    if (!reorderDraft) return;
    const result = await reorder.run(reorderDraft.map((rule) => rule.id));
    if (result.success) setReorderDraft(null);
  }

  async function handleSeed() {
    setAdminMessage(null);
    const result = await seed.run();
    if (result.success) {
      const created = result.data?.created ?? 0;
      setAdminMessage(
        created === 0 ? "All starter rules already exist." : `Added ${created} starter rules.`
      );
    }
  }

  const isReordering = reorderDraft !== null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>
          <h2>Rules ({rules.length})</h2>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {isReordering ? (
            <>
              <Button type="button" onClick={finishReordering} disabled={reorder.isPending}>
                {reorder.isPending ? "Saving order..." : "Save order"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reorder.clearError();
                  setReorderDraft(null);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpandedIds(new Set(rules.map((rule) => rule.id)))}
                disabled={rules.length === 0}
              >
                Expand all
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpandedIds(new Set())}
                disabled={expandedIds.size === 0}
              >
                Collapse all
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setReorderDraft(rules);
                }}
                disabled={rules.length < 2}
              >
                <ListOrdered aria-hidden="true" />
                Reorder
              </Button>
              <Button
                type="button"
                onClick={() => setNewRule(createRuleDraft())}
                disabled={newRule !== null}
              >
                <Plus aria-hidden="true" />
                Add rule
              </Button>
              <AdminToolsMenu onSeed={handleSeed} isSeeding={seed.isPending} onReset={onResetRules} />
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <InlineError message={reorder.error ?? seed.error} />
        {adminMessage ? (
          <p role="status" className="text-sm text-greyscale-700">
            {adminMessage}
          </p>
        ) : null}

        {newRule ? (
          <section aria-labelledby="new-rule-heading" className="rounded-lg border p-4 ring-2 ring-secondary-400">
            <h3 id="new-rule-heading" className="mb-3 font-medium">
              New rule
            </h3>
            <RuleEditor
              idPrefix="new-rule"
              draft={newRule}
              onDraftChange={setNewRule}
              ruleNames={ruleNames}
              otherRuleNames={ruleNames}
              submitLabel="Add rule"
              isPending={create.isPending}
              error={create.error}
              onSubmit={handleCreate}
              onCancel={() => {
                create.clearError();
                setNewRule(null);
              }}
            />
          </section>
        ) : null}

        {rules.length === 0 && !newRule ? (
          <Placeholder
            label="No rules yet. Add one, or seed the starter grammar from Admin tools."
            icon={<Workflow />}
          />
        ) : isReordering ? (
          <ReorderRuleList rules={reorderDraft} onReorder={setReorderDraft} />
        ) : (
          <VirtualizedRuleList
            rules={rules}
            ruleNames={ruleNames}
            expandedIds={expandedIds}
            editingId={editing?.id ?? null}
            edit={edit}
            onToggle={toggleExpanded}
            onEdit={startEditing}
            onDelete={handleDelete}
          />
        )}
      </CardContent>
    </Card>
  );
}

function AdminToolsMenu({
  onSeed,
  isSeeding,
  onReset,
}: {
  onSeed: () => void;
  isSeeding: boolean;
  onReset: MutationAction<[], { deleted: number }>;
}): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" aria-label="Admin tools">
            <Settings2 aria-hidden="true" />
            Admin tools
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Rules</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSeed} disabled={isSeeding}>
            Seed starter rules
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        title="Delete every rule?"
        description="This removes all database rules. Published grammar versions are kept, so imports using one are unaffected."
        confirmLabel="Delete all rules"
        onConfirm={() => onReset()}
        trigger={
          <Button type="button" variant="ghost" className="text-error-700">
            Reset rules
          </Button>
        }
      />
    </div>
  );
}
