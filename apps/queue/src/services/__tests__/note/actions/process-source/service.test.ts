import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@peas/database", () => ({
  attachImportedSource: vi.fn(),
}));

import { attachImportedSource } from "@peas/database";

import {
  type ProcessSourceQueues,
  processSource,
} from "../../../../note/actions/process-source/service";
import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";

function pipelineData(source: string | undefined): NotePipelineData {
  return {
    noteId: "note-1",
    importId: "import-1",
    content: "<p></p>",
    file: {
      title: "Chili",
      contents: "<p></p>",
      ingredients: [],
      instructions: [],
      evernoteMetadata: source === undefined ? undefined : { source },
    },
  } as NotePipelineData;
}

describe("processSource", () => {
  let logger: StructuredLogger;
  let sourceQueue: { add: ReturnType<typeof vi.fn> };
  let bookLookupQueue: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    logger = { log: vi.fn() };
    sourceQueue = { add: vi.fn().mockResolvedValue(undefined) };
    bookLookupQueue = { add: vi.fn().mockResolvedValue(undefined) };
  });

  it("links a URL source and queues one reachability check keyed by the URL", async () => {
    vi.mocked(attachImportedSource).mockResolvedValue({
      sourceId: "source-1",
      kind: "URL",
      urlIdToCheck: "url-1",
      bookLookupIdToRun: null,
    });

    const data = pipelineData("https://example.com/chili?utm_source=rss");
    const result = await processSource(data, logger, { sourceQueue, bookLookupQueue } as unknown as ProcessSourceQueues);

    expect(result).toBe(data);
    expect(attachImportedSource).toHaveBeenCalledWith("note-1", "https://example.com/chili?utm_source=rss");
    expect(sourceQueue.add).toHaveBeenCalledWith(
      "check-url",
      { kind: "CHECK_URL", urlId: "url-1", jobId: "url-check-url-1" },
      expect.objectContaining({ jobId: "url-check-url-1", attempts: 3 })
    );
    expect(bookLookupQueue.add).not.toHaveBeenCalled();
  });

  it("queues a book lookup for new source text", async () => {
    vi.mocked(attachImportedSource).mockResolvedValue({
      sourceId: "source-2",
      kind: "OTHER",
      urlIdToCheck: null,
      bookLookupIdToRun: "lookup-1",
    });

    await processSource(pipelineData("Salt, Fat, Acid, Heat p. 112"), logger, { sourceQueue, bookLookupQueue } as unknown as ProcessSourceQueues);

    expect(bookLookupQueue.add).toHaveBeenCalledWith(
      "lookup-book",
      { kind: "LOOKUP_BOOK", lookupId: "lookup-1", jobId: "book-lookup-lookup-1" },
      expect.objectContaining({ jobId: "book-lookup-lookup-1" })
    );
    expect(sourceQueue.add).not.toHaveBeenCalled();
  });

  it("skips notes without a source", async () => {
    await processSource(pipelineData(undefined), logger, { sourceQueue, bookLookupQueue } as unknown as ProcessSourceQueues);
    await processSource(pipelineData("   "), logger, { sourceQueue, bookLookupQueue } as unknown as ProcessSourceQueues);

    expect(attachImportedSource).not.toHaveBeenCalled();
  });

  it("never fails the import when linking or queueing fails", async () => {
    vi.mocked(attachImportedSource).mockRejectedValueOnce(new Error("database down"));
    const data = pipelineData("https://example.com/a");

    await expect(processSource(data, logger, { sourceQueue } as unknown as ProcessSourceQueues)).resolves.toBe(data);

    vi.mocked(attachImportedSource).mockResolvedValueOnce({
      sourceId: "source-1",
      kind: "URL",
      urlIdToCheck: "url-1",
      bookLookupIdToRun: null,
    });
    sourceQueue.add.mockRejectedValueOnce(new Error("redis down"));
    await expect(processSource(data, logger, { sourceQueue } as unknown as ProcessSourceQueues)).resolves.toBe(data);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Could not queue the URL check"), "warn");
  });

  it("keeps a source with no usable text on the Evernote metadata only", async () => {
    vi.mocked(attachImportedSource).mockResolvedValue(null);
    const data = pipelineData("—");
    await expect(processSource(data, logger, { sourceQueue, bookLookupQueue } as unknown as ProcessSourceQueues)).resolves.toBe(data);
    expect(sourceQueue.add).not.toHaveBeenCalled();
  });

  it("logs a book lookup that could not be queued and continues", async () => {
    vi.mocked(attachImportedSource).mockResolvedValue({
      sourceId: "source-2",
      kind: "OTHER",
      urlIdToCheck: null,
      bookLookupIdToRun: "lookup-1",
    });
    bookLookupQueue.add.mockRejectedValueOnce(new Error("redis down"));
    const data = pipelineData("Some cookbook");
    await expect(processSource(data, logger, { bookLookupQueue } as unknown as ProcessSourceQueues)).resolves.toBe(data);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Could not queue the book lookup"), "warn");
  });

  it("requires a note id", async () => {
    await expect(
      processSource({ ...pipelineData("x"), noteId: undefined }, logger)
    ).rejects.toThrow("No note ID available for source processing");
  });
});
