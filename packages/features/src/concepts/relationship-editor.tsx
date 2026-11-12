"use client";

import type { ConceptRelationship } from "./types";

import { type ReactNode, useId, useState } from "react";

import { Button, Label } from "@peas/components";

import { AppLink } from "../app-navigation";
import { InlineError, type MutationAction, useMutation } from "../shared";
import { ConceptPicker } from "../teach/concept-picker";
import type {
  ApplyDecisionResult,
  ConceptRef,
  DecisionPayload,
  SearchConcepts,
} from "../teach/types";

const TYPES = ["IS_A", "PART_OF", "DERIVED_FROM", "PROCESSED_FROM"] as const;
const TYPE_LABELS: Record<string, string> = {
  IS_A: "is a kind of",
  PART_OF: "is part of",
  DERIVED_FROM: "is made from",
  PROCESSED_FROM: "is processed from",
};

function RelationshipList({
  title,
  edges,
  empty,
  describe,
}: {
  title: string;
  edges: ConceptRelationship[];
  empty: string;
  describe: (edge: ConceptRelationship) => ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase text-greyscale-600">
        {title}
      </h3>
      {edges.length === 0 ? (
        <p className="text-sm text-greyscale-600">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {edges.map((edge) => (
            <li key={edge.id}>
              {describe(edge)}
              {edge.status !== "ACTIVE" ? (
                <span className="ml-2 text-xs text-greyscale-600">
                  ({edge.status.toLowerCase()})
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Typed relationships in both directions, plus a form that adds one through an ADD_RELATIONSHIP decision (cycles are rejected).
 */
export function RelationshipEditor({
  concept,
  parents,
  children,
  onApplyDecision,
  onSearchConcepts,
}: {
  concept: ConceptRef;
  parents: ConceptRelationship[];
  children: ConceptRelationship[];
  onApplyDecision?: MutationAction<
    [payload: DecisionPayload, discoveryId: string | null],
    ApplyDecisionResult
  >;
  onSearchConcepts?: SearchConcepts;
}): ReactNode {
  const typeId = useId();
  const [type, setType] = useState<(typeof TYPES)[number]>("IS_A");
  const [target, setTarget] = useState<ConceptRef | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const apply = useMutation(onApplyDecision);
  const link = (related: ConceptRef) => (
    <AppLink
      href={`/concepts/${related.id}`}
      className="text-primary underline underline-offset-2"
    >
      {related.canonicalName}
    </AppLink>
  );

  async function handleAdd() {
    if (!target) return;
    const result = await apply.run(
      {
        type: "ADD_RELATIONSHIP",
        sourceConceptId: concept.id,
        targetConceptId: target.id,
        relationshipType: type,
      },
      null
    );
    if (result.success) {
      setTarget(null);
      setMessage(result.data?.summary ?? "Relationship added");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RelationshipList
        title="More general"
        edges={parents}
        empty="No broader concepts yet."
        describe={(edge) => (
          <>
            {concept.canonicalName} {TYPE_LABELS[edge.type] ?? edge.type}{" "}
            {link(edge.concept)}
          </>
        )}
      />
      <RelationshipList
        title="More specific"
        edges={children}
        empty="No narrower concepts yet."
        describe={(edge) => (
          <>
            {link(edge.concept)} {TYPE_LABELS[edge.type] ?? edge.type}{" "}
            {concept.canonicalName}
          </>
        )}
      />
      {onApplyDecision && onSearchConcepts ? (
        <form
          className="flex flex-col gap-2 rounded-md border border-greyscale-200 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAdd();
          }}
        >
          <h3 className="text-sm font-semibold">Add a relationship</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={typeId}>{concept.canonicalName}…</Label>
              <select
                id={typeId}
                value={type}
                onChange={(event) =>
                  setType(event.target.value as (typeof TYPES)[number])
                }
                className="h-9 rounded-md border border-greyscale-300 bg-white px-2 text-sm"
              >
                {TYPES.map((option) => (
                  <option key={option} value={option}>
                    {TYPE_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
            <ConceptPicker
              label="Related concept"
              value={target}
              onChange={setTarget}
              onSearch={onSearchConcepts}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="self-start"
            disabled={!target || apply.isPending}
          >
            {apply.isPending ? "Adding…" : "Add relationship"}
          </Button>
          <InlineError message={apply.error} />
          {message ? (
            <p role="status" className="text-sm text-success-900">
              {message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
