"use client";

import { ReactNode } from "react";

interface ActivityItemProps {
  id: string;
  text: string;
  indentLevel: number;
}

export function ActivityItem({
  id: _id,
  text,
  indentLevel,
}: ActivityItemProps): ReactNode {
  return (
    <div
      className="text-sm text-gray-600"
      style={{
        paddingLeft: (indentLevel + 1) * 16 + 10,
      }}
    >
      {text}
    </div>
  );
}
