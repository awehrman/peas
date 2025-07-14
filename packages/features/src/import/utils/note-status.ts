export interface Item {
  text: string;
  indentLevel: number;
  id: string;
}

export interface GroupedItem {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "error";
  children: Item[];
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

  if (lowerText.includes("added note") || lowerText.includes("note")) {
    return { operationType: "note", isChild: false };
  } else if (
    lowerText.includes("ingredient") ||
    lowerText.includes("parsed ingredient")
  ) {
    return { operationType: "ingredients", isChild: false };
  } else if (
    lowerText.includes("instruction") ||
    lowerText.includes("parsed instruction")
  ) {
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
    lowerText.includes("beverages") ||
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

    // Check if this is a progress update or detailed message
    const lowerText = item.text.toLowerCase();
    const isProgressUpdate =
      lowerText.includes("%") ||
      lowerText.includes("step") ||
      lowerText.includes("extracting") ||
      lowerText.includes("compressing") ||
      lowerText.includes("generating") ||
      lowerText.includes("processed") ||
      lowerText.includes("finished") ||
      lowerText.includes("uploaded successfully");

    if (isProgressUpdate) {
      // Add progress updates and detailed messages as children
      group.children.push(item);
    } else {
      // Only update group title for main status messages
      if (
        lowerText.includes("added note") ||
        lowerText.includes("categorized as") ||
        lowerText.includes("finished") ||
        lowerText.includes("uploaded successfully")
      ) {
        group.title = item.text;
      } else {
        // Add other messages as children
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
