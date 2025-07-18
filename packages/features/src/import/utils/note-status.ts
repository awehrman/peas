export interface Item {
  text: string;
  indentLevel: number;
  id: string;
  importId: string; // Add importId to support grouping by import
  timestamp?: Date; // Add timestamp for sorting
  metadata?: Record<string, unknown>; // Add metadata for additional info like note title
  context?: string; // Add context for operation type (clean_html, parse_html, etc.)
}

export interface GroupedItem {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "error";
  children: Item[];
  timestamp: Date;
  importId?: string; // Add importId to support import-level grouping
}

// New interface for import-level grouping
export interface ImportGroup {
  importId: string;
  title: string; // Add title to store the note title or import ID
  operations: GroupedItem[];
  overallStatus: "pending" | "processing" | "completed" | "error";
  timestamp: Date;
}

/**
 * Determine the operation type based on the message content
 */
export function getOperationType(text: string): {
  operationType: string;
  isChild: boolean;
} {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("clean")) {
    return { operationType: "cleaning", isChild: false };
  } else if (
    lowerText.includes("added note") ||
    lowerText.includes("note") ||
    lowerText.includes("html parsing")
  ) {
    return { operationType: "note", isChild: false };
  } else if (lowerText.includes("ingredient")) {
    return { operationType: "ingredients", isChild: false };
  } else if (lowerText.includes("instruction")) {
    return { operationType: "instructions", isChild: false };
  } else if (
    lowerText.includes("image") ||
    lowerText.includes("upload") ||
    lowerText.includes("thumbnail")
  ) {
    return { operationType: "image", isChild: false };
  } else if (
    lowerText.includes("categoriz") ||
    lowerText.includes("analyzing") ||
    lowerText.includes("tags")
  ) {
    return { operationType: "categorization", isChild: false };
  } else {
    return { operationType: "other", isChild: false };
  }
}

/**
 * Get a human-readable title for an operation type
 */
export function getGroupTitle(operationType: string): string {
  switch (operationType) {
    case "cleaning":
      return "HTML Cleaning";
    case "note":
      return "Note Processing";
    case "ingredients":
      return "Ingredient Parsing";
    case "instructions":
      return "Instruction Parsing";
    case "image":
      return "Image Processing";
    case "categorization":
      return "Categorization";
    default:
      return "Other Operations";
  }
}

/**
 * Determine the status based on message content
 */
export function getStatusFromText(
  text: string
): "pending" | "processing" | "completed" | "error" {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("started") ||
    lowerText.includes("processing") ||
    lowerText.includes("%") ||
    lowerText.includes("analyzing")
  ) {
    return "processing";
  } else if (
    lowerText.includes("completed") ||
    lowerText.includes("successfully") ||
    lowerText.includes("finished") ||
    lowerText.includes("added note") ||
    lowerText.includes("categorized as") ||
    lowerText.includes("uploaded successfully") ||
    lowerText.includes("instruction parsing completed") ||
    lowerText.includes("ingredient parsing completed")
  ) {
    return "completed";
  } else if (lowerText.includes("error") || lowerText.includes("failed")) {
    return "error";
  } else {
    return "pending";
  }
}

/**
 * Get CSS color class for a status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "processing":
      return "text-blue-600";
    case "completed":
      return "text-green-600";
    case "error":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

/**
 * Get emoji icon for a status
 */
export function getStatusIcon(status: string): string {
  switch (status) {
    case "processing":
      return "⏳";
    case "completed":
      return "✅";
    case "error":
      return "❌";
    default:
      return "🔄";
  }
}

/**
 * Group items by import ID and organize them hierarchically by indentation level
 */
export function groupStatusItems(items: Item[]): GroupedItem[] {
  // Group items by importId first
  const importGroups = items.reduce(
    (groups: Map<string, Item[]>, item: Item) => {
      if (!groups.has(item.importId)) {
        groups.set(item.importId, []);
      }
      groups.get(item.importId)!.push(item);
      return groups;
    },
    new Map<string, Item[]>()
  );

  // Convert each import group to a GroupedItem
  return Array.from(importGroups.entries()).map(([importId, importItems]) => {
    // Group items by context (clean_html, parse_html, import_complete) and status (start vs completion)
    const operationGroups = importItems.reduce(
      (groups: Map<string, Item[]>, item: Item) => {
        const isStart = item.text.toLowerCase().includes("started");
        const context = item.context || "unknown";
        const status = isStart ? "start" : "completion";
        const key = `${context}-${status}`;

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(item);
        return groups;
      },
      new Map<string, Item[]>()
    );

    // For each operation group, keep only the latest message
    const latestMessages: Item[] = [];
    for (const [, items] of operationGroups) {
      // Sort by timestamp (newest first) and take the first one
      const sortedItems = items.sort((a, b) => {
        const timeA = new Date(a.timestamp || new Date()).getTime();
        const timeB = new Date(b.timestamp || new Date()).getTime();
        return timeB - timeA;
      });
      if (sortedItems.length > 0 && sortedItems[0]) {
        latestMessages.push(sortedItems[0]);
      }
    }

    // Sort by context (clean_html first, then parse_html, then import_complete)
    const sortedMessages = latestMessages.sort((a, b) => {
      const contextOrder: Record<string, number> = {
        clean_html: 1,
        parse_html: 2,
        import_complete: 3,
      };
      const aOrder = contextOrder[a.context || "unknown"] || 999;
      const bOrder = contextOrder[b.context || "unknown"] || 999;
      return aOrder - bOrder;
    });

    // Use note title from metadata if available, otherwise use import ID
    const noteTitleEvent = sortedMessages.find(
      (item) =>
        item.text.toLowerCase().includes("note:") && item.metadata?.noteTitle
    );
    const title =
      (noteTitleEvent?.metadata?.noteTitle as string) ||
      `Import ${importId.slice(0, 8)}`;

    // Determine overall status
    const status = determineOverallStatus(sortedMessages);

    // Create a flat list of all messages (both start and completion) at the same level
    // Each operation (cleaning, parsing) should show its current status
    const operationMessages: Item[] = [];

    // Group by context and get the latest status for each
    const operationStatuses = new Map<string, Item>();

    for (const item of sortedMessages) {
      const context = item.context || "unknown";

      // Skip import_complete context as it's used for the title
      if (context === "import_complete") continue;

      // Keep the latest message for each context
      const existing = operationStatuses.get(context);
      if (
        !existing ||
        new Date(item.timestamp || new Date()) >
          new Date(existing.timestamp || new Date())
      ) {
        operationStatuses.set(context, item);
      }
    }

    // Add operation messages at level 1 (same level as import title)
    for (const [, item] of operationStatuses) {
      operationMessages.push({
        ...item,
        indentLevel: 1, // Same level as import title
      });
    }

    return {
      id: `import-${importId}`,
      title,
      status,
      children: operationMessages,
      timestamp: new Date(
        Math.min(
          ...sortedMessages.map((item) =>
            new Date(item.timestamp || new Date()).getTime()
          )
        )
      ),
      importId,
    };
  });
}

/**
 * Group items by import ID - simplified approach that uses the new grouping logic
 */
export function groupStatusItemsByImport(items: Item[]): ImportGroup[] {
  // Use the new grouping logic that groups by import ID
  const groupedItems = groupStatusItems(items);

  // Convert GroupedItem[] to ImportGroup[]
  return groupedItems.map((group) => ({
    importId: group.importId!,
    title: group.title, // Pass through the title (note title or import ID)
    operations: [group], // Each import is now a single operation group
    overallStatus: group.status,
    timestamp: group.timestamp,
  }));
}

/**
 * Determine the overall status of an import based on its items
 */
function determineOverallStatus(
  items: Item[]
): "pending" | "processing" | "completed" | "error" {
  if (items.length === 0) return "pending";

  // Get status from text content
  const statuses = items.map((item) => getStatusFromText(item.text));

  // If any item has an error, the overall status is error
  if (statuses.some((status) => status === "error")) {
    return "error";
  }

  // If all items are completed, the overall status is completed
  if (statuses.every((status) => status === "completed")) {
    return "completed";
  }

  // If any item is processing, the overall status is processing
  if (statuses.some((status) => status === "processing")) {
    return "processing";
  }

  // Otherwise, it's pending
  return "pending";
}
