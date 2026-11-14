"use client";

import type { ReactNode } from "react";

import { cn } from "@peas/components";

import { AppLink } from "../app-navigation";
import { HighlightedLine, RoleLegend } from "../teach/highlighted-line";
import type { SyntaxToken, TextSpan } from "../teach/types";

const EXAMPLE = "1 ½ lbs boneless chicken thighs, finely diced";

/** The span of `part` in `text`. */
function spanOf(text: string, part: string): TextSpan {
  const start = text.indexOf(part);
  return { start, end: start + part.length, text: part };
}

function lexeme(part: string, role: string): SyntaxToken {
  return {
    span: spanOf(EXAMPLE, part),
    kind: "LEXEME",
    roles: [role],
    zone: "PHRASE",
  };
}

const EXAMPLE_LEXEMES: SyntaxToken[] = [
  lexeme("boneless", "ATTRIBUTE"),
  lexeme("chicken thighs", "FOOD"),
  lexeme("finely", "DEGREE"),
  lexeme("diced", "PREPARATION"),
];

const EXAMPLE_TOKENS = [
  "1",
  "1",
  "/",
  "2",
  "lbs",
  "boneless",
  "chicken",
  "thighs",
  ",",
  "finely",
  "diced",
];

interface Term {
  id: string;
  term: string;
  definition: ReactNode;
  example?: string;
}

const READING_TERMS: Term[] = [
  {
    id: "line",
    term: "Line",
    definition:
      "One ingredient line exactly as it was imported. Peas never changes it, so it can always read it again with newer knowledge or a newer grammar.",
    example: "1 ½ lbs boneless chicken thighs, finely diced",
  },
  {
    id: "normalization",
    term: "Normalization",
    definition:
      "Tidying the text before reading it: fractions like ½ become 1/2, dashes and quotes are unified, extra spaces collapse. Every word still points back at the original characters.",
  },
  {
    id: "token",
    term: "Token",
    definition:
      "A word, number, or punctuation mark. The lexicon and the grammar both split the line into the same tokens, so they agree on where words start and end.",
  },
  {
    id: "grammar",
    term: "Grammar",
    definition:
      "The rules that find a line's shape: amounts, ranges, units, packages, parentheses, the comma before preparation notes, and lines with several ingredients. It contains no food words; those come from the lexicon. Grammar changes are reviewed code, versioned as the parser version.",
  },
  {
    id: "quantity",
    term: "Quantity",
    definition:
      "How much: an exact amount, a range (2-3 lb, or 800 g-1 kg when the ends use different units), an approximate amount, a package (1 can, each 14 oz), alternatives (1 tbsp or 15 ml), a sum (1 lb 12 oz), or an unspecified amount (to taste, a few sprigs). Amounts are stored as exact fractions.",
  },
  {
    id: "unit",
    term: "Unit",
    definition:
      "A measure the grammar knows: mass (g, lb), volume (cup, tbsp), count (clove, sprig, rack), length (inch), or package (can, jar). Units are code, not lexicon entries, because their meaning matters for conversion.",
  },
  {
    id: "segment",
    term: "Segment and part",
    definition:
      'Most lines name one ingredient. "1 tbsp butter and 2 tbsp oil" has two segments; "salt and pepper" is one segment with two parts once the resolver decides it names two foods.',
  },
  {
    id: "mention",
    term: "Mention",
    definition:
      "One ingredient read from one line (one segment, or one part of it): its quantity, its words, the concept it resolved to, and the versions that produced it. Editing knowledge rereads the mentions it affects.",
  },
  {
    id: "structural-pattern",
    term: "Structural pattern",
    definition:
      "A line shape the grammar doesn't handle yet, grouped by token classes (W for an unknown word, N a number, U a unit), so recurring shapes reach the review queue as one card.",
    example: '"thyme 4 sprigs fresh" has the shape W N U W',
  },
];

const KNOWLEDGE_TERMS: Term[] = [
  {
    id: "concept",
    term: "Concept",
    definition:
      "A food identity, such as chicken thigh or granny smith apple. A concept has one main name but no spellings of its own; every way of writing it is a lexicon entry. Proposed concepts wait for approval; verified ones are used for imports; merged ones point at the concept that replaced them.",
  },
  {
    id: "lexicon",
    term: "Lexicon",
    definition:
      "Every word and phrase Peas knows, each with a role and a meaning. Teaching Peas a word adds or edits a lexicon entry; the grammar never changes for that.",
  },
  {
    id: "entry",
    term: "Lexicon entry",
    definition:
      'One piece of text, the role it plays, and what it means. The same text can have several entries: "green" is both color green and ripeness unripe. Active entries are used for imports, proposed ones only when exploring, retired ones not at all.',
    example: '"chicken thighs" is a food name (plural) for chicken thigh',
  },
  {
    id: "role",
    term: "Role",
    definition: (
      <>
        What an entry does in a line: a <strong>food name</strong> points at a
        concept; an <strong>attribute</strong> describes the food (boneless,
        whole); a <strong>preparation</strong> is something done to it (diced,
        minced); a <strong>degree</strong> says how much (finely, roughly); a{" "}
        <strong>measure word</strong> qualifies the amount (heaping, packed); an{" "}
        <strong>instruction</strong> is a note for the cook (divided, to serve).
      </>
    ),
  },
  {
    id: "kind",
    term: "Kind of name",
    definition:
      "How a food name relates to its concept: the main name, a plural, an alternate name, a regional name, an abbreviation, or a spelling variant.",
  },
  {
    id: "attribute",
    term: "Attribute",
    definition:
      'A dimension and one of its values, such as bone: boneless or fat content: whole. A dimension applies to some concepts and everything under them (bone applies to chicken, so to chicken thigh too), which is how Peas knows "whole" means fat content for milk but form for peppercorns.',
  },
  {
    id: "relationship",
    term: "Relationship",
    definition:
      "How two concepts connect: is a kind of (kosher salt and salt), is part of (chicken thigh and chicken), is made from (buttermilk and milk), or is processed from (canned tomatoes and tomato). Relationships carry attributes and classifications down to more specific foods.",
  },
  {
    id: "classification",
    term: "Classification",
    definition:
      "A yes, no, or unknown fact about a concept: a food group (dairy), an allergen (gluten), a dietary property, or a category. Most are inherited through relationships; a value set on the concept itself wins over an inherited one.",
  },
  {
    id: "tag-substitution",
    term: "Tags and substitutions",
    definition:
      "Free labels for organizing concepts (pantry, baking), and other concepts that can stand in for one, with an optional ratio. Neither changes how lines are read.",
  },
];

const REVIEW_TERMS: Term[] = [
  {
    id: "resolution",
    term: "Resolution status",
    definition:
      "How sure Peas is about a mention: auto-resolved (one fully explained reading), needs review (a food was found but something is unknown or ambiguous), unresolved (no food recognized), or verified (a person confirmed it; never changed automatically).",
  },
  {
    id: "discovery",
    term: "Review card",
    definition:
      "Something worth teaching Peas, collected from many lines: an unknown food phrase, an unknown word, an ambiguous match, a relationship suggestion, or a structural pattern. Cards are ranked by how many notes they affect.",
  },
  {
    id: "decision",
    term: "Decision",
    definition:
      "A reviewed change to knowledge, such as mapping a phrase to a concept, editing a concept's names, or retiring a lexicon entry. Every decision is recorded and can be reverted.",
  },
  {
    id: "revision",
    term: "Revision",
    definition:
      "A number that goes up with every decision. Each mention remembers the revision it was read with, so Peas knows which lines to reread.",
  },
  {
    id: "impact",
    term: "Impact preview",
    definition:
      "What a change would do before it is saved: how many stored mentions would read differently, with before and after examples. Editing a concept or a lexicon entry asks for confirmation when anything would change.",
  },
];

const STEP_CLASS =
  "flex flex-col gap-3 rounded-lg border border-greyscale-200 p-4";

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}): ReactNode {
  return (
    <li className={STEP_CLASS}>
      <h3 className="flex items-center gap-2 text-base font-semibold text-greyscale-900">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs text-primary-800"
        >
          {number}
        </span>
        <span>
          <span className="sr-only">Step {number}: </span>
          {title}
        </span>
      </h3>
      {children}
    </li>
  );
}

function ShapeBox({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "quantity" | "phrase" | "trailing";
}): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex flex-col rounded-md border px-2 py-1",
        tone === "quantity" && "border-indigo-300 bg-indigo-50",
        tone === "phrase" && "border-greyscale-400 bg-white",
        tone === "trailing" && "border-amber-300 bg-amber-50"
      )}
    >
      <span className="text-xs font-semibold uppercase text-greyscale-600">
        {label}
      </span>
      <span className="font-mono text-sm text-greyscale-900">{text}</span>
    </span>
  );
}

function Walkthrough(): ReactNode {
  return (
    <ol aria-label="How one line is read" className="flex flex-col gap-4">
      <Step number={1} title="The line, as imported">
        <p className="font-mono text-base text-greyscale-900">{EXAMPLE}</p>
        <p className="text-sm text-greyscale-700">
          Peas keeps this text forever. Everything below can be redone from it
          whenever the knowledge or the grammar improves.
        </p>
      </Step>
      <Step number={2} title="Normalize">
        <p className="font-mono text-base text-greyscale-900">
          1 <mark className="rounded-sm bg-amber-100 px-0.5">1/2</mark> lbs
          boneless chicken thighs, finely diced
        </p>
        <p className="text-sm text-greyscale-700">
          The ½ becomes 1/2 so the grammar can read it. Positions still point at
          the original characters, which is why highlights always land on the
          text you imported.
        </p>
      </Step>
      <Step number={3} title="Split into tokens">
        <ul aria-label="Tokens" className="flex flex-wrap gap-1">
          {EXAMPLE_TOKENS.map((token, index) => (
            <li
              key={`${token}-${index}`}
              className="rounded border border-greyscale-300 bg-greyscale-50 px-1.5 py-0.5 font-mono text-sm"
            >
              {token}
            </li>
          ))}
        </ul>
        <p className="text-sm text-greyscale-700">
          Words, numbers, and punctuation. The lexicon and the grammar use the
          same tokens.
        </p>
      </Step>
      <Step number={4} title="Match the lexicon">
        <p className="text-base">
          <HighlightedLine text={EXAMPLE} tokens={EXAMPLE_LEXEMES} />
        </p>
        <RoleLegend />
        <p className="text-sm text-greyscale-700">
          Lexicon entries name the words: <strong>boneless</strong> is an
          attribute, <strong>chicken thighs</strong> a food name (the plural of
          chicken thigh), <strong>finely</strong> a degree, and{" "}
          <strong>diced</strong> a preparation. A word the lexicon doesn&apos;t
          know stays in the line as unknown, so nothing is guessed or dropped.
        </p>
      </Step>
      <Step number={5} title="Find the shape (grammar)">
        <div className="flex flex-wrap items-end gap-2">
          <ShapeBox label="Quantity" text="1 1/2 lb" tone="quantity" />
          <ShapeBox
            label="Phrase"
            text="boneless chicken thighs"
            tone="phrase"
          />
          <ShapeBox
            label="After the comma"
            text="finely diced"
            tone="trailing"
          />
        </div>
        <p className="text-sm text-greyscale-700">
          A number followed by a unit is the quantity: exactly 3/2 pounds. The
          words before the comma are the ingredient phrase; the words after it
          are notes about preparing it.
        </p>
      </Step>
      <Step number={6} title="Decide the meaning (resolver)">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="font-semibold">Concept</dt>
          <dd>
            chicken thigh, through the plural name &ldquo;chicken thighs&rdquo;
          </dd>
          <dt className="font-semibold">Attribute</dt>
          <dd>bone: boneless (bone applies to chicken and its parts)</dd>
          <dt className="font-semibold">Preparation</dt>
          <dd>dice, finely, after the food</dd>
          <dt className="font-semibold">Status</dt>
          <dd>auto-resolved: one reading, every word explained</dd>
        </dl>
        <p className="text-sm text-greyscale-700">
          The rightmost food name is the head; every other word gets the role
          that fits it best. Had a word been unknown, the mention would need
          review instead.
        </p>
      </Step>
      <Step number={7} title="Store, review, and reread">
        <p className="text-sm text-greyscale-700">
          The result is saved as a mention. Unknown or ambiguous words from many
          lines collect into review cards in the{" "}
          <AppLink
            href="/teach"
            className="text-primary underline underline-offset-2"
          >
            review queue
          </AppLink>
          . Answering a card, or editing a{" "}
          <AppLink
            href="/concepts"
            className="text-primary underline underline-offset-2"
          >
            concept
          </AppLink>{" "}
          or a{" "}
          <AppLink
            href="/lexicon"
            className="text-primary underline underline-offset-2"
          >
            lexicon entry
          </AppLink>
          , is a decision: the revision goes up and every affected line is
          reread, which is why edits show what they would change first.
        </p>
      </Step>
    </ol>
  );
}

function TermList({
  title,
  terms,
}: {
  title: string;
  terms: Term[];
}): ReactNode {
  const headingId = `glossary-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xl font-semibold text-greyscale-900">
        {title}
      </h2>
      <dl className="flex flex-col gap-4">
        {terms.map((term) => (
          <div
            key={term.id}
            id={term.id}
            className="flex flex-col gap-1 scroll-mt-24"
          >
            <dt className="font-semibold text-greyscale-900">{term.term}</dt>
            <dd className="text-sm text-greyscale-800">{term.definition}</dd>
            {term.example ? (
              <dd className="text-sm text-greyscale-600">
                <span className="font-medium">Example:</span> {term.example}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The Knowledge section's glossary: how Peas reads an ingredient line (grammar for the shape, lexicon for the words, resolver and concepts for the meaning), a step-by-step walkthrough of one example line, and the terms used across the review queue, concepts, and lexicon.
 *
 * @example
 * <GlossaryPageContent />
 */
export function GlossaryPageContent(): ReactNode {
  return (
    <article className="flex max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-greyscale-900">Glossary</h1>
        <p className="text-sm text-greyscale-700">
          Peas reads an ingredient line in three layers. The{" "}
          <a
            href="#grammar"
            className="text-primary underline underline-offset-2"
          >
            grammar
          </a>{" "}
          finds its shape (how much, of what, prepared how). The{" "}
          <a
            href="#lexicon"
            className="text-primary underline underline-offset-2"
          >
            lexicon
          </a>{" "}
          names the words. The resolver decides which{" "}
          <a
            href="#concept"
            className="text-primary underline underline-offset-2"
          >
            concept
          </a>{" "}
          the line means. Teaching Peas changes the lexicon and the concepts;
          the grammar only changes through reviewed code.
        </p>
      </header>

      <section
        aria-labelledby="glossary-walkthrough"
        className="flex flex-col gap-3"
      >
        <h2
          id="glossary-walkthrough"
          className="text-xl font-semibold text-greyscale-900"
        >
          Walkthrough: one line, step by step
        </h2>
        <Walkthrough />
        <p className="text-sm text-greyscale-700">
          Try any line yourself in the{" "}
          <AppLink
            href="/teach/playground"
            className="text-primary underline underline-offset-2"
          >
            playground
          </AppLink>
          .
        </p>
      </section>

      <TermList title="Reading a line" terms={READING_TERMS} />
      <TermList title="Knowledge" terms={KNOWLEDGE_TERMS} />
      <TermList title="Reviewing" terms={REVIEW_TERMS} />
    </article>
  );
}
