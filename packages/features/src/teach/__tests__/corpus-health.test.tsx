import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import { CorpusHealthCard } from "../corpus-health";
import type { CorpusHealth } from "../types";

const health: CorpusHealth = {
  lineCount: 200,
  linesWithMentions: 150,
  parsedSuccessfully: 190,
  parsedWithErrors: 5,
  awaitingParsing: 5,
  mentions: {
    total: 220,
    autoResolved: 100,
    needsReview: 40,
    unresolved: 70,
    verified: 10,
  },
  openDiscoveryCount: 12,
  topUnknownPhrases: [
    { discoveryId: "d1", phrase: "gochugaru", mentionCount: 1400 },
  ],
  reinterpretBacklog: { pending: 1, processing: 1, failed: 0, failedBatches: 0 },
  lexiconRevision: 15,
  live: {
    windowSeconds: 3600,
    lineCount: 1200,
    linesPerSecond: 1 / 3,
    structuralSuccessShare: 0.975,
    averageCandidatesPerSegment: 1.44,
    unknownTokens: 85,
    lexiconRevision: 15,
  },
};

function renderCard(value: CorpusHealth) {
  return render(
    <AppNavigationProvider push={vi.fn()}>
      <CorpusHealthCard health={value} />
    </AppNavigationProvider>
  );
}

describe("CorpusHealthCard", () => {
  it("summarizes coverage, resolution, discoveries, backlog, and live parsing", () => {
    renderCard(health);

    expect(
      screen.getByRole("heading", { name: "Corpus health" })
    ).toBeInTheDocument();
    expect(screen.getByText("Lexicon revision 15")).toBeInTheDocument();
    expect(screen.getByText("Lines with mentions").parentElement).toHaveTextContent(
      "75%150 of 200"
    );
    expect(screen.getByText("Resolved mentions").parentElement).toHaveTextContent(
      "50%10 verified"
    );
    expect(screen.getByText("Reinterpreting").parentElement).toHaveTextContent(
      "2runs in progress"
    );
    expect(
      within(screen.getByRole("list", { name: "Mentions by resolution" })).getByText(
        "Unresolved"
      ).parentElement
    ).toHaveTextContent("70");
    expect(screen.getByRole("link", { name: "gochugaru" })).toHaveAttribute(
      "href",
      "/teach/d1"
    );
    expect(screen.getByText("1,400")).toBeInTheDocument();
    expect(screen.getByText("Structure parsed").nextSibling).toHaveTextContent(
      "98%"
    );
    expect(screen.getByText("Candidates per part").nextSibling).toHaveTextContent(
      "1.4"
    );
    expect(screen.getByText("Lines parsed").nextSibling).toHaveTextContent(
      "1,200 (0.33/s)"
    );
  });

  it("explains missing live numbers, empty phrases, and failed runs", () => {
    renderCard({
      ...health,
      topUnknownPhrases: [],
      reinterpretBacklog: { pending: 0, processing: 0, failed: 2, failedBatches: 3 },
      live: null,
    });
    expect(screen.getByText("No unknown phrases waiting.")).toBeInTheDocument();
    expect(
      screen.getByText("The queue is not reachable, so live numbers are unavailable.")
    ).toBeInTheDocument();
    expect(screen.getByText("Reinterpreting").parentElement).toHaveTextContent(
      "02 failed"
    );
  });

  it("shows dashes before any live line", () => {
    renderCard({
      ...health,
      live: {
        ...health.live!,
        lineCount: 0,
        linesPerSecond: 0,
        structuralSuccessShare: null,
        averageCandidatesPerSegment: null,
      },
    });
    expect(screen.getByText("Structure parsed").nextSibling).toHaveTextContent("—");
    expect(screen.getByText("Candidates per part").nextSibling).toHaveTextContent("—");
  });
});
