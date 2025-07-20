import { describe, it, expect } from "vitest";
import { formatLogMessage } from "../../utils";

describe("formatLogMessage", () => {
  it("should format message with string placeholders", () => {
    const template = "Processing {action} for {user}";
    const placeholders = {
      action: "import",
      user: "john_doe",
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Processing import for john_doe");
  });

  it("should format message with number placeholders", () => {
    const template = "Processed {count} items in {time}ms";
    const placeholders = {
      count: 42,
      time: 1500,
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Processed 42 items in 1500ms");
  });

  it("should format message with mixed string and number placeholders", () => {
    const template = "User {user} completed {count} tasks in {time}ms";
    const placeholders = {
      user: "alice",
      count: 10,
      time: 500,
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("User alice completed 10 tasks in 500ms");
  });

  it("should handle missing placeholders by keeping original text", () => {
    const template = "Processing {action} for {user}";
    const placeholders = {
      action: "import",
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Processing import for {user}");
  });

  it("should handle empty placeholders object", () => {
    const template = "Processing {action} for {user}";
    const placeholders = {};

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Processing {action} for {user}");
  });

  it("should handle template with no placeholders", () => {
    const template = "Simple message without placeholders";
    const placeholders = {
      action: "import",
      user: "john",
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Simple message without placeholders");
  });

  it("should handle empty template", () => {
    const template = "";
    const placeholders = {
      action: "import",
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("");
  });

  it("should handle template with only placeholders", () => {
    const template = "{action}{user}";
    const placeholders = {
      action: "import",
      user: "john",
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("importjohn");
  });

  it("should handle placeholders with special characters", () => {
    const template = "Processing {action} with {config}";
    const placeholders = {
      action: "import",
      config: "special-chars_123",
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe("Processing import with special-chars_123");
  });

  it("should handle multiple occurrences of the same placeholder", () => {
    const template =
      "User {user} started {action} and {user} will complete {action}";
    const placeholders = {
      user: "john",
      action: "import",
    };

    const result = formatLogMessage(template, placeholders);

    expect(result).toBe(
      "User john started import and john will complete import"
    );
  });
});
