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
 * Determine the status based on message content
 */
export function getStatusFromText(
  text: string
): "pending" | "processing" | "completed" | "error" {
  const lowerText = text.toLowerCase();

  // Check for instruction count patterns (e.g., "7/7 instructions")
  const instructionCountMatch = text.match(/(\d+)\/(\d+)\s+instructions/);
  if (instructionCountMatch && instructionCountMatch[1] && instructionCountMatch[2]) {
    const processed = parseInt(instructionCountMatch[1], 10);
    const total = parseInt(instructionCountMatch[2], 10);
    if (processed === total && total > 0) {
      return "completed";
    } else if (processed > 0) {
      return "processing";
    }
  }

  // Check for ingredient count patterns (e.g., "11/11 ingredients")
  const ingredientCountMatch = text.match(/(\d+)\/(\d+)\s+ingredients/);
  if (ingredientCountMatch && ingredientCountMatch[1] && ingredientCountMatch[2]) {
    const processed = parseInt(ingredientCountMatch[1], 10);
    const total = parseInt(ingredientCountMatch[2], 10);
    if (processed === total && total > 0) {
      return "completed";
    } else if (processed > 0) {
      return "processing";
    }
  }

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
        const context = item.context || "unknown";
        let status = "completion"; // Default to completion

        // Check for start messages based on context patterns
        if (
          context.includes("_start") ||
          context === "parse_html_start" ||
          context === "clean_html_start"
        ) {
          status = "start";
        }

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

    // Filter out start messages if we have completion messages for the same operation
    const filteredMessages: Item[] = [];
    const completionContexts = new Set<string>();

    // First, collect all completion contexts
    for (const item of latestMessages) {
      const context = item.context || "unknown";
      if (!context.includes("_start")) {
        // Remove "_complete" suffix to get base context
        const baseContext = context.replace("_complete", "");
        completionContexts.add(baseContext);
      }
    }

    // Then, only include start messages if we don't have a completion for that operation
    for (const item of latestMessages) {
      const context = item.context || "unknown";
      if (context.includes("_start")) {
        const baseContext = context.replace("_start", "");
        if (!completionContexts.has(baseContext)) {
          filteredMessages.push(item);
        }
      } else {
        filteredMessages.push(item);
      }
    }

    // Sort by context (clean_html first, then parse_html, then import_complete)
    const sortedMessages = filteredMessages.sort((a, b) => {
      const contextOrder: Record<string, number> = {
        clean_html: 1,
        parse_html: 2,
        import_complete: 3,
      };
      const aOrder = contextOrder[a.context || "unknown"] || 999;
      const bOrder = contextOrder[b.context || "unknown"] || 999;
      return aOrder - bOrder;
    });

    // Use note title from metadata if available, prioritizing import_complete events
    // First look for import_complete events with note title
    let noteTitleEvent = sortedMessages.find(
      (item) => item.context === "import_complete" && item.metadata?.noteTitle
    );

    // If no import_complete event with title, look for any event with note title
    if (!noteTitleEvent) {
      noteTitleEvent = sortedMessages.find((item) => item.metadata?.noteTitle);
    }

    // Determine overall status based on the three states
    let status: "pending" | "processing" | "completed" | "error";

    if (
      noteTitleEvent?.context === "import_complete" &&
      noteTitleEvent?.metadata?.noteTitle
    ) {
      // State 3: Completion
      status = "completed";
    } else if (noteTitleEvent?.metadata?.noteTitle) {
      // State 2: Note title received but not completed yet
      status = "processing";
    } else {
      // State 1: Initial state - check if there are any processing items
      const hasProcessingItems = sortedMessages.some((item) => {
        const itemStatus = getStatusFromText(item.text);
        return itemStatus === "processing" || itemStatus === "completed";
      });
      status = hasProcessingItems ? "processing" : "pending";
    }

    // Determine the title based on the three states:
    // 1. Initial: Show import ID (no emoji, status icon will show 🔄)
    // 2. After note title received: Show note title (no emoji, status icon will show ⏳)
    // 3. After completion: Show completion message with note title (no emoji, status icon will show ✅)
    let title: string;

    if (
      noteTitleEvent?.context === "import_complete" &&
      noteTitleEvent?.metadata?.noteTitle
    ) {
      // State 3: Completion - show completion message with note title (no emoji, status icon will show ✅)
      const noteTitle = noteTitleEvent.metadata.noteTitle as string;
      title = `Imported ${noteTitle}`;
    } else if (noteTitleEvent?.metadata?.noteTitle) {
      // State 2: Note title received but not completed yet (no emoji, status icon will show ⏳)
      const noteTitle = noteTitleEvent.metadata.noteTitle as string;
      title = noteTitle;
    } else {
      // State 1: Initial state - show import ID (no emoji, status icon will show 🔄)
      title = `Import ${importId.slice(0, 8)}`;
    }

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

    // Add operation messages with their original indentLevel
    for (const [, item] of operationStatuses) {
      operationMessages.push({
        ...item,
        indentLevel: item.indentLevel ?? 1, // Use original indentLevel or default to 1
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
