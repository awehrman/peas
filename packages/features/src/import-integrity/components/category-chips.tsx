"use client";

import { type FormEvent, type ReactNode, useId, useState } from "react";

import { Badge, Button, Input, Label, cn } from "@peas/components";
import { Check, ChevronDown, Plus, RotateCcw, X } from "lucide-react";

import { AppLink } from "../../app-navigation";
import { InlineError, type MutationAction, useMutation } from "../../shared";
import type { CategoryEvidence, CategoryMembership } from "../types";

type CategoryAction = MutationAction<[categoryId: string]>;

export interface CategoryActions {
  onApproveCategory?: CategoryAction;
  onExcludeCategory?: CategoryAction;
  onRestoreCategory?: CategoryAction;
  onRemoveCategory?: CategoryAction;
  onAddCategory?: MutationAction<[name: string]>;
}

interface CategoryChipsProps extends CategoryActions {
  memberships: CategoryMembership[];
}

const RELATIONSHIP_LABELS: Record<CategoryEvidence["path"][number]["type"], string> = {
  IS_A: "is a",
  PART_OF: "part of",
  DERIVED_FROM: "made from",
  PROCESSED_FROM: "processed from",
};

/**
 * Explains an inferred membership, e.g. "chicken thigh → part of → chicken".
 *
 * @example
 * describeEvidence({ conceptName: "chicken thigh", path: [{ type: "PART_OF", conceptName: "chicken" }] }) // "chicken thigh → part of → chicken"
 */
export function describeEvidence(evidence: Pick<CategoryEvidence, "conceptName" | "path">): string {
  return [evidence.conceptName, ...evidence.path.flatMap((step) => [RELATIONSHIP_LABELS[step.type], step.conceptName])].join(
    " → "
  );
}

/**
 * A note's categories: approved ones as solid chips, inferred ones as outlined "suggested" chips with the ingredient path that put them there, and excluded ones collapsed with Restore. Accept, reject, remove, and add are shown when their actions are given.
 */
export function CategoryChips({
  memberships,
  onApproveCategory,
  onExcludeCategory,
  onRestoreCategory,
  onRemoveCategory,
  onAddCategory,
}: CategoryChipsProps): ReactNode {
  const visible = memberships.filter((membership) => membership.state !== "EXCLUDED");
  const excluded = memberships.filter((membership) => membership.state === "EXCLUDED");
  const [showExcluded, setShowExcluded] = useState(false);
  const excludedId = useId();

  return (
    <div className="flex flex-col gap-3">
      {visible.length === 0 ? (
        <p className="text-sm text-greyscale-600">No categories yet.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Categories">
          {visible.map((membership) => (
            <CategoryChip
              key={membership.id}
              membership={membership}
              onApprove={onApproveCategory}
              onExclude={onExcludeCategory}
              onRemove={onRemoveCategory}
            />
          ))}
        </ul>
      )}

      {excluded.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start px-0 text-xs text-greyscale-600"
            aria-expanded={showExcluded}
            aria-controls={excludedId}
            onClick={() => setShowExcluded((open) => !open)}
          >
            <ChevronDown
              aria-hidden="true"
              className={cn("h-3 w-3 transition-transform", showExcluded && "rotate-180")}
            />
            Excluded ({excluded.length})
          </Button>
          {showExcluded ? (
            <ul id={excludedId} className="flex flex-col gap-1" aria-label="Excluded categories">
              {excluded.map((membership) => (
                <ExcludedChip key={membership.id} membership={membership} onRestore={onRestoreCategory} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {onAddCategory ? <AddCategoryForm onAdd={onAddCategory} /> : null}
    </div>
  );
}

function CategoryChip({
  membership,
  onApprove,
  onExclude,
  onRemove,
}: {
  membership: CategoryMembership;
  onApprove?: CategoryAction;
  onExclude?: CategoryAction;
  onRemove?: CategoryAction;
}): ReactNode {
  const approve = useMutation(onApprove);
  const exclude = useMutation(onExclude);
  const remove = useMutation(onRemove);
  const [showWhy, setShowWhy] = useState(false);
  const whyId = useId();
  const { category } = membership;
  const isInferred = membership.state === "INFERRED";
  const isPending = approve.isPending || exclude.isPending || remove.isPending;

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        <AppLink href={`/recipes?category=${encodeURIComponent(category.name)}`}>
          <Badge
            variant={isInferred ? "outline" : "default"}
            className={cn(isInferred && "border-dashed")}
          >
            {category.name}
            {isInferred ? <span className="sr-only"> (suggested from ingredients)</span> : null}
          </Badge>
        </AppLink>
        {isInferred ? <span className="text-xs text-greyscale-600" aria-hidden="true">suggested</span> : null}
        {membership.evidence.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1 text-xs"
            aria-expanded={showWhy}
            aria-controls={whyId}
            onClick={() => setShowWhy((open) => !open)}
          >
            Why?
          </Button>
        ) : null}
        {isInferred && onApprove ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            aria-label={`Accept category ${category.name}`}
            disabled={isPending}
            onClick={() => void approve.run(category.id)}
          >
            <Check aria-hidden="true" />
          </Button>
        ) : null}
        {isInferred && onExclude ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            aria-label={`Reject category ${category.name}`}
            disabled={isPending}
            onClick={() => void exclude.run(category.id)}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
        {!isInferred && onRemove ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            aria-label={`Remove category ${category.name}`}
            disabled={isPending}
            onClick={() => void remove.run(category.id)}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {showWhy ? (
        <ul id={whyId} className="flex flex-col gap-0.5 pl-2 text-xs text-greyscale-600">
          {membership.evidence.map((evidence) => (
            <li key={evidence.mentionId}>{describeEvidence(evidence)}</li>
          ))}
        </ul>
      ) : null}
      <InlineError message={approve.error ?? exclude.error ?? remove.error} />
    </li>
  );
}

function ExcludedChip({
  membership,
  onRestore,
}: {
  membership: CategoryMembership;
  onRestore?: CategoryAction;
}): ReactNode {
  const restore = useMutation(onRestore);
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm text-greyscale-600">
      <span className="line-through">{membership.category.name}</span>
      {onRestore ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          disabled={restore.isPending}
          onClick={() => void restore.run(membership.category.id)}
        >
          <RotateCcw aria-hidden="true" className="h-3 w-3" />
          Restore
        </Button>
      ) : null}
      <InlineError message={restore.error} />
    </li>
  );
}

function AddCategoryForm({ onAdd }: { onAdd: MutationAction<[name: string]> }): ReactNode {
  const [name, setName] = useState("");
  const add = useMutation(onAdd);
  const inputId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const result = await add.run(trimmed);
    if (result.success) setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <Label htmlFor={inputId} className="text-xs">
        Add a category
      </Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={name}
          placeholder="e.g. Thanksgiving"
          onChange={(event) => setName(event.target.value)}
          className="h-8"
        />
        <Button type="submit" size="sm" variant="outline" disabled={add.isPending || !name.trim()}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>
      <InlineError message={add.error} />
    </form>
  );
}
