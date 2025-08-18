"use client";

import { ReactNode } from "react";

import {
  StatusSummary,
  generateStatusMessages,
} from "../../utils/status-parser";

export interface DetailedStatusProps {
  summary: StatusSummary;
  className?: string;
  showAllDetails?: boolean;
}

export function DetailedStatus({
  summary,
  className = "",
  showAllDetails = true,
}: DetailedStatusProps): ReactNode {
  const statusMessages = generateStatusMessages(summary);

  if (statusMessages.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No status information available
      </div>
    );
  }

  const getStatusIcon = (message: string) => {
    if (message.includes("error") || message.includes("failed")) {
      return "❌";
    }
    if (message.includes("completed") || message.includes("successfully")) {
      return "✅";
    }
    if (message.includes("processing") || message.includes("Processed")) {
      return "🔄";
    }
    if (message.includes("Created") || message.includes("Added")) {
      return "➕";
    }
    if (message.includes("Cleaned")) {
      return "🧹";
    }
    if (message.includes("Connected")) {
      return "🔗";
    }
    return "ℹ️";
  };

  const getStatusColor = (message: string) => {
    if (message.includes("error") || message.includes("failed")) {
      return "text-red-700";
    }
    if (message.includes("completed") || message.includes("successfully")) {
      return "text-green-700";
    }
    if (message.includes("processing") || message.includes("Processed")) {
      return "text-blue-700";
    }
    return "text-gray-700";
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 50/50 layout for status + preview handled by parent. Keep content flexible */}
      {/* Status messages */}
      <div className="space-y-1">
        {statusMessages.map((message, index) => (
          <div key={index} className="flex items-start space-x-2">
            <span className="flex-shrink-0 text-sm mt-0.5">
              {getStatusIcon(message)}
            </span>
            <span className={`text-sm ${getStatusColor(message)}`}>
              {message}
            </span>
          </div>
        ))}
      </div>

      {/* Additional details */}
      {showAllDetails && (
        <div className="pt-2 border-t border-gray-200">
          {/* Parsing errors */}
          {summary.parsingErrors > 0 && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <span>⚠️</span>
              <span>
                {summary.parsingErrors} parsing error
                {summary.parsingErrors !== 1 ? "s" : ""} found
              </span>
            </div>
          )}

          {/* File cleaning details */}
          {summary.fileCleaned && (
            <div className="text-xs text-gray-500 mt-1">
              Original size: {summary.fileCleaned.originalSize}
            </div>
          )}

          {/* Ingredient processing details */}
          {summary.ingredientsProcessed && (
            <div className="text-xs text-gray-500 mt-1">
              {summary.ingredientsProcessed.errors > 0 && (
                <span className="text-red-600">
                  {summary.ingredientsProcessed.errors} ingredient parsing error
                  {summary.ingredientsProcessed.errors !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Image processing details */}
          {summary.imagesAdded && summary.imagesAdded.types.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Image types: {summary.imagesAdded.types.join(", ")}
            </div>
          )}

          {/* Source details */}
          {summary.sourceConnected && (
            <div className="text-xs text-gray-500 mt-1">
              Source type: {summary.sourceConnected.type}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
