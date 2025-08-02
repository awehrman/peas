import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import { ActionFactory } from "../../../workers/core/action-factory";
import type { InstructionJobData } from "../../../workers/instruction/dependencies";
import type { InstructionWorkerDependencies } from "../../../workers/instruction/dependencies";
import {
  createActionRegistration,
  registerActions,
} from "../../../workers/shared/action-registry";
import { FormatInstructionAction } from "../../instruction/actions/format-instruction/action";
import { SaveInstructionAction } from "../../instruction/actions/save-instruction/action";
import { registerInstructionActions } from "../../instruction/register";

// Mock the action registry
vi.mock("../../../workers/shared/action-registry", () => ({
  registerActions: vi.fn(),
  createActionRegistration: vi.fn(),
}));

describe("registerInstructionActions", () => {
  let mockFactory: ActionFactory<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >;

  beforeEach(() => {
    mockFactory = {
      register: vi.fn(),
    } as unknown as ActionFactory<
      InstructionJobData,
      InstructionWorkerDependencies,
      InstructionJobData
    >;

    vi.clearAllMocks();
  });

  describe("successful registration", () => {
    it("should register format and save instruction actions", () => {
      const mockCreateActionRegistration = vi.mocked(createActionRegistration);
      const mockRegisterActions = vi.mocked(registerActions);

      const formatRegistration = {
        name: ActionName.FORMAT_INSTRUCTION_LINE,
        factory: vi.fn(),
      };
      const saveRegistration = {
        name: ActionName.SAVE_INSTRUCTION_LINE,
        factory: vi.fn(),
      };

      mockCreateActionRegistration
        .mockReturnValueOnce(formatRegistration)
        .mockReturnValueOnce(saveRegistration);

      registerInstructionActions(mockFactory);

      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        FormatInstructionAction
      );

      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.SAVE_INSTRUCTION_LINE,
        SaveInstructionAction
      );

      expect(mockRegisterActions).toHaveBeenCalledWith(mockFactory, [
        formatRegistration,
        saveRegistration,
      ]);
    });

    it("should register actions in correct order", () => {
      const mockCreateActionRegistration = vi.mocked(createActionRegistration);

      const formatRegistration = {
        name: ActionName.FORMAT_INSTRUCTION_LINE,
        factory: vi.fn(),
      };
      const saveRegistration = {
        name: ActionName.SAVE_INSTRUCTION_LINE,
        factory: vi.fn(),
      };

      mockCreateActionRegistration
        .mockReturnValueOnce(formatRegistration)
        .mockReturnValueOnce(saveRegistration);

      registerInstructionActions(mockFactory);

      expect(mockCreateActionRegistration).toHaveBeenNthCalledWith(
        1,
        ActionName.FORMAT_INSTRUCTION_LINE,
        FormatInstructionAction
      );

      expect(mockCreateActionRegistration).toHaveBeenNthCalledWith(
        2,
        ActionName.SAVE_INSTRUCTION_LINE,
        SaveInstructionAction
      );
    });
  });

  describe("error handling", () => {
    it("should throw error when factory is null", () => {
      expect(() =>
        registerInstructionActions(
          null as unknown as ActionFactory<
            InstructionJobData,
            InstructionWorkerDependencies,
            InstructionJobData
          >
        )
      ).toThrow("Invalid factory");
    });

    it("should throw error when factory is undefined", () => {
      expect(() =>
        registerInstructionActions(
          undefined as unknown as ActionFactory<
            InstructionJobData,
            InstructionWorkerDependencies,
            InstructionJobData
          >
        )
      ).toThrow("Invalid factory");
    });

    it("should throw error when factory is not an object", () => {
      expect(() =>
        registerInstructionActions(
          "not-an-object" as unknown as ActionFactory<
            InstructionJobData,
            InstructionWorkerDependencies,
            InstructionJobData
          >
        )
      ).toThrow("Invalid factory");
    });

    it("should throw error when factory is a number", () => {
      expect(() =>
        registerInstructionActions(
          123 as unknown as ActionFactory<
            InstructionJobData,
            InstructionWorkerDependencies,
            InstructionJobData
          >
        )
      ).toThrow("Invalid factory");
    });
  });

  describe("action registration details", () => {
    it("should create action registration for format instruction", () => {
      const mockCreateActionRegistration = vi.mocked(createActionRegistration);
      const formatRegistration = {
        name: ActionName.FORMAT_INSTRUCTION_LINE,
        factory: vi.fn(),
      };
      mockCreateActionRegistration.mockReturnValue(formatRegistration);

      registerInstructionActions(mockFactory);

      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        FormatInstructionAction
      );
    });

    it("should create action registration for save instruction", () => {
      const mockCreateActionRegistration = vi.mocked(createActionRegistration);
      const saveRegistration = {
        name: ActionName.SAVE_INSTRUCTION_LINE,
        factory: vi.fn(),
      };
      mockCreateActionRegistration.mockReturnValue(saveRegistration);

      registerInstructionActions(mockFactory);

      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.SAVE_INSTRUCTION_LINE,
        SaveInstructionAction
      );
    });
  });
});
