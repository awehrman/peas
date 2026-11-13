"use client";

import type { ReactNode } from "react";

import { cn } from "@peas/components";

import { AppLink } from "../app-navigation";

export const KNOWLEDGE_SECTIONS = [
  { key: "queue", label: "Review queue", href: "/teach" },
  { key: "concepts", label: "Concepts", href: "/concepts" },
  { key: "lexicon", label: "Lexicon", href: "/lexicon" },
  { key: "health", label: "Health", href: "/teach/health" },
  { key: "glossary", label: "Glossary", href: "/teach/glossary" },
] as const;

export type KnowledgeSection = (typeof KNOWLEDGE_SECTIONS)[number]["key"];

/**
 * Which Knowledge tab a path belongs to.
 *
 * @example
 * knowledgeSectionFor("/teach/0193...") // "queue"
 * knowledgeSectionFor("/concepts/0193...") // "concepts"
 */
export function knowledgeSectionFor(pathname: string): KnowledgeSection {
  if (pathname.startsWith("/concepts")) return "concepts";
  if (pathname.startsWith("/lexicon")) return "lexicon";
  if (pathname.startsWith("/teach/health")) return "health";
  if (pathname.startsWith("/teach/glossary")) return "glossary";
  return "queue";
}

/**
 * The Knowledge section's tabs: the review queue (Teach Peas), the concepts workbench, the lexicon, corpus health, and the glossary.
 *
 * @example
 * <KnowledgeTabs active="lexicon" />
 */
export function KnowledgeTabs({
  active,
}: {
  active: KnowledgeSection;
}): ReactNode {
  return (
    <nav aria-label="Knowledge" className="border-b border-greyscale-200">
      <ul className="flex flex-wrap gap-6">
        {KNOWLEDGE_SECTIONS.map((section) => (
          <li key={section.key}>
            <AppLink
              href={section.href}
              aria-current={section.key === active ? "page" : undefined}
              className={cn(
                "-mb-px inline-block border-b-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                section.key === active
                  ? "border-primary font-medium text-greyscale-900"
                  : "border-transparent text-greyscale-600 hover:text-greyscale-900"
              )}
            >
              {section.label}
            </AppLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
