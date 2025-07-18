import { describe, it, expect } from "vitest";
import { groupStatusItems, type Item } from "../note-status";

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
    expect(result[0]?.title).toBe("Import import-1");
  });
});
