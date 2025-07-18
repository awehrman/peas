"use client";

import { ReactNode } from "react";
import { getStatusColor, getStatusIcon } from "../../utils";
import { ActivityOperation } from "./activity-operation";

interface ActivityGroupProps {
  importId: string;
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
  importId,
  overallStatus,
  operations,
}: ActivityGroupProps): ReactNode {
  return (
    <div className="border-l-2 border-gray-200 pl-4">
      {/* Import Group Header */}
      <div
        className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(overallStatus)}`}
      >
        <span>{getStatusIcon(overallStatus)}</span>
        <span>Importing file {importId.slice(0, 8)}...</span>
      </div>

      {/* Operations within this import */}
      {operations.length > 0 && (
        <div className="mt-2 space-y-2 pl-2.5">
          {operations.map((operation) => (
            <ActivityOperation
              key={operation.id}
              id={operation.id}
              title={operation.title}
              status={operation.status}
              children={operation.children}
            />
          ))}
        </div>
      )}
    </div>
  );
}
