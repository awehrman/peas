import type { ReactNode } from "react";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppNavigationProvider } from "../../app-navigation";
import { SectionHeadingItem } from "../../notes/components/note-detail-page-content";
import {
  type StructureProposalData,
  type StructureReviewData,
  StructureReviewPageContent,
  describeStructureLabel,
  structureReviewHref,
} from "../structure-review";

const proposal: StructureProposalData = {
  id: "p1",
  noteId: "n1",
  noteTitle: "Cream sauce",
  contentIndex: 3,
  text: "For the sauce:",
  assignedKind: "INGREDIENT",
  proposalType: "RECLASSIFY",
  proposedLabel: "SECTION_HEADING",
  parts: [],
  patternKey: "SECTION_HEADING:COLON_HEADING",
  margin: 8.5,
  signals: [
    { id: "IMPORTER_SECTION", kind: "INGREDIENT", weight: 1 },
    { id: "COLON_HEADING", kind: "SECTION_HEADING", weight: 4 },
    { id: "FOR_THE", kind: "SECTION_HEADING", weight: 3.5, text: null },
  ],
  status: "OPEN",
  decidedLabel: null,
  decidedBy: null,
  decidedAt: null,
  before: [{ contentIndex: 1, text: "1 tsp salt" }],
  after: [{ contentIndex: 4, text: "2 tbsp butter" }],
};

const data: StructureReviewData = {
  counts: {
    open: 1,
    decided: 0,
    byPattern: [{ patternKey: "SECTION_HEADING:COLON_HEADING", open: 1 }],
  },
  proposals: { items: [proposal], total: 1, page: 1, pageSize: 25 },
  patterns: [
    {
      patternKey: "SECTION_HEADING:COLON_HEADING",
      proposedLabel: "SECTION_HEADING",
      open: 1,
      approved: 60,
      rejected: 1,
      changed: 0,
      notes: 40,
      precision: 60 / 61,
      scope: "SOURCE_SPECIFIC",
      topSourceLabel: "Island Book",
      topSourceShare: 0.9,
      canAutoApply: true,
    },
  ],
};

function renderPage(
  overrides: Partial<Parameters<typeof StructureReviewPageContent>[0]> = {},
  push = vi.fn()
) {
  const actions = {
    onDecide: vi.fn().mockResolvedValue({ success: true }),
    onUndo: vi.fn().mockResolvedValue({ success: true }),
    onDecidePattern: vi
      .fn()
      .mockResolvedValue({ success: true, message: "Applied to 1 line" }),
  };
  const wrap = (children: ReactNode) => (
    <AppNavigationProvider push={push}>{children}</AppNavigationProvider>
  );
  render(
    wrap(
      <StructureReviewPageContent
        data={data}
        status="OPEN"
        {...actions}
        {...overrides}
      />
    )
  );
  return { actions, push };
}

describe("StructureReviewPageContent", () => {
  it("shows each line in context with where it was filed, the proposal, and the evidence", () => {
    renderPage();
    const card = screen.getByRole("article", { name: "Cream sauce" });
    expect(
      within(card).getByRole("link", { name: "Cream sauce" })
    ).toHaveAttribute("href", "/notes/n1");
    const context = within(card).getByRole("list", {
      name: "The line in context",
    });
    expect(context).toHaveTextContent("1 tsp saltFor the sauce:2 tbsp butter");
    expect(
      within(card).getByText("For the sauce:", { selector: "mark" })
    ).toBeInTheDocument();
    expect(card).toHaveTextContent("Filed as ingredient; looks like heading");
    const evidence = within(card).getByRole("list", { name: "Evidence" });
    expect(evidence).toHaveTextContent("colon heading");
    expect(evidence).not.toHaveTextContent("importer section");
  });

  it("approves, rejects, and changes a line", async () => {
    const { actions } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(actions.onDecide).toHaveBeenCalledWith("p1", { action: "APPROVE" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Not this" }));
    await waitFor(() =>
      expect(actions.onDecide).toHaveBeenCalledWith("p1", { action: "REJECT" })
    );
    fireEvent.change(screen.getByLabelText("Change to"), {
      target: { value: "OTHER" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(actions.onDecide).toHaveBeenCalledWith("p1", {
        action: "CHANGE",
        label: "OTHER",
      })
    );
  });

  it("shows a failed decision", async () => {
    renderPage({
      onDecide: vi
        .fn()
        .mockResolvedValue({
          success: false,
          message: "The line is no longer in this note as filed",
        }),
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "no longer in this note"
    );
  });

  it("shows decided lines with who decided and an undo", async () => {
    const decided = {
      ...proposal,
      status: "CHANGED",
      decidedLabel: "NOTE",
      decidedBy: "allie",
      decidedAt: "2026-11-14T15:00:00.000Z",
    };
    const rejected = {
      ...proposal,
      id: "p2",
      status: "REJECTED",
      decidedLabel: "INGREDIENT",
      decidedBy: null,
      decidedAt: null,
    };
    const { actions } = renderPage({
      status: "DECIDED",
      data: {
        ...data,
        proposals: { ...data.proposals, items: [decided, rejected], total: 2 },
      },
    });
    expect(screen.getByText(/Filed as note by allie on/)).toBeInTheDocument();
    expect(screen.getByText("Kept as filed")).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Undo" })[0] as HTMLElement
    );
    await waitFor(() => expect(actions.onUndo).toHaveBeenCalledWith("p1"));
    expect(screen.getByRole("link", { name: "Decided" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("filters by pattern and approves a whole pattern after confirming", async () => {
    const push = vi.fn();
    const { actions } = renderPage(
      { pattern: "SECTION_HEADING:COLON_HEADING" },
      push
    );
    fireEvent.change(screen.getByLabelText("Pattern"), {
      target: { value: "" },
    });
    expect(push).toHaveBeenCalledWith("/teach/structure");
    fireEvent.click(screen.getByRole("button", { name: "Approve all 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve all" }));
    await waitFor(() =>
      expect(actions.onDecidePattern).toHaveBeenCalledWith(
        "SECTION_HEADING:COLON_HEADING",
        { action: "APPROVE" }
      )
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Applied to 1 line"
    );
  });

  it("tabulates patterns with precision, scope, and whether they can apply automatically", () => {
    renderPage();
    const table = screen.getByRole("table", { name: "Structure patterns" });
    const row = within(table).getByRole("row", {
      name: /SECTION_HEADING:COLON_HEADING/,
    });
    expect(row).toHaveTextContent("can apply automatically");
    expect(row).toHaveTextContent("98%");
    expect(row).toHaveTextContent("mostly one source (90% Island Book)");
  });

  it("explains empty lists and labels splits", () => {
    renderPage({
      data: {
        ...data,
        proposals: { ...data.proposals, items: [], total: 0 },
        patterns: [],
      },
    });
    expect(screen.getByText("Nothing to review.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(describeStructureLabel("SECTION_HEADING+INSTRUCTION")).toBe(
      "heading + step"
    );
    expect(structureReviewHref("DECIDED", "A:B", 2)).toBe(
      "/teach/structure?status=DECIDED&pattern=A%3AB&page=2"
    );
  });

  it("describes a split proposal's parts", () => {
    renderPage({
      data: {
        ...data,
        proposals: {
          ...data.proposals,
          items: [
            {
              ...proposal,
              proposalType: "SPLIT",
              proposedLabel: "SECTION_HEADING+INSTRUCTION",
              parts: [
                { kind: "SECTION_HEADING", text: "For the glaze:" },
                { kind: "INSTRUCTION", text: "Whisk." },
              ],
            },
          ],
        },
      },
    });
    expect(
      screen.getByText(/“For the glaze:” then “Whisk.”/)
    ).toBeInTheDocument();
  });
});

describe("SectionHeadingItem", () => {
  it("renders a heading inside a list", () => {
    render(
      <ul>
        <SectionHeadingItem text="For the sauce:" />
      </ul>
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "For the sauce:" })
    ).toBeInTheDocument();
  });
});
