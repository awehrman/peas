"use client";

import { ReactNode } from "react";

export interface StatsSummaryProps {
  noteCount?: number;
  ingredientCount?: number;
  parsingErrorCount?: number;
  className?: string;
}

export function StatsSummary({
  noteCount = 0,
  ingredientCount = 0,
  parsingErrorCount = 0,
  className = "",
}: StatsSummaryProps): ReactNode {
  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Import Summary
      </h2>
      <div className="space-y-3">
        <div className="p-1">
          <p className="text-sm text-gray-600">{noteCount} Notes</p>
        </div>
        <div className="p-1">
          <p className="text-sm text-gray-600">{ingredientCount} Ingredients</p>
        </div>
        <div className="p-1">
          <p className="text-sm text-gray-600">
            {parsingErrorCount} Parsing errors
          </p>
        </div>
      </div>
    </div>
  );
}
