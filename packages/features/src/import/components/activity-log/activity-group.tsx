"use client";

import { ReactNode } from "react";
import { getStatusColor, getStatusIcon, getStatusFromText } from "../../utils";

interface ActivityGroupProps {
  title: string; // Add title prop
  overallStatus: string;
  operations: Array<{
    id: string;
    title: string;
    status: string;
    children: Array<{
      id: string;
      text: string;
      indentLevel: number;
    }>;
  }>;
}

export function ActivityGroup({
  title,
  overallStatus,
  operations,
}: ActivityGroupProps): ReactNode {
  return (
    <div className="border-l-2 border-gray-200 pl-4 mb-2 max-h-[200px] overflow-y-auto">
      {/* Import Group Header */}
      <div
        className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(overallStatus)} mb-1 flex-shrink-0`}
      >
        <span>{getStatusIcon(overallStatus)}</span>
        <span>{title}</span>
      </div>

      {/* Operations within this import - display at same level as import title */}
      {operations.length > 0 && (
        <div className="space-y-0.5">
          {operations.map((operation) => (
            <div key={operation.id}>
              {/* Display operation children directly (these are the main operations like cleaning/parsing) */}
              {operation.children.map((child, index) => {
                // Get the status from the child's text content
                const childStatus = getStatusFromText(child.text);
                return (
                  <div
                    key={`${operation.id}_${child.id}_${index}`}
                    className={`flex items-center gap-2 text-sm ${getStatusColor(childStatus)} py-0.5`}
                    style={{
                      paddingLeft: child.indentLevel * 24 + 16,
                    }}
                  >
                    <span>{getStatusIcon(childStatus)}</span>
                    <span>{child.text}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
