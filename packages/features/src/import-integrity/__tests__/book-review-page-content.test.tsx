import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BookReviewPageContent } from "../components/book-review-page-content";
import type { BookLookupView } from "../types";

const lookup: BookLookupView = {
  id: "l1",
  query: "The Joy of Cooking",
  status: "AMBIGUOUS",
  fetchedAt: "2026-11-13T00:00:00.000Z",
  attempts: 1,
  errorReason: null,
  noteCount: 12,
  book: null,
  candidates: [
    {
      workKey: "/works/OL1W",
      title: "Joy of Cooking",
      subtitle: null,
      authors: ["Irma S. Rombauer"],
      firstPublishYear: 1931,
      publishers: ["Scribner"],
      editionCount: 80,
      coverId: 123,
      isbns: ["9780743246262", "0743246268", "9780452279124", "0452279127", "9781501169717"],
      matchedIsbn: null,
      score: 0.62,
      evidence: ["Title matches exactly"],
    },
    {
      workKey: "/works/OL2W",
      title: "The Joy of Cooking Cookbook",
      subtitle: null,
      authors: ["Someone Else"],
      firstPublishYear: 1990,
      publishers: [],
      editionCount: 1,
      coverId: null,
      isbns: [],
      matchedIsbn: null,
      score: 0.4,
      evidence: ["Title words overlap 75%"],
    },
  ],
};

function renderPage(overrides: Partial<Parameters<typeof BookReviewPageContent>[0]> = {}) {
  const props = {
    lookup,
    onSelectCandidate: vi.fn().mockResolvedValue({ success: true }),
    onCreateManually: vi.fn().mockResolvedValue({ success: true }),
    onLeaveUnresolved: vi.fn().mockResolvedValue({ success: true }),
    onRetry: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  };
  render(<BookReviewPageContent {...props} />);
  return props;
}

describe("BookReviewPageContent", () => {
  it("shows ranked candidates with their evidence and never presents work ISBNs as the edition", () => {
    renderPage();
    expect(screen.getByText(/cited by 12 notes/)).toBeInTheDocument();
    expect(screen.getByText("Title matches exactly")).toBeInTheDocument();
    expect(screen.getByText(/not attached without knowing the edition/)).toBeInTheDocument();
    expect(screen.getByText(/and 1 more/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Library" })).toHaveAttribute("href", "https://openlibrary.org");
  });

  it("selects a candidate by its work key", async () => {
    const user = userEvent.setup();
    const props = renderPage();
    await user.click(screen.getAllByRole("button", { name: "This one" })[0]!);
    await waitFor(() => expect(props.onSelectCandidate).toHaveBeenCalledWith("/works/OL1W"));
  });

  it("creates a book by hand, keeping an ISBN only in the field it fits", async () => {
    const user = userEvent.setup();
    const props = renderPage();
    await user.type(screen.getByLabelText("Authors (comma separated)"), "Irma Rombauer, Marion Becker");
    await user.type(screen.getByLabelText("Year"), "1975");
    await user.type(screen.getByLabelText(/ISBN/), "0-7432-4626-8");
    await user.click(screen.getByRole("button", { name: "Save book" }));

    await waitFor(() =>
      expect(props.onCreateManually).toHaveBeenCalledWith({
        title: "The Joy of Cooking",
        subtitle: null,
        authors: ["Irma Rombauer", "Marion Becker"],
        publisher: null,
        publishedYear: 1975,
        isbn13: null,
        isbn10: "0743246268",
      })
    );
  });

  it("can leave the text unresolved, and retries a failed lookup", async () => {
    const user = userEvent.setup();
    const props = renderPage({ lookup: { ...lookup, status: "ERROR", errorReason: "Open Library answered 503" } });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await user.click(screen.getByRole("button", { name: "Leave as text" }));
    await waitFor(() => expect(props.onLeaveUnresolved).toHaveBeenCalled());
    expect(props.onRetry).toHaveBeenCalled();
  });
});
