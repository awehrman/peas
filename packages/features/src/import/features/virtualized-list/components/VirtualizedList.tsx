"use client";

import { FixedSizeList as List } from "react-window";

import { useVirtualization } from "../hooks/use-virtualization";
import { VirtualizedListProps } from "../types/virtualization";

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight = 400,
  overscan = 5,
  renderItem,
  className = "",
  onScroll,
}: VirtualizedListProps<T>): React.ReactElement {
  const virtualization = useVirtualization({
    itemsCount: items.length,
    itemHeight,
    containerHeight,
    overscan,
    threshold: 50,
  });

  const { shouldVirtualize } = virtualization;

  // If we don't need virtualization, render normal list
  if (!shouldVirtualize) {
    return (
      <div
        className={`overflow-auto ${className}`}
        style={{ height: containerHeight }}
        onScroll={(e) => {
          onScroll?.(e.currentTarget.scrollTop);
        }}
      >
        {items.map((item, index) => (
          <div key={index} style={{ height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  // Render virtualized list using react-window
  return (
    <div className={className}>
      <List
        height={containerHeight}
        width="100%"
        itemCount={items.length}
        itemSize={itemHeight}
        overscanCount={overscan}
        onScroll={({ scrollOffset }) => {
          onScroll?.(scrollOffset);
        }}
      >
        {({ index, style }) => (
          <div style={style}>{renderItem(items[index]!, index)}</div>
        )}
      </List>
    </div>
  );
}
