"use client";

import { type FormEvent, type ReactNode, useEffect, useId, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@peas/components";
import { ArrowLeft, Pencil } from "lucide-react";

import { AppLink } from "../../app-navigation";
import { InlineError, type MutationAction, useMutation } from "../../shared";
import { ConceptPicker } from "../../teach/concept-picker";
import type { ConceptRef, SearchConcepts } from "../../teach/types";
import type { CategoryEvidence, CategoryKind, FoodRelationshipType } from "../types";

import { describeEvidence } from "./category-chips";

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  kind: CategoryKind;
  description: string | null;
  concept: ConceptRef | null;
  traversal: FoodRelationshipType[];
  ruleVersion: number;
  approvedCount: number;
  inferredCount: number;
  excludedCount: number;
}

export interface CategoryFormInput {
  name: string;
  description: string | null;
  conceptId: string | null;
  traversal: FoodRelationshipType[];
}

export interface CategoryRulePreview {
  noteCount: number;
  examples: { noteId: string; title: string | null; evidence: CategoryEvidence[] }[];
}

interface CategoriesPageContentProps {
  categories: CategoryView[];
  /** Admin only; the page is read-only without them. */
  onCreate?: MutationAction<[input: CategoryFormInput]>;
  onUpdate?: MutationAction<[id: string, input: CategoryFormInput]>;
  onSearchConcepts: SearchConcepts;
  onPreviewRule: (conceptId: string, traversal: FoodRelationshipType[]) => Promise<CategoryRulePreview>;
}

const TRAVERSAL_OPTIONS: { value: FoodRelationshipType; label: string; description: string }[] = [
  { value: "IS_A", label: "Kinds of it", description: "boneless chicken thigh is a chicken thigh" },
  { value: "PART_OF", label: "Parts of it", description: "chicken thigh is part of chicken" },
  { value: "DERIVED_FROM", label: "Made from it", description: "chicken stock is made from chicken" },
  { value: "PROCESSED_FROM", label: "Processed from it", description: "dried apricot is processed from apricot" },
];

const DEFAULT_TRAVERSAL: FoodRelationshipType[] = ["IS_A", "PART_OF"];

/**
 * Recipe categories: manual ones (Thanksgiving, Freezer friendly) and ingredient categories that infer members from a food and the relationships allowed for it. Rule changes show how many notes would match before saving and are recomputed in the background; reviewer decisions on members are kept.
 */
export function CategoriesPageContent({
  categories,
  onCreate,
  onUpdate,
  onSearchConcepts,
  onPreviewRule,
}: CategoriesPageContentProps): ReactNode {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <AppLink href="/recipes" className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Recipes
      </AppLink>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-greyscale-900">Categories</h1>
        <p className="text-sm text-greyscale-600">
          Ingredient categories suggest members from recipe ingredients; suggestions stay until accepted or rejected on the recipe.
        </p>
      </header>

      {onCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>New category</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryForm
              submitLabel="Create category"
              onSubmit={onCreate}
              onSearchConcepts={onSearchConcepts}
              onPreviewRule={onPreviewRule}
              resetOnSuccess
            />
          </CardContent>
        </Card>
      ) : null}

      {categories.length === 0 ? (
        <p className="text-sm text-greyscale-600">No categories yet.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Categories">
          {categories.map((category) => (
            <li key={category.id}>
              <Card>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AppLink
                        href={`/recipes?category=${encodeURIComponent(category.name)}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {category.name}
                      </AppLink>
                      <Badge variant="outline">{category.kind === "CONCEPT" ? "From ingredients" : "Manual"}</Badge>
                    </div>
                    {category.concept ? (
                      <p className="text-xs text-greyscale-600">
                        Recipes with{" "}
                        <AppLink href={`/concepts/${category.concept.id}`} className="underline">
                          {category.concept.canonicalName}
                        </AppLink>{" "}
                        (
                        {category.traversal
                          .map((type) => TRAVERSAL_OPTIONS.find((option) => option.value === type)?.label.toLowerCase())
                          .join(", ")}
                        )
                      </p>
                    ) : null}
                    {category.description ? <p className="text-xs text-greyscale-600">{category.description}</p> : null}
                    <p className="text-xs tabular-nums text-greyscale-600">
                      {category.approvedCount} approved · {category.inferredCount} suggested · {category.excludedCount} excluded
                    </p>
                  </div>
                  {onUpdate ? (
                    <EditCategoryDialog
                      category={category}
                      onUpdate={onUpdate}
                      onSearchConcepts={onSearchConcepts}
                      onPreviewRule={onPreviewRule}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditCategoryDialog({
  category,
  onUpdate,
  onSearchConcepts,
  onPreviewRule,
}: {
  category: CategoryView;
  onUpdate: MutationAction<[id: string, input: CategoryFormInput]>;
  onSearchConcepts: SearchConcepts;
  onPreviewRule: CategoriesPageContentProps["onPreviewRule"];
}): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          Edit
          <span className="sr-only"> {category.name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {category.name}</DialogTitle>
          <DialogDescription>
            Changing the food or relationships recomputes suggestions in the background. Accepted and rejected memberships are kept.
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          initial={category}
          submitLabel="Save"
          onSubmit={async (input) => {
            const result = await onUpdate(category.id, input);
            if (result.success) setIsOpen(false);
            return result;
          }}
          onSearchConcepts={onSearchConcepts}
          onPreviewRule={onPreviewRule}
        />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  initial,
  submitLabel,
  onSubmit,
  onSearchConcepts,
  onPreviewRule,
  resetOnSuccess = false,
}: {
  initial?: CategoryView;
  submitLabel: string;
  onSubmit: MutationAction<[input: CategoryFormInput]>;
  onSearchConcepts: SearchConcepts;
  onPreviewRule: CategoriesPageContentProps["onPreviewRule"];
  resetOnSuccess?: boolean;
}): ReactNode {
  const formId = useId();
  const submit = useMutation(onSubmit);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [concept, setConcept] = useState<ConceptRef | null>(initial?.concept ?? null);
  const [traversal, setTraversal] = useState<FoodRelationshipType[]>(initial?.traversal ?? DEFAULT_TRAVERSAL);
  const [preview, setPreview] = useState<CategoryRulePreview | null>(null);
  const nameError = name.trim() ? null : "Name is required";
  const traversalKey = traversal.join(",");

  // Ask how many notes the rule would include whenever the food or relationships change
  useEffect(() => {
    if (!concept || traversal.length === 0) {
      setPreview(null);
      return;
    }
    let isCancelled = false;
    onPreviewRule(concept.id, traversal)
      .then((result) => {
        if (!isCancelled) setPreview(result);
      })
      .catch(() => {
        if (!isCancelled) setPreview(null);
      });
    return () => {
      isCancelled = true;
    };
    // traversalKey stands in for the array's contents, so a new array with the same types does not refetch
  }, [concept, traversalKey, onPreviewRule]);

  function toggleTraversal(type: FoodRelationshipType, checked: boolean) {
    setTraversal((current) => (checked ? [...new Set([...current, type])] : current.filter((value) => value !== type)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nameError) return;
    const result = await submit.run({
      name: name.trim(),
      description: description.trim() || null,
      conceptId: concept?.id ?? null,
      traversal: traversal.length ? traversal : DEFAULT_TRAVERSAL,
    });
    if (result.success && resetOnSuccess) {
      setName("");
      setDescription("");
      setConcept(null);
      setTraversal(DEFAULT_TRAVERSAL);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${formId}-name`}>Name</Label>
        <Input
          id={`${formId}-name`}
          value={name}
          required
          aria-invalid={!!nameError}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${formId}-description`}>Description (optional)</Label>
        <Input id={`${formId}-description`} value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <ConceptPicker
        label="Suggest recipes that use this food (optional)"
        value={concept}
        onChange={setConcept}
        onSearch={onSearchConcepts}
        placeholder="e.g. chicken"
      />
      {concept ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Also include</legend>
          {TRAVERSAL_OPTIONS.map((option) => {
            const id = `${formId}-${option.value}`;
            return (
              <div key={option.value} className="flex items-start gap-2">
                <Checkbox
                  id={id}
                  checked={traversal.includes(option.value)}
                  onCheckedChange={(checked) => toggleTraversal(option.value, checked === true)}
                />
                <Label htmlFor={id} className="text-sm font-normal">
                  {option.label}
                  <span className="block text-xs text-greyscale-600">e.g. {option.description}</span>
                </Label>
              </div>
            );
          })}
          {preview ? (
            <div aria-live="polite" className="rounded-md border border-greyscale-200 p-3 text-sm">
              <p className="font-medium">
                {preview.noteCount} {preview.noteCount === 1 ? "note matches" : "notes match"}
              </p>
              {preview.examples.length ? (
                <ul className="mt-1 list-disc pl-5 text-xs text-greyscale-600">
                  {preview.examples.map((example) => (
                    <li key={example.noteId}>
                      {example.title ?? "Untitled"}
                      {example.evidence[0] ? `: ${describeEvidence(example.evidence[0])}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      ) : null}
      <InlineError message={submit.error} />
      <Button type="submit" className="self-start" disabled={submit.isPending || !!nameError}>
        {submit.isPending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
