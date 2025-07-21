import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionFactory } from "../../../core/action-factory";
// Import the mocked functions
import {
  createActionRegistration,
  registerActions,
} from "../../../shared/action-registry";
import {
  CompletionStatusAction,
  InstructionCompletedStatusAction,
  ProcessInstructionLineAction,
  SaveInstructionLineAction,
  UpdateInstructionCountAction,
} from "../../actions";
import { registerInstructionActions } from "../../actions/index";
import type { InstructionWorkerDependencies } from "../../types";

// Mock the action registry functions
vi.mock("../../../shared/action-registry", () => ({
  registerActions: vi.fn(),
  createActionRegistration: vi.fn((name, action) => ({ name, action })),
}));

describe("Instruction Actions Index", () => {
  let mockFactory: ActionFactory;

  beforeEach(() => {
    mockFactory = {
      registerAction: vi.fn(),
      getAction: vi.fn(),
      hasAction: vi.fn(),
      listActions: vi.fn(),
    } as unknown as ActionFactory;
    vi.clearAllMocks();
  });

  describe("registerInstructionActions", () => {
    it("registers all instruction actions with correct names", () => {
      registerInstructionActions(mockFactory);

      // Verify registerActions was called with the factory
      expect(registerActions).toHaveBeenCalledWith(
        mockFactory,
        expect.any(Array)
      );

      // Verify createActionRegistration was called for each action
      expect(createActionRegistration).toHaveBeenCalledWith(
        "process_instruction_line",
        ProcessInstructionLineAction
      );
      expect(createActionRegistration).toHaveBeenCalledWith(
        "save_instruction_line",
        SaveInstructionLineAction
      );
      expect(createActionRegistration).toHaveBeenCalledWith(
        "update_instruction_count",
        UpdateInstructionCountAction
      );
      expect(createActionRegistration).toHaveBeenCalledWith(
        "instruction_completed_status",
        InstructionCompletedStatusAction
      );
      expect(createActionRegistration).toHaveBeenCalledWith(
        "completion_status",
        CompletionStatusAction
      );

      // Verify the correct number of registrations
      expect(createActionRegistration).toHaveBeenCalledTimes(5);
    });

    it("registers actions in the correct order", () => {
      registerInstructionActions(mockFactory);

      // Get the array of registrations passed to registerActions
      const registrations = (
        registerActions as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0]?.[1];

      // Verify the order of registrations
      expect(registrations).toEqual([
        {
          name: "process_instruction_line",
          action: ProcessInstructionLineAction,
        },
        { name: "save_instruction_line", action: SaveInstructionLineAction },
        {
          name: "update_instruction_count",
          action: UpdateInstructionCountAction,
        },
        {
          name: "instruction_completed_status",
          action: InstructionCompletedStatusAction,
        },
        { name: "completion_status", action: CompletionStatusAction },
      ]);
    });

    it("passes the correct action classes to registrations", () => {
      registerInstructionActions(mockFactory);

      // Verify each action class is correctly passed
      expect(createActionRegistration).toHaveBeenCalledWith(
        "process_instruction_line",
        ProcessInstructionLineAction
      );
      expect(createActionRegistration).toHaveBeenCalledWith(
        "save_instruction_line",
        SaveInstructionLineAction
      );
      expect(createActionRegistration).toHaveBeenCalledWith(
        "update_instruction_count",
        UpdateInstructionCountAction
      );
      expect(createActionRegistration).toHaveBeenCalledWith(
        "instruction_completed_status",
        InstructionCompletedStatusAction
      );
      expect(createActionRegistration).toHaveBeenCalledWith(
        "completion_status",
        CompletionStatusAction
      );
    });

    it("uses the correct action names", () => {
      registerInstructionActions(mockFactory);

      // Verify the action names match the expected format
      const expectedNames = [
        "process_instruction_line",
        "save_instruction_line",
        "update_instruction_count",
        "instruction_completed_status",
        "completion_status",
      ];

      expectedNames.forEach((name) => {
        expect(createActionRegistration).toHaveBeenCalledWith(
          name,
          expect.any(Function)
        );
      });
    });

    it("calls registerActions only once", () => {
      registerInstructionActions(mockFactory);

      expect(registerActions).toHaveBeenCalledTimes(1);
    });

    it("passes exactly 5 action registrations", () => {
      registerInstructionActions(mockFactory);

      const registrations = (
        registerActions as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0]?.[1];
      expect(registrations).toHaveLength(5);
    });

    it("handles different factory instances", () => {
      const mockFactory2 = {
        registerAction: vi.fn(),
        getAction: vi.fn(),
        hasAction: vi.fn(),
        listActions: vi.fn(),
      } as unknown as ActionFactory;

      registerInstructionActions(mockFactory);
      registerInstructionActions(mockFactory2);

      // Verify registerActions was called with both factories
      expect(registerActions).toHaveBeenCalledWith(
        mockFactory,
        expect.any(Array)
      );
      expect(registerActions).toHaveBeenCalledWith(
        mockFactory2,
        expect.any(Array)
      );
      expect(registerActions).toHaveBeenCalledTimes(2);
    });

    it("maintains consistent registration structure", () => {
      registerInstructionActions(mockFactory);

      const registrations = (
        registerActions as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0]?.[1];

      // Verify each registration has the correct structure
      registrations?.forEach(
        (registration: { name: string; action: unknown }) => {
          expect(registration).toHaveProperty("name");
          expect(registration).toHaveProperty("action");
          expect(typeof registration.name).toBe("string");
          expect(typeof registration.action).toBe("function");
        }
      );
    });
  });

  describe("exports", () => {
    it("should export all required actions", () => {
      expect(ProcessInstructionLineAction).toBeDefined();
      expect(SaveInstructionLineAction).toBeDefined();
      expect(UpdateInstructionCountAction).toBeDefined();
      expect(InstructionCompletedStatusAction).toBeDefined();
      expect(CompletionStatusAction).toBeDefined();
    });

    it("should have correct action types", () => {
      expect(typeof ProcessInstructionLineAction).toBe("function");
      expect(typeof SaveInstructionLineAction).toBe("function");
      expect(typeof UpdateInstructionCountAction).toBe("function");
      expect(typeof InstructionCompletedStatusAction).toBe("function");
      expect(typeof CompletionStatusAction).toBe("function");
    });

    it("should create action instances correctly", () => {
      const processAction = new ProcessInstructionLineAction();
      const saveAction = new SaveInstructionLineAction();
      const updateAction = new UpdateInstructionCountAction();
      const completedAction = new InstructionCompletedStatusAction();

      expect(processAction).toBeInstanceOf(ProcessInstructionLineAction);
      expect(saveAction).toBeInstanceOf(SaveInstructionLineAction);
      expect(updateAction).toBeInstanceOf(UpdateInstructionCountAction);
      expect(completedAction).toBeInstanceOf(InstructionCompletedStatusAction);
    });

    it("should have correct action names", () => {
      const processAction = new ProcessInstructionLineAction();
      const saveAction = new SaveInstructionLineAction();
      const updateAction = new UpdateInstructionCountAction();
      const completedAction = new InstructionCompletedStatusAction();

      expect(processAction.name).toBe("process_instruction_line");
      expect(saveAction.name).toBe("save_instruction_line");
      expect(updateAction.name).toBe("update_instruction_count");
      expect(completedAction.name).toBe("instruction_completed_status");
    });

    it("should execute actions with mock data", async () => {
      const mockDeps = {
        logger: { log: vi.fn() },
        database: {} as unknown as InstructionWorkerDependencies["database"],
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        ErrorHandler: { withErrorHandling: vi.fn(async (op) => op()) },
      } as InstructionWorkerDependencies;

      const mockContext = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        noteId: "test-note",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const saveAction = new SaveInstructionLineAction();
      const mockInput = {
        noteId: "test-note",
        instructionLineId: "test-line",
        originalText: "test text",
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT" as const,
      };

      const result = await saveAction.execute(mockInput, mockDeps, mockContext);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle action execution errors", async () => {
      const mockDeps = {
        logger: { log: vi.fn() },
        database: {} as unknown as InstructionWorkerDependencies["database"],
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        ErrorHandler: { withErrorHandling: vi.fn(async (op) => op()) },
      } as InstructionWorkerDependencies;

      const mockContext = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        noteId: "test-note",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const updateAction = new UpdateInstructionCountAction();
      const mockInput = {
        importId: "test-import",
        currentInstructionIndex: 1,
        totalInstructions: 5,
      };

      const result = await updateAction.execute(
        mockInput,
        mockDeps,
        mockContext
      );
      expect(result).toBeDefined();
    });
  });
});
