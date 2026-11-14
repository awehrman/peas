"use client";

import type {
  ConceptExplorerData,
  ConceptExplorerOptions,
  UsageCounts,
} from "./types";

import { type ReactNode, useId } from "react";

import { Checkbox, Label } from "@peas/components";

import { AppLink } from "../app-navigation";
import { StatCard, formatCount } from "../dashboard/components/stat-charts";

const PATH_LABELS: Record<string, string> = {
  IS_A: "a kind of",
  PART_OF: "part of",
  DERIVED_FROM: "made from",
  PROCESSED_FROM: "processed from",
};

const NAME_KIND_LABELS: Record<string, string> = {
  CANONICAL: "main name",
  ALIAS: "alternate name",
  PLURAL: "plural",
  REGIONAL: "regional name",
  ABBREVIATION: "abbreviation",
  VARIANT: "spelling variant",
};

const COUNT_ROWS: { key: keyof UsageCounts; label: string }[] = [
  { key: "mentions", label: "Mentions" },
  { key: "lines", label: "Ingredient lines" },
  { key: "notes", label: "Notes" },
  { key: "recipes", label: "Recipes" },
];

export interface ConceptUsagePanelProps {
  conceptName: string;
  /** Null until the first answer arrives. */
  data: ConceptExplorerData | null;
  options: ConceptExplorerOptions;
  onOptionsChange: (options: ConceptExplorerOptions) => void;
  /** True while new numbers are loading; the previous ones stay on screen. */
  isLoading?: boolean;
  /** The page listing every counted line, with the same switches. */
  occurrencesHref?: string;
}

function plural(count: number, one: string, many: string): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

/** "part of chicken", or for deeper paths "a kind of → part of chicken". */
function describePath(path: string[], conceptName: string): string {
  const steps = [...path].reverse().map((type) => PATH_LABELS[type] ?? type);
  return `${steps.join(" → ")} ${conceptName}`;
}

function SectionTable({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}): ReactNode {
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  );
}

function DistributionHead({ first }: { first: string }): ReactNode {
  return (
    <thead className="border-b border-greyscale-200 text-xs text-greyscale-600">
      <tr>
        <th scope="col" className="py-2 pr-4 font-medium">
          {first}
        </th>
        <th scope="col" className="py-2 pr-4 text-right font-medium">
          Directly
        </th>
        <th scope="col" className="py-2 text-right font-medium">
          Expanded
        </th>
      </tr>
    </thead>
  );
}

/**
 * The concept page's explorer (Phase 8): how often the food appears directly and through more specific foods, which foods contribute, the ways it is written, and how it is prepared and described. Direct and expanded counts are always labelled separately. "Expanded" follows kinds and parts, plus foods made or processed from it when that switch is on; only settled mentions count unless mentions waiting for review are switched on.
 *
 * @example
 * <ConceptUsagePanel conceptName="chicken" data={data} options={{ includeMadeFrom: false, includeNeedsReview: false }} onOptionsChange={setOptions} />
 */
export function ConceptUsagePanel({
  conceptName,
  data,
  options,
  onOptionsChange,
  isLoading = false,
  occurrencesHref,
}: ConceptUsagePanelProps): ReactNode {
  const id = useId();
  const expandedLabel = options.includeMadeFrom
    ? "With kinds, parts, and foods made from it"
    : "With kinds and parts";

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2
          id={`${id}-heading`}
          className="text-lg font-semibold text-greyscale-900"
        >
          Usage in the collection
        </h2>
        <fieldset className="flex flex-wrap gap-4">
          <legend className="sr-only">What to count</legend>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${id}-made-from`}
              checked={options.includeMadeFrom}
              onCheckedChange={(checked) =>
                onOptionsChange({
                  ...options,
                  includeMadeFrom: checked === true,
                })
              }
            />
            <Label htmlFor={`${id}-made-from`} className="text-sm font-normal">
              Include foods made from it
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${id}-review`}
              checked={options.includeNeedsReview}
              onCheckedChange={(checked) =>
                onOptionsChange({
                  ...options,
                  includeNeedsReview: checked === true,
                })
              }
            />
            <Label htmlFor={`${id}-review`} className="text-sm font-normal">
              Include mentions waiting for review
            </Label>
          </div>
        </fieldset>
      </div>
      <p aria-live="polite" className="text-xs text-greyscale-600">
        {isLoading ? "Updating…" : ""}
      </p>

      {data ? (
        <div className="grid gap-6 md:grid-cols-2">
          <UsageCard
            conceptName={conceptName}
            data={data}
            options={options}
            expandedLabel={expandedLabel}
            occurrencesHref={occurrencesHref}
          />
          <FormsCard data={data} />
          <DistributionsCard data={data} conceptName={conceptName} />
        </div>
      ) : (
        <p className="text-sm text-greyscale-600">Loading usage…</p>
      )}
    </section>
  );
}

function UsageCard({
  conceptName,
  data,
  options,
  expandedLabel,
  occurrencesHref,
}: {
  conceptName: string;
  data: ConceptExplorerData;
  options: ConceptExplorerOptions;
  expandedLabel: string;
  occurrencesHref?: string;
}): ReactNode {
  const { usage } = data;
  const waiting = usage.byStatus.needsReview;
  return (
    <StatCard
      title="Usage"
      description="Active ingredient lines in notes that are not archived."
    >
      <div className="flex flex-col gap-4">
        <SectionTable caption={`How often ${conceptName} appears`}>
          <thead className="border-b border-greyscale-200 text-xs text-greyscale-600">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                <span className="sr-only">Count</span>
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Directly
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {expandedLabel}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-greyscale-100">
            {COUNT_ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="py-1.5 pr-4 font-normal">
                  {row.label}
                </th>
                <td className="py-1.5 pr-4 text-right tabular-nums">
                  {formatCount(usage.direct[row.key])}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatCount(usage.expanded[row.key])}
                </td>
              </tr>
            ))}
          </tbody>
        </SectionTable>
        {occurrencesHref && usage.expanded.mentions > 0 ? (
          <AppLink
            href={occurrencesHref}
            className="self-start text-sm text-primary underline underline-offset-2"
          >
            See all {plural(usage.expanded.mentions, "mention", "mentions")}
          </AppLink>
        ) : null}
        {waiting > 0 && !options.includeNeedsReview ? (
          <p className="text-xs text-greyscale-600">
            {plural(waiting, "more mention is", "more mentions are")} waiting
            for review with {conceptName} as the best guess; they are not
            counted.
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-greyscale-900">
            More specific foods counted
          </h3>
          {usage.contributors.length === 0 ? (
            <p className="text-sm text-greyscale-600">
              None with mentions yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {usage.contributors.map((row) => (
                <li key={row.concept.id}>
                  <AppLink
                    href={`/concepts/${row.concept.id}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {row.concept.canonicalName}
                  </AppLink>{" "}
                  <span className="text-greyscale-600">
                    ({describePath(row.path, conceptName)})
                  </span>
                  : {plural(row.counts.mentions, "mention", "mentions")} in{" "}
                  {plural(row.counts.notes, "note", "notes")}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </StatCard>
  );
}

function FormsCard({ data }: { data: ConceptExplorerData }): ReactNode {
  const { forms, otherMentions } = data.observedForms;
  return (
    <StatCard
      title="How it's written"
      description="Each name and how many direct mentions use it."
    >
      {forms.length === 0 ? (
        <p className="text-sm text-greyscale-600">No names yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {forms.map((form) => (
            <li key={form.entryId} className="flex flex-col">
              <span>
                <span className="font-medium">{form.text}</span>{" "}
                <span className="text-greyscale-600">
                  ({NAME_KIND_LABELS[form.kind ?? ""] ?? "name"}
                  {form.status === "PROPOSED" ? ", proposed" : ""})
                </span>
                :{" "}
                {form.mentions === 0
                  ? "not used yet"
                  : `${plural(form.mentions, "mention", "mentions")} in ${plural(form.notes, "note", "notes")}`}
              </span>
              {form.example ? (
                <span className="text-xs text-greyscale-600">
                  e.g. “{form.example}”
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {otherMentions > 0 ? (
        <p className="mt-3 text-xs text-greyscale-600">
          {plural(otherMentions, "mention reaches", "mentions reach")} this food
          without one of its names (for example, checked by hand).
        </p>
      ) : null}
    </StatCard>
  );
}

function DistributionsCard({
  data,
  conceptName,
}: {
  data: ConceptExplorerData;
  conceptName: string;
}): ReactNode {
  const { preparations, attributes, modifiers } = data.distributions;
  const isEmpty =
    preparations.length === 0 &&
    attributes.length === 0 &&
    modifiers.length === 0;
  return (
    <div className="md:col-span-2">
      <StatCard
        title="Preparations and descriptions"
        description="Counted directly and across the expanded foods."
      >
        {isEmpty ? (
          <p className="text-sm text-greyscale-600">
            No preparations or descriptions recorded yet.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {preparations.length > 0 ? (
              <SectionTable caption={`How ${conceptName} is prepared`}>
                <DistributionHead first="Preparation" />
                <tbody className="divide-y divide-greyscale-100">
                  {preparations.map((row) => (
                    <tr key={`${row.preparationKey}:${row.degreeKey ?? ""}`}>
                      <th scope="row" className="py-1.5 pr-4 font-normal">
                        {row.label}
                        {row.degreeKey ? ` (${row.degreeKey})` : ""}
                      </th>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {formatCount(row.direct)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatCount(row.expanded)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SectionTable>
            ) : null}
            {attributes.length > 0 ? (
              <SectionTable caption={`How ${conceptName} is described`}>
                <DistributionHead first="Attribute" />
                <tbody className="divide-y divide-greyscale-100">
                  {attributes.map((row) => (
                    <tr key={`${row.definitionKey}:${row.valueKey}`}>
                      <th scope="row" className="py-1.5 pr-4 font-normal">
                        {row.definitionName}: {row.label}
                        {row.asserted < row.expanded ? (
                          <span className="block text-xs text-greyscale-600">
                            {formatCount(row.asserted)} written in the text
                          </span>
                        ) : null}
                      </th>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {formatCount(row.direct)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatCount(row.expanded)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SectionTable>
            ) : null}
            {modifiers.length > 0 ? (
              <SectionTable caption={`Notes on amounts of ${conceptName}`}>
                <DistributionHead first="Modifier" />
                <tbody className="divide-y divide-greyscale-100">
                  {modifiers.map((row) => (
                    <tr key={`${row.role}:${row.valueKey}`}>
                      <th scope="row" className="py-1.5 pr-4 font-normal">
                        {row.valueKey}
                      </th>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {formatCount(row.direct)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatCount(row.expanded)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SectionTable>
            ) : null}
          </div>
        )}
      </StatCard>
    </div>
  );
}
