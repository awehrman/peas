"use client";

import {
  ClassificationEditor,
  SubstitutionEditor,
  TagEditor,
} from "./concept-editors";
import { EntryList } from "./entry-list";
import { RelationshipEditor } from "./relationship-editor";
import type { ConceptDetail, ConceptEditActions } from "./types";

import { type ReactNode, useState } from "react";

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

export interface ConceptDetailProps extends ConceptEditActions {
  concept: ConceptDetail;
  /** Recipes filtered to this concept and its more specific concepts. */
  recipesHref?: string;
  /** Where the back link goes; admins return to the concepts workbench, everyone else to the ingredients list. */
  backLink?: { href: string; label: string };
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
 * The concept page: names, relationships, attributes, effective classifications (inherited ones marked), tags, substitutions, example mentions, and the decisions behind it, each revertible. Editing controls appear only for the actions passed in, so viewers who aren't admins get a read-only page.
 */
export function ConceptDetailPageContent({
  concept,
  recipesHref,
  backLink = { href: "/concepts", label: "All concepts" },
  onApplyDecision,
  onSearchConcepts,
  onSetClassification,
  onRemoveClassification,
  onSetTags,
  onSetSubstitution,
  onRemoveSubstitution,
}: ConceptDetailProps): ReactNode {
  const [approvedMessage, setApprovedMessage] = useState<string | null>(null);
  const ref = {
    id: concept.id,
    canonicalName: concept.canonicalName,
    status: concept.status,
  };
  return (
    <article className="flex max-w-5xl flex-col gap-6">
      <AppLink
        href={backLink.href}
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLink.label}
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
          {concept.status === "PROPOSED" && onApplyDecision ? (
            <ApproveConcept
              conceptId={concept.id}
              name={concept.canonicalName}
              onApplyDecision={onApplyDecision}
              onApproved={setApprovedMessage}
            />
          ) : null}
          {approvedMessage ? (
            <span role="status" className="text-success-900">
              {approvedMessage}
            </span>
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
        {recipesHref ? (
          <AppLink
            href={recipesHref}
            className="self-start text-sm text-primary underline underline-offset-2"
          >
            Recipes with {concept.canonicalName}
          </AppLink>
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
          <ClassificationEditor
            classifications={concept.classifications}
            onSetClassification={onSetClassification}
            onRemoveClassification={onRemoveClassification}
          />
        </Section>
        <Section title="Tags">
          <TagEditor tags={concept.tags} onSetTags={onSetTags} />
        </Section>
        <Section title="Substitutions">
          <SubstitutionEditor
            substitutions={concept.substitutions}
            onSetSubstitution={onSetSubstitution}
            onRemoveSubstitution={onRemoveSubstitution}
            onSearchConcepts={onSearchConcepts}
          />
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
                      className="text-primary underline underline-offset-2"
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
        {onApplyDecision || concept.decisions.length > 0 ? (
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
        ) : null}
      </div>
    </article>
  );
}

function ApproveConcept({
  conceptId,
  name,
  onApplyDecision,
  onApproved,
}: {
  conceptId: string;
  name: string;
  onApplyDecision: NonNullable<ConceptDetailProps["onApplyDecision"]>;
  onApproved: (message: string) => void;
}): ReactNode {
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" size="sm">
          Approve
        </Button>
      }
      title={`Approve ${name}?`}
      description="Its names become active, so imports resolve to it, and it appears on the ingredients page. Affected mentions are reinterpreted."
      confirmLabel="Approve"
      onConfirm={async () => {
        const result = await onApplyDecision(
          { type: "APPROVE_CONCEPT", conceptId },
          null
        );
        if (result.success) onApproved(result.data?.summary ?? "Approved");
        return result;
      }}
    />
  );
}
