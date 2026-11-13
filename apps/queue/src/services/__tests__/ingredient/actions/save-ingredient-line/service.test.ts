import * as database from "@peas/database";
import { processIngredientLine } from "@peas/parser/v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IngredientJobData } from "../../../../../workers/ingredient/dependencies";
import { fixtureContext } from "../../v2-fixture";
import { saveIngredientLine } from "../../../../ingredient/actions/save-ingredient-line/service";
import * as completion from "../../../../note/actions/track-completion/service";

vi.mock("@peas/database", () => ({
  saveImportedLine: vi.fn(async () => ({
    lineId: "line-1",
    lines: 1,
    mentionsWritten: 1,
    protectedMentions: 0,
    discoveriesTouched: 0,
    mentionsChanged: 1,
  })),
}));

vi.mock("../../../../ingredient/lexicon-cache", () => ({
  getResolverContext: vi.fn(async () => fixtureContext()),
}));

vi.mock("../../../../note/actions/track-completion/service", () => ({
  markIngredientLineCompleted: vi.fn(),
  getIngredientCompletionStatus: vi.fn(() => ({ completedIngredients: 1, totalIngredients: 3, progress: "1/3", isComplete: false })),
}));

const addToQueue = vi.fn();
vi.mock("../../../../../queues/create-queue", () => ({
  createQueue: vi.fn(() => ({ add: addToQueue })),
}));


const logger = { log: vi.fn() };

function parsedJob(reference: string, overrides: Partial<IngredientJobData> = {}): IngredientJobData {
  return {
    noteId: "note-1",
    importId: "import-1",
    jobId: "job-1",
    ingredientReference: reference,
    blockIndex: 1,
    lineIndex: 2,
    parseStatus: "COMPLETED_SUCCESSFULLY",
    isActive: true,
    metadata: { v2Result: processIngredientLine(reference, fixtureContext()), parserVersion: "v2:test" },
    ...overrides,
  };
}

describe("saveIngredientLine (v2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the line, its mentions, and its discoveries in one call, keyed by note, block, and line", async () => {
    const data = parsedJob("2 tbsp butter");
    await saveIngredientLine(data, logger);

    expect(database.saveImportedLine).toHaveBeenCalledWith(
      expect.objectContaining({
        noteId: "note-1",
        blockIndex: 1,
        lineIndex: 2,
        reference: "2 tbsp butter",
        parseStatus: "COMPLETED_SUCCESSFULLY",
        parserVersion: "v2:test",
        result: expect.objectContaining({ mentions: [expect.objectContaining({ status: "AUTO_RESOLVED" })] }),
      }),
      expect.objectContaining({ revision: 7 })
    );
    expect(completion.markIngredientLineCompleted).toHaveBeenCalledWith("note-1", 1, 2, logger);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("[V2_SAVE] line=line-1"));
  });

  it("never touches legacy tables or queues pattern tracking", async () => {
    await saveIngredientLine(parsedJob("1 cup flour"), logger);
    expect(Object.keys(database)).toEqual(["saveImportedLine"]);
    expect(addToQueue).not.toHaveBeenCalled();
  });

  it("broadcasts progress and queues the completion check when the note is done", async () => {
    vi.mocked(completion.getIngredientCompletionStatus).mockReturnValueOnce({ completedIngredients: 3, totalIngredients: 3, progress: "3/3", isComplete: true });
    const broadcaster = { addStatusEventAndBroadcast: vi.fn(async () => ({})) };

    await saveIngredientLine(parsedJob("1 cup flour"), logger, broadcaster);

    expect(broadcaster.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ status: "COMPLETED", currentCount: 3, totalCount: 3, metadata: expect.objectContaining({ savedIngredientId: "line-1" }) })
    );
    expect(addToQueue).toHaveBeenCalledWith("check_ingredient_completion", expect.objectContaining({ noteId: "note-1" }), expect.any(Object));
  });

  it("defaults the block and parser version, and rejects jobs without a valid v2 result", async () => {
    const withoutBlock = { ...parsedJob("1 cup flour"), blockIndex: undefined };
    await saveIngredientLine({ ...withoutBlock, metadata: { v2Result: withoutBlock.metadata?.v2Result } }, logger);
    expect(database.saveImportedLine).toHaveBeenCalledWith(expect.objectContaining({ blockIndex: 0, parserVersion: expect.stringMatching(/^v2:/) }), expect.anything());

    await expect(saveIngredientLine(parsedJob("1 cup flour", { metadata: {} }), logger)).rejects.toThrow("No valid v2 parse result");
    await expect(saveIngredientLine(parsedJob("1 cup flour", { noteId: "" }), logger)).rejects.toThrow("No note ID");
  });

  it("surfaces database errors", async () => {
    vi.mocked(database.saveImportedLine).mockRejectedValueOnce(new Error("db down"));
    await expect(saveIngredientLine(parsedJob("1 cup flour"), logger)).rejects.toThrow("db down");
  });
});
