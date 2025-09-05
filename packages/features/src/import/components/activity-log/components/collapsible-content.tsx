"use client";

import { ReactNode } from "react";

import { ProcessingStep } from "../../../utils/status-parser";
import { ProgressStatusBar } from "../progress-status-bar";
import { ImportItem, ImportItemWithUploadProgress } from "../types";

interface CollapsibleContentProps {
  item: ImportItem | ImportItemWithUploadProgress;
  processingSteps: ProcessingStep[];
  previewUrl: string | null;
}

export function CollapsibleContent({
  item,
  processingSteps,
  previewUrl,
}: CollapsibleContentProps): ReactNode {
  const effectivePreviewUrl = previewUrl;
  return (
    <div
      id={`import-item-${item.importId}`}
      className="border-t border-greyscale-200 bg-card h-[600px] overflow-y-auto"
    >
      <div className="p-4">
        <div className="md:flex md:items-start md:gap-6">
          {/* Left: 50% width on md+ with progress */}
          <div className="w-full md:w-1/2 space-y-4">
            {/* Progress Status Bar */}
            {processingSteps.length > 0 && (
              <div>
                <ProgressStatusBar steps={processingSteps} compact />
              </div>
            )}
          </div>

          {/* Right: image placeholder/preview 3x4 aspect */}
          <div className="w-full md:w-1/2 mt-4 md:mt-0">
            <div className="w-full md:flex md:justify-end">
              <div
                className="border border-gray-200 rounded-md overflow-hidden w-full"
                aria-live="polite"
              >
                {effectivePreviewUrl ? (
                  <div className="relative w-full">
                    <div className="aspect-[4/3] w-full">
                      <img
                        src={effectivePreviewUrl}
                        alt="Imported image preview"
                        className="block w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-full aspect-[4/3] bg-gray-100 animate-pulse"
                    aria-label="Image loading placeholder"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
