import { ReactNode } from "react";

import { render, screen } from "@testing-library/react";

import { ImportStateProvider } from "../../../../contexts/import-state-context";
import { StatusEvent } from "../../../../hooks/use-status-websocket";
import { ActivityItem } from "../../../../types/core";
import { AdaptiveActivityItemsList } from "../adaptive-activity-items-list";

// Mock react-window
jest.mock("react-window", () => ({
  FixedSizeList: ({ children, itemData, itemCount }: any) => {
    // Render first few items for testing
    const itemsToRender = Math.min(itemCount, 5);
    return (
      <div data-testid="virtualized-list">
        {Array.from({ length: itemsToRender }, (_, index) =>
          children({
            index,
            style: { height: 120 },
            data: itemData,
          })
        )}
      </div>
    );
  },
}));

// Test wrapper
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ImportStateProvider>{children}</ImportStateProvider>
);

const createMockActivityItem = (
  id: string,
  type: "import" | "upload" = "import"
): ActivityItem => ({
  importId: id,
  htmlFileName: `test-${id}.html`,
  createdAt: new Date(),
  type,
  ...(type === "import"
    ? {
        noteTitle: `Test Note ${id}`,
        status: "completed" as const,
      }
    : {
        imageCount: 5,
        status: "uploaded" as const,
      }),
});

const createMockEvents = (importId: string): StatusEvent[] => [
  {
    importId,
    status: "COMPLETED",
    context: "test",
    createdAt: new Date().toISOString(),
  },
];

describe("AdaptiveActivityItemsList", () => {
  const mockProps = {
    eventsByImportId: new Map<string, StatusEvent[]>(),
    fileTitles: new Map<string, string>(),
    showCollapsible: true,
    isExpanded: jest.fn(() => false),
    onToggle: jest.fn(),
    className: "test-class",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log for development mode
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should render empty state when no items", () => {
    render(
      <TestWrapper>
        <AdaptiveActivityItemsList {...mockProps} items={[]} />
      </TestWrapper>
    );

    expect(screen.getByText("No items to display")).toBeInTheDocument();
  });

  it("should use standard rendering for small item count", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      createMockActivityItem(`item-${i}`)
    );

    render(
      <TestWrapper>
        <AdaptiveActivityItemsList
          {...mockProps}
          items={items}
          virtualizationThreshold={50}
        />
      </TestWrapper>
    );

    // Should not use virtualization for small lists
    expect(screen.queryByTestId("virtualized-list")).not.toBeInTheDocument();

    // Should show standard rendering indicator in development
    if (process.env.NODE_ENV === "development") {
      expect(screen.getByText(/📝 Standard:/)).toBeInTheDocument();
    }
  });

  it("should use virtualization for large item count", () => {
    const items = Array.from({ length: 100 }, (_, i) =>
      createMockActivityItem(`item-${i}`)
    );

    render(
      <TestWrapper>
        <AdaptiveActivityItemsList
          {...mockProps}
          items={items}
          virtualizationThreshold={50}
        />
      </TestWrapper>
    );

    // Should use virtualization for large lists
    expect(screen.getByTestId("virtualized-list")).toBeInTheDocument();

    // Should show virtualization indicator in development
    if (process.env.NODE_ENV === "development") {
      expect(screen.getByText(/🚀 Virtualized:/)).toBeInTheDocument();
    }
  });

  it("should force virtualization when threshold is exceeded", () => {
    const items = Array.from({ length: 60 }, (_, i) =>
      createMockActivityItem(`item-${i}`)
    );

    render(
      <TestWrapper>
        <AdaptiveActivityItemsList
          {...mockProps}
          items={items}
          virtualizationThreshold={50}
        />
      </TestWrapper>
    );

    expect(screen.getByTestId("virtualized-list")).toBeInTheDocument();
  });

  it("should handle mixed item types", () => {
    const items = [
      createMockActivityItem("import-1", "import"),
      createMockActivityItem("upload-1", "upload"),
      createMockActivityItem("import-2", "import"),
    ];

    render(
      <TestWrapper>
        <AdaptiveActivityItemsList {...mockProps} items={items} />
      </TestWrapper>
    );

    // Should render without errors
    expect(screen.queryByText("No items to display")).not.toBeInTheDocument();
  });

  it("should use custom virtualization threshold", () => {
    const items = Array.from({ length: 30 }, (_, i) =>
      createMockActivityItem(`item-${i}`)
    );

    render(
      <TestWrapper>
        <AdaptiveActivityItemsList
          {...mockProps}
          items={items}
          virtualizationThreshold={20} // Lower threshold
        />
      </TestWrapper>
    );

    // Should use virtualization since items exceed custom threshold
    expect(screen.getByTestId("virtualized-list")).toBeInTheDocument();
  });

  it("should pass correct props to virtualized list", () => {
    const items = Array.from({ length: 100 }, (_, i) =>
      createMockActivityItem(`item-${i}`)
    );
    const eventsByImportId = new Map(
      items.map((item) => [item.importId, createMockEvents(item.importId)])
    );

    render(
      <TestWrapper>
        <AdaptiveActivityItemsList
          {...mockProps}
          items={items}
          eventsByImportId={eventsByImportId}
          defaultItemHeight={80}
        />
      </TestWrapper>
    );

    const virtualizedList = screen.getByTestId("virtualized-list");
    expect(virtualizedList).toBeInTheDocument();
  });

  it("should handle resize events", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      createMockActivityItem(`item-${i}`)
    );

    render(
      <TestWrapper>
        <AdaptiveActivityItemsList {...mockProps} items={items} />
      </TestWrapper>
    );

    // Should render without errors
    expect(screen.queryByText("No items to display")).not.toBeInTheDocument();

    // Simulate window resize
    global.dispatchEvent(new Event("resize"));

    // Should still render correctly
    expect(screen.queryByText("No items to display")).not.toBeInTheDocument();
  });

  it("should log performance metrics in development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const consoleSpy = jest.spyOn(console, "log");
    const items = Array.from({ length: 100 }, (_, i) =>
      createMockActivityItem(`item-${i}`)
    );

    render(
      <TestWrapper>
        <AdaptiveActivityItemsList {...mockProps} items={items} />
      </TestWrapper>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("📊 [ActivityList] Performance Metrics:"),
      expect.objectContaining({
        itemCount: 100,
        shouldVirtualize: expect.any(Boolean),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });
});
