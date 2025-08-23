"use client";

import { ReactNode, useMemo } from "react";

export interface StatsSummaryProps {
  noteCount?: number;
  ingredientCount?: number;
  parsingErrorCount?: number;
  className?: string;
}

interface StatItem {
  label: string;
  value: number;
  type: "success" | "info" | "warning";
}

export function StatsSummary({
  noteCount = 0,
  ingredientCount = 0,
  parsingErrorCount = 0,
  className = "",
}: StatsSummaryProps): ReactNode {
  const stats = useMemo<StatItem[]>(
    () => [
      { label: "Notes", value: noteCount, type: "info" },
      { label: "Ingredients", value: ingredientCount, type: "success" },
      { label: "Parsing Errors", value: parsingErrorCount, type: "warning" },
    ],
    [noteCount, ingredientCount, parsingErrorCount]
  );

  const getStatStyle = (type: StatItem["type"]) => {
    switch (type) {
      case "success":
        return "text-green-600";
      case "warning":
        return "text-amber-600";
      case "info":
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className={className}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Import summary
      </h2>
      <div className="space-y-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{stat.label}</span>
            <span className={`text-sm font-medium ${getStatStyle(stat.type)}`}>
              {stat.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
