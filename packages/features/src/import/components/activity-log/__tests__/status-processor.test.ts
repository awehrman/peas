import { describe, expect, it } from "vitest";

import { processStatusEvents } from "../status-processor";
import type { StatusEvent } from "../../../hooks/use-status-websocket";

describe("processStatusEvents", () => {
  describe("multiple note statuses", () => {
    it("should handle multiple notes from the same import", () => {
      const events: StatusEvent[] = [
        {
          importId: "import-123",
          noteId: "note-1",
          status: "PROCESSING",
          message: "Processing note 1",
          context: "note_processing",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          metadata: { noteTitle: "Recipe 1" },
        },
        {
          importId: "import-123",
          noteId: "note-2",
          status: "PROCESSING",
          message: "Processing note 2",
          context: "note_processing",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          metadata: { noteTitle: "Recipe 2" },
        },
        {
          importId: "import-123",
          noteId: "note-1",
          status: "COMPLETED",
          message: "Note 1 completed",
          context: "import_complete",
          createdAt: new Date("2024-01-01T10:02:00Z"),
          metadata: { noteTitle: "Recipe 1" },
        },
        {
          importId: "import-123",
          noteId: "note-2",
          status: "COMPLETED",
          message: "Note 2 completed",
          context: "import_complete",
          createdAt: new Date("2024-01-01T10:03:00Z"),
          metadata: { noteTitle: "Recipe 2" },
        },
      ];

      const result = processStatusEvents(events);

      // Should have 1 status entry (grouped by importId)
      expect(result.size).toBe(1);

      // Check the combined status
      const status = result.get("import-123");
      expect(status).toBeDefined();
      expect(status?.importId).toBe("import-123");
      // Should have the latest noteId (note-2 in this case)
      expect(status?.noteId).toBe("note-2");
      // Should have the latest noteTitle (Recipe 2 in this case)
      expect(status?.noteTitle).toBe("Recipe 2");
      expect(status?.status).toBe("completed");
    });

    it("should handle events without noteId (legacy behavior)", () => {
      const events: StatusEvent[] = [
        {
          importId: "import-123",
          status: "PROCESSING",
          message: "Processing import",
          context: "note_processing",
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          importId: "import-123",
          status: "COMPLETED",
          message: "Import completed",
          context: "import_complete",
          createdAt: new Date("2024-01-01T10:01:00Z"),
        },
      ];

      const result = processStatusEvents(events);

      // Should have 1 status entry (using just importId as key)
      expect(result.size).toBe(1);

      const status = result.get("import-123");
      expect(status).toBeDefined();
      expect(status?.importId).toBe("import-123");
      expect(status?.noteId).toBeUndefined();
      expect(status?.status).toBe("completed");
    });

    it("should handle mixed events with and without noteId", () => {
      const events: StatusEvent[] = [
        {
          importId: "import-123",
          status: "PROCESSING",
          message: "Processing import",
          context: "note_processing",
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          importId: "import-123",
          noteId: "note-1",
          status: "PROCESSING",
          message: "Processing note 1",
          context: "note_processing",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          metadata: { noteTitle: "Recipe 1" },
        },
        {
          importId: "import-123",
          status: "COMPLETED",
          message: "Import completed",
          context: "import_complete",
          createdAt: new Date("2024-01-01T10:02:00Z"),
        },
        {
          importId: "import-123",
          noteId: "note-1",
          status: "COMPLETED",
          message: "Note 1 completed",
          context: "import_complete",
          createdAt: new Date("2024-01-01T10:03:00Z"),
          metadata: { noteTitle: "Recipe 1" },
        },
      ];

      const result = processStatusEvents(events);

      // Should have 1 status entry (grouped by importId)
      expect(result.size).toBe(1);

      // Check the combined status
      const status = result.get("import-123");
      expect(status).toBeDefined();
      expect(status?.importId).toBe("import-123");
      // Should have the latest noteId
      expect(status?.noteId).toBe("note-1");
      expect(status?.noteTitle).toBe("Recipe 1");
      expect(status?.status).toBe("completed");
    });
  });
});
