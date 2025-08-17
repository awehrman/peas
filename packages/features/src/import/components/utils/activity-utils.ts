// Helper function to determine indentation level for group titles
export function getGroupIndentLevel(title: string): number {
  const titleLower = title.toLowerCase();

  // Main operations (no indentation)
  if (
    titleLower.includes("added note") ||
    titleLower.includes("note processing") ||
    titleLower.includes("cleaning")
  ) {
    return 0;
  }

  // Sub-operations (indent level 1)
  if (
    titleLower.includes("image") ||
    titleLower.includes("categorization") ||
    titleLower.includes("categorized as")
  ) {
    return 1;
  }

  if (titleLower.includes("ingredient") || titleLower.includes("instruction")) {
    return 2;
  }

  return 0;
}

// Helper function to get status indicators
export function getStatusIndicator(status: string): string {
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

// Interface for events that might have cleaning messages
interface EventWithMessage {
  errorMessage?: string;
  message?: string;
  context?: string;
  status?: string;
}

// Helper function to filter out cleaning messages
export function filterCleaningMessages(event: EventWithMessage): boolean {
  const message =
    event.errorMessage ||
    event.message ||
    event.context ||
    `Status ${event.status}`;
  return !message.toLowerCase().includes("cleaning html file");
}
