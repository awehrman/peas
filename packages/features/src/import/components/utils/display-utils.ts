import { useMemo } from "react";

export function getDisplayTitle(
  item: {
    noteTitle?: string;
    htmlFileName: string;
  },
  fileTitles: Map<string, string>
): string {
  return (
    item.noteTitle ||
    fileTitles.get(item.htmlFileName) ||
    item.htmlFileName.replace(/\.(html|htm)$/, "") ||
    "Note"
  );
}

export function useDisplayTitle(
  item: {
    noteTitle?: string;
    htmlFileName: string;
  },
  fileTitles: Map<string, string>
): string {
  return useMemo(() => getDisplayTitle(item, fileTitles), [
    item.noteTitle,
    item.htmlFileName,
    fileTitles,
  ]);
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString();
}

export function getStatusIcon(status: "importing" | "completed" | "failed") {
  switch (status) {
    case "completed":
      return "✅";
    case "failed":
      return "❌";
    case "importing":
      return "spinner";
    default:
      return "spinner";
  }
}

export function getStatusText(
  status: "importing" | "completed" | "failed",
  displayTitle: string
): string {
  switch (status) {
    case "completed":
      return `Added ${displayTitle}`;
    case "failed":
      return `Failed to import ${displayTitle}`;
    case "importing":
      return `Importing ${displayTitle}...`;
    default:
      return `Importing ${displayTitle}...`;
  }
}
