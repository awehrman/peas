"use client";

import { IngredientPicker, type SearchIngredients } from "./ingredient-picker";

import { type FormEvent, type ReactNode, useState } from "react";

import {
  Button,
  Checkbox,
  InlineSelect,
  Label,
  UnderlineInput,
  cn,
} from "@peas/components";
import { Pencil, X } from "lucide-react";

import { AppLink } from "../../app-navigation";
import {
  AddableLabel,
  ChipInput,
  InlineError,
  type MutationAction,
  RemovableList,
  useMutation,
} from "../../shared";
import {
  COMPOSING_RELATIONSHIP_TYPES,
  INGREDIENT_DIETARY_TAG_LABELS,
  INGREDIENT_PROPERTY_GROUPS,
  INGREDIENT_RELATIONSHIP_LABELS,
  INGREDIENT_RELATIONSHIP_TYPES,
  INGREDIENT_VARIANT_HEADINGS,
  type IngredientDetail,
  type IngredientOption,
  type IngredientPropertyState,
  type IngredientRelation,
  type IngredientRelationshipType,
  type IngredientSaveInput,
  type IngredientStoredProperty,
} from "../types";
import { dietaryTagsFor } from "../utils/dietary-tags";
import { formatPropertyLabel } from "../utils/group-ingredients";
import { validateIngredientNames } from "../utils/validate-ingredient";

export type SaveIngredient = MutationAction<
  [input: IngredientSaveInput],
  { nextId: string | null }
>;

/** The food that already answers to a name (other than `excludeId`), or null when the name is free. */
export type CheckIngredientName = (
  name: string,
  excludeId: string
) => Promise<IngredientOption | null>;

/** How many matches the pickers offer at once. */
const PICKER_LIMIT = 5;

interface IngredientCardProps {
  ingredient: IngredientDetail;
  categoryOptions: string[];
  isReviewQueue: boolean;
  onSave: SaveIngredient;
  onSearch: SearchIngredients;
  /** Checks a new alternate name against every food's names. */
  onCheckName?: CheckIngredientName;
  onSaved?: (result: { nextId: string | null; advanced: boolean }) => void;
}

/**
 * The ingredient card: read-only with an edit button on the ingredients list, and always editable in the review queue. Cancelling an edit throws away every change.
 */
export function IngredientCard({
  isReviewQueue,
  onSaved,
  ...props
}: IngredientCardProps): ReactNode {
  const [isEditing, setIsEditing] = useState(isReviewQueue);
  const [editorKey, setEditorKey] = useState(0);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  if (!isEditing)
    return (
      <IngredientCardView
        ingredient={props.ingredient}
        savedMessage={savedMessage}
        onEdit={() => {
          setSavedMessage(null);
          setIsEditing(true);
        }}
      />
    );

  return (
    <IngredientCardEditor
      key={editorKey}
      {...props}
      isReviewQueue={isReviewQueue}
      onCancel={() => {
        if (isReviewQueue) setEditorKey((key) => key + 1);
        else setIsEditing(false);
      }}
      onSaved={(result) => {
        if (!isReviewQueue) {
          setSavedMessage("Saved");
          setIsEditing(false);
        }
        onSaved?.(result);
      }}
    />
  );
}

function IngredientCardView({
  ingredient,
  savedMessage,
  onEdit,
}: {
  ingredient: IngredientDetail;
  savedMessage: string | null;
  onEdit: () => void;
}): ReactNode {
  const titleId = `ingredient-${ingredient.id}-title`;
  const inEffect = ingredient.propertyStates.filter(
    (state) => (state.explicit ?? state.inherited) === "TRUE"
  );
  const composingRelation = ingredient.relationships.find((relation) =>
    COMPOSING_RELATIONSHIP_TYPES.includes(relation.relationshipType)
  );
  const isComposed =
    ingredient.isComposedIngredient || composingRelation !== undefined;
  const autoTags = ingredient.dietaryTags.flatMap((tag) =>
    tag === "VEGAN" || tag === "VEGETARIAN" || tag === "GLUTEN_FREE"
      ? [INGREDIENT_DIETARY_TAG_LABELS[tag]]
      : []
  );

  return (
    <article
      aria-labelledby={titleId}
      className="max-h-[48rem] overflow-y-auto p-5"
    >
      <div className="flex flex-col gap-5">
        <header className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-2xl">
            <span className="font-semibold">{ingredient.name}</span>
            {ingredient.plural ? (
              <span className="text-greyscale-600">, {ingredient.plural}</span>
            ) : null}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Edit ${ingredient.name}`}
            className="text-greyscale-600 hover:text-primary-700"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <ViewList
              label="Alternate names"
              items={ingredient.aliases.map((alias) => alias.name)}
            />
            {ingredient.relationships.length > 0 ? (
              <ViewSection label="Base ingredients">
                <ul
                  aria-label="Base ingredients"
                  className="flex flex-col gap-1 text-sm"
                >
                  {ingredient.relationships.map((relation) => (
                    <li key={relation.ingredient.id}>
                      {ingredient.name}{" "}
                      <span className="text-secondary-700">
                        {
                          INGREDIENT_RELATIONSHIP_LABELS[
                            relation.relationshipType
                          ]
                        }
                      </span>{" "}
                      <AppLink
                        href={`/ingredients?id=${relation.ingredient.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {relation.ingredient.name}
                      </AppLink>
                    </li>
                  ))}
                </ul>
              </ViewSection>
            ) : null}
            {ingredient.substitutions.length > 0 ? (
              <ViewSection label="Substitutes">
                <ul
                  aria-label="Substitutes"
                  className="flex flex-wrap gap-x-3 gap-y-1 text-sm"
                >
                  {ingredient.substitutions.map((option) => (
                    <li key={option.id}>
                      <AppLink
                        href={`/ingredients?id=${option.id}`}
                        className="text-primary hover:underline"
                      >
                        {option.name}
                      </AppLink>
                    </li>
                  ))}
                </ul>
              </ViewSection>
            ) : null}
            <ViewList
              label="Categories"
              items={ingredient.categories}
              isChips
            />
            {autoTags.length > 0 || ingredient.tags.length > 0 ? (
              <ViewSection label="Tags">
                <ul aria-label="Tags" className="flex flex-wrap gap-1">
                  {autoTags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-sm bg-secondary-50 px-1.5 py-0.5 text-xs text-secondary-700"
                    >
                      {tag}
                    </li>
                  ))}
                  {ingredient.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-sm bg-greyscale-100 px-1.5 py-0.5 text-xs text-greyscale-800"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </ViewSection>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            {INGREDIENT_PROPERTY_GROUPS.map((group) => {
              const members = inEffect.filter((state) =>
                (group.properties as readonly string[]).includes(state.property)
              );
              if (members.length === 0) return null;
              return (
                <ViewSection key={group.label} label={group.label}>
                  <ul
                    aria-label={group.label}
                    className="flex flex-wrap gap-x-3 gap-y-1 text-sm"
                  >
                    {members.map((state) => (
                      <li key={state.property}>
                        {formatPropertyLabel(state.property)}
                        {state.explicit === null && state.inheritedFrom ? (
                          <span className="text-xs text-greyscale-600">
                            {" "}
                            (from {state.inheritedFrom.name})
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </ViewSection>
              );
            })}
            {isComposed ? (
              <p className="text-sm text-greyscale-800">
                Composed ingredient
                {composingRelation ? (
                  <span className="text-xs text-greyscale-600">
                    {" "}
                    (
                    {
                      INGREDIENT_RELATIONSHIP_LABELS[
                        composingRelation.relationshipType
                      ]
                    }{" "}
                    {composingRelation.ingredient.name})
                  </span>
                ) : null}
              </p>
            ) : null}
            <VariantsSection ingredient={ingredient} />
            <ReferencesSection ingredient={ingredient} />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3">
          <ReviewStatus ingredient={ingredient} />
          {savedMessage ? (
            <p role="status" className="text-sm text-success-800">
              {savedMessage}
            </p>
          ) : null}
        </footer>
      </div>
    </article>
  );
}

function IngredientCardEditor({
  ingredient,
  categoryOptions,
  isReviewQueue,
  onSave,
  onSearch,
  onCheckName,
  onCancel,
  onSaved,
}: IngredientCardProps & {
  onCancel: () => void;
  onSaved: (result: { nextId: string | null; advanced: boolean }) => void;
}): ReactNode {
  const [name, setName] = useState(ingredient.name);
  const [plural, setPlural] = useState(ingredient.plural ?? "");
  const [explicit, setExplicit] = useState(() =>
    explicitValues(ingredient.propertyStates)
  );
  const [isComposed, setIsComposed] = useState(ingredient.isComposedIngredient);
  const [relations, setRelations] = useState<IngredientRelation[]>(
    ingredient.relationships
  );
  const [substitutions, setSubstitutions] = useState<IngredientOption[]>(
    ingredient.substitutions
  );
  const [aliases, setAliases] = useState(
    ingredient.aliases.map((alias) => alias.name)
  );
  const [categories, setCategories] = useState(ingredient.categories);
  const [tags, setTags] = useState(ingredient.tags);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isAddingBase, setIsAddingBase] = useState(false);
  const [isAddingSubstitute, setIsAddingSubstitute] = useState(false);
  const save = useMutation(onSave);
  const inheritedStates = new Map(
    ingredient.propertyStates.map((state) => [state.property, state])
  );

  const errors = validateIngredientNames(name, plural);
  const hasErrors = Object.keys(errors).length > 0;
  const fieldId = (field: string) => `ingredient-${ingredient.id}-${field}`;
  const displayName = name.trim() || ingredient.name;

  const isInherited = (property: IngredientStoredProperty) =>
    inheritedStates.get(property)?.inherited === "TRUE";
  const isInEffect = (property: IngredientStoredProperty) =>
    (explicit.get(property) ?? (isInherited(property) ? "TRUE" : null)) ===
    "TRUE";
  const dietaryTags = dietaryTagsFor(
    INGREDIENT_PROPERTY_GROUPS.flatMap((group) => group.properties).filter(
      isInEffect
    )
  );
  const composingRelation = relations.find((relation) =>
    COMPOSING_RELATIONSHIP_TYPES.includes(relation.relationshipType)
  );

  /** Checking sets "contains"; unchecking an inherited property sets "does not contain"; unchecking that again goes back to inheriting. */
  function toggleProperty(property: IngredientStoredProperty) {
    setExplicit((current) => {
      const next = new Map(current);
      if (isInEffect(property)) {
        if (isInherited(property)) next.set(property, "FALSE");
        else next.delete(property);
      } else if (isInherited(property)) next.delete(property);
      else next.set(property, "TRUE");
      return next;
    });
  }

  function setRelationType(
    ingredientId: string,
    relationshipType: IngredientRelationshipType
  ) {
    setRelations((current) =>
      current.map((relation) =>
        relation.ingredient.id === ingredientId
          ? { ...relation, relationshipType }
          : relation
      )
    );
  }

  async function validateAlias(value: string): Promise<string | null> {
    const key = value.trim().toLowerCase();
    if (
      key === name.trim().toLowerCase() ||
      key === plural.trim().toLowerCase()
    )
      return `“${value.trim()}” is already this ingredient's name`;
    const owner = onCheckName
      ? await onCheckName(value.trim(), ingredient.id)
      : null;
    return owner
      ? `“${value.trim()}” is already a name of ${owner.name}`
      : null;
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
      properties: [...explicit].flatMap(([property, value]) =>
        value === "TRUE" ? [property] : []
      ),
      excludedProperties: [...explicit].flatMap(([property, value]) =>
        value === "FALSE" ? [property] : []
      ),
      isComposedIngredient: isComposed || composingRelation !== undefined,
      relationships: relations.map((relation) => ({
        ingredientId: relation.ingredient.id,
        relationshipType: relation.relationshipType,
      })),
      substitutionIds: substitutions.map((option) => option.id),
      aliases,
      categories,
      tags,
      markReviewed: true,
      advanceToNext,
    });

    if (!result.success) return;
    setSavedMessage("Saved");
    onSaved({ nextId: result.data?.nextId ?? null, advanced: advanceToNext });
  }

  return (
    <article
      aria-labelledby={fieldId("title")}
      className="max-h-[48rem] overflow-y-auto p-5"
    >
      <h2 id={fieldId("title")} className="sr-only">
        {ingredient.name}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-2xl">
            <Label htmlFor={fieldId("name")} className="sr-only">
              Name
            </Label>
            <span className="inline-flex min-w-0 items-baseline">
              <UnderlineInput
                id={fieldId("name")}
                fitContent
                className="font-semibold"
                value={name}
                placeholder="name"
                required
                spellCheck
                autoComplete="off"
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? fieldId("name-error") : undefined
                }
                onChange={(event) => setName(event.target.value)}
              />
              <span aria-hidden="true" className="-ml-1 text-greyscale-400">
                ,
              </span>
            </span>
            <Label htmlFor={fieldId("plural")} className="sr-only">
              Plural
            </Label>
            <UnderlineInput
              id={fieldId("plural")}
              fitContent
              className="text-greyscale-600"
              value={plural}
              placeholder="plural"
              spellCheck
              autoComplete="off"
              aria-invalid={!!errors.plural}
              aria-describedby={
                errors.plural ? fieldId("plural-error") : undefined
              }
              onChange={(event) => setPlural(event.target.value)}
            />
          </div>
          <FieldError id={fieldId("name-error")} message={errors.name} />
          <FieldError id={fieldId("plural-error")} message={errors.plural} />
        </div>

        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <ChipInput
              id={fieldId("aliases")}
              label="Alternate names"
              values={aliases}
              onChange={setAliases}
              placeholder="add alternate name"
              addLabel="Add an alternate name"
              validate={validateAlias}
              variant="underline"
            />

            <div
              role="group"
              aria-labelledby={fieldId("bases-label")}
              className="flex flex-col gap-1"
            >
              <AddableLabel
                id={fieldId("bases-label")}
                label="Base ingredients"
                addLabel="Add a base ingredient"
                canAdd={!isAddingBase}
                onAdd={() => setIsAddingBase(true)}
              />
              {relations.length > 0 ? (
                <ul
                  aria-label="Base ingredients"
                  className="flex max-h-40 flex-col gap-1.5 overflow-y-auto"
                >
                  {relations.map((relation) => (
                    <li
                      key={relation.ingredient.id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="text-greyscale-700">{displayName}</span>
                      <InlineSelect
                        aria-label={`How ${displayName} relates to ${relation.ingredient.name}`}
                        value={relation.relationshipType}
                        onChange={(event) =>
                          setRelationType(
                            relation.ingredient.id,
                            event.target.value as IngredientRelationshipType
                          )
                        }
                      >
                        {INGREDIENT_RELATIONSHIP_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {INGREDIENT_RELATIONSHIP_LABELS[type]}
                          </option>
                        ))}
                      </InlineSelect>
                      <AppLink
                        href={`/ingredients?id=${relation.ingredient.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {relation.ingredient.name}
                      </AppLink>
                      <button
                        type="button"
                        aria-label={`Remove ${relation.ingredient.name}`}
                        className="rounded-sm p-0.5 text-greyscale-500 hover:text-greyscale-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() =>
                          setRelations((current) =>
                            current.filter(
                              (item) =>
                                item.ingredient.id !== relation.ingredient.id
                            )
                          )
                        }
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {isAddingBase ? (
                <BaseIngredientAdder
                  foodName={displayName}
                  excludeIds={[
                    ingredient.id,
                    ...relations.map((relation) => relation.ingredient.id),
                  ]}
                  onSearch={onSearch}
                  onAdd={(relation) => {
                    setRelations((current) => [...current, relation]);
                    setIsAddingBase(false);
                  }}
                  onCancel={() => setIsAddingBase(false)}
                />
              ) : null}
            </div>

            <div
              role="group"
              aria-labelledby={fieldId("substitutes-label")}
              className="flex flex-col gap-1"
            >
              <AddableLabel
                id={fieldId("substitutes-label")}
                label="Substitutes"
                addLabel="Add a substitute"
                canAdd={!isAddingSubstitute}
                onAdd={() => setIsAddingSubstitute(true)}
              />
              <RemovableList
                label="Substitutes"
                items={substitutions.map((option) => ({
                  key: option.id,
                  label: option.name,
                }))}
                onRemove={(id) =>
                  setSubstitutions((current) =>
                    current.filter((option) => option.id !== id)
                  )
                }
              />
              {isAddingSubstitute ? (
                <IngredientPicker
                  label="Add a substitute"
                  selected={substitutions}
                  onChange={setSubstitutions}
                  onSearch={onSearch}
                  excludeId={ingredient.id}
                  limit={PICKER_LIMIT}
                  multiple
                  hideSelected
                  autoFocus
                  onDismiss={() => setIsAddingSubstitute(false)}
                />
              ) : null}
            </div>

            <ChipInput
              id={fieldId("categories")}
              label="Categories"
              values={categories}
              onChange={setCategories}
              placeholder="add category"
              addLabel="Add a category"
              suggestions={categoryOptions.filter(
                (option) => !categories.includes(option)
              )}
              variant="underline"
            />
            <ChipInput
              id={fieldId("tags")}
              label="Tags"
              values={tags}
              onChange={setTags}
              placeholder="add tag"
              addLabel="Add a tag"
              fixedValues={dietaryTags.map(
                (tag) => INGREDIENT_DIETARY_TAG_LABELS[tag]
              )}
              fixedValuesDescription="Added automatically from the properties"
              variant="underline"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-3">
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Properties</legend>
                {INGREDIENT_PROPERTY_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-greyscale-600">
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                      {group.properties.map((property) => {
                        const inherited = inheritedStates.get(property);
                        const own = explicit.get(property);
                        const note =
                          own === undefined && inherited?.inherited === "TRUE"
                            ? `from ${inherited.inheritedFrom?.name ?? "its base"}`
                            : own === "FALSE" && inherited?.inherited === "TRUE"
                              ? `not, unlike ${inherited.inheritedFrom?.name ?? "its base"}`
                              : undefined;
                        return (
                          <InlineCheckbox
                            key={property}
                            id={fieldId(`property-${property}`)}
                            label={formatPropertyLabel(property)}
                            isChecked={isInEffect(property)}
                            isInherited={
                              own === undefined && isInherited(property)
                            }
                            isExcluded={own === "FALSE"}
                            note={note}
                            onCheckedChange={() => toggleProperty(property)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </fieldset>
              <InlineCheckbox
                id={fieldId("composed")}
                label="Composed ingredient (can be made from a recipe)"
                isChecked={isComposed || composingRelation !== undefined}
                isDisabled={composingRelation !== undefined}
                note={
                  composingRelation
                    ? `${INGREDIENT_RELATIONSHIP_LABELS[composingRelation.relationshipType]} ${composingRelation.ingredient.name}`
                    : undefined
                }
                onCheckedChange={setIsComposed}
              />
            </div>
            <VariantsSection ingredient={ingredient} />
            <ReferencesSection ingredient={ingredient} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ReviewStatus ingredient={ingredient} isEditing />
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
                onClick={onCancel}
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

/**
 * Adds one base ingredient: how the food relates to it, and an existing ingredient picked from the closest matches. Both are required.
 */
function BaseIngredientAdder({
  foodName,
  excludeIds,
  onSearch,
  onAdd,
  onCancel,
}: {
  foodName: string;
  excludeIds: string[];
  onSearch: SearchIngredients;
  onAdd: (relation: IngredientRelation) => void;
  onCancel: () => void;
}): ReactNode {
  const [relationshipType, setRelationshipType] = useState<
    IngredientRelationshipType | ""
  >("");
  const [base, setBase] = useState<IngredientOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (!relationshipType) {
      setError(`Choose how ${foodName} relates to its base ingredient`);
      return;
    }
    const [ingredient] = base;
    if (!ingredient) {
      setError("Choose an existing ingredient");
      return;
    }
    onAdd({ relationshipType, ingredient });
  }

  return (
    <div
      role="group"
      aria-label="New base ingredient"
      className="flex flex-col gap-2 rounded-md border border-greyscale-200 p-2"
    >
      <div className="flex flex-wrap items-start gap-2 text-sm">
        <span className="pt-1 text-greyscale-700">{foodName}</span>
        <InlineSelect
          aria-label="Relationship"
          className="mt-1"
          value={relationshipType}
          autoFocus
          onChange={(event) => {
            setRelationshipType(
              event.target.value as IngredientRelationshipType
            );
            setError(null);
          }}
        >
          <option value="" disabled>
            choose a relationship
          </option>
          {INGREDIENT_RELATIONSHIP_TYPES.map((type) => (
            <option key={type} value={type}>
              {INGREDIENT_RELATIONSHIP_LABELS[type]}
            </option>
          ))}
        </InlineSelect>
        <div className="min-w-40 flex-1">
          <IngredientPicker
            label="Base ingredient"
            selected={base}
            onChange={(selected) => {
              setBase(selected);
              setError(null);
            }}
            onSearch={onSearch}
            excludeIds={excludeIds}
            limit={PICKER_LIMIT}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error-700">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="font-normal text-greyscale-600"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="font-semibold text-secondary-600 hover:text-secondary-700"
          onClick={add}
        >
          Add base ingredient
        </Button>
      </div>
    </div>
  );
}

function ViewSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold">{label}</h3>
      {children}
    </section>
  );
}

function ViewList({
  label,
  items,
  isChips = false,
}: {
  label: string;
  items: string[];
  isChips?: boolean;
}): ReactNode {
  if (items.length === 0) return null;
  return (
    <ViewSection label={label}>
      <ul
        aria-label={label}
        className={cn(
          "flex flex-wrap text-sm",
          isChips ? "gap-1" : "gap-x-3 gap-y-1"
        )}
      >
        {items.map((item) => (
          <li
            key={item}
            className={
              isChips
                ? "rounded-sm bg-greyscale-100 px-1.5 py-0.5 text-xs text-greyscale-800"
                : undefined
            }
          >
            {item}
          </li>
        ))}
      </ul>
    </ViewSection>
  );
}

function VariantsSection({
  ingredient,
}: {
  ingredient: IngredientDetail;
}): ReactNode {
  if (ingredient.variants.length === 0) return null;
  const headingId = `ingredient-${ingredient.id}-variants`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-sm font-semibold">
        Variants
      </h3>
      {INGREDIENT_RELATIONSHIP_TYPES.map((type) => {
        const members = ingredient.variants.filter(
          (variant) => variant.relationshipType === type
        );
        if (members.length === 0) return null;
        const heading = INGREDIENT_VARIANT_HEADINGS[type](ingredient.name);
        return (
          <div key={type} className="flex flex-col gap-1">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-greyscale-600">
              {heading}
            </h4>
            <ul
              aria-label={heading}
              className="flex max-h-24 flex-wrap gap-x-3 gap-y-1 overflow-y-auto text-sm"
            >
              {members.map((variant) => (
                <li key={variant.ingredient.id}>
                  <AppLink
                    href={`/ingredients?id=${variant.ingredient.id}`}
                    className="text-primary hover:underline"
                  >
                    {variant.ingredient.name}
                  </AppLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function ReferencesSection({
  ingredient,
}: {
  ingredient: IngredientDetail;
}): ReactNode {
  if (ingredient.referenceCount === 0) return null;
  const headingId = `ingredient-${ingredient.id}-references`;
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="text-sm font-semibold">
          References ({ingredient.referenceCount})
        </h3>
        <AppLink
          href={`/recipes?concept=${encodeURIComponent(ingredient.id)}`}
          className="text-sm text-primary underline underline-offset-2"
        >
          Recipes with {ingredient.name}
        </AppLink>
      </div>
      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm">
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
    </section>
  );
}

function ReviewStatus({
  ingredient,
  isEditing = false,
}: {
  ingredient: IngredientDetail;
  isEditing?: boolean;
}): ReactNode {
  return (
    <p className="flex items-center gap-2 text-sm text-greyscale-600">
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full",
          ingredient.isReviewed ? "bg-primary-500" : "bg-amber-500"
        )}
      />
      <span>
        {ingredient.isReviewed
          ? "Approved"
          : isEditing
            ? "Needs review (saving approves it)"
            : "Needs review"}
      </span>
      <span aria-hidden="true">·</span>
      <AppLink
        href={`/concepts/${ingredient.id}`}
        className="text-primary underline-offset-2 hover:underline"
      >
        Concept details
      </AppLink>
    </p>
  );
}

function FieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}): ReactNode {
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
  /** Checked because a base ingredient has it: shown lighter. */
  isInherited?: boolean;
  /** Explicitly "does not contain": the label is struck through. */
  isExcluded?: boolean;
  isDisabled?: boolean;
  /** A short explanation after the label, e.g. "from wheat". */
  note?: string;
}

function InlineCheckbox({
  id,
  label,
  isChecked,
  onCheckedChange,
  isInherited = false,
  isExcluded = false,
  isDisabled = false,
  note,
}: InlineCheckboxProps): ReactNode {
  const noteId = note ? `${id}-note` : undefined;
  return (
    <div className="flex items-center gap-1.5">
      <Checkbox
        id={id}
        checked={isChecked}
        disabled={isDisabled}
        aria-describedby={noteId}
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
        className={cn(
          "h-3.5 w-3.5 rounded-[3px] border-greyscale-500 shadow-none data-[state=checked]:border-primary-600 data-[state=checked]:bg-transparent data-[state=checked]:text-primary-600 [&_svg]:h-3.5 [&_svg]:w-3.5",
          isInherited &&
            "data-[state=checked]:border-primary-300 data-[state=checked]:text-primary-400"
        )}
      />
      <Label
        htmlFor={id}
        className={cn(
          "cursor-pointer text-sm font-normal",
          isInherited && "text-greyscale-600",
          isExcluded && "text-greyscale-600 line-through",
          isDisabled && "cursor-default"
        )}
      >
        {label}
      </Label>
      {note ? (
        <span id={noteId} className="text-xs text-greyscale-600">
          ({note})
        </span>
      ) : null}
    </div>
  );
}

/** The card's own values ("contains" / "does not contain") from the server's property states. */
function explicitValues(
  states: readonly IngredientPropertyState[]
): Map<IngredientStoredProperty, "TRUE" | "FALSE"> {
  return new Map(
    states.flatMap((state) =>
      state.explicit === "TRUE" || state.explicit === "FALSE"
        ? [[state.property, state.explicit] as const]
        : []
    )
  );
}
