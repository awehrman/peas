import { describe, expect, it } from "vitest";

import {
  type InstructionJobData,
  type InstructionWorkerDependencies,
  buildInstructionDependencies,
  createInstructionWorker,
} from "../../instruction";

describe("Instruction Worker Index", () => {
  describe("exports", () => {
    it("should export createInstructionWorker function", () => {
      expect(typeof createInstructionWorker).toBe("function");
    });

    it("should export buildInstructionDependencies function", () => {
      expect(typeof buildInstructionDependencies).toBe("function");
    });

    it("should export InstructionWorkerDependencies type", () => {
      // TypeScript will catch if this type is not exported
      const testDeps: InstructionWorkerDependencies = {
        logger: {
          log: () => {},
        },
        services: {
          formatInstruction: async () => ({}) as InstructionJobData,
          saveInstruction: async () => ({}) as InstructionJobData,
        },
      };
      expect(testDeps).toBeDefined();
    });

    it("should export InstructionJobData type", () => {
      // TypeScript will catch if this type is not exported
      const testData: InstructionJobData = {
        noteId: "test-note",
        instructionReference: "test instruction",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
      };
      expect(testData).toBeDefined();
    });
  });
});
