import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SourceList } from "../components/source-list";
import type { NoteSourceLink } from "../types";

const book: NoteSourceLink = {
  id: "ns-book",
  isPrimary: true,
  origin: "EVERNOTE_IMPORT",
  originalText: "Salt, Fat, Acid, Heat p. 112",
  source: {
    id: "s-book",
    kind: "BOOK",
    displayName: null,
    url: null,
    bookLookup: null,
    book: {
      id: "b1",
      title: "Salt, Fat, Acid, Heat",
      subtitle: null,
      authors: ["Samin Nosrat"],
      publisher: null,
      publishedYear: 2017,
      isbn13: null,
      isbn10: null,
      coverId: null,
      matchStatus: "AUTO_MATCHED",
      openLibraryWorkKey: "/works/OL1W",
    },
  },
};

const brokenUrl: NoteSourceLink = {
  id: "ns-url",
  isPrimary: false,
  origin: "DUPLICATE_MERGE",
  originalText: "https://gone.example/chili",
  source: {
    id: "s-url",
    kind: "URL",
    displayName: "gone.example",
    book: null,
    bookLookup: null,
    url: {
      id: "u1",
      originalUrl: "https://gone.example/chili",
      normalizedUrl: "https://gone.example/chili",
      siteName: null,
      checkStatus: "UNREACHABLE",
      lastCheckedAt: "2026-11-10T12:00:00.000Z",
      lastSuccessfulVisitAt: "2024-03-01T12:00:00.000Z",
      lastHttpStatus: 404,
      lastFailureReason: "HTTP 404",
      lastFinalUrl: null,
    },
  },
};

const pendingText: NoteSourceLink = {
  id: "ns-text",
  isPrimary: true,
  origin: "EVERNOTE_IMPORT",
  originalText: "Grandma's binder",
  source: {
    id: "s-text",
    kind: "OTHER",
    displayName: "Grandma's binder",
    url: null,
    book: null,
    bookLookup: { id: "lookup-1", status: "AMBIGUOUS" },
  },
};

describe("SourceList", () => {
  it("shows the book first with its authors and year, and marks it primary", () => {
    render(<SourceList sources={[book, brokenUrl]} />);
    expect(screen.getByText("Salt, Fat, Acid, Heat")).toBeInTheDocument();
    expect(screen.getByText("(Samin Nosrat, 2017)")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("From a merged duplicate")).toBeInTheDocument();
  });

  it("explains a failed check without hiding the URL, and rechecks it", async () => {
    const user = userEvent.setup();
    const onRecheckUrl = vi.fn().mockResolvedValue({ success: true });
    render(<SourceList sources={[brokenUrl]} onRecheckUrl={onRecheckUrl} />);

    expect(screen.getByRole("link", { name: "gone.example" })).toHaveAttribute("href", "https://gone.example/chili");
    expect(screen.getByText("Unreachable")).toBeInTheDocument();
    expect(screen.getByText(/HTTP 404/)).toBeInTheDocument();
    expect(screen.getByText(/last reachable/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Recheck" }));
    await waitFor(() => expect(onRecheckUrl).toHaveBeenCalledWith("u1"));
  });

  it("links text waiting for a book decision to its review page", () => {
    render(<SourceList sources={[pendingText]} />);
    expect(screen.getByRole("link", { name: "Choose the matching book" })).toHaveAttribute(
      "href",
      "/import/books/lookup-1"
    );
  });

  it("falls back to the raw Evernote source when nothing is linked", () => {
    render(<SourceList sources={[]} fallbackSource="Some magazine, 1998" />);
    expect(screen.getByText("Some magazine, 1998")).toBeInTheDocument();
  });
});
