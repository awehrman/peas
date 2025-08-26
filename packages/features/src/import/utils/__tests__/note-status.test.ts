import { describe, expect, it } from "vitest";

import { type Item, groupStatusItems } from "../note-status";

describe("groupStatusItems", () => {
  it("should show completion message when import_complete event has note title", () => {
    const items: Item[] = [
      {
        id: "1",
        text: "Parsing HTML",
        indentLevel: 1,
        importId: "import-123",
        timestamp: new Date("2023-01-01T10:00:00Z"),
        context: "parse_html_complete",
        metadata: {
          noteTitle: "Early Recipe Title",
        },
      },
      {
        id: "2",
        text: "Import completed",
        indentLevel: 0,
        importId: "import-123",
        timestamp: new Date("2023-01-01T10:05:00Z"),
        context: "import_complete",
        metadata: {
          noteTitle: "Final Recipe Title",
        },
      },
    ];

    const result = groupStatusItems(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Imported Final Recipe Title");
  });

  it("should show note title when available but not completed", () => {
    const items: Item[] = [
      {
        id: "1",
        text: "Parsing HTML",
        indentLevel: 1,
        importId: "import-123",
        timestamp: new Date("2023-01-01T10:00:00Z"),
        context: "parse_html_complete",
        metadata: {
          noteTitle: "Recipe Title from Parsing",
        },
      },
      {
        id: "2",
        text: "Processing ingredients",
        indentLevel: 0,
        importId: "import-123",
        timestamp: new Date("2023-01-01T10:05:00Z"),
        context: "ingredient_processing",
        // No noteTitle in metadata
      },
    ];

    const result = groupStatusItems(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Recipe Title from Parsing");
  });

  it("should show import ID when no note title is available", () => {
    const items: Item[] = [
      {
        id: "1",
        text: "HTML cleaning started",
        indentLevel: 1,
        importId: "import-123",
        timestamp: new Date("2023-01-01T10:00:00Z"),
        context: "clean_html_start",
        // No metadata
      },
    ];

    const result = groupStatusItems(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Import import-123");
  });

  it("should properly group clean_html_start and clean_html_end completion events", () => {
    const items: Item[] = [
      {
        id: "1",
        text: "Cleaning .html files...",
        indentLevel: 1,
        importId: "import-123",
        timestamp: new Date("2023-01-01T10:00:00Z"),
        context: "clean_html_start",
        metadata: {},
      },
      {
        id: "2",
        text: "Cleaned .html files!",
        indentLevel: 1,
        importId: "import-123",
        timestamp: new Date("2023-01-01T10:00:05Z"),
        context: "clean_html_end",
        metadata: {
          sizeRemoved: 1024,
          originalSize: "5.2 KB",
        },
      },
    ];

    const result = groupStatusItems(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.children).toHaveLength(2);
    // Should have both start and completion events
    expect(result[0]?.children[0]?.context).toBe("clean_html_start");
    expect(result[0]?.children[1]?.context).toBe("clean_html_end");
  });

  it("should create processing steps that group clean_html_start and clean_html_end contexts correctly", () => {
    const { createProcessingSteps } = require("../status-parser");

    const events = [
      {
        importId: "test-123",
        status: "PROCESSING",
        context: "clean_html_start",
        message: "Cleaning .html files...",
        createdAt: "2023-01-01T10:00:00Z",
        metadata: {},
      },
      {
        importId: "test-123",
        status: "COMPLETED",
        context: "clean_html_end",
        message: "Cleaned .html files!",
        createdAt: "2023-01-01T10:00:05Z",
        metadata: { sizeRemoved: 1024 },
      },
    ];

    const steps = createProcessingSteps(events);

    // Should have one "cleaning" step that combines both events
    expect(steps).toHaveLength(1);
    expect(steps[0]?.id).toBe("cleaning");
    expect(steps[0]?.name).toBe("Cleaning");
    expect(steps[0]?.status).toBe("completed"); // Final status should be completed
    expect(steps[0]?.message).toBe("Cleaned .html files!"); // Final message
    expect(steps[0]?.metadata?.sizeRemoved).toBe(1024); // Metadata preserved
  });
});
