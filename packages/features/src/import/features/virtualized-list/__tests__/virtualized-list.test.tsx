import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VirtualizedList } from "../components/VirtualizedList";

// Mock react-window
vi.mock("react-window", () => ({
  FixedSizeList: ({ children, itemCount }: any) => (
    <div data-testid="virtualized-list">
      {Array.from({ length: Math.min(itemCount, 5) }, (_, i) => (
        <div key={i} data-testid={`virtual-item-${i}`}>
          {children({ index: i, style: {} })}
        </div>
      ))}
    </div>
  ),
}));

// Test render function
const renderItem = (item: string, index: number) => (
  <div data-testid={`rendered-item-${index}`}>{item}</div>
);

describe("VirtualizedList Feature", () => {
  it("should render virtualized list for large datasets", () => {
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

    render(
      <VirtualizedList
        items={items}
        itemHeight={50}
        containerHeight={400}
        renderItem={renderItem}
      />
    );

    expect(screen.getByTestId("virtualized-list")).toBeInTheDocument();
    expect(screen.getByTestId("virtual-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("rendered-item-0")).toHaveTextContent("Item 0");
  });

  it("should render normal list for small datasets", () => {
    const items = ["Item 1", "Item 2", "Item 3"];

    render(
      <VirtualizedList
        items={items}
        itemHeight={50}
        containerHeight={400}
        renderItem={renderItem}
      />
    );

    expect(screen.getByTestId("rendered-item-0")).toHaveTextContent("Item 1");
    expect(screen.getByTestId("rendered-item-1")).toHaveTextContent("Item 2");
    expect(screen.getByTestId("rendered-item-2")).toHaveTextContent("Item 3");
  });

  it("should handle empty items list", () => {
    const items: string[] = [];

    render(
      <VirtualizedList
        items={items}
        itemHeight={50}
        containerHeight={400}
        renderItem={renderItem}
      />
    );

    expect(screen.getByTestId("virtualized-list")).toBeInTheDocument();
  });
});
