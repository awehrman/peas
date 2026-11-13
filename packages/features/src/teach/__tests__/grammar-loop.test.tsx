import type { ReactNode } from "react";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import { DiscoveryReviewPageContent } from "../discovery-review";
import { HealthPageContent, type HealthTrends } from "../health";
import type { TeachDiscovery, TeachVocabulary } from "../types";

function withNavigation(children: ReactNode, push = vi.fn()) {
  return <AppNavigationProvider push={push}>{children}</AppNavigationProvider>;
}

const vocabulary: TeachVocabulary = {
  definitions: [],
  attributeValues: [],
  preparations: [],
  degreeKeys: [],
  measurementModifierKeys: [],
  instructionKeys: [],
};

const FIXTURES = JSON.stringify(
  [
    {
      id: "pending-w-colon-1",
      input: "For the glaze:",
      tags: ["pending"],
      expected: { status: "PARSED", segments: [] },
    },
  ],
  null,
  2
);

const structural: TeachDiscovery = {
  id: "d-structure",
  type: "STRUCTURAL_PATTERN",
  key: "W :",
  status: "OPEN",
  priority: 2,
  mentionCount: 2,
  distinctNoteCount: 1,
  title: "W :",
  payload: {
    type: "STRUCTURAL_PATTERN",
    signature: "W :",
    example: "For the glaze:",
    reason: "HEADING",
  },
  concepts: [],
  entries: [],
  fixtureBlock: FIXTURES,
};

function renderStructural(
  overrides: Partial<Parameters<typeof DiscoveryReviewPageContent>[0]> = {}
) {
  const push = vi.fn();
  const props = {
    discovery: structural,
    examples: [],
    vocabulary,
    previousId: null,
    nextId: "d-next",
    onApplyDecision: vi.fn(),
    onDefer: vi.fn(async () => ({ success: true as const })),
    onMarkNoise: vi.fn(async () => ({
      success: true as const,
      data: { linesDeactivated: 2 },
    })),
    onPreviewDecision: vi.fn(),
    onSearchConcepts: vi.fn(async () => []),
    onLoadExamples: vi.fn(async () => []),
    ...overrides,
  };
  render(withNavigation(<DiscoveryReviewPageContent {...props} />, push));
  return { push, props };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("structural pattern review card", () => {
  it("shows the fixture block and copies it, without decision options or previews", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const { props } = renderStructural();

    expect(screen.getByText(/looks like a heading/)).toBeInTheDocument();
    expect(screen.getByLabelText("Export as fixtures")).toHaveTextContent(
      '"input": "For the glaze:"'
    );
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("button", { name: /Apply/ })).toBeNull();
    expect(
      screen.getByText("Shortcuts: j/k move, e examples, d defer")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy fixtures" }));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(FIXTURES);

    fireEvent.keyDown(window, { key: "Enter" });
    expect(props.onApplyDecision).not.toHaveBeenCalled();
    expect(props.onPreviewDecision).not.toHaveBeenCalled();
  });

  it("asks before marking the pattern as noise, then moves to the next card", async () => {
    const { push, props } = renderStructural();
    fireEvent.click(screen.getByRole("button", { name: "Mark as noise" }));
    const dialog = screen.getByRole("dialog", { name: "Mark “W :” as noise?" });
    expect(dialog).toHaveTextContent("Its 2 lines are set aside");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Mark as noise" })
    );

    await waitFor(() =>
      expect(props.onMarkNoise).toHaveBeenCalledWith("d-structure")
    );
    expect(push).toHaveBeenCalledWith(
      `/teach/d-next?taught=${encodeURIComponent("Marked “W :” as noise; 2 lines set aside")}`
    );
  });

  it("explains a pattern no stored line shows any more and still defers", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("denied");
    });
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const { push, props } = renderStructural({
      discovery: {
        ...structural,
        fixtureBlock: null,
        payload: { type: "STRUCTURAL_PATTERN", signature: "W :" },
      },
      onMarkNoise: undefined,
    });
    expect(
      screen.getByText("No stored line shows “W :” any more.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as noise" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Defer/ }));
    await waitFor(() =>
      expect(props.onDefer).toHaveBeenCalledWith("d-structure")
    );
    expect(push).toHaveBeenCalledWith(
      expect.stringContaining("/teach/d-next?taught=")
    );
  });

  it("reports when copying is not allowed", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        writeText: vi.fn(async () => Promise.reject(new Error("denied"))),
      },
    });
    renderStructural();
    fireEvent.click(screen.getByRole("button", { name: "Copy fixtures" }));
    expect(await screen.findByText(/Could not copy/)).toBeInTheDocument();
  });
});

const trends: HealthTrends = {
  parserVersion: "2.1.0",
  snapshots: [
    {
      id: "s1",
      takenAt: "2026-11-11T03:00:00.000Z",
      trigger: "SCHEDULED",
      parserVersion: "2.0.0",
      lexiconRevision: 6,
      totalLines: 100,
      totalMentions: 100,
      autoResolvedMentions: 60,
      needsReviewMentions: 10,
      unresolvedMentions: 30,
      verifiedMentions: 0,
      avgCandidates: 1.2,
      openDiscoveries: 12,
    },
    {
      id: "s2",
      takenAt: "2026-11-12T03:00:00.000Z",
      trigger: "REPARSE",
      parserVersion: "2.1.0",
      lexiconRevision: 7,
      totalLines: 100,
      totalMentions: 100,
      autoResolvedMentions: 75,
      needsReviewMentions: 5,
      unresolvedMentions: 10,
      verifiedMentions: 10,
      avgCandidates: 1.1,
      openDiscoveries: 8,
    },
  ],
  byParserVersion: [
    { parserVersion: "2.0.0", total: 40, unresolved: 10 },
    { parserVersion: "2.1.0", total: 60, unresolved: 3 },
  ],
  reviewByWeek: [
    { weekStart: "2026-11-09", decisions: 4, mentionsChanged: 30 },
  ],
  topUnknownPhrases: [
    {
      discoveryId: "u1",
      type: "UNKNOWN_FOOD_PHRASE",
      phrase: "gochugaru",
      mentionCount: 3,
    },
  ],
  mostAmbiguousPhrases: [],
};

describe("HealthPageContent", () => {
  it("charts coverage, parser versions, and review throughput, each with a data table", () => {
    render(withNavigation(<HealthPageContent trends={trends} />));
    expect(
      screen.getByRole("img", {
        name: /Resolved share of mentions over 2 snapshots, latest 90%/,
      })
    ).toBeInTheDocument();
    const snapshots = screen.getByRole("table", {
      name: "Corpus health snapshots",
    });
    expect(within(snapshots).getAllByRole("row")[1]).toHaveTextContent(
      "reparse2.1.0100"
    );

    expect(
      screen.getByRole("img", { name: /2.0.0 25%, 2.1.0 5%/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Mentions by parser version" })
    ).toHaveTextContent("2.1.0 (running)");

    const review = screen.getByRole("table", {
      name: "Decisions and mentions changed per week",
    });
    expect(within(review).getAllByRole("row")[1]).toHaveTextContent(
      "Nov 9" + "4" + "30" + "7.5"
    );

    expect(screen.getByRole("link", { name: "gochugaru" })).toHaveAttribute(
      "href",
      "/teach/u1"
    );
    expect(screen.getByText("No open ambiguous phrases.")).toBeInTheDocument();
  });

  it("offers a reparse only while older parser versions wrote mentions, and reports each action", async () => {
    const onStartReparse = vi.fn(async () => ({
      success: true as const,
      data: {
        message: "Reparsing lines from older parser versions with 2.1.0",
      },
    }));
    const onTakeSnapshot = vi.fn(async () => ({
      success: false as const,
      message: "database down",
    }));
    render(
      withNavigation(
        <HealthPageContent
          trends={trends}
          onStartReparse={onStartReparse}
          onTakeSnapshot={onTakeSnapshot}
        />
      )
    );

    expect(
      screen.getByText("40 mentions were written by 2.0.0.")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reparse with 2.1.0" }));
    expect(
      await screen.findByText(
        "Reparsing lines from older parser versions with 2.1.0"
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Take snapshot" }));
    expect(await screen.findByText("database down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run sweep" })).toBeDisabled();
  });

  it("explains empty data and disables the reparse when every mention is current", () => {
    render(
      withNavigation(
        <HealthPageContent
          trends={{
            ...trends,
            snapshots: [],
            byParserVersion: [
              { parserVersion: "2.1.0", total: 5, unresolved: 0 },
            ],
            reviewByWeek: [],
            topUnknownPhrases: [],
          }}
          onStartReparse={vi.fn()}
        />
      )
    );
    expect(screen.getByText(/No snapshots yet/)).toBeInTheDocument();
    expect(
      screen.getByText("Every mention was written by 2.1.0.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reparse with 2.1.0" })
    ).toBeDisabled();
    expect(
      screen.getByText("No decisions in the last 12 weeks.")
    ).toBeInTheDocument();
    expect(screen.getByText("No open unknown phrases.")).toBeInTheDocument();
  });
});
