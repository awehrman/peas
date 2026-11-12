"use client";

import { type FormEvent, type ReactNode, useState } from "react";

import { Button, Checkbox, Label, UnderlineInput, cn } from "@peas/components";
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
    const advanceToNext = isReviewQueue && submitter?.dataset.intent === "next";

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
      markReviewed: true,
      advanceToNext,
    });

    if (!result.success) return;
    setSavedMessage("Saved");
    onSaved?.({ nextId: result.data?.nextId ?? null, advanced: advanceToNext });
  }

  return (
    <article aria-labelledby={fieldId("title")} className="p-5">
      <h2 id={fieldId("title")} className="sr-only">
        {ingredient.name}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
        <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor={fieldId("name")} className="sr-only">
              Name
            </Label>
            <UnderlineInput
              id={fieldId("name")}
              className="text-2xl font-semibold"
              value={name}
              placeholder="name"
              required
              spellCheck
              autoComplete="off"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? fieldId("name-error") : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            <FieldError id={fieldId("name-error")} message={errors.name} />

            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                aria-label="Fill in the plural automatically"
                className="shrink-0 rounded-sm p-0.5 text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPlural(pluralize.plural(name.trim()))}
                disabled={!name.trim()}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </button>
              <Label htmlFor={fieldId("plural")} className="sr-only">
                Plural
              </Label>
              <UnderlineInput
                id={fieldId("plural")}
                value={plural}
                placeholder="plural"
                spellCheck
                autoComplete="off"
                aria-invalid={!!errors.plural}
                aria-describedby={errors.plural ? fieldId("plural-error") : undefined}
                onChange={(event) => setPlural(event.target.value)}
              />
            </div>
            <FieldError id={fieldId("plural-error")} message={errors.plural} />
        </div>

        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <ChipInput
              id={fieldId("aliases")}
              label="Alternate names"
              values={aliases}
              onChange={setAliases}
              placeholder="e.g. granny smith"
              description="Press Enter or comma to add a name."
              variant="underline"
            />
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
            <div className="flex flex-col gap-1">
              <Label htmlFor={fieldId("category")}>Category</Label>
              <UnderlineInput
                id={fieldId("category")}
                className="text-sm"
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
              variant="underline"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-3">
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Properties</legend>
                {INGREDIENT_PROPERTY_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-greyscale-600">
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                      {group.properties.map((property) => (
                        <InlineCheckbox
                          key={property}
                          id={fieldId(`property-${property}`)}
                          label={formatPropertyLabel(property)}
                          isChecked={properties.includes(property)}
                          onCheckedChange={(isChecked) => toggleProperty(property, isChecked)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>
              <InlineCheckbox
                id={fieldId("composed")}
                label="Composed ingredient (can be made from a recipe)"
                isChecked={isComposed}
                onCheckedChange={setIsComposed}
              />
            </div>

            {ingredient.variants.length > 0 ? (
              <section aria-labelledby={fieldId("variants")}>
                <h3 id={fieldId("variants")} className="mb-2 text-sm font-medium">
                  Variants
                </h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {ingredient.variants.map((variant) => (
                    <li key={variant.id}>
                      <AppLink
                        href={`/ingredients?id=${variant.id}`}
                        className="text-primary hover:underline"
                      >
                        {variant.name}
                      </AppLink>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby={fieldId("references")}>
              <h3 id={fieldId("references")} className="mb-2 text-sm font-medium">
                References ({ingredient.referenceCount})
              </h3>
              {ingredient.references.length === 0 ? (
                <p className="text-sm text-greyscale-600">Not used in any imported lines yet.</p>
              ) : (
                <ul className="flex max-h-72 flex-col gap-1 overflow-auto text-sm">
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
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-greyscale-600">
            <span
              aria-hidden="true"
              className={cn(
                "h-2 w-2 rounded-full",
                ingredient.isReviewed ? "bg-primary-500" : "bg-amber-500"
              )}
            />
            {ingredient.isReviewed ? "Reviewed" : "Needs review"}
          </p>
          <div className="flex flex-col items-end gap-1">
            <InlineError message={save.error} />
            {savedMessage ? (
              <p role="status" className="text-sm text-success-800">
                {savedMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="font-normal text-greyscale-600"
                onClick={resetForm}
                disabled={save.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="font-semibold text-secondary-600 hover:text-secondary-700"
                data-intent="save"
                disabled={save.isPending || hasErrors}
              >
                {save.isPending ? "Saving..." : "Save"}
              </Button>
              {isReviewQueue ? (
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="font-semibold text-secondary-600 hover:text-secondary-700"
                  data-intent="next"
                  disabled={save.isPending || hasErrors}
                >
                  Save and next
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </article>
  );
}

function FieldError({ id, message }: { id: string; message?: string }): ReactNode {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-error-700">
      {message}
    </p>
  );
}

interface InlineCheckboxProps {
  id: string;
  label: string;
  isChecked: boolean;
  onCheckedChange: (isChecked: boolean) => void;
}

function InlineCheckbox({ id, label, isChecked, onCheckedChange }: InlineCheckboxProps): ReactNode {
  return (
    <div className="flex items-center gap-1.5">
      <Checkbox
        id={id}
        checked={isChecked}
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
        className="h-3.5 w-3.5 rounded-[3px] border-greyscale-500 shadow-none data-[state=checked]:border-primary-600 data-[state=checked]:bg-transparent data-[state=checked]:text-primary-600 [&_svg]:h-3.5 [&_svg]:w-3.5"
      />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}
