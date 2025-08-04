/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import { cleanHtmlFile } from "../../../services/note/actions/clean-html/action";
import { parseHtmlFile } from "../../../services/note/actions/parse-html/action";
import { saveNote } from "../../../services/note/actions/save-note/action";
import { createMockNoteData } from "../../../test-utils/helpers";
import type { NoteWorkerDependencies } from "../../../types/notes";
import { buildNoteWorkerDependencies } from "../../note/dependencies";

// Mock the dependencies
vi.mock("../../../parsers/html", () => ({
  parseHTMLContent: vi.fn(),
}));

vi.mock("@peas/parser", () => ({
  parseHTMLContent: vi.fn(),
}));

vi.mock("../../../services/note/actions/clean-html/action", () => ({
  cleanHtmlFile: vi.fn(),
}));

vi.mock("../../../services/note/actions/parse-html/action", () => ({
  parseHtmlFile: vi.fn(),
}));

vi.mock("../../../services/note/actions/save-note/action", () => ({
  saveNote: vi.fn(),
}));

vi.mock("../../core/worker-dependencies/build-base-dependencies", () => ({
  buildBaseDependencies: vi.fn(),
}));

describe("buildNoteWorkerDependencies", () => {
  let mockContainer: IServiceContainer;
  let mockBaseDeps: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockBaseDeps = {
      logger: {
        log: vi.fn(),
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      queues: {
        noteQueue: { name: "note" } as any,
        imageQueue: { name: "image" } as any,
        ingredientQueue: { name: "ingredient" } as any,
        instructionQueue: { name: "instruction" } as any,
        categorizationQueue: { name: "categorization" } as any,
        sourceQueue: { name: "source" } as any,
      },
    };

    mockContainer = {
      logger: {
        log: vi.fn(),
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      queues: {
        noteQueue: { name: "note" } as any,
        imageQueue: { name: "image" } as any,
        ingredientQueue: { name: "ingredient" } as any,
        instructionQueue: { name: "instruction" } as any,
        categorizationQueue: { name: "categorization" } as any,
        sourceQueue: { name: "source" } as any,
      },
      cache: {} as any,
      database: {} as any,
      healthMonitor: {} as any,
      webSocket: {} as any,
      config: {} as any,
      close: vi.fn(),
    } as IServiceContainer;

    // Mock buildBaseDependencies to return our mock
    const { buildBaseDependencies } = await import(
      "../../core/worker-dependencies/build-base-dependencies"
    );
    vi.mocked(buildBaseDependencies).mockReturnValue(mockBaseDeps);

    // Set up mock return values
    vi.mocked(cleanHtmlFile).mockResolvedValue(createMockNoteData());
    vi.mocked(parseHtmlFile).mockResolvedValue(createMockNoteData());
    vi.mocked(saveNote).mockResolvedValue(createMockNoteData());
  });

  describe("successful cases", () => {
    it("should build note worker dependencies with all required properties", () => {
      const deps = buildNoteWorkerDependencies(mockContainer);

      expect(deps).toBeDefined();
      expect(deps.logger).toBeDefined();
      expect(deps.errorHandler).toBeDefined();
      expect(deps.statusBroadcaster).toBeDefined();
      expect(deps.queues).toBeDefined();
      expect(deps.services).toBeDefined();
    });

    it("should include base dependencies", () => {
      const deps = buildNoteWorkerDependencies(mockContainer);

      expect(deps.logger).toBe(mockBaseDeps.logger);
      expect(deps.errorHandler).toBe(mockBaseDeps.errorHandler);
      expect(deps.statusBroadcaster).toBe(mockBaseDeps.statusBroadcaster);
      expect(deps.queues).toBe(mockBaseDeps.queues);
    });

    it("should include note-specific services", () => {
      const deps = buildNoteWorkerDependencies(mockContainer);

      expect(deps.services).toBeDefined();
      expect(typeof deps.services.cleanHtml).toBe("function");
      expect(typeof deps.services.parseHtml).toBe("function");
      expect(typeof deps.services.saveNote).toBe("function");
    });

    it("should call buildBaseDependencies with the container", async () => {
      const { buildBaseDependencies } = await import(
        "../../core/worker-dependencies/build-base-dependencies"
      );

      buildNoteWorkerDependencies(mockContainer);

      expect(buildBaseDependencies).toHaveBeenCalledWith(mockContainer);
      expect(buildBaseDependencies).toHaveBeenCalledTimes(1);
    });
  });

  describe("services", () => {
    let deps: NoteWorkerDependencies;

    beforeEach(async () => {
      deps = buildNoteWorkerDependencies(mockContainer);
    });

    describe("cleanHtml service", () => {
      it("should call cleanHtmlFile with correct parameters", async () => {
        const testData = createMockNoteData();
        const result = await deps.services.cleanHtml(testData);

        expect(cleanHtmlFile).toHaveBeenCalledWith(
          testData,
          mockBaseDeps.logger
        );
        expect(cleanHtmlFile).toHaveBeenCalledTimes(1);
        expect(result).toEqual(createMockNoteData());
      });

      it("should handle cleanHtmlFile errors", async () => {
        const testError = new Error("Clean HTML failed");
        vi.mocked(cleanHtmlFile).mockRejectedValue(testError);
        const testData = createMockNoteData();

        await expect(deps.services.cleanHtml(testData)).rejects.toThrow(
          "Clean HTML failed"
        );
        expect(cleanHtmlFile).toHaveBeenCalledWith(
          testData,
          mockBaseDeps.logger
        );
      });

      it("should pass through the data correctly", async () => {
        const testData = createMockNoteData({
          content: "<html><body>Test content</body></html>",
          importId: "test-import-123",
          source: {
            filename: "test.html",
            url: "https://example.com/test",
          },
          options: {
            skipFollowupTasks: true,
          },
        });

        await deps.services.cleanHtml(testData);

        expect(cleanHtmlFile).toHaveBeenCalledWith(
          testData,
          mockBaseDeps.logger
        );
      });
    });

    describe("parseHtml service", () => {
      it("should call parseHtmlFile with correct parameters", async () => {
        const testData = createMockNoteData();
        const result = await deps.services.parseHtml(testData);

        expect(parseHtmlFile).toHaveBeenCalledWith(
          testData,
          mockBaseDeps.logger
        );
        expect(parseHtmlFile).toHaveBeenCalledTimes(1);
        expect(result).toEqual(createMockNoteData());
      });

      it("should handle parseHtmlFile errors", async () => {
        const testError = new Error("Parse HTML failed");
        vi.mocked(parseHtmlFile).mockRejectedValue(testError);
        const testData = createMockNoteData();

        await expect(deps.services.parseHtml(testData)).rejects.toThrow(
          "Parse HTML failed"
        );
        expect(parseHtmlFile).toHaveBeenCalledWith(
          testData,
          mockBaseDeps.logger
        );
      });

      it("should pass through the data correctly", async () => {
        const testData = createMockNoteData({
          content: "<html><body>Test content</body></html>",
          importId: "test-import-456",
          source: {
            filename: "test2.html",
            url: "https://example.com/test2",
          },
          options: {
            skipFollowupTasks: false,
          },
        });

        await deps.services.parseHtml(testData);

        expect(parseHtmlFile).toHaveBeenCalledWith(
          testData,
          mockBaseDeps.logger
        );
      });

      it("should execute parseHtmlFile function to cover line 26", async () => {
        const testData = createMockNoteData();
        const mockResult = createMockNoteData({ content: "parsed content" });
        vi.mocked(parseHtmlFile).mockResolvedValue(mockResult);

        // Actually call the service function to execute line 26
        const result = await deps.services.parseHtml(testData);

        expect(parseHtmlFile).toHaveBeenCalledWith(
          testData,
          mockBaseDeps.logger
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe("saveNote service", () => {
      it("should call saveNote with correct parameters", async () => {
        const testData = createMockNoteData();
        const result = await deps.services.saveNote(testData);

        expect(saveNote).toHaveBeenCalledWith(testData, mockBaseDeps.logger);
        expect(saveNote).toHaveBeenCalledTimes(1);
        expect(result).toEqual(createMockNoteData());
      });

      it("should handle saveNote errors", async () => {
        const testError = new Error("Save note failed");
        vi.mocked(saveNote).mockRejectedValue(testError);
        const testData = createMockNoteData();

        await expect(deps.services.saveNote(testData)).rejects.toThrow(
          "Save note failed"
        );
        expect(saveNote).toHaveBeenCalledWith(testData, mockBaseDeps.logger);
      });

      it("should pass through the data correctly", async () => {
        const testData = createMockNoteData({
          content: "<html><body>Test content</body></html>",
          importId: "test-import-789",
          source: {
            filename: "test3.html",
            url: "https://example.com/test3",
          },
          options: {
            skipFollowupTasks: true,
          },
        });

        await deps.services.saveNote(testData);

        expect(saveNote).toHaveBeenCalledWith(testData, mockBaseDeps.logger);
      });

      it("should execute saveNote function to cover line 26", async () => {
        const testData = createMockNoteData();
        const mockResult = createMockNoteData({
          noteId: "test-note-123",
          note: {
            id: "test-note-123",
            title: "Test Note",
            content: "saved content",
            html: "saved content",
            createdAt: new Date(),
            updatedAt: new Date(),
            parsedIngredientLines: [],
            parsedInstructionLines: [],
          },
        });
        vi.mocked(saveNote).mockResolvedValue(mockResult);

        // Actually call the service function to execute line 26
        const result = await deps.services.saveNote(testData);

        expect(saveNote).toHaveBeenCalledWith(testData, mockBaseDeps.logger);
        expect(result).toEqual(mockResult);
      });
    });
  });

  describe("integration", () => {
    it("should create new instances on each call", () => {
      const deps1 = buildNoteWorkerDependencies(mockContainer);
      const deps2 = buildNoteWorkerDependencies(mockContainer);

      expect(deps1).not.toBe(deps2);
      expect(deps1.services).not.toBe(deps2.services);
      expect(deps1.services.cleanHtml).not.toBe(deps2.services.cleanHtml);
      expect(deps1.services.parseHtml).not.toBe(deps2.services.parseHtml);
      expect(deps1.services.saveNote).not.toBe(deps2.services.saveNote);
    });

    it("should maintain proper structure", () => {
      const deps = buildNoteWorkerDependencies(mockContainer);

      expect(deps).toEqual({
        ...mockBaseDeps,
        services: {
          cleanHtml: expect.any(Function),
          parseHtml: expect.any(Function),
          saveNote: expect.any(Function),
        },
      });
    });

    it("should work with different container configurations", async () => {
      const differentContainer = {
        ...mockContainer,
        logger: {
          log: vi.fn(),
          debug: vi.fn(),
        },
      } as IServiceContainer;

      const differentBaseDeps = {
        ...mockBaseDeps,
        logger: {
          log: vi.fn(),
          debug: vi.fn(),
        },
      };

      const { buildBaseDependencies } = await import(
        "../../core/worker-dependencies/build-base-dependencies"
      );
      vi.mocked(buildBaseDependencies).mockReturnValue(differentBaseDeps);

      const deps = buildNoteWorkerDependencies(differentContainer);

      expect(deps.logger).toBe(differentBaseDeps.logger);
      expect(deps.services.cleanHtml).toBeDefined();
      expect(deps.services.parseHtml).toBeDefined();
      expect(deps.services.saveNote).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should propagate errors from buildBaseDependencies", async () => {
      const { buildBaseDependencies } = await import(
        "../../core/worker-dependencies/build-base-dependencies"
      );
      const testError = new Error("Base dependencies failed");
      vi.mocked(buildBaseDependencies).mockImplementation(() => {
        throw testError;
      });

      expect(() => {
        buildNoteWorkerDependencies(mockContainer);
      }).toThrow("Base dependencies failed");
    });

    it("should handle service function errors gracefully", async () => {
      const deps = buildNoteWorkerDependencies(mockContainer);
      const testData = createMockNoteData();

      // Test cleanHtml error
      const cleanHtmlModule = await import(
        "../../../services/note/actions/clean-html/action"
      );
      const cleanHtmlSpy = vi.mocked(cleanHtmlModule.cleanHtmlFile);
      cleanHtmlSpy.mockRejectedValueOnce(new Error("Service error"));

      await expect(deps.services.cleanHtml(testData)).rejects.toThrow(
        "Service error"
      );

      // Test parseHtml error
      const parseHtmlModule = await import(
        "../../../services/note/actions/parse-html/action"
      );
      const parseHtmlSpy = vi.mocked(parseHtmlModule.parseHtmlFile);
      parseHtmlSpy.mockRejectedValueOnce(new Error("Parse error"));

      await expect(deps.services.parseHtml(testData)).rejects.toThrow(
        "Parse error"
      );

      // Test saveNote error
      const saveNoteModule = await import(
        "../../../services/note/actions/save-note/action"
      );
      const saveNoteSpy = vi.mocked(saveNoteModule.saveNote);
      saveNoteSpy.mockRejectedValueOnce(new Error("Save error"));

      await expect(deps.services.saveNote(testData)).rejects.toThrow(
        "Save error"
      );
    });
  });

  describe("service function behavior", () => {
    it("should return promises from service functions", () => {
      const deps = buildNoteWorkerDependencies(mockContainer);
      const testData = createMockNoteData();

      const cleanHtmlPromise = deps.services.cleanHtml(testData);
      const parseHtmlPromise = deps.services.parseHtml(testData);
      const saveNotePromise = deps.services.saveNote(testData);

      expect(cleanHtmlPromise).toBeInstanceOf(Promise);
      expect(parseHtmlPromise).toBeInstanceOf(Promise);
      expect(saveNotePromise).toBeInstanceOf(Promise);
    });

    it("should handle async operations correctly", async () => {
      const deps = buildNoteWorkerDependencies(mockContainer);
      const testData = createMockNoteData();

      const cleanHtmlModule = await import(
        "../../../services/note/actions/clean-html/action"
      );
      const parseHtmlModule = await import(
        "../../../services/note/actions/parse-html/action"
      );

      vi.mocked(cleanHtmlModule.cleanHtmlFile).mockResolvedValue({
        cleaned: true,
      } as any);
      vi.mocked(parseHtmlModule.parseHtmlFile).mockResolvedValue({
        parsed: true,
      } as any);

      const saveNoteModule = await import(
        "../../../services/note/actions/save-note/action"
      );
      vi.mocked(saveNoteModule.saveNote).mockResolvedValue({
        saved: true,
      } as any);

      const cleanResult = await deps.services.cleanHtml(testData);
      const parseResult = await deps.services.parseHtml(testData);
      const saveResult = await deps.services.saveNote(testData);

      expect(cleanResult).toEqual({ cleaned: true });
      expect(parseResult).toEqual({ parsed: true });
      expect(saveResult).toEqual({ saved: true });
    });
  });
});
