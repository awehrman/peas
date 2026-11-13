import type { ReactNode } from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import { KnowledgeTabs, knowledgeSectionFor } from "../knowledge-tabs";
import { LexiconPageContent, type LexiconPageData } from "../lexicon-list";

function withNavigation(children: ReactNode, push = vi.fn()) {
  return <AppNavigationProvider push={push}>{children}</AppNavigationProvider>;
}

const page: LexiconPageData = {
  items: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      text: "chicken thighs",
      role: "FOOD",
      kind: "PLURAL",
      status: "ACTIVE",
      targetLabel: "chicken thigh",
      conceptId: "00000000-0000-4000-8000-000000000010",
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      text: "green",
      role: "ATTRIBUTE",
      kind: null,
      status: "PROPOSED",
      targetLabel: "color: green",
      conceptId: null,
    },
  ],
  total: 60,
  page: 1,
  pageSize: 50,
};

describe("knowledgeSectionFor", () => {
  it("maps each path to its tab", () => {
    expect(knowledgeSectionFor("/teach")).toBe("queue");
    expect(knowledgeSectionFor("/teach/playground")).toBe("queue");
    expect(knowledgeSectionFor("/concepts/abc")).toBe("concepts");
    expect(knowledgeSectionFor("/lexicon")).toBe("lexicon");
    expect(knowledgeSectionFor("/teach/health")).toBe("health");
    expect(knowledgeSectionFor("/teach/glossary")).toBe("glossary");
  });
});

describe("KnowledgeTabs", () => {
  it("marks only the active tab as the current page", () => {
    render(withNavigation(<KnowledgeTabs active="concepts" />));
    const nav = screen.getByRole("navigation", { name: "Knowledge" });
    expect(within(nav).getByRole("link", { name: "Concepts" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      within(nav).getByRole("link", { name: "Review queue" })
    ).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: "Lexicon" })).toHaveAttribute(
      "href",
      "/lexicon"
    );
  });
});

describe("LexiconPageContent", () => {
  it("lists entries with their role, meaning, and status", () => {
    render(withNavigation(<LexiconPageContent data={page} role={null} />));
    expect(screen.getByText("60 entries")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByText("chicken thighs")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("(plural)")).toBeInTheDocument();
    expect(
      within(rows[1]!).getByRole("link", { name: "chicken thigh" })
    ).toHaveAttribute("href", "/concepts/00000000-0000-4000-8000-000000000010");
    expect(within(rows[2]!).getByText("color: green")).toBeInTheDocument();
    expect(within(rows[2]!).queryByRole("link")).toBeNull();
    expect(within(rows[2]!).getByText("proposed")).toBeInTheDocument();
  });

  it("keeps the query and role in filter and page links", () => {
    render(
      withNavigation(
        <LexiconPageContent data={page} query="chick" role="FOOD" />
      )
    );
    const roles = screen.getByRole("navigation", { name: "Lexicon role" });
    expect(within(roles).getByRole("link", { name: "Foods" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      within(roles).getByRole("link", { name: "Attributes" })
    ).toHaveAttribute("href", "/lexicon?query=chick&role=ATTRIBUTE");
    expect(within(roles).getByRole("link", { name: "All" })).toHaveAttribute(
      "href",
      "/lexicon?query=chick"
    );
    const pages = screen.getByRole("navigation", { name: "Lexicon pages" });
    expect(within(pages).getByRole("link", { name: /next/i })).toHaveAttribute(
      "href",
      "/lexicon?query=chick&role=FOOD&page=2"
    );
  });

  it("searches from the first page and keeps the role", () => {
    const push = vi.fn();
    render(
      withNavigation(<LexiconPageContent data={page} role="FOOD" />, push)
    );
    fireEvent.change(screen.getByLabelText("Search the lexicon"), {
      target: { value: "thigh" },
    });
    fireEvent.submit(
      screen.getByLabelText("Search the lexicon").closest("form")!
    );
    expect(push).toHaveBeenCalledWith("/lexicon?query=thigh&role=FOOD");
  });

  it("says so when nothing matches", () => {
    render(
      withNavigation(
        <LexiconPageContent
          data={{ items: [], total: 0, page: 1, pageSize: 50 }}
          query="zzz"
          role={null}
        />
      )
    );
    expect(screen.getByText("No entries found.")).toBeInTheDocument();
    expect(screen.getByText(/0 entries matching/)).toBeInTheDocument();
  });
});
