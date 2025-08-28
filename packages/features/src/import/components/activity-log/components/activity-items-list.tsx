"use client";

import React, { memo } from "react";

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

function ActivityItemsListComponent({
  items,
  eventsByImportId,
  fileTitles,
  showCollapsible,
  isExpanded,
  onToggle,
  className = "",
}: ActivityItemsListProps): React.ReactElement {
  const useCollapsible = showCollapsible;

  return (
    <div className={className}>
      {items.map((item) => {
        // Use CollapsibleImportItem for both import items and upload items when showCollapsible is true
        if (useCollapsible && showCollapsible) {
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
}

export const ActivityItemsList = memo(ActivityItemsListComponent);
