"use client";

import { ReactNode, useMemo } from "react";

import { UploadItem } from "../types";
import {
  UPLOAD_BACKGROUND_COLOR,
  UPLOAD_STATUS_ICON,
  getUploadStatusText,
} from "../../utils/activity-log-helpers";

interface UploadItemComponentProps {
  item: UploadItem;
  className?: string;
}

export function UploadItemComponent({
  item,
  className = "",
}: UploadItemComponentProps): ReactNode {
  const statusIcon = useMemo(
    () => UPLOAD_STATUS_ICON[item.status] ?? "spinner",
    [item.status]
  );

  const statusText = useMemo(
    () =>
      getUploadStatusText(
        item.status,
        item.htmlFileName,
        item.imageCount
      ),
    [item.status, item.htmlFileName, item.imageCount]
  );

  const backgroundColor = useMemo(
    () => UPLOAD_BACKGROUND_COLOR[item.status] ?? "bg-gray-50",
    [item.status]
  );

  const getStatusColor = () => {
    switch (item.status) {
      case "uploaded":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getTextColor = () => {
    switch (item.status) {
      case "uploaded":
        return "text-green-800";
      case "failed":
        return "text-red-800";
      default:
        return "text-gray-800";
    }
  };

  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded ${backgroundColor} ${className}`}
    >
      <div className="flex-shrink-0">
        {statusIcon === "spinner" ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
        ) : (
          <div className={`text-lg ${getStatusColor()}`}>
            {statusIcon}
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className={`font-medium ${getTextColor()}`}>
          {statusText}
        </div>
      </div>
    </div>
  );
}
