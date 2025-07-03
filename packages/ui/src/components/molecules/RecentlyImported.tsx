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
  className = ""
}: RecentlyImportedProps): ReactNode {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Recently imported</h3>
      <ul className="space-y-2 list-none">
        {items.map((item, index) => (
          <li 
            key={index} 
            className={`p-1 ${item.indentLevel === 1 ? 'pl-5' : item.indentLevel === 2 ? 'pl-10' : ''}`}
          >
            <span className="text-sm text-gray-700">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
} 