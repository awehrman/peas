"use server";

import { Item } from "../utils";

interface StatusEvent {
  id: string;
  status: string;
  message?: string;
  context?: string;
  errorMessage?: string;
  note: {
    title?: string;
  };
}

interface ApiResponse {
  items: StatusEvent[];
  lastEventId?: string;
}

/**
 * Fetch note status events from the API
 */
export async function getNoteStatusEvents(
  since?: string,
  sinceTime?: number
): Promise<{
  items: Item[];
  lastEventId?: string;
}> {
  try {
    // In a real implementation, this would call your database directly
    // For now, we'll simulate the API call structure
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    let url = `${baseUrl}/api/import/status`;

    if (since) {
      url += `?since=${since}`;
    } else if (sinceTime) {
      url += `?sinceTime=${sinceTime}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Disable caching to ensure fresh data
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch status events: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();

    console.log("🔍 Client: API response data:", {
      itemCount: data.items.length,
      lastEventId: data.lastEventId,
      firstItem: data.items[0]
        ? {
            id: data.items[0].id,
            status: data.items[0].status,
            context: data.items[0].context,
            message: data.items[0].message,
            errorMessage: data.items[0].errorMessage,
            note: data.items[0].note,
          }
        : null,
    });

    // Transform the API response to the format expected by the component
    const items: Item[] = data.items.map((event) => {
      // Default indent level based on context
      let indentLevel = 0;
      if (event.context?.includes("ingredient")) indentLevel = 1;
      if (event.context?.includes("instruction")) indentLevel = 1;

      const text =
        event.errorMessage ??
        event.message ??
        event.context ??
        `Status ${event.status} for note "${event.note?.title ?? "Unknown"}"`;

      return {
        text,
        indentLevel,
        id: event.id,
      };
    });

    return {
      items,
      lastEventId: data.lastEventId,
    };
  } catch (error) {
    console.error("Error fetching note status events:", error);

    // Return empty data on error
    return {
      items: [],
      lastEventId: since, // Keep the same since ID to avoid losing progress
    };
  }
}

/**
 * Get initial status events (for first load)
 */
export async function getInitialNoteStatusEvents(): Promise<{
  items: Item[];
  lastEventId?: string;
}> {
  console.log("🔄 Server action: getInitialNoteStatusEvents called");
  const result = await getNoteStatusEvents();
  console.log("✅ Server action: getInitialNoteStatusEvents completed", {
    itemCount: result.items.length,
    lastEventId: result.lastEventId,
  });
  return result;
}

/**
 * Get incremental status events (for polling)
 */
export async function getIncrementalNoteStatusEvents(
  since: string,
  sinceTime?: number
): Promise<{
  items: Item[];
  lastEventId?: string;
}> {
  console.log("🔄 Server action: getIncrementalNoteStatusEvents called", {
    since,
    sinceTime,
  });
  const result = await getNoteStatusEvents(since, sinceTime);
  console.log("✅ Server action: getIncrementalNoteStatusEvents completed", {
    itemCount: result.items.length,
    lastEventId: result.lastEventId,
  });
  return result;
}
