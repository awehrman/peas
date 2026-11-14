import type { ReactNode } from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import { HighlightedText } from "../../shared";
import {
  LexiconEntryPageContent,
  type LexiconOccurrenceRow,
} from "../lexicon-entry";
import { LexiconPageContent } from "../lexicon-list";
import {
  UnknownExpressionsPageContent,
  unknownExpressionsHref,
} from "../unknown-expressions";

function wrap(children: ReactNode, push = vi.fn()) {
  return render(
    <AppNavigationProvider push={push}>{children}</AppNavigationProvider>
  );
}

const entry = {
  id: "e1",
  text: "chicken thighs",
  role: "FOOD",
  kind: "PLURAL",
  status: "ACTIVE",
  targetLabel: "chicken thigh",
  conceptId: "c1",
  revisionAdded: 3,
  revisionRetired: null,
  createdAt: "2026-11-12T12:00:00.000Z",
};

const occurrence: LexiconOccurrenceRow = {
  mentionId: "m1",
  lineText: "1 lb boneless chicken thighs",
  span: { start: 14, end: 28, text: "chicken thighs" },
  noteId: "n1",
  noteTitle: "Braised thighs",
  recipeId: "r1",
  recipeTitle: "Braised thighs",
  conceptName: "chicken thigh",
  status: "AUTO_RESOLVED",
};

describe("HighlightedText", () => {
  it("marks the span, or shows the text plainly when the span doesn't fit", () => {
    const { container, rerender } = render(
      <HighlightedText text="1 lb salt" span={{ start: 5, end: 9 }} />
    );
    expect(container.querySelector("mark")?.textContent).toBe("salt");
    rerender(<HighlightedText text="1 lb salt" span={{ start: 5, end: 40 }} />);
    expect(container.querySelector("mark")).toBeNull();
    rerender(<HighlightedText text="1 lb salt" span={null} />);
    expect(container.textContent).toBe("1 lb salt");
  });
});

describe("LexiconEntryPageContent", () => {
  it("describes the entry and lists the lines that use it", () => {
    wrap(
      <LexiconEntryPageContent
        entry={entry}
        occurrences={{ items: [occurrence], total: 1, nextCursor: null }}
      />
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "chicken thighs" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "chicken thigh" })).toHaveAttribute(
      "href",
      "/concepts/c1"
    );
    expect(screen.getByText(/Added in revision 3/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Used in 1 line" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("chicken thighs", { selector: "mark" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Braised thighs" })
    ).toHaveAttribute("href", "/notes/n1");
    expect(
      screen.getByRole("link", { name: "Recipe: Braised thighs" })
    ).toHaveAttribute("href", "/recipes/r1");
    expect(screen.getByText(/· chicken thigh · resolved/)).toBeInTheDocument();
  });

  it("marks retired entries, plain targets, and empty usage", () => {
    wrap(
      <LexiconEntryPageContent
        entry={{
          ...entry,
          role: "DEGREE",
          kind: null,
          conceptId: null,
          targetLabel: "fine",
          status: "DEPRECATED",
          revisionRetired: 9,
        }}
        occurrences={{ items: [], total: 0, nextCursor: null }}
      />
    );
    expect(screen.getByText("retired")).toBeInTheDocument();
    expect(screen.getByText("fine")).toBeInTheDocument();
    expect(screen.getByText(/retired in revision 9/)).toBeInTheDocument();
    expect(
      screen.getByText("No active line uses this entry yet.")
    ).toBeInTheDocument();
  });

  it("loads more lines while more exist", () => {
    const onLoadMore = vi.fn();
    wrap(
      <LexiconEntryPageContent
        entry={entry}
        occurrences={{
          items: [
            {
              ...occurrence,
              recipeId: null,
              conceptName: null,
              status: "NEEDS_REVIEW",
            },
          ],
          total: 80,
          nextCursor: "m1",
        }}
        onLoadMore={onLoadMore}
      />
    );
    expect(screen.getByText(/waiting for review/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalled();
    expect(screen.getByText("Showing 1 of 80")).toBeInTheDocument();
  });
});

describe("UnknownExpressionsPageContent", () => {
  const data = {
    items: [
      {
        discoveryId: "d1",
        type: "UNKNOWN_FOOD_PHRASE",
        phrase: "calamansi juice",
        mentions: 4,
        notes: 3,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 50,
  };

  it("lists open expressions linking to their review cards", () => {
    wrap(
      <UnknownExpressionsPageContent data={data} type={null} sources={[]} />
    );
    const row = screen.getByRole("row", { name: /calamansi juice/ });
    expect(
      within(row).getByRole("link", { name: "calamansi juice" })
    ).toHaveAttribute("href", "/teach/d1");
    expect(row).toHaveTextContent("unknown food34");
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("filters by source through the URL", () => {
    const push = vi.fn();
    wrap(
      <UnknownExpressionsPageContent
        data={data}
        type="UNKNOWN_FOOD_PHRASE"
        sources={[{ id: "s1", label: "Island Book", notes: 2 }]}
      />,
      push
    );
    fireEvent.change(screen.getByLabelText("Source"), {
      target: { value: "s1" },
    });
    expect(push).toHaveBeenCalledWith(
      "/lexicon/unknown?type=UNKNOWN_FOOD_PHRASE&source=s1"
    );
    expect(screen.getByRole("link", { name: "Unknown foods" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("says when there is nothing to review and builds page links", () => {
    wrap(
      <UnknownExpressionsPageContent
        data={{ ...data, items: [], total: 0 }}
        type={null}
        sources={[]}
      />
    );
    expect(screen.getByText("Nothing to review here.")).toBeInTheDocument();
    expect(unknownExpressionsHref(null, undefined)).toBe("/lexicon/unknown");
    expect(unknownExpressionsHref("AMBIGUOUS_MATCH", "s1", 3)).toBe(
      "/lexicon/unknown?type=AMBIGUOUS_MATCH&source=s1&page=3"
    );
  });
});

describe("LexiconPageContent explorer links", () => {
  it("links each entry to where it is used and toggles newest first", () => {
    wrap(
      <LexiconPageContent
        data={{
          items: [
            {
              id: "e1",
              text: "icing sugar",
              role: "FOOD",
              kind: "ALIAS",
              status: "ACTIVE",
              targetLabel: "powdered sugar",
              conceptId: "c2",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
        }}
        role={null}
        newestFirst
      />
    );
    expect(screen.getByRole("link", { name: "icing sugar" })).toHaveAttribute(
      "href",
      "/lexicon/e1"
    );
    expect(screen.getByRole("link", { name: "A to Z" })).toHaveAttribute(
      "href",
      "/lexicon"
    );
    expect(screen.getByRole("link", { name: "Foods" })).toHaveAttribute(
      "href",
      "/lexicon?role=FOOD&newest=1"
    );
    expect(
      screen.getByRole("link", { name: "Unknown expressions" })
    ).toHaveAttribute("href", "/lexicon/unknown");
  });
});
