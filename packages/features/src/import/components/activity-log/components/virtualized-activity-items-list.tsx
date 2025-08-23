"use client";

import {
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { VariableSizeList as List } from "react-window";

import { StatusEvent } from "../../../hooks/use-status-websocket";
import { ActivityItem } from "../../../types/core";
import { CollapsibleImportItem } from "../collapsible-import-item";
import { ImportItemComponent } from "../import-item";

interface VirtualizedActivityItemsListProps {
  items: ActivityItem[];
  eventsByImportId: Map<string, StatusEvent[]>;
  fileTitles: Map<string, string>;
  showCollapsible: boolean;
  isExpanded: (itemId: string) => boolean;
  onToggle: (itemId: string) => void;
  height: number; // Total height of the virtualized list
  itemHeight: number; // Default height of each item
  className?: string;
}

interface ItemData {
  items: ActivityItem[];
  eventsByImportId: Map<string, StatusEvent[]>;
  fileTitles: Map<string, string>;
  showCollapsible: boolean;
  isExpanded: (itemId: string) => boolean;
  onToggle: (itemId: string) => void;
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: ItemData;
}

// Individual item renderer for react-window
const ListItem = memo(({ index, style, data }: ListItemProps) => {
  const {
    items,
    eventsByImportId,
    fileTitles,
    showCollapsible,
    isExpanded,
    onToggle,
  } = data;

  const item = items[index];
  if (!item) return null;

  const handleToggle = useCallback(() => {
    console.log("🔄 Toggle called for item:", item.importId);
    onToggle(item.importId);
  }, [onToggle, item.importId]);

  return (
    <div style={style}>
              <div className="px-2 py-1">
          {/* Debug logging for first few items */}
          {(() => {
            if (index < 3) {
              console.log(`🔍 Item ${index}:`, {
                importId: item.importId,
                type: item.type,
                hasNoteTitle: "noteTitle" in item,
                showCollapsible,
                shouldBeCollapsible: showCollapsible && item.type === "import",
              });
            }
            return null;
          })()}
          {showCollapsible && item.type === "import" ? (
          <CollapsibleImportItem
            item={item}
            fileTitles={fileTitles}
            events={eventsByImportId.get(item.importId) || []}
            isExpanded={isExpanded(item.importId)}
            onToggle={handleToggle}
          />
        ) : (
          <ImportItemComponent item={item} fileTitles={fileTitles} />
        )}
      </div>
    </div>
  );
});

ListItem.displayName = "VirtualizedListItem";

const VirtualizedActivityItemsListComponent = ({
  items,
  eventsByImportId,
  fileTitles,
  showCollapsible,
  isExpanded,
  onToggle,
  height,
  itemHeight,
  className = "",
}: VirtualizedActivityItemsListProps): ReactNode => {
  // Calculate item heights based on expansion state
  const getItemHeight = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return itemHeight;

      // Check if this item should be expanded
      const expanded = showCollapsible && isExpanded(item.importId);
      const height = expanded ? 650 : 80;

      // Debug logging for first few items
      if (index < 3) {
        console.log(
          `📏 Item ${index} (${item.importId}): expanded=${expanded}, height=${height}`
        );
      }

      // Collapsed items: header height (approximately 80px)
      // Expanded items: 650px with scroll if needed
      return height;
    },
    [items, showCollapsible, isExpanded, itemHeight]
  );

  // Ref to the list for cache reset
  const listRef = useRef<List>(null);

  // Memoize the data object to prevent unnecessary re-renders
  const itemData = useMemo(
    (): ItemData => ({
      items,
      eventsByImportId,
      fileTitles,
      showCollapsible,
      isExpanded,
      onToggle,
    }),
    [items, eventsByImportId, fileTitles, showCollapsible, isExpanded, onToggle]
  );

  // Reset cache when expansion state changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
      console.log("🔄 Virtualized list cache reset");
    }
  }, [items, showCollapsible, isExpanded]);

  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center py-8 text-gray-500 ${className}`}
      >
        No items to display
      </div>
    );
  }

  // Create a key that changes when expansion state changes to force re-render
  const listKey = useMemo(() => {
    const expandedCount = items.filter(
      (item) =>
        showCollapsible && item.type === "import" && isExpanded(item.importId)
    ).length;
    return `list-${items.length}-${expandedCount}`;
  }, [items, showCollapsible, isExpanded]);

  return (
    <div className={className}>
      <List
        key={listKey}
        ref={listRef}
        height={height}
        width="100%"
        itemCount={items.length}
        itemSize={getItemHeight}
        itemData={itemData}
        overscanCount={5} // Render 5 extra items above/below visible area for smooth scrolling
      >
        {ListItem}
      </List>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const VirtualizedActivityItemsList = memo(
  VirtualizedActivityItemsListComponent
);
