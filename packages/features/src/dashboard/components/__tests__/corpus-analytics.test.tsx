import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../../app-navigation";
import type { CorpusAnalytics } from "../../types";
import { CorpusAnalyticsSection } from "../corpus-analytics";

const CHICKEN = { id: "c1", canonicalName: "chicken", status: "VERIFIED" };
const CALAMANSI = { id: "c2", canonicalName: "calamansi", status: "PROPOSED" };

const analytics: CorpusAnalytics = {
  computedAt: "2026-11-14T15:00:00.000Z",
  isStale: false,
  settledMentions: 812,
  conceptsWithMentions: 140,
  unusedVerifiedConcepts: 6,
  rareConceptCount: 41,
  topExpanded: [
    {
      concept: CHICKEN,
      directMentions: 3,
      directNotes: 3,
      expandedMentions: 15,
    },
  ],
  rare: [
    {
      concept: CALAMANSI,
      directMentions: 1,
      directNotes: 1,
      expandedMentions: 1,
    },
  ],
  preparations: [
    { preparationKey: "chop", label: "Chop", mentions: 64, concepts: 21 },
  ],
  attributes: [
    {
      definitionKey: "bone",
      definitionName: "Bone",
      valueKey: "boneless",
      label: "Boneless",
      mentions: 12,
      asserted: 12,
    },
  ],
};

function renderSection(data: CorpusAnalytics = analytics) {
  render(
    <AppNavigationProvider push={vi.fn()}>
      <CorpusAnalyticsSection analytics={data} />
    </AppNavigationProvider>
  );
}

describe("CorpusAnalyticsSection", () => {
  it("shows totals, expanded rankings with the direct count, rare foods, and distributions", () => {
    renderSection();
    expect(
      screen.getByRole("heading", { level: 2, name: "Foods in the collection" })
    ).toBeInTheDocument();
    expect(screen.getByText("812")).toBeInTheDocument();
    expect(screen.getByText("Approved foods not yet seen")).toBeInTheDocument();
    const ranked = screen.getByRole("list", {
      name: "Most-used foods with kinds and parts",
    });
    expect(
      within(ranked).getByRole("link", { name: "chicken (3 directly)" })
    ).toHaveAttribute("href", "/concepts/c1");
    expect(ranked).toHaveTextContent("15 mentions");
    const rare = screen.getByRole("list", { name: "Rare foods" });
    expect(
      within(rare).getByRole("link", { name: "calamansi" })
    ).toBeInTheDocument();
    expect(rare).toHaveTextContent("1 note");
    expect(
      screen.getByRole("list", { name: "Preparations" })
    ).toHaveTextContent("Chop (21 foods)64 mentions");
    expect(
      screen.getByRole("list", { name: "Descriptions" })
    ).toHaveTextContent("Bone: Boneless12 mentions");
  });

  it("says when the numbers were computed and whether they are refreshing", () => {
    renderSection({ ...analytics, isStale: true });
    expect(
      screen.getByText(/Updated .*; refreshing in the background/)
    ).toBeInTheDocument();
  });

  it("explains empty lists", () => {
    renderSection({
      ...analytics,
      topExpanded: [],
      rare: [],
      preparations: [],
      attributes: [],
    });
    expect(screen.getByText("No settled mentions yet.")).toBeInTheDocument();
    expect(screen.getByText("No rare foods yet.")).toBeInTheDocument();
    expect(
      screen.getByText("No preparations recorded yet.")
    ).toBeInTheDocument();
    expect(screen.getByText("No attributes recorded yet.")).toBeInTheDocument();
  });
});
