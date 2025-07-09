"use client";
import { ReactNode } from "react";

export interface RecentlyImportedItem {
  text: string;
  indentLevel?: number;
}

export interface RecentlyImportedProps {
  items?: RecentlyImportedItem[];
  className?: string;
}

export function RecentlyImported({
  items = [],
  className = "",
}: RecentlyImportedProps): ReactNode {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Recently imported
      </h3>
      <ul className="space-y-2 list-none">
        {items.map((item, index) => {
          const indentClass =
            item.indentLevel === 1
              ? "pl-5"
              : item.indentLevel === 2
                ? "pl-10"
                : item.indentLevel === 3
                  ? "pl-16"
                  : "";

          return (
            <li
              key={index}
              className={`inline-block animate-in slide-in-from-top-2 fade-in duration-300 ${indentClass}`}
              style={{
                paddingLeft: item.indentLevel
                  ? `${item.indentLevel * 20}px`
                  : "0px",
                animationDelay: `${index * 500}ms`,
              }}
            >
              <span className="text-sm text-gray-600">{item.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
