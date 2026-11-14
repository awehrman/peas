"use client";

import { type ReactNode, useId } from "react";

import { Label, cn } from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink, useAppNavigation } from "../app-navigation";
import { formatCount } from "../dashboard/components/stat-charts";
import { PageLinks } from "../shared";

export const UNKNOWN_EXPRESSION_FILTERS = [
  { type: null, label: "All" },
  { type: "UNKNOWN_FOOD_PHRASE", label: "Unknown foods" },
  { type: "UNKNOWN_MODIFIER", label: "Unknown words" },
  { type: "AMBIGUOUS_MATCH", label: "Ambiguous" },
] as const;

export type UnknownExpressionFilter = Exclude<
  (typeof UNKNOWN_EXPRESSION_FILTERS)[number]["type"],
  null
>;

const TYPE_LABELS: Record<string, string> = {
  UNKNOWN_FOOD_PHRASE: "unknown food",
  UNKNOWN_MODIFIER: "unknown word",
  AMBIGUOUS_MATCH: "ambiguous",
};

export interface UnknownExpressionsData {
  items: {
    discoveryId: string;
    type: string;
    phrase: string;
    mentions: number;
    notes: number;
  }[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Builds the page's URL from its filters.
 *
 * @example
 * unknownExpressionsHref("UNKNOWN_FOOD_PHRASE", "cm3s...", 2) // "/lexicon/unknown?type=UNKNOWN_FOOD_PHRASE&source=cm3s...&page=2"
 */
export function unknownExpressionsHref(
  type: UnknownExpressionFilter | null,
  sourceId: string | undefined,
  page = 1
): string {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (sourceId) params.set("source", sourceId);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/lexicon/unknown?${search}` : "/lexicon/unknown";
}

/**
 * Expressions Peas doesn't understand yet (Phase 8-C): open review cards for unknown food phrases, unknown words, and ambiguous matches, most notes first, each linking to its card. The source filter counts only evidence from that source's notes, so a site's or a book's vocabulary stands out.
 *
 * @example
 * <UnknownExpressionsPageContent data={data} type={null} sources={sources} />
 */
export function UnknownExpressionsPageContent({
  data,
  type,
  sourceId,
  sources,
}: {
  data: UnknownExpressionsData;
  type: UnknownExpressionFilter | null;
  sourceId?: string;
  sources: { id: string; label: string; notes: number }[];
}): ReactNode {
  const { push } = useAppNavigation();
  const selectId = useId();
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <AppLink
        href="/lexicon"
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Lexicon
      </AppLink>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-greyscale-900">
          Unknown expressions
        </h1>
        <p className="text-sm text-greyscale-700">
          {formatCount(data.total)} open{" "}
          {data.total === 1 ? "expression" : "expressions"}
        </p>
      </header>
      <div className="flex flex-wrap items-end gap-4">
        <nav aria-label="Kind of expression">
          <ul className="flex flex-wrap gap-3">
            {UNKNOWN_EXPRESSION_FILTERS.map((filter) => (
              <li key={filter.label}>
                <AppLink
                  href={unknownExpressionsHref(filter.type, sourceId)}
                  aria-current={filter.type === type ? "page" : undefined}
                  className={cn(
                    "text-sm underline-offset-4",
                    filter.type === type
                      ? "font-medium text-primary underline decoration-2"
                      : "text-greyscale-600 hover:underline"
                  )}
                >
                  {filter.label}
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-1">
          <Label htmlFor={selectId} className="text-xs">
            Source
          </Label>
          <select
            id={selectId}
            value={sourceId ?? ""}
            onChange={(event) =>
              push(
                unknownExpressionsHref(type, event.target.value || undefined)
              )
            }
            className="h-9 min-w-48 rounded-md border border-greyscale-300 bg-white px-2 text-sm"
          >
            <option value="">Any source</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label} ({formatCount(source.notes)})
              </option>
            ))}
          </select>
        </div>
      </div>
      {data.items.length === 0 ? (
        <p className="text-sm text-greyscale-700">Nothing to review here.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Unknown expressions</caption>
          <thead className="border-b border-greyscale-200 text-xs text-greyscale-600">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                Expression
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Kind
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Notes
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Mentions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-greyscale-100">
            {data.items.map((item) => (
              <tr key={item.discoveryId}>
                <td className="py-2 pr-4">
                  <AppLink
                    href={`/teach/${item.discoveryId}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {item.phrase}
                  </AppLink>
                </td>
                <td className="py-2 pr-4 text-greyscale-700">
                  {TYPE_LABELS[item.type] ?? item.type}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {formatCount(item.notes)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatCount(item.mentions)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <PageLinks
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        getHref={(page) => unknownExpressionsHref(type, sourceId, page)}
        label="Unknown expression pages"
      />
    </div>
  );
}
