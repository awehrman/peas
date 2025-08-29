"use client";

import { ReactNode } from "react";

interface ActivityLogHeaderProps {
  title?: string;
  className?: string;
}

export function ActivityLogHeader({
  title = "Import activity",
  className = "",
}: ActivityLogHeaderProps): ReactNode {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${className}`}>
      {title}
    </h3>
  );
}
