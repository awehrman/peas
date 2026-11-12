"use client";

import { type FormEvent, type ReactNode, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from "@peas/components";
import pluralize from "pluralize";
import { Sparkles } from "lucide-react";

import { AppLink } from "../../app-navigation";
import { ChipInput, InlineError, type MutationAction, useMutation } from "../../shared";
import {
  INGREDIENT_PROPERTY_GROUPS,
  type IngredientDetail,
  type IngredientOption,
  type IngredientProperty,
  type IngredientSaveInput,
} from "../types";
import { formatPropertyLabel } from "../utils/group-ingredients";
import { validateIngredientNames } from "../utils/validate-ingredient";

import { IngredientPicker, type SearchIngredients } from "./ingredient-picker";

export type SaveIngredient = MutationAction<
  [input: IngredientSaveInput],
  { nextId: string | null }
>;

interface IngredientCardProps {
  ingredient: IngredientDetail;
  categoryOptions: string[];
  isReviewQueue: boolean;
  onSave: SaveIngredient;
  onSearch: SearchIngredients;
  onSaved?: (result: { nextId: string | null; advanced: boolean }) => void;
}

interface SubmitOptions {
  markReviewed: boolean;
  advanceToNext: boolean;
}

function getSubmitOptions(intent: string | undefined, isReviewQueue: boolean): SubmitOptions {
  if (intent === "review") return { markReviewed: true, advanceToNext: isReviewQueue };
  return { markReviewed: false, advanceToNext: false };
}

export function IngredientCard({
  ingredient,
  categoryOptions,
  isReviewQueue,
  onSave,
  onSearch,
  onSaved,
}: IngredientCardProps): ReactNode {
  const [name, setName] = useState(ingredient.name);
  const [plural, setPlural] = useState(ingredient.plural ?? "");
  const [properties, setProperties] = useState<IngredientProperty[]>(ingredient.properties);
  const [isComposed, setIsComposed] = useState(ingredient.isComposedIngredient);
  const [parent, setParent] = useState<IngredientOption[]>(
    ingredient.parent ? [ingredient.parent] : []
  );
  const [substitutions, setSubstitutions] = useState<IngredientOption[]>(
    ingredient.substitutions
  );
  const [aliases, setAliases] = useState(ingredient.aliases.map((alias) => alias.name));
  const [category, setCategory] = useState(ingredient.category ?? "");
  const [tags, setTags] = useState(ingredient.tags);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const save = useMutation(onSave);

  const errors = validateIngredientNames(name, plural);
  const hasErrors = Object.keys(errors).length > 0;
  const fieldId = (field: string) => `ingredient-${ingredient.id}-${field}`;
  const categoryListId = fieldId("category-options");

  function toggleProperty(property: IngredientProperty, isChecked: boolean) {
    setProperties((current) =>
      isChecked ? [...current, property] : current.filter((item) => item !== property)
    );
  }

  function resetForm() {
    setName(ingredient.name);
    setPlural(ingredient.plural ?? "");
    setProperties(ingredient.properties);
    setIsComposed(ingredient.isComposedIngredient);
    setParent(ingredient.parent ? [ingredient.parent] : []);
    setSubstitutions(ingredient.substitutions);
    setAliases(ingredient.aliases.map((alias) => alias.name));
    setCategory(ingredient.category ?? "");
    setTags(ingredient.tags);
    save.clearError();
    setSavedMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasErrors) return;
    setSavedMessage(null);

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const submitOptions = getSubmitOptions(submitter?.dataset.intent, isReviewQueue);

    const result = await save.run({
      id: ingredient.id,
      name: name.trim(),
      plural: plural.trim() || null,
      properties,
      isComposedIngredient: isComposed,
      parentIngredientId: parent[0]?.id ?? null,
      substitutionIds: substitutions.map((option) => option.id),
      aliases,
      category: category.trim() || null,
      tags,
      markReviewed: submitOptions.markReviewed,
      advanceToNext: submitOptions.advanceToNext,
    });

    if (!result.success) return;
    setSavedMessage("Saved");
    onSaved?.({
      nextId: result.data?.nextId ?? null,
      advanced: submitOptions.advanceToNext,
    });
  }

  return (
    <Card aria-labelledby={fieldId("title")}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle>
          <h2 id={fieldId("title")} className="text-xl">
            {ingredient.name}
          </h2>
        </CardTitle>
        {ingredient.isReviewed ? (
          <Badge variant="secondary">Reviewed</Badge>
        ) : (
          <Badge variant="outline">Needs review</Badge>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={fieldId("name")}>Name</Label>
              <Input
                id={fieldId("name")}
                value={name}
                required
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? fieldId("name-error") : undefined}
                onChange={(event) => setName(event.target.value)}
              />
              {errors.name ? (
                <p id={fieldId("name-error")} className="text-xs text-error-700">
                  {errors.name}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={fieldId("plural")}>Plural</Label>
              <div className="flex gap-2">
                <Input
                  id={fieldId("plural")}
                  value={plural}
                  aria-invalid={!!errors.plural}
                  aria-describedby={errors.plural ? fieldId("plural-error") : undefined}
                  onChange={(event) => setPlural(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Fill in the plural automatically"
                  onClick={() => setPlural(pluralize.plural(name.trim()))}
                  disabled={!name.trim()}
                >
                  <Sparkles aria-hidden="true" />
                </Button>
              </div>
              {errors.plural ? (
                <p id={fieldId("plural-error")} className="text-xs text-error-700">
                  {errors.plural}
                </p>
              ) : null}
            </div>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-medium">Properties</legend>
            {INGREDIENT_PROPERTY_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-greyscale-600">
                  {group.label}
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.properties.map((property) => (
                    <div key={property} className="flex items-center gap-2">
                      <Checkbox
                        id={fieldId(`property-${property}`)}
                        checked={properties.includes(property)}
                        onCheckedChange={(checked) => toggleProperty(property, checked === true)}
                      />
                      <Label htmlFor={fieldId(`property-${property}`)} className="font-normal">
                        {formatPropertyLabel(property)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          <div className="flex items-center gap-2">
            <Checkbox
              id={fieldId("composed")}
              checked={isComposed}
              onCheckedChange={(checked) => setIsComposed(checked === true)}
            />
            <Label htmlFor={fieldId("composed")} className="font-normal">
              Can also be made from a recipe (composed ingredient)
            </Label>
          </div>

          <ChipInput
            id={fieldId("aliases")}
            label="Alternate names"
            values={aliases}
            onChange={setAliases}
            placeholder="e.g. granny smith"
            description="Press Enter or comma to add a name."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <IngredientPicker
              label="Parent ingredient"
              selected={parent}
              onChange={setParent}
              onSearch={onSearch}
              excludeId={ingredient.id}
            />
            <IngredientPicker
              label="Substitutes"
              selected={substitutions}
              onChange={setSubstitutions}
              onSearch={onSearch}
              excludeId={ingredient.id}
              multiple
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={fieldId("category")}>Category</Label>
              <Input
                id={fieldId("category")}
                value={category}
                list={categoryListId}
                placeholder="e.g. fruit"
                onChange={(event) => setCategory(event.target.value)}
              />
              <datalist id={categoryListId}>
                {categoryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <ChipInput
              id={fieldId("tags")}
              label="Tags"
              values={tags}
              onChange={setTags}
              placeholder="e.g. low-carb"
            />
          </div>

          {ingredient.variants.length > 0 ? (
            <section aria-labelledby={fieldId("variants")}>
              <h3 id={fieldId("variants")} className="mb-2 text-sm font-medium">
                Variants
              </h3>
              <ul className="flex flex-wrap gap-2">
                {ingredient.variants.map((variant) => (
                  <li key={variant.id}>
                    <AppLink
                      href={`/ingredients?id=${variant.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {variant.name}
                    </AppLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-col gap-2">
            <InlineError message={save.error} />
            {savedMessage ? (
              <p role="status" className="text-sm text-success-800">
                {savedMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                data-intent="save"
                disabled={save.isPending || hasErrors}
              >
                {save.isPending ? "Saving..." : "Save"}
              </Button>
              {!ingredient.isReviewed ? (
                <Button
                  type="submit"
                  variant="secondary"
                  data-intent="review"
                  disabled={save.isPending || hasErrors}
                >
                  {isReviewQueue ? "Mark reviewed and next" : "Mark reviewed"}
                </Button>
              ) : null}
              <Button type="button" variant="ghost" onClick={resetForm} disabled={save.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        </form>

        <section aria-labelledby={fieldId("references")} className="mt-6 border-t pt-4">
          <h3 id={fieldId("references")} className="mb-2 text-sm font-medium">
            References ({ingredient.referenceCount})
          </h3>
          {ingredient.references.length === 0 ? (
            <p className="text-sm text-greyscale-600">Not used in any imported lines yet.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1 overflow-auto text-sm">
              {ingredient.references.map((reference) => (
                <li key={reference.id} className="flex justify-between gap-2">
                  <span>{reference.reference}</span>
                  {reference.noteId ? (
                    <AppLink
                      href={`/notes/${reference.noteId}`}
                      className="shrink-0 text-primary hover:underline"
                    >
                      {reference.noteTitle || "View note"}
                    </AppLink>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
