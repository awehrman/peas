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
