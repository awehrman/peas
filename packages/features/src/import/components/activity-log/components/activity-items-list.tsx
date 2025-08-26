"use client";

import { ReactNode, memo } from "react";

import { StatusEvent } from "../../../hooks/use-status-websocket";
import { ActivityItem } from "../../../types/core";
import { CollapsibleImportItem } from "../collapsible-import-item";
import { ImportItemComponent } from "../import-item";

interface ActivityItemsListProps {
  items: ActivityItem[];
  eventsByImportId: Map<string, StatusEvent[]>;
  fileTitles: Map<string, string>;
  showCollapsible: boolean;
  isExpanded: (itemId: string) => boolean;
  onToggle: (itemId: string) => void;
  className?: string;
}

const ActivityItemsListComponent = ({
  items,
  eventsByImportId,
  fileTitles,
  showCollapsible,
  isExpanded,
  onToggle,
  className = "",
}: ActivityItemsListProps): ReactNode => {
  return (
    <div className={className}>
      {items.map((item) => {
        // Use CollapsibleImportItem for both import items and upload items when showCollapsible is true
        if (showCollapsible) {
          // Create a stable callback for each item to prevent unnecessary re-renders
          const handleToggle = () => onToggle(item.importId);

          // Get pre-filtered events for this specific item
          const itemEvents = eventsByImportId.get(item.importId) || [];

          return (
            <CollapsibleImportItem
              key={item.importId}
              item={item}
              fileTitles={fileTitles}
              events={itemEvents}
              isExpanded={isExpanded(item.importId)}
              onToggle={handleToggle}
            />
          );
        }

        return (
          <ImportItemComponent
            key={item.importId}
            item={item}
            fileTitles={fileTitles}
          />
        );
      })}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ActivityItemsList = memo(ActivityItemsListComponent);
