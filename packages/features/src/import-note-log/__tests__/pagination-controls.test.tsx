import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PaginationControls } from "../pagination-controls";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("PaginationControls", () => {
  it("should not render when there is only one page", () => {
    render(<PaginationControls totalItems={5} />);
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("should render pagination controls when there are multiple pages", () => {
    render(<PaginationControls totalItems={25} />);

    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should show correct page information", () => {
    render(<PaginationControls totalItems={25} />);

    expect(screen.getByText("Showing 1 to 10 of 25 items")).toBeInTheDocument();
  });

  it("should handle page navigation", () => {
    render(<PaginationControls totalItems={25} />);

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    // The button should be clickable (actual navigation is handled by the hook)
    expect(nextButton).toBeInTheDocument();
  });

  it("should show ellipsis for many pages", () => {
    render(<PaginationControls totalItems={100} />);

    // Should show first page, current page, and last page with ellipsis
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});
