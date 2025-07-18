export interface Item {
  text: string;
  indentLevel: number;
  id: string;
  importId: string; // Add importId to support grouping by import
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
  } else if (lowerText.includes("added note") || lowerText.includes("note")) {
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
 * Get operation priority for sorting
 */
function getOperationPriority(operationType: string): number {
  switch (operationType) {
    case "note":
      return 0; // Note processing first
    case "ingredients":
      return 1; // Ingredient parsing second
    case "instructions":
      return 2; // Instruction parsing third
    case "categorization":
      return 3; // Categorization fourth
    case "image":
      return 4; // Image processing last
    default:
      return 999; // Other operations at the end
  }
}

/**
 * Group items by operation type and organize them hierarchically
 */
export function groupStatusItems(items: Item[]): GroupedItem[] {
  const groups = items.reduce((groups: GroupedItem[], item: Item) => {
    const { operationType } = getOperationType(item.text);

    // Find or create the group by operation type
    let group = groups.find((g) => g.id === `group-${operationType}`);

    if (!group) {
      // Create a new group with a unique ID based on operation type
      group = {
        id: `group-${operationType}`,
        title: getGroupTitle(operationType),
        status: "pending",
        children: [],
        timestamp: new Date(),
      };
      groups.push(group);
    }

    // Update status based on message content
    const newStatus = getStatusFromText(item.text);
    if (newStatus !== "pending") {
      group.status = newStatus;
    }

    // Use explicit indentLevel to determine if this is a child item
    if (item.indentLevel > 0) {
      // Add as child item (indented)
      group.children.push(item);
    } else {
      // Only update group title for main status messages (indentLevel 0)
      const lowerText = item.text.toLowerCase();
      if (
        lowerText.includes("added note") ||
        lowerText.includes("categorized as") ||
        lowerText.includes("finished") ||
        lowerText.includes("uploaded successfully") ||
        lowerText.includes("completed")
      ) {
        group.title = item.text;
      } else {
        // Add other main-level messages as children
        group.children.push(item);
      }
    }

    return groups;
  }, []);

  // Sort groups by operation priority
  const sortedGroups = groups.sort((a, b) => {
    const aType = a.id.replace("group-", "");
    const bType = b.id.replace("group-", "");
    return getOperationPriority(aType) - getOperationPriority(bType);
  });

  // Update note status based on completion of all sub-operations
  const noteGroup = sortedGroups.find((g) => g.id === "group-note");
  if (noteGroup) {
    const subOperations = sortedGroups.filter((g) => g.id !== "group-note");
    const allSubOperationsCompleted = subOperations.every(
      (g) => g.status === "completed"
    );

    if (allSubOperationsCompleted && subOperations.length > 0) {
      noteGroup.status = "completed";
      // Remove any existing checkmark from title to avoid duplication
      noteGroup.title = noteGroup.title.replace("✅ ", "");
    } else if (subOperations.some((g) => g.status === "processing")) {
      noteGroup.status = "processing";
    }
  }

  return sortedGroups;
}

/**
 * Group items by import ID first, then by operation type within each import
 */
export function groupStatusItemsByImport(items: Item[]): ImportGroup[] {
  // First, group items by importId
  const importGroups = items.reduce(
    (imports: Map<string, Item[]>, item: Item) => {
      if (!imports.has(item.importId)) {
        imports.set(item.importId, []);
      }
      imports.get(item.importId)!.push(item);
      return imports;
    },
    new Map<string, Item[]>()
  );

  // Convert to ImportGroup array
  return Array.from(importGroups.entries())
    .map(([importId, importItems]) => {
      // Group the items within this import by operation type
      const operations = groupStatusItems(importItems);

      // Determine overall status for this import
      const overallStatus = determineOverallStatus(operations);

      // Get the earliest timestamp from all operations
      const timestamp = new Date(
        Math.min(...operations.map((op) => op.timestamp.getTime()))
      );

      return {
        importId,
        operations,
        overallStatus,
        timestamp,
      };
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by newest first
}

/**
 * Determine the overall status of an import based on its operations
 */
function determineOverallStatus(
  operations: GroupedItem[]
): "pending" | "processing" | "completed" | "error" {
  if (operations.length === 0) return "pending";

  // If any operation has an error, the overall status is error
  if (operations.some((op) => op.status === "error")) {
    return "error";
  }

  // If all operations are completed, the overall status is completed
  if (operations.every((op) => op.status === "completed")) {
    return "completed";
  }

  // If any operation is processing, the overall status is processing
  if (operations.some((op) => op.status === "processing")) {
    return "processing";
  }

  // Otherwise, it's pending
  return "pending";
}
