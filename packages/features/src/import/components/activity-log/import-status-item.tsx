import { ImportStatus } from "./types";
import { getStepIcon, getStepText } from "./utils";

import { ReactNode } from "react";

interface ImportStatusItemProps {
  importStatus: ImportStatus;
}

export function ImportStatusItem({
  importStatus,
}: ImportStatusItemProps): ReactNode {
  return (
    <div className="p-4">
      {/* Import Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-medium">
            {importStatus.status === "completed"
              ? `Added Note ${
                  importStatus.noteTitle
                    ? `"${
                        importStatus.noteTitle.length > 30
                          ? importStatus.noteTitle.substring(0, 30) + "..."
                          : importStatus.noteTitle
                      }"`
                    : importStatus.importId.slice(0, 8)
                }`
              : `Importing Note ${importStatus.importId.slice(0, 8)}`}
          </span>
          {importStatus.status === "completed" && (
            <span className="text-green-600">✅</span>
          )}
          {importStatus.status === "failed" && (
            <span className="text-red-600">❌</span>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {importStatus.createdAt.toLocaleTimeString()}
        </span>
      </div>

      {/* Import Steps */}
      <div className="space-y-2 text-sm">
        {/* Cleaning */}
        <div className="flex items-center">
          <span className="mr-3 text-center" style={{ minWidth: "20px" }}>
            {getStepIcon(importStatus.steps.cleaning.status)}
          </span>
          <span
            className={
              importStatus.steps.cleaning.status === "failed"
                ? "text-red-600"
                : ""
            }
          >
            {importStatus.steps.cleaning.status === "completed"
              ? "Cleaned .html files!"
              : "Cleaning .html files..."}
          </span>
          {importStatus.steps.cleaning.error && (
            <span className="text-red-500 text-xs">
              ({importStatus.steps.cleaning.error})
            </span>
          )}
        </div>

        {/* Structure */}
        <div className="flex items-center">
          <span className="mr-3 text-center" style={{ minWidth: "20px" }}>
            {getStepIcon(importStatus.steps.structure.status)}
          </span>
          <span
            className={
              importStatus.steps.structure.status === "failed"
                ? "text-red-600"
                : ""
            }
          >
            {importStatus.steps.structure.status === "completed"
              ? "Created note structure!"
              : "Creating note structure..."}
          </span>
          {importStatus.steps.structure.error && (
            <span className="text-red-500 text-xs">
              ({importStatus.steps.structure.error})
            </span>
          )}
        </div>

        {/* Processing Note Container */}
        <div className="ml-4 space-y-1">
          <div className="flex items-center">
            <span className="mr-3 text-center" style={{ minWidth: "20px" }}>
              📝
            </span>
            <span>Processing note</span>
          </div>

          {/* Ingredients */}
          <div className="ml-8 flex items-center">
            <span className="mr-3 text-center" style={{ minWidth: "20px" }}>
              {getStepIcon(importStatus.steps.ingredients.status)}
            </span>
            <span
              className={
                importStatus.steps.ingredients.status === "failed"
                  ? "text-red-600"
                  : ""
              }
            >
              {getStepText(importStatus.steps.ingredients, "ingredients")}
            </span>
          </div>

          {/* Instructions */}
          <div className="ml-8 flex items-center">
            <span className="mr-3 text-center" style={{ minWidth: "20px" }}>
              {getStepIcon(importStatus.steps.instructions.status)}
            </span>
            <span
              className={
                importStatus.steps.instructions.status === "failed"
                  ? "text-red-600"
                  : ""
              }
            >
              {getStepText(importStatus.steps.instructions, "instructions")}
            </span>
          </div>

          {/* Source */}
          <div className="ml-4 flex items-center">
            <span className="mr-3 text-center" style={{ minWidth: "20px" }}>
              {getStepIcon(importStatus.steps.source.status)}
            </span>
            <span
              className={
                importStatus.steps.source.status === "failed"
                  ? "text-red-600"
                  : ""
              }
            >
              {importStatus.steps.source.status === "completed"
                ? "Added source..."
                : "Processing source..."}
            </span>
            {importStatus.steps.source.error && (
              <span className="text-red-500 text-xs">
                ({importStatus.steps.source.error})
              </span>
            )}
          </div>

          {/* Image */}
          <div className="ml-4 flex items-center">
            <span className="mr-3 text-center" style={{ minWidth: "20px" }}>
              {getStepIcon(importStatus.steps.image.status)}
            </span>
            <span
              className={
                importStatus.steps.image.status === "failed"
                  ? "text-red-600"
                  : ""
              }
            >
              {importStatus.steps.image.status === "completed"
                ? "Added image..."
                : "Processing image..."}
            </span>
            {importStatus.steps.image.error && (
              <span className="text-red-500 text-xs">
                ({importStatus.steps.image.error})
              </span>
            )}
          </div>
        </div>

        {/* Duplicates */}
        <div className="flex items-center">
          <span className="mr-3 text-center" style={{ minWidth: "20px" }}>
            {getStepIcon(importStatus.steps.duplicates.status)}
          </span>
          <span
            className={
              importStatus.steps.duplicates.status === "failed"
                ? "text-red-600"
                : ""
            }
          >
            {importStatus.steps.duplicates.status === "completed"
              ? "Verified no duplicates!"
              : "Checking for duplicate notes..."}
          </span>
          {importStatus.steps.duplicates.error && (
            <span className="text-red-500 text-xs">
              ({importStatus.steps.duplicates.error})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
