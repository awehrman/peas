import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseOperations } from "../../database-operations";

describe("DatabaseOperations - createOrUpdateParsedIngredientLine", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock Prisma client for testing
  let mockPrisma: any;
  let dbOps: DatabaseOperations;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      parsedIngredientLine: {
        update: vi.fn(),
        create: vi.fn(),
      },
    };

    dbOps = new DatabaseOperations(mockPrisma);
  });

  it("should update existing ingredient line successfully", async () => {
    const lineId = "test-line-id";
    const data = {
      blockIndex: 0,
      lineIndex: 0,
      reference: "Test ingredient",
      noteId: "test-note-id",
      parseStatus: "CORRECT" as const,
      parsedAt: new Date("2023-01-01"),
    };

    mockPrisma.parsedIngredientLine.update.mockResolvedValue({ id: lineId });

    await dbOps.createOrUpdateParsedIngredientLine(lineId, data);

    expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalledWith({
      where: { id: lineId },
      data: {
        parseStatus: "CORRECT",
        parsedAt: new Date("2023-01-01"),
      },
    });
    expect(mockPrisma.parsedIngredientLine.create).not.toHaveBeenCalled();
  });

  it("should create new ingredient line when update fails with not found error", async () => {
    const lineId = "test-line-id";
    const data = {
      blockIndex: 0,
      lineIndex: 0,
      reference: "Test ingredient",
      noteId: "test-note-id",
      parseStatus: "INCORRECT" as const,
    };

    const notFoundError = new Error("No record was found");
    mockPrisma.parsedIngredientLine.update.mockRejectedValue(notFoundError);

    await dbOps.createOrUpdateParsedIngredientLine(lineId, data);

    expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalledWith({
      where: { id: lineId },
      data: {
        parseStatus: "INCORRECT",
        parsedAt: expect.any(Date),
      },
    });
    expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
      data: {
        id: lineId,
        blockIndex: 0,
        lineIndex: 0,
        reference: "Test ingredient",
        noteId: "test-note-id",
        parseStatus: "INCORRECT",
        parsedAt: expect.any(Date),
      },
    });
  });

  it("should create new ingredient line with null noteId when not provided", async () => {
    const lineId = "test-line-id";
    const data = {
      blockIndex: 0,
      lineIndex: 0,
      reference: "Test ingredient",
      parseStatus: "ERROR" as const,
    };

    const notFoundError = new Error("No record was found");
    mockPrisma.parsedIngredientLine.update.mockRejectedValue(notFoundError);

    await dbOps.createOrUpdateParsedIngredientLine(lineId, data);

    expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
      data: {
        id: lineId,
        blockIndex: 0,
        lineIndex: 0,
        reference: "Test ingredient",
        noteId: null,
        parseStatus: "ERROR",
        parsedAt: expect.any(Date),
      },
    });
  });

  it("should use current date when parsedAt is not provided", async () => {
    const lineId = "test-line-id";
    const data = {
      blockIndex: 0,
      lineIndex: 0,
      reference: "Test ingredient",
      parseStatus: "CORRECT" as const,
    };

    const notFoundError = new Error("No record was found");
    mockPrisma.parsedIngredientLine.update.mockRejectedValue(notFoundError);

    await dbOps.createOrUpdateParsedIngredientLine(lineId, data);

    expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
      data: {
        id: lineId,
        blockIndex: 0,
        lineIndex: 0,
        reference: "Test ingredient",
        noteId: null,
        parseStatus: "CORRECT",
        parsedAt: expect.any(Date),
      },
    });
  });

  it("should throw error for missing lineId", async () => {
    const data = {
      blockIndex: 0,
      lineIndex: 0,
      reference: "Test ingredient",
      parseStatus: "CORRECT" as const,
    };

    await expect(
      dbOps.createOrUpdateParsedIngredientLine("", data)
    ).rejects.toThrow(
      "lineId is required for createOrUpdateParsedIngredientLine"
    );
  });

  it("should throw error for undefined lineId", async () => {
    const data = {
      blockIndex: 0,
      lineIndex: 0,
      reference: "Test ingredient",
      parseStatus: "CORRECT" as const,
    };

    await expect(
      dbOps.createOrUpdateParsedIngredientLine(
        undefined as unknown as string,
        data
      )
    ).rejects.toThrow(
      "lineId is required for createOrUpdateParsedIngredientLine"
    );
  });

  it("should re-throw non-not-found errors", async () => {
    const lineId = "test-line-id";
    const data = {
      blockIndex: 0,
      lineIndex: 0,
      reference: "Test ingredient",
      parseStatus: "CORRECT" as const,
    };

    const otherError = new Error("Database connection failed");
    mockPrisma.parsedIngredientLine.update.mockRejectedValue(otherError);

    await expect(
      dbOps.createOrUpdateParsedIngredientLine(lineId, data)
    ).rejects.toThrow("Database connection failed");

    expect(mockPrisma.parsedIngredientLine.create).not.toHaveBeenCalled();
  });

  it("should handle different parse statuses", async () => {
    const lineId = "test-line-id";
    const statuses = ["CORRECT", "INCORRECT", "ERROR"] as const;

    for (const status of statuses) {
      vi.clearAllMocks();
      const data = {
        blockIndex: 0,
        lineIndex: 0,
        reference: "Test ingredient",
        parseStatus: status,
      };

      const notFoundError = new Error("No record was found");
      mockPrisma.parsedIngredientLine.update.mockRejectedValue(notFoundError);

      await dbOps.createOrUpdateParsedIngredientLine(lineId, data);

      expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
        data: {
          id: lineId,
          blockIndex: 0,
          lineIndex: 0,
          reference: "Test ingredient",
          noteId: null,
          parseStatus: status,
          parsedAt: expect.any(Date),
        },
      });
    }
  });

  it("should handle special characters in reference", async () => {
    const lineId = "test-line-id";
    const data = {
      blockIndex: 0,
      lineIndex: 0,
      reference: "Test ingredient with & special chars: test!",
      parseStatus: "CORRECT" as const,
    };

    const notFoundError = new Error("No record was found");
    mockPrisma.parsedIngredientLine.update.mockRejectedValue(notFoundError);

    await dbOps.createOrUpdateParsedIngredientLine(lineId, data);

    expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
      data: {
        id: lineId,
        blockIndex: 0,
        lineIndex: 0,
        reference: "Test ingredient with & special chars: test!",
        noteId: null,
        parseStatus: "CORRECT",
        parsedAt: expect.any(Date),
      },
    });
  });

  it("should handle very long reference", async () => {
    const lineId = "test-line-id";
    const longReference = "a".repeat(1000);
    const data = {
      blockIndex: 0,
      lineIndex: 0,
      reference: longReference,
      parseStatus: "CORRECT" as const,
    };

    const notFoundError = new Error("No record was found");
    mockPrisma.parsedIngredientLine.update.mockRejectedValue(notFoundError);

    await dbOps.createOrUpdateParsedIngredientLine(lineId, data);

    expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
      data: {
        id: lineId,
        blockIndex: 0,
        lineIndex: 0,
        reference: longReference,
        noteId: null,
        parseStatus: "CORRECT",
        parsedAt: expect.any(Date),
      },
    });
  });
});
