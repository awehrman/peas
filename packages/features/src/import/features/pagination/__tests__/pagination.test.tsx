import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PaginationProvider, PaginationControls, usePaginationContext } from "../index";

// Mock Next.js router
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Test component that uses pagination context
function TestComponent() {
  const { state, actions } = usePaginationContext();
  
  return (
    <div>
      <div data-testid="current-page">{state.page}</div>
      <div data-testid="total-pages">{state.totalPages}</div>
      <div data-testid="total-items">{state.totalItems}</div>
      <div data-testid="has-next">{state.hasNextPage.toString()}</div>
      <div data-testid="has-prev">{state.hasPreviousPage.toString()}</div>
      <button onClick={() => actions.goToPage(2)}>Go to page 2</button>
      <button onClick={actions.goToNextPage}>Next</button>
      <button onClick={actions.goToPreviousPage}>Previous</button>
    </div>
  );
}

describe("Pagination Feature", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams.clear();
  });

  it("should render pagination with correct initial state", () => {
    render(
      <PaginationProvider totalItems={25} defaultLimit={10}>
        <TestComponent />
      </PaginationProvider>
    );

    expect(screen.getByTestId("current-page")).toHaveTextContent("1");
    expect(screen.getByTestId("total-pages")).toHaveTextContent("3");
    expect(screen.getByTestId("total-items")).toHaveTextContent("25");
    expect(screen.getByTestId("has-next")).toHaveTextContent("true");
    expect(screen.getByTestId("has-prev")).toHaveTextContent("false");
  });

  it("should navigate to different pages", () => {
    render(
      <PaginationProvider totalItems={25} defaultLimit={10}>
        <TestComponent />
      </PaginationProvider>
    );

    fireEvent.click(screen.getByText("Go to page 2"));
    
    expect(mockPush).toHaveBeenCalledWith("?page=2", { scroll: false });
  });

  it("should render pagination controls", () => {
    render(
      <PaginationProvider totalItems={25} defaultLimit={10}>
        <PaginationControls />
      </PaginationProvider>
    );

    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 to 10 of 25 items")).toBeInTheDocument();
  });

  it("should not render pagination controls when only one page", () => {
    const { container } = render(
      <PaginationProvider totalItems={5} defaultLimit={10}>
        <PaginationControls />
      </PaginationProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it("should handle URL parameters correctly", () => {
    mockSearchParams.set("page", "2");
    mockSearchParams.set("limit", "5");

    render(
      <PaginationProvider totalItems={25} defaultLimit={10}>
        <TestComponent />
      </PaginationProvider>
    );

    expect(screen.getByTestId("current-page")).toHaveTextContent("2");
  });
});
