"use client";

import { StatusIcon } from "./status-icon";

import { ReactNode } from "react";

import { ProcessingStep } from "../../../utils/status-parser";
import { formatStatusText } from "../../utils/status-text-formatter";
import { ACTIVITY_LOG_STYLES } from "../styles/activity-log-styles";
import { ImportItem, ImportItemWithUploadProgress } from "../types";
import { StylingConfig } from "../utils/styling-utils";

interface CollapsibleHeaderProps {
  item: ImportItem | ImportItemWithUploadProgress;
  isExpanded: boolean;
  onToggle: () => void;
  styling: StylingConfig;
  hasDuplicate: boolean;
  statusText: string;
}

export function CollapsibleHeader({
  item,
  isExpanded,
  onToggle,
  styling,
  hasDuplicate,
  statusText,
}: CollapsibleHeaderProps): ReactNode {
  return (
    <button
      type="button"
      className={`w-full text-left flex items-center space-x-3 p-4 transition-colors ${styling.backgroundColor} ${styling.hoverBackgroundColor}`}
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={`import-item-${item.importId}`}
    >
      {/* Status Icon - align with step icons */}
      <div className={ACTIVITY_LOG_STYLES.collapsible.statusIcon}>
        <StatusIcon
          status={item.status === "importing" ? "processing" : item.status}
          step={
            hasDuplicate
              ? ({
                  id: "check_duplicates",
                  status: "completed",
                  metadata: { duplicateCount: 1 },
                } as ProcessingStep)
              : undefined
          }
          size="md"
        />
      </div>

      {/* Status Text */}
      <div className="flex-1">
        <div className={`font-medium ${styling.textColor}`}>
          {formatStatusText(statusText)}
        </div>
      </div>

      {/* Expand/Collapse Icon */}
      <div className="flex-shrink-0">
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </button>
  );
}
