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
    <div className="bg-green-50 border border-green-200 p-4 rounded">
      {/* Import Header */}
      <div className="bg-purple-50 border border-purple-200 p-2 rounded flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="text-lg font-medium">
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
          </div>
          {importStatus.status === "completed" && (
            <div className="text-green-600">✅</div>
          )}
          {importStatus.status === "failed" && (
            <div className="text-red-600">❌</div>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {importStatus.createdAt.toLocaleTimeString()}
        </div>
      </div>

      {/* Import Steps */}
      <div className="space-y-2 text-sm">
        {/* Cleaning */}
        <div className="flex items-center">
          <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
            {getStepIcon(importStatus.steps.cleaning.status)}
          </div>
          <div
            className={
              importStatus.steps.cleaning.status === "failed"
                ? "text-red-600"
                : ""
            }
          >
            {importStatus.steps.cleaning.status === "completed"
              ? "Cleaned .html files!"
              : "Cleaning .html files..."}
          </div>
          {importStatus.steps.cleaning.error && (
            <div className="text-red-500 text-xs">
              ({importStatus.steps.cleaning.error})
            </div>
          )}
        </div>

        {/* Structure */}
        <div className="flex items-center">
          <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
            {getStepIcon(importStatus.steps.structure.status)}
          </div>
          <div
            className={
              importStatus.steps.structure.status === "failed"
                ? "text-red-600"
                : ""
            }
          >
            {importStatus.steps.structure.status === "completed"
              ? "Created note structure!"
              : "Creating note structure..."}
          </div>
          {importStatus.steps.structure.error && (
            <div className="text-red-500 text-xs">
              ({importStatus.steps.structure.error})
            </div>
          )}
        </div>

        {/* Processing Note Container */}
        <div className="ml-4 space-y-1">
          <div className="flex items-center">
            <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
              {getStepIcon(importStatus.steps.noteProcessing.status)}
            </div>
            <div>Processing note</div>
          </div>

          {/* Ingredients */}
          <div className="ml-8 flex items-center">
            <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
              {getStepIcon(importStatus.steps.ingredients.status)}
            </div>
            <div
              className={
                importStatus.steps.ingredients.status === "failed"
                  ? "text-red-600"
                  : ""
              }
            >
              {getStepText(importStatus.steps.ingredients, "ingredients")}
            </div>
          </div>

          {/* Instructions */}
          <div className="ml-8 flex items-center">
            <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
              {getStepIcon(importStatus.steps.instructions.status)}
            </div>
            <div
              className={
                importStatus.steps.instructions.status === "failed"
                  ? "text-red-600"
                  : ""
              }
            >
              {getStepText(importStatus.steps.instructions, "instructions")}
            </div>
          </div>

          {/* Source */}
          <div className="ml-4 flex items-center">
            <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
              {getStepIcon(importStatus.steps.source.status)}
            </div>
            <div
              className={
                importStatus.steps.source.status === "failed"
                  ? "text-red-600"
                  : ""
              }
            >
              {importStatus.steps.source.status === "completed"
                ? "Added source!"
                : "Processing source..."}
            </div>
            {importStatus.steps.source.error && (
              <div className="text-red-500 text-xs">
                ({importStatus.steps.source.error})
              </div>
            )}
          </div>

          {/* Image */}
          <div className="ml-4 flex items-center">
            <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
              {getStepIcon(importStatus.steps.image.status)}
            </div>
            <div
              className={
                importStatus.steps.image.status === "failed"
                  ? "text-red-600"
                  : ""
              }
            >
              {importStatus.steps.image.status === "completed"
                ? "Added image!"
                : "Processing image..."}
            </div>
            {importStatus.steps.image.error && (
              <div className="text-red-500 text-xs">
                ({importStatus.steps.image.error})
              </div>
            )}
          </div>
        </div>

        {/* Duplicates */}
        <div className="flex items-center">
          <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
            {getStepIcon(importStatus.steps.duplicates.status)}
          </div>
          <div
            className={
              importStatus.steps.duplicates.status === "failed"
                ? "text-red-600"
                : ""
            }
          >
            {importStatus.steps.duplicates.status === "completed"
              ? (importStatus.steps.duplicates.message?.includes("Duplicate note identified") 
                  ? "Duplicate note identified!"
                  : "Verified no duplicates!")
              : "Checking for duplicate notes..."}
          </div>
          {importStatus.steps.duplicates.error && (
            <div className="text-red-500 text-xs">
              ({importStatus.steps.duplicates.error})
            </div>
          )}
        </div>

        {/* Categorization */}
        <div className="flex items-center">
          <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
            {getStepIcon(importStatus.steps.categorization.status)}
          </div>
          <div
            className={
              importStatus.steps.categorization.status === "failed"
                ? "text-red-600"
                : ""
            }
          >
            {importStatus.steps.categorization.status === "completed"
              ? (importStatus.steps.categorization.message || "Category determined!")
              : "Determining recipe category..."}
          </div>
          {importStatus.steps.categorization.error && (
            <div className="text-red-500 text-xs">
              ({importStatus.steps.categorization.error})
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center">
          <div className="mr-3 text-center" style={{ minWidth: "20px" }}>
            {getStepIcon(importStatus.steps.tags.status)}
          </div>
          <div
            className={
              importStatus.steps.tags.status === "failed"
                ? "text-red-600"
                : ""
            }
          >
            {importStatus.steps.tags.status === "completed"
              ? (importStatus.steps.tags.message || "Tags determined!")
              : "Determining recipe tags..."}
          </div>
          {importStatus.steps.tags.error && (
            <div className="text-red-500 text-xs">
              ({importStatus.steps.tags.error})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
