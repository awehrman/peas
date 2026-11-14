import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@peas/database", () => ({
  findDuplicateMatches: vi.fn(),
  getNoteWithIngredients: vi.fn(),
  recordDuplicateCandidates: vi.fn(),
  updateNoteTitleSimHash: vi.fn(),
}));

import {
  type DuplicateMatch,
  findDuplicateMatches,
  getNoteWithIngredients,
  recordDuplicateCandidates,
  updateNoteTitleSimHash,
} from "@peas/database";

import { checkForDuplicates } from "../../../../note/actions/check-duplicates/service";
import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import { generateTitleSimHash } from "../../../../../utils/simhash";

const data = { noteId: "note-new", importId: "import-1", content: "" } as NotePipelineData;

function noteRow(title: string | null, titleSimHash: string | null = null) {
  return { id: "note-new", title, titleSimHash, parsedIngredientLines: [], parsedInstructionLines: [] } as unknown as Awaited<
    ReturnType<typeof getNoteWithIngredients>
  >;
}

const exactMatch: DuplicateMatch = {
  existingNoteId: "note-old",
  kind: "EXACT",
  confidence: 1,
  signals: {
    rawHtmlHash: true,
    contentHash: true,
    sharedSourceIds: [],
    titleSimilarity: 1,
    ingredientSimilarity: 1,
    reasons: ["Same uploaded file"],
  },
};

describe("checkForDuplicates", () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = { log: vi.fn() };
  });

  it("stores the padded title SimHash before matching", async () => {
    vi.mocked(getNoteWithIngredients).mockResolvedValue(noteRow("Weeknight Chili"));
    vi.mocked(findDuplicateMatches).mockResolvedValue([]);

    await expect(checkForDuplicates(data, logger)).resolves.toEqual({ data, hasDuplicates: false });
    expect(updateNoteTitleSimHash).toHaveBeenCalledWith("note-new", generateTitleSimHash("Weeknight Chili"));
    expect(generateTitleSimHash("Weeknight Chili")).toHaveLength(32);
    expect(recordDuplicateCandidates).not.toHaveBeenCalled();
  });

  it("does not rewrite an unchanged SimHash, and still checks untitled notes by content", async () => {
    vi.mocked(getNoteWithIngredients).mockResolvedValue(noteRow(null));
    vi.mocked(findDuplicateMatches).mockResolvedValue([exactMatch]);
    vi.mocked(recordDuplicateCandidates).mockResolvedValue({ blocking: true, highestConfidence: 1, candidateIds: ["d1"] });

    await expect(checkForDuplicates(data, logger)).resolves.toEqual({ data, hasDuplicates: true });
    expect(updateNoteTitleSimHash).not.toHaveBeenCalled();
    expect(recordDuplicateCandidates).toHaveBeenCalledWith("note-new", [exactMatch]);
  });

  it("reports possible duplicates without holding the note", async () => {
    vi.mocked(getNoteWithIngredients).mockResolvedValue(noteRow("Chili", generateTitleSimHash("Chili")));
    vi.mocked(findDuplicateMatches).mockResolvedValue([{ ...exactMatch, kind: "POSSIBLE", confidence: 0.6 }]);
    vi.mocked(recordDuplicateCandidates).mockResolvedValue({ blocking: false, highestConfidence: 0, candidateIds: ["d2"] });

    await expect(checkForDuplicates(data, logger)).resolves.toEqual({ data, hasDuplicates: false });
  });

  it("fails clearly without a note", async () => {
    await expect(checkForDuplicates({ ...data, noteId: undefined }, logger)).rejects.toThrow("Note ID is required");
    vi.mocked(getNoteWithIngredients).mockResolvedValue(null);
    await expect(checkForDuplicates(data, logger)).rejects.toThrow("not found");
  });
});
