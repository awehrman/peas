import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import { buildCategorizationDependencies } from "../../categorization/dependencies";
import type { CategorizationJobData } from "../../categorization/dependencies";

// Mock the service functions
vi.mock(
  "../../../services/categorization/actions/determine-category/service",
  () => ({
    determineCategory: vi
      .fn()
      .mockResolvedValue({ noteId: "test-note", importId: "test-import" }),
  })
);

vi.mock(
  "../../../services/categorization/actions/save-category/service",
  () => ({
    saveCategory: vi
      .fn()
      .mockResolvedValue({ noteId: "test-note", importId: "test-import" }),
  })
);

vi.mock(
  "../../../services/categorization/actions/determine-tags/service",
  () => ({
    determineTags: vi
      .fn()
      .mockResolvedValue({ noteId: "test-note", importId: "test-import" }),
  })
);

vi.mock("../../../services/categorization/actions/save-tags/service", () => ({
  saveTags: vi
    .fn()
    .mockResolvedValue({ noteId: "test-note", importId: "test-import" }),
}));

// Mock the service container
const mockServiceContainer: Partial<IServiceContainer> = {
  logger: {
    log: vi.fn(),
  },
  statusBroadcaster: {
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
  },
};

describe("Categorization Dependencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildCategorizationDependencies", () => {
    it("should build dependencies with all required services", () => {
      const dependencies = buildCategorizationDependencies(
        mockServiceContainer as IServiceContainer
      );

      expect(dependencies).toBeDefined();
      expect(dependencies.logger).toBe(mockServiceContainer.logger);
      expect(dependencies.statusBroadcaster).toBe(
        mockServiceContainer.statusBroadcaster
      );
      expect(dependencies.services).toBeDefined();
    });

    it("should include determineCategory service", () => {
      const dependencies = buildCategorizationDependencies(
        mockServiceContainer as IServiceContainer
      );

      expect(dependencies.services.determineCategory).toBeDefined();
      expect(typeof dependencies.services.determineCategory).toBe("function");
    });

    it("should include saveCategory service", () => {
      const dependencies = buildCategorizationDependencies(
        mockServiceContainer as IServiceContainer
      );

      expect(dependencies.services.saveCategory).toBeDefined();
      expect(typeof dependencies.services.saveCategory).toBe("function");
    });

    it("should include determineTags service", () => {
      const dependencies = buildCategorizationDependencies(
        mockServiceContainer as IServiceContainer
      );

      expect(dependencies.services.determineTags).toBeDefined();
      expect(typeof dependencies.services.determineTags).toBe("function");
    });

    it("should include saveTags service", () => {
      const dependencies = buildCategorizationDependencies(
        mockServiceContainer as IServiceContainer
      );

      expect(dependencies.services.saveTags).toBeDefined();
      expect(typeof dependencies.services.saveTags).toBe("function");
    });

    it("should call determineCategory service with correct parameters", async () => {
      const dependencies = buildCategorizationDependencies(
        mockServiceContainer as IServiceContainer
      );

      const testData: CategorizationJobData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        jobId: "test-job-123",
        metadata: { test: "value" },
      };

      const result = await dependencies.services.determineCategory(testData);

      expect(result).toEqual({ noteId: "test-note", importId: "test-import" });
    });

    it("should call saveCategory service with correct parameters", async () => {
      const dependencies = buildCategorizationDependencies(
        mockServiceContainer as IServiceContainer
      );

      const testData: CategorizationJobData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        jobId: "test-job-123",
        metadata: { test: "value" },
      };

      const result = await dependencies.services.saveCategory(testData);

      expect(result).toEqual({ noteId: "test-note", importId: "test-import" });
    });

    it("should call determineTags service with correct parameters", async () => {
      const dependencies = buildCategorizationDependencies(
        mockServiceContainer as IServiceContainer
      );

      const testData: CategorizationJobData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        jobId: "test-job-123",
        metadata: { test: "value" },
      };

      const result = await dependencies.services.determineTags(testData);

      expect(result).toEqual({ noteId: "test-note", importId: "test-import" });
    });

    it("should call saveTags service with correct parameters", async () => {
      const dependencies = buildCategorizationDependencies(
        mockServiceContainer as IServiceContainer
      );

      const testData: CategorizationJobData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        jobId: "test-job-123",
        metadata: { test: "value" },
      };

      const result = await dependencies.services.saveTags(testData);

      expect(result).toEqual({ noteId: "test-note", importId: "test-import" });
    });

    it("should handle service container without statusBroadcaster", () => {
      const containerWithoutBroadcaster = {
        logger: mockServiceContainer.logger,
      } as IServiceContainer;

      const dependencies = buildCategorizationDependencies(
        containerWithoutBroadcaster
      );

      expect(dependencies.statusBroadcaster).toBeUndefined();
      expect(dependencies.services).toBeDefined();
    });

    it("should handle service container with minimal logger", () => {
      const minimalContainer = {
        logger: {
          log: vi.fn(),
        },
      } as unknown as IServiceContainer;

      const dependencies = buildCategorizationDependencies(minimalContainer);

      expect(dependencies.logger).toBe(minimalContainer.logger);
      expect(dependencies.services).toBeDefined();
    });
  });

  describe("CategorizationJobData interface", () => {
    it("should accept valid job data structure", () => {
      const validJobData: CategorizationJobData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        jobId: "test-job-123",
        metadata: {
          category: "dessert",
          tags: ["sweet", "chocolate"],
        },
      };

      expect(validJobData.noteId).toBe("test-note-123");
      expect(validJobData.importId).toBe("test-import-123");
      expect(validJobData.jobId).toBe("test-job-123");
      expect(validJobData.metadata).toEqual({
        category: "dessert",
        tags: ["sweet", "chocolate"],
      });
    });

    it("should accept job data without metadata", () => {
      const jobDataWithoutMetadata: CategorizationJobData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        jobId: "test-job-123",
      };

      expect(jobDataWithoutMetadata.noteId).toBe("test-note-123");
      expect(jobDataWithoutMetadata.importId).toBe("test-import-123");
      expect(jobDataWithoutMetadata.jobId).toBe("test-job-123");
      expect(jobDataWithoutMetadata.metadata).toBeUndefined();
    });
  });
});
