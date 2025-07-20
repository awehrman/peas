import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateUuid } from "../../utils";

// Mock crypto module
vi.mock("crypto", () => ({
  randomUUID: vi.fn(),
}));

describe("generateUuid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a UUID", async () => {
    const mockUuid = "123e4567-e89b-12d3-a456-426614174000";
    const crypto = await import("crypto");
    vi.mocked(crypto.randomUUID).mockReturnValue(mockUuid);

    const result = await generateUuid();

    expect(result).toBe(mockUuid);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("should generate different UUIDs on multiple calls", async () => {
    const mockUuids = [
      "123e4567-e89b-12d3-a456-426614174000",
      "987fcdeb-51a2-43d1-b789-123456789abc",
      "abcdef12-3456-7890-abcd-ef1234567890",
    ] as const;
    const crypto = await import("crypto");
    vi.mocked(crypto.randomUUID)
      .mockReturnValueOnce(mockUuids[0])
      .mockReturnValueOnce(mockUuids[1])
      .mockReturnValueOnce(mockUuids[2]);

    const result1 = await generateUuid();
    const result2 = await generateUuid();
    const result3 = await generateUuid();

    expect(result1).toBe(mockUuids[0]);
    expect(result2).toBe(mockUuids[1]);
    expect(result3).toBe(mockUuids[2]);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(3);
  });

  it("should generate valid UUID format", async () => {
    const mockUuid = "123e4567-e89b-12d3-a456-426614174000";
    const crypto = await import("crypto");
    vi.mocked(crypto.randomUUID).mockReturnValue(mockUuid);

    const result = await generateUuid();

    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("should handle crypto import dynamically", async () => {
    const mockUuid = "123e4567-e89b-12d3-a456-426614174000";
    const crypto = await import("crypto");
    vi.mocked(crypto.randomUUID).mockReturnValue(mockUuid);

    await generateUuid();

    expect(crypto.randomUUID).toBeDefined();
    expect(typeof crypto.randomUUID).toBe("function");
  });

  it("should return a string", async () => {
    const mockUuid = "123e4567-e89b-12d3-a456-426614174000";
    const crypto = await import("crypto");
    vi.mocked(crypto.randomUUID).mockReturnValue(mockUuid);

    const result = await generateUuid();

    expect(typeof result).toBe("string");
  });

  it("should handle empty UUID from crypto", async () => {
    const crypto = await import("crypto");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test edge case
    vi.mocked(crypto.randomUUID).mockReturnValue("" as any);

    const result = await generateUuid();

    expect(result).toBe("");
  });

  it("should handle special characters in UUID", async () => {
    const mockUuid = "00000000-0000-0000-0000-000000000000";
    const crypto = await import("crypto");
    vi.mocked(crypto.randomUUID).mockReturnValue(mockUuid);

    const result = await generateUuid();

    expect(result).toBe(mockUuid);
  });
});
