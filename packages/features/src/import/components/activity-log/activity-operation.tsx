"use client";

import { ReactNode } from "react";
import { getStatusColor, getStatusIcon } from "../../utils";
import { getGroupIndentLevel } from "../utils/activity-utils";
import { ActivityItem } from "./activity-item";

interface ActivityOperationProps {
  id: string;
  title: string;
  status: string;
  children: Array<{
    id: string;
    text: string;
    indentLevel: number;
  }>;
}

export function ActivityOperation({
  id,
  title,
  status,
  children,
}: ActivityOperationProps): ReactNode {
  return (
    <div key={id} className="ml-4 border-l border-gray-100 pl-3">
      <div
        className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(status)}`}
        style={{
          paddingLeft: getGroupIndentLevel(title) * 16 + 10,
        }}
      >
        <span>{getStatusIcon(status)}</span>
        <span>{title}</span>
      </div>

      {children.length > 0 && (
        <div className="mt-1 space-y-1">
          {children.map((child) => (
            <ActivityItem
              key={child.id}
              id={child.id}
              text={child.text}
              indentLevel={child.indentLevel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
