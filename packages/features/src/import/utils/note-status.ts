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
    return { operationType: "image", isChild: true };
  } else if (
    lowerText.includes("categoriz") ||
    lowerText.includes("analyzing") ||
    lowerText.includes("beverages") ||
    lowerText.includes("tags")
  ) {
    return { operationType: "categorization", isChild: true };
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
    lowerText.includes("%")
  ) {
    return "processing";
  } else if (
    lowerText.includes("completed") ||
    lowerText.includes("successfully") ||
    lowerText.includes("finished")
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
      return "⏸️";
  }
}

/**
 * Group items by operation type and organize them hierarchically
 */
export function groupStatusItems(items: Item[]): GroupedItem[] {
  return items.reduce((groups: GroupedItem[], item: Item) => {
    const { operationType, isChild } = getOperationType(item.text);

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

    // Add as child if it's a sub-operation, otherwise update the group title
    if (isChild) {
      group.children.push(item);
    } else {
      // Update group title with the actual message
      group.title = item.text;
    }

    return groups;
  }, []);
}
