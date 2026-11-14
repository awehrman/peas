"use client";

import { ConceptPicker } from "./concept-picker";
import type {
  ConceptRef,
  DecisionPayload,
  SearchConcepts,
  TeachDiscovery,
  TeachVocabulary,
} from "./types";

import { type ReactNode, useEffect, useId, useMemo, useState } from "react";

import { Input, Label, cn } from "@peas/components";
import type { DiscoveryPayload } from "@peas/parser/v2";

const RELATIONSHIP_TYPES = [
  "IS_A",
  "PART_OF",
  "DERIVED_FROM",
  "PROCESSED_FROM",
] as const;
type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  IS_A: "is a kind of",
  PART_OF: "is part of",
  DERIVED_FROM: "is made from",
  PROCESSED_FROM: "is processed from",
};

/** Everything an option's fields can edit. */
interface OptionState {
  concept: ConceptRef | null;
  text: string;
  choice: string;
  relationshipType: RelationshipType | "";
  conceptIds: string[];
}

interface FieldProps {
  state: OptionState;
  update: (patch: Partial<OptionState>) => void;
}

export interface DecisionOption {
  key: string;
  label: string;
  hint?: string;
  initial?: Partial<OptionState>;
  fields?: (props: FieldProps) => ReactNode;
  build: (state: OptionState) => DecisionPayload | null;
}

const EMPTY_STATE: OptionState = {
  concept: null,
  text: "",
  choice: "",
  relationshipType: "",
  conceptIds: [],
};

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}): ReactNode {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-greyscale-300 bg-white px-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  suggestions,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: readonly string[];
}): ReactNode {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        list={suggestions ? `${id}-list` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {suggestions ? (
        <datalist id={`${id}-list`}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

/** "loosely" -> "loose", "heaped" -> "heap": a starting value key the reviewer can edit. */
function guessValueKey(token: string, known: readonly string[]): string {
  const lower = token.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const stems = [
    lower,
    lower.replace(/ly$/, ""),
    lower.replace(/ed$/, ""),
    lower.replace(/ed$/, "ing"),
  ];
  return stems.find((stem) => known.includes(stem)) ?? stems[1] ?? lower;
}

function rejectOption(): DecisionOption {
  return {
    key: "reject",
    label: "Reject: nothing to teach here",
    initial: { text: "Not useful" },
    fields: ({ state, update }) => (
      <TextField
        label="Reason"
        value={state.text}
        onChange={(text) => update({ text })}
      />
    ),
    build: (state) =>
      state.text.trim() ? { type: "REJECT", reason: state.text.trim() } : null,
  };
}

function relationshipFields(onSearch: SearchConcepts, label: string) {
  return function RelationshipFields({ state, update }: FieldProps): ReactNode {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField
          label={label}
          value={state.relationshipType}
          options={[
            { value: "", label: "No relationship" },
            ...RELATIONSHIP_TYPES.map((type) => ({
              value: type,
              label: RELATIONSHIP_LABELS[type],
            })),
          ]}
          onChange={(value) =>
            update({ relationshipType: value as RelationshipType | "" })
          }
        />
        {state.relationshipType ? (
          <ConceptPicker
            label="Related concept"
            value={state.concept}
            onChange={(concept) => update({ concept })}
            onSearch={onSearch}
          />
        ) : null}
      </div>
    );
  };
}

/**
 * The choices a discovery offers (Phase 4f), each building a DecisionPayload. Values are prefilled from the discovery so the common answer is one keypress away.
 */
export function decisionOptionsFor(
  discovery: TeachDiscovery,
  vocabulary: TeachVocabulary,
  onSearch: SearchConcepts
): DecisionOption[] {
  const payload = discovery.payload as DiscoveryPayload;
  const conceptById = new Map(
    discovery.concepts.map((concept) => [concept.id, concept])
  );

  switch (payload.type) {
    case "UNKNOWN_FOOD_PHRASE": {
      const suggested =
        (payload.suggestedHeadConceptIds ?? [])
          .map((id) => conceptById.get(id))
          .find(Boolean) ?? null;
      return [
        {
          key: "create",
          label: `Create a new concept "${payload.phrase}"`,
          hint: suggested
            ? `Suggested: made from ${suggested.canonicalName}`
            : undefined,
          initial: {
            text: payload.phrase,
            relationshipType: suggested ? "DERIVED_FROM" : "",
            concept: suggested,
          },
          fields: ({ state, update }) => (
            <div className="flex flex-col gap-2">
              <TextField
                label="Concept name"
                value={state.text}
                onChange={(text) => update({ text })}
              />
              {relationshipFields(onSearch, "Relationship")({ state, update })}
            </div>
          ),
          build: (state) =>
            state.text.trim()
              ? {
                  type: "CREATE_CONCEPT",
                  canonicalName: state.text.trim(),
                  phrase: payload.phrase,
                  relationships:
                    state.relationshipType && state.concept
                      ? [
                          {
                            targetConceptId: state.concept.id,
                            relationshipType: state.relationshipType,
                          },
                        ]
                      : [],
                }
              : null,
        },
        {
          key: "map",
          label: `"${payload.phrase}" is another name for an existing concept`,
          fields: ({ state, update }) => (
            <ConceptPicker
              label="Existing concept"
              value={state.concept}
              onChange={(concept) => update({ concept })}
              onSearch={onSearch}
            />
          ),
          build: (state) =>
            state.concept
              ? {
                  type: "MAP_TO_CONCEPT",
                  phrase: payload.phrase,
                  conceptId: state.concept.id,
                  kind: "ALIAS",
                }
              : null,
        },
        rejectOption(),
      ];
    }

    case "UNKNOWN_MODIFIER": {
      const token = payload.token;
      const heads = (payload.adjacentHeads ?? [])
        .map((head) => conceptById.get(head.conceptId))
        .filter((concept): concept is ConceptRef => Boolean(concept));
      const keyOption = (
        key: string,
        role: "MEASUREMENT_MODIFIER" | "DEGREE" | "INSTRUCTION",
        label: string,
        known: readonly string[]
      ): DecisionOption => ({
        key,
        label,
        initial: { text: guessValueKey(token, known) },
        fields: ({ state, update }) => (
          <TextField
            label="Value key"
            value={state.text}
            suggestions={known}
            onChange={(text) => update({ text })}
          />
        ),
        build: (state) => {
          const valueKey = state.text
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_");
          return valueKey
            ? { type: "CLASSIFY_MODIFIER", token, role, valueKey }
            : null;
        },
      });
      const options: Record<string, DecisionOption> = {
        MEASUREMENT_MODIFIER: keyOption(
          "measurement",
          "MEASUREMENT_MODIFIER",
          `"${token}" describes the measurement (like "heaping")`,
          vocabulary.measurementModifierKeys
        ),
        PREPARATION: {
          key: "preparation",
          label: `"${token}" is a preparation (like "chopped")`,
          initial: {
            choice:
              vocabulary.preparations.find((preparation) =>
                token.toLowerCase().startsWith(preparation.key)
              )?.id ??
              vocabulary.preparations[0]?.id ??
              "",
          },
          fields: ({ state, update }) => (
            <SelectField
              label="Preparation"
              value={state.choice}
              options={vocabulary.preparations.map((preparation) => ({
                value: preparation.id,
                label: preparation.label,
              }))}
              onChange={(choice) => update({ choice })}
            />
          ),
          build: (state) =>
            state.choice
              ? {
                  type: "CLASSIFY_MODIFIER",
                  token,
                  role: "PREPARATION",
                  preparationId: state.choice,
                }
              : null,
        },
        DEGREE: keyOption(
          "degree",
          "DEGREE",
          `"${token}" says how much (like "finely")`,
          vocabulary.degreeKeys
        ),
        ATTRIBUTE: {
          key: "attribute",
          label: `"${token}" is an attribute value (like "boneless")`,
          initial: {
            choice: vocabulary.attributeValues[0]?.id ?? "",
            conceptIds: heads.map((head) => head.id),
          },
          fields: ({ state, update }) => (
            <div className="flex flex-col gap-2">
              <SelectField
                label="Attribute value"
                value={state.choice}
                options={vocabulary.attributeValues.map((value) => ({
                  value: value.id,
                  label: `${value.definitionName}: ${value.label}`,
                }))}
                onChange={(choice) => update({ choice })}
              />
              {heads.length > 0 ? (
                <fieldset className="flex flex-col gap-1">
                  <legend className="text-sm font-medium">Applies to</legend>
                  {heads.map((head) => (
                    <label
                      key={head.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={state.conceptIds.includes(head.id)}
                        onChange={(event) =>
                          update({
                            conceptIds: event.target.checked
                              ? [...state.conceptIds, head.id]
                              : state.conceptIds.filter((id) => id !== head.id),
                          })
                        }
                      />
                      {head.canonicalName}
                    </label>
                  ))}
                </fieldset>
              ) : null}
            </div>
          ),
          build: (state) =>
            state.choice
              ? {
                  type: "CLASSIFY_MODIFIER",
                  token,
                  role: "ATTRIBUTE",
                  attributeValueId: state.choice,
                  applicableConceptIds: state.conceptIds,
                }
              : null,
        },
        INSTRUCTION: keyOption(
          "instruction",
          "INSTRUCTION",
          `"${token}" is an instruction (like "divided")`,
          vocabulary.instructionKeys
        ),
      };
      const suggested = payload.suggestedRoles ?? [];
      const ordered = [
        ...suggested,
        ...Object.keys(options).filter(
          (role) => !suggested.includes(role as never)
        ),
      ];
      return [
        ...ordered.flatMap((role) =>
          options[role] ? [options[role] as DecisionOption] : []
        ),
        {
          key: "ignore",
          label: `Ignore "${token}" (it carries no meaning)`,
          build: () => ({ type: "IGNORE_TOKEN", token }),
        },
        rejectOption(),
      ];
    }

    case "ATTRIBUTE_INTERPRETATION": {
      const head = payload.headConceptId
        ? conceptById.get(payload.headConceptId)
        : undefined;
      return [
        ...discovery.entries
          .filter((entry) => entry.attributeValueId)
          .map((entry): DecisionOption => ({
            key: `attribute-${entry.id}`,
            label: `"${payload.phrase}" means ${entry.targetLabel}${head ? ` for ${head.canonicalName}` : ""}`,
            build: () => ({
              type: "CLASSIFY_MODIFIER",
              token: payload.phrase,
              role: "ATTRIBUTE",
              attributeValueId: entry.attributeValueId ?? "",
              applicableConceptIds: head ? [head.id] : [],
            }),
          })),
        rejectOption(),
      ];
    }

    case "IDENTITY_DECISION": {
      const head = conceptById.get(payload.headConceptId);
      const modifierText = discovery.entries
        .map((entry) => entry.text)
        .join(" ");
      const attributeValueIds = discovery.entries.flatMap((entry) =>
        entry.attributeValueId ? [entry.attributeValueId] : []
      );
      const headName = head?.canonicalName ?? "the head";
      return [
        {
          key: "attribute",
          label: `${headName} with ${discovery.entries.map((entry) => entry.targetLabel).join(", ") || modifierText}`,
          hint: `"${payload.phrase}" is not its own food`,
          build: () =>
            attributeValueIds.length > 0
              ? {
                  type: "CONCEPT_PLUS_ATTRIBUTE",
                  phrase: payload.phrase,
                  modifierText,
                  conceptId: payload.headConceptId,
                  attributeValueIds,
                }
              : null,
        },
        {
          key: "concept",
          label: `A new concept "${payload.phrase}"`,
          hint: `A kind of ${headName}, like whole milk`,
          initial: {
            text: payload.phrase,
            relationshipType: "IS_A",
            concept: head ?? null,
          },
          fields: ({ state, update }) => (
            <div className="flex flex-col gap-2">
              <TextField
                label="Concept name"
                value={state.text}
                onChange={(text) => update({ text })}
              />
              {relationshipFields(onSearch, "Relationship")({ state, update })}
            </div>
          ),
          build: (state) =>
            state.text.trim()
              ? {
                  type: "CREATE_CONCEPT",
                  canonicalName: state.text.trim(),
                  phrase: payload.phrase,
                  relationships:
                    state.relationshipType && state.concept
                      ? [
                          {
                            targetConceptId: state.concept.id,
                            relationshipType: state.relationshipType,
                          },
                        ]
                      : [],
                  attributeValueIds,
                }
              : null,
        },
        {
          key: "alias",
          label: `Just another name for ${headName}`,
          build: () => ({
            type: "MAP_TO_CONCEPT",
            phrase: payload.phrase,
            conceptId: payload.headConceptId,
            kind: "ALIAS",
          }),
        },
        rejectOption(),
      ];
    }

    case "AMBIGUOUS_MATCH": {
      const foods = discovery.entries.filter((entry) => entry.conceptId);
      return [
        ...foods.map((entry): DecisionOption => ({
          key: `default-${entry.id}`,
          label: `"${payload.phrase}" always means ${entry.targetLabel}`,
          build: () => ({
            type: "MAP_TO_CONCEPT",
            phrase: payload.phrase,
            conceptId: entry.conceptId ?? "",
            kind: "ALIAS",
            exclusive: true,
          }),
        })),
        {
          key: "ambiguous",
          label: "Keep it ambiguous and review each line",
          build: () =>
            payload.entryIds.length >= 2
              ? {
                  type: "MARK_AMBIGUOUS",
                  phrase: payload.phrase,
                  entryIds: payload.entryIds,
                }
              : null,
        },
        rejectOption(),
      ];
    }

    case "RELATIONSHIP_SUGGESTION": {
      const source =
        conceptById.get(payload.sourceConceptId)?.canonicalName ??
        "this concept";
      const target =
        conceptById.get(payload.targetConceptId)?.canonicalName ??
        "that concept";
      return [
        {
          key: "accept",
          label: `Accept: ${source} … ${target}`,
          hint: payload.evidence,
          initial: { choice: payload.relationshipType },
          fields: ({ state, update }) => (
            <SelectField
              label="Relationship"
              value={state.choice}
              options={RELATIONSHIP_TYPES.map((type) => ({
                value: type,
                label: `${source} ${RELATIONSHIP_LABELS[type]} ${target}`,
              }))}
              onChange={(choice) => update({ choice })}
            />
          ),
          build: (state) => ({
            type: "ADD_RELATIONSHIP",
            sourceConceptId: payload.sourceConceptId,
            targetConceptId: payload.targetConceptId,
            relationshipType: (state.choice ||
              payload.relationshipType) as RelationshipType,
          }),
        },
        rejectOption(),
      ];
    }

    case "STRUCTURAL_PATTERN":
    case "VERIFIED_DRIFT":
      return [rejectOption()];
  }
}

/** The payload an option builds from its prefilled values, so the first render can already preview and apply. */
export function initialPayload(
  options: readonly DecisionOption[],
  index = 0
): DecisionPayload | null {
  const option = options[index];
  return option ? option.build({ ...EMPTY_STATE, ...option.initial }) : null;
}

/**
 * The option radio group for a discovery. Reports the selected option's payload (or null while incomplete) to the parent, which previews and applies it.
 */
export function DecisionOptions({
  discovery,
  options,
  selectedIndex,
  onSelect,
  onPayloadChange,
}: {
  discovery: TeachDiscovery;
  options: DecisionOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onPayloadChange: (payload: DecisionPayload | null) => void;
}): ReactNode {
  const name = useId();
  const [states, setStates] = useState<OptionState[]>(() =>
    options.map((option) => ({ ...EMPTY_STATE, ...option.initial }))
  );

  const payload = useMemo(() => {
    const option = options[selectedIndex];
    const state = states[selectedIndex];
    return option && state ? option.build(state) : null;
  }, [options, selectedIndex, states]);

  useEffect(() => onPayloadChange(payload), [payload, onPayloadChange]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-base font-semibold text-greyscale-900">
        How should Peas read “{discovery.title}”?
      </legend>
      {options.map((option, index) => {
        const id = `${name}-${option.key}`;
        const isSelected = index === selectedIndex;
        const state = states[index] ?? EMPTY_STATE;
        return (
          <div
            key={option.key}
            className={cn(
              "rounded-md border p-3",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-greyscale-200"
            )}
          >
            <div className="flex items-start gap-2">
              <input
                id={id}
                type="radio"
                name={name}
                checked={isSelected}
                onChange={() => onSelect(index)}
                className="mt-1"
                aria-describedby={option.hint ? `${id}-hint` : undefined}
              />
              <label htmlFor={id} className="flex flex-1 flex-col text-sm">
                <span>
                  {index < 9 ? (
                    <kbd
                      className="mr-2 rounded border border-greyscale-300 px-1 text-xs text-greyscale-600"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </kbd>
                  ) : null}
                  {option.label}
                </span>
                {option.hint ? (
                  <span
                    id={`${id}-hint`}
                    className="text-xs text-greyscale-600"
                  >
                    {option.hint}
                  </span>
                ) : null}
              </label>
            </div>
            {isSelected && option.fields ? (
              <div className="mt-3 pl-6">
                {option.fields({
                  state,
                  update: (patch) =>
                    setStates((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, ...patch } : item
                      )
                    ),
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
