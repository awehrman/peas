import { useMemo } from "react";

export function getDisplayTitle(
  item: {
    noteTitle?: string;
    htmlFileName: string;
  },
  fileTitles: Map<string, string>
): string {
  const result = (
    item.noteTitle ||
    fileTitles.get(item.htmlFileName) ||
    item.htmlFileName.replace(/\.(html|htm)$/, "") ||
    "Note"
  );

  console.log("📊 [GET_DISPLAY_TITLE] Computing title:", {
    noteTitle: item.noteTitle,
    htmlFileName: item.htmlFileName,
    fileTitlesSize: fileTitles.size,
    fileTitlesKeys: Array.from(fileTitles.keys()),
    hasFileTitle: fileTitles.has(item.htmlFileName),
    fileTitle: fileTitles.get(item.htmlFileName),
    cleanedFileName: item.htmlFileName.replace(/\.(html|htm)$/, ""),
    result,
  });

  return result;
}

export function useDisplayTitle(
  item: {
    noteTitle?: string;
    htmlFileName: string;
  },
  fileTitles: Map<string, string>
): string {
  // Convert Map to string for proper dependency tracking
  const fileTitlesString = useMemo(() => {
    return JSON.stringify(Array.from(fileTitles.entries()));
  }, [fileTitles]);

  const result = useMemo(
    () => getDisplayTitle(item, fileTitles),
    [item.noteTitle, item.htmlFileName, fileTitlesString]
  );

  console.log("📊 [USE_DISPLAY_TITLE] Computing title:", {
    noteTitle: item.noteTitle,
    htmlFileName: item.htmlFileName,
    fileTitlesSize: fileTitles.size,
    result,
    hasFileTitle: fileTitles.has(item.htmlFileName),
    fileTitle: fileTitles.get(item.htmlFileName),
  });

  return result;
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
