import { beforeEach, describe, expect, it, vi } from "vitest";

import { useActivity } from "../../context/activity";
import { useStats } from "../../context/stats";
import { useImportUpload } from "../../context/upload";
import { useWs } from "../../context/ws";
import { useImport } from "../use-import";

// Mock all the individual context hooks
vi.mock("../../context/activity", () => ({
  useActivity: vi.fn(),
}));

vi.mock("../../context/stats", () => ({
  useStats: vi.fn(),
}));

vi.mock("../../context/upload", () => ({
  useImportUpload: vi.fn(),
}));

vi.mock("../../context/ws", () => ({
  useWs: vi.fn(),
}));

describe("useImport", () => {
  const mockUploadContext = {
    state: { previousBatches: [], currentBatch: undefined },
    dispatch: vi.fn(),
  };

  const mockWsContext = {
    state: { status: "idle", reconnectionAttempts: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockStatsContext = {
    state: {
      numberOfNotes: 0,
      numberOfIngredients: 0,
      numberOfParsingErrors: 0,
    },
    dispatch: vi.fn(),
  };

  const mockActivityContext = {
    state: { currentPageIndex: 0, pageToCardIds: {}, cardsById: {} },
    dispatch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useImportUpload).mockReturnValue(mockUploadContext);
    vi.mocked(useWs).mockReturnValue(mockWsContext);
    vi.mocked(useStats).mockReturnValue(mockStatsContext);
    vi.mocked(useActivity).mockReturnValue(mockActivityContext);
  });

  it("should return all context values", () => {
    const result = useImport();

    expect(result.upload).toBe(mockUploadContext);
    expect(result.ws).toBe(mockWsContext);
    expect(result.stats).toBe(mockStatsContext);
    expect(result.activity).toBe(mockActivityContext);
  });

  it("should call all context hooks", () => {
    useImport();

    expect(useImportUpload).toHaveBeenCalled();
    expect(useWs).toHaveBeenCalled();
    expect(useStats).toHaveBeenCalled();
    expect(useActivity).toHaveBeenCalled();
  });

  it("should return consistent structure", () => {
    const result = useImport();

    expect(result).toHaveProperty("upload");
    expect(result).toHaveProperty("ws");
    expect(result).toHaveProperty("stats");
    expect(result).toHaveProperty("activity");
  });

  it("should handle context hook failures gracefully", () => {
    vi.mocked(useImportUpload).mockImplementation(() => {
      throw new Error("Upload context not available");
    });

    expect(() => useImport()).toThrow("Upload context not available");
  });
});
