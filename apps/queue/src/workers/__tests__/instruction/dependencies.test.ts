import { ParseStatus } from "@peas/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import {
  type InstructionJobData,
  type InstructionWorkerDependencies,
  buildInstructionDependencies,
} from "../../instruction/dependencies";

// Mock the service imports
vi.mock(
  "../../../services/instruction/actions/format-instruction/service",
  () => ({
    formatInstruction: vi.fn(),
  })
);

vi.mock(
  "../../../services/instruction/actions/save-instruction/service",
  () => ({
    saveInstruction: vi.fn(),
  })
);

describe("Instruction Dependencies", () => {
  let mockContainer: IServiceContainer;
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
    };

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
    };

    mockContainer = {
      logger: mockLogger,
      statusBroadcaster: mockStatusBroadcaster,
    } as unknown as IServiceContainer;

    vi.clearAllMocks();
  });

  describe("InstructionJobData interface", () => {
    it("should have all required properties", () => {
      const testData: InstructionJobData = {
        noteId: "test-note-id",
        instructionReference: "Test instruction",
        lineIndex: 0,
        importId: "test-import-id",
        jobId: "test-job-id",
        metadata: { key: "value" },
        parseStatus: ParseStatus.PENDING,
        isActive: true,
      };

      expect(testData.noteId).toBe("test-note-id");
      expect(testData.instructionReference).toBe("Test instruction");
      expect(testData.lineIndex).toBe(0);
      expect(testData.importId).toBe("test-import-id");
      expect(testData.jobId).toBe("test-job-id");
      expect(testData.metadata).toEqual({ key: "value" });
      expect(testData.parseStatus).toBe(ParseStatus.PENDING);
      expect(testData.isActive).toBe(true);
    });

    it("should allow optional properties to be undefined", () => {
      const testData: InstructionJobData = {
        noteId: "test-note-id",
        instructionReference: "Test instruction",
        lineIndex: 0,
        parseStatus: ParseStatus.PENDING,
        isActive: true,
      };

      expect(testData.importId).toBeUndefined();
      expect(testData.jobId).toBeUndefined();
      expect(testData.metadata).toBeUndefined();
    });
  });

  describe("InstructionWorkerDependencies interface", () => {
    it("should have all required properties", () => {
      const testDeps: InstructionWorkerDependencies = {
        logger: mockLogger,
        services: {
          formatInstruction: vi
            .fn()
            .mockResolvedValue({} as InstructionJobData),
          saveInstruction: vi.fn().mockResolvedValue({} as InstructionJobData),
        },
        statusBroadcaster: mockStatusBroadcaster,
      };

      expect(testDeps.logger).toBe(mockLogger);
      expect(testDeps.services.formatInstruction).toBeDefined();
      expect(testDeps.services.saveInstruction).toBeDefined();
      expect(testDeps.statusBroadcaster).toBe(mockStatusBroadcaster);
    });

    it("should allow statusBroadcaster to be optional", () => {
      const testDeps: InstructionWorkerDependencies = {
        logger: mockLogger,
        services: {
          formatInstruction: vi
            .fn()
            .mockResolvedValue({} as InstructionJobData),
          saveInstruction: vi.fn().mockResolvedValue({} as InstructionJobData),
        },
      };

      expect(testDeps.statusBroadcaster).toBeUndefined();
    });
  });

  describe("buildInstructionDependencies", () => {
    it("should build dependencies with logger", () => {
      const deps = buildInstructionDependencies(mockContainer);

      expect(deps.logger).toBe(mockLogger);
    });

    it("should build dependencies with statusBroadcaster", () => {
      const deps = buildInstructionDependencies(mockContainer);

      expect(deps.statusBroadcaster).toBe(mockStatusBroadcaster);
    });

    it("should build dependencies with services", () => {
      const deps = buildInstructionDependencies(mockContainer);

      expect(deps.services).toBeDefined();
      expect(typeof deps.services.formatInstruction).toBe("function");
      expect(typeof deps.services.saveInstruction).toBe("function");
    });

    it("should return services that are async functions", () => {
      const deps = buildInstructionDependencies(mockContainer);

      expect(deps.services.formatInstruction).toBeInstanceOf(Function);
      expect(deps.services.saveInstruction).toBeInstanceOf(Function);
    });

    it("should handle container without statusBroadcaster", () => {
      const containerWithoutBroadcaster = {
        ...mockContainer,
        statusBroadcaster: undefined,
      } as unknown as IServiceContainer;

      const deps = buildInstructionDependencies(containerWithoutBroadcaster);

      expect(deps.statusBroadcaster).toBeUndefined();
      expect(deps.logger).toBe(mockLogger);
      expect(deps.services).toBeDefined();
    });

    it("should handle container with null statusBroadcaster", () => {
      const containerWithNullBroadcaster = {
        ...mockContainer,
        statusBroadcaster: null,
      } as unknown as IServiceContainer;

      const deps = buildInstructionDependencies(containerWithNullBroadcaster);

      expect(deps.statusBroadcaster).toBeNull();
      expect(deps.logger).toBe(mockLogger);
      expect(deps.services).toBeDefined();
    });
  });

  describe("service functions", () => {
    it("should have formatInstruction service that returns Promise", async () => {
      const deps = buildInstructionDependencies(mockContainer);
      const testData: InstructionJobData = {
        noteId: "test-note",
        instructionReference: "test instruction",
        lineIndex: 0,
        parseStatus: ParseStatus.PENDING,
        isActive: true,
      };

      const result = deps.services.formatInstruction(testData);

      expect(result).toBeInstanceOf(Promise);
      // The actual implementation will be tested in the service tests
    });

    it("should have saveInstruction service that returns Promise", async () => {
      const deps = buildInstructionDependencies(mockContainer);
      const testData: InstructionJobData = {
        noteId: "test-note",
        instructionReference: "test instruction",
        lineIndex: 0,
        parseStatus: ParseStatus.PENDING,
        isActive: true,
      };

      const result = deps.services.saveInstruction(testData);

      expect(result).toBeInstanceOf(Promise);
      // The actual implementation will be tested in the service tests
    });
  });
});
