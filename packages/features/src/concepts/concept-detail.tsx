"use client";

import { EntryList } from "./entry-list";
import { RelationshipEditor } from "./relationship-editor";
import type { ConceptDetail } from "./types";

import type { ReactNode } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink } from "../app-navigation";
import { ConfirmDialog, type MutationAction, formatDate } from "../shared";
import type {
  ApplyDecisionResult,
  DecisionPayload,
  SearchConcepts,
} from "../teach/types";

export interface ConceptDetailProps {
  concept: ConceptDetail;
  onApplyDecision?: MutationAction<
    [payload: DecisionPayload, discoveryId: string | null],
    ApplyDecisionResult
  >;
  onSearchConcepts?: SearchConcepts;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * The concept page: names, relationships, attributes, effective classifications (inherited ones marked), example mentions, and the decisions behind it, each revertible.
 */
export function ConceptDetailPageContent({
  concept,
  onApplyDecision,
  onSearchConcepts,
}: ConceptDetailProps): ReactNode {
  const ref = {
    id: concept.id,
    canonicalName: concept.canonicalName,
    status: concept.status,
  };
  return (
    <article className="flex max-w-5xl flex-col gap-6">
      <AppLink
        href="/concepts"
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All concepts
      </AppLink>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-greyscale-900">
          {concept.canonicalName}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-greyscale-700">
          <Badge
            variant={concept.status === "VERIFIED" ? "secondary" : "outline"}
          >
            {concept.status.toLowerCase()}
          </Badge>
          {concept.isComposed ? (
            <Badge variant="outline">made from other ingredients</Badge>
          ) : null}
          {concept.mergedInto ? (
            <span>
              Merged into{" "}
              <AppLink
                href={`/concepts/${concept.mergedInto.id}`}
                className="text-primary underline underline-offset-2"
              >
                {concept.mergedInto.canonicalName}
              </AppLink>
            </span>
          ) : null}
        </div>
        {concept.description ? (
          <p className="text-sm text-greyscale-700">{concept.description}</p>
        ) : null}
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Names">
          <EntryList entries={concept.entries} />
        </Section>
        <Section title="Relationships">
          <RelationshipEditor
            concept={ref}
            parents={concept.parents}
            children={concept.children}
            onApplyDecision={onApplyDecision}
            onSearchConcepts={onSearchConcepts}
          />
        </Section>
        <Section title="Attributes">
          {concept.attributes.length === 0 ? (
            <p className="text-sm text-greyscale-600">
              No characterizing attributes.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1">
              {concept.attributes.map((attribute) => (
                <li key={attribute.attributeValueId}>
                  <Badge variant="secondary">
                    {attribute.definitionKey}: {attribute.label}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Classifications">
          {concept.classifications.length === 0 ? (
            <p className="text-sm text-greyscale-600">No classifications.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {concept.classifications.map((row) => (
                <li key={row.key}>
                  <span className="font-medium">{row.key}</span>:{" "}
                  {row.value.toLowerCase()}
                  {row.source === "INHERITED" && row.inheritedFrom ? (
                    <span className="text-greyscale-600">
                      {" "}
                      (inherited from{" "}
                      <AppLink
                        href={`/concepts/${row.inheritedFrom.id}`}
                        className="text-primary underline underline-offset-2"
                      >
                        {row.inheritedFrom.canonicalName}
                      </AppLink>
                      )
                    </span>
                  ) : row.source === "CONFLICT" ? (
                    <span className="text-error-700">
                      {" "}
                      (conflicting parents)
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Example mentions">
          {concept.mentions.length === 0 ? (
            <p className="text-sm text-greyscale-600">
              No stored mentions yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {concept.mentions.map((mention) => (
                <li key={mention.mentionId}>
                  {mention.noteId ? (
                    <AppLink
                      href={`/notes/${mention.noteId}`}
                      className="text-primary hover:underline"
                    >
                      {mention.lineText}
                    </AppLink>
                  ) : (
                    mention.lineText
                  )}
                  {mention.noteTitle ? (
                    <span className="text-greyscale-600">
                      {" "}
                      ({mention.noteTitle})
                    </span>
                  ) : null}
                  {mention.verified ? (
                    <span className="text-success-900"> verified</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Decisions">
          {concept.decisions.length === 0 ? (
            <p className="text-sm text-greyscale-600">No decisions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {concept.decisions.map((decision) => (
                <li
                  key={decision.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    <span className="font-medium">
                      {decision.type.replace(/_/g, " ").toLowerCase()}
                    </span>{" "}
                    by {decision.username} on {formatDate(decision.createdAt)}{" "}
                    <span className="text-greyscale-600">
                      (revision {decision.revision})
                    </span>
                    {decision.reverted ? (
                      <span className="text-greyscale-600"> reverted</span>
                    ) : null}
                  </span>
                  {decision.canRevert && onApplyDecision ? (
                    <ConfirmDialog
                      trigger={
                        <Button type="button" size="sm" variant="outline">
                          Revert
                        </Button>
                      }
                      title="Revert this decision?"
                      description="Entries and relationships it created are retired and anything it changed goes back. Affected mentions are reinterpreted."
                      confirmLabel="Revert"
                      onConfirm={() =>
                        onApplyDecision(
                          { type: "REVERT", decisionId: decision.id },
                          null
                        )
                      }
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </article>
  );
}
