import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type { NotePipelineData } from "../../../types/notes";
import type { NoteWorkerDependencies } from "../../../types/notes";
import { ActionFactory } from "../../../workers/core/action-factory";
import {
  createActionRegistration,
  registerActions,
} from "../../../workers/shared/action-registry";
import { registerNoteActions } from "../../note/register";

// Mock the action classes
vi.mock("../actions/parse-html/action", () => ({
  ParseHtmlAction: class MockParseHtmlAction {
    constructor() {
      // Mock constructor
    }
  },
}));

vi.mock("../actions/clean-html/action", () => ({
  CleanHtmlAction: class MockCleanHtmlAction {
    constructor() {
      // Mock constructor
    }
  },
}));

vi.mock("../actions/save-note/action", () => ({
  SaveNoteAction: class MockSaveNoteAction {
    constructor() {
      // Mock constructor
    }
  },
}));

vi.mock("../actions/schedule-tasks/action", () => ({
  ScheduleAllFollowupTasksAction: class MockScheduleAllFollowupTasksAction {
    constructor() {
      // Mock constructor
    }
  },
}));

vi.mock("../actions/process-source/action", () => ({
  ProcessSourceAction: class MockProcessSourceAction {
    constructor() {
      // Mock constructor
    }
  },
}));

// Mock the action registry functions
vi.mock("../../../workers/shared/action-registry", () => ({
  createActionRegistration: vi.fn(),
  registerActions: vi.fn(),
}));

describe("registerNoteActions", () => {
  let mockFactory: ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >;
  let mockCreateActionRegistration: ReturnType<typeof vi.fn>;
  let mockRegisterActions: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock factory
    mockFactory = new ActionFactory<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >();

    // Get mocked functions
    mockCreateActionRegistration = vi.mocked(createActionRegistration);
    mockRegisterActions = vi.mocked(registerActions);

    // Setup default mock implementations
    mockCreateActionRegistration.mockReturnValue({
      name: ActionName.PARSE_HTML,
      factory: vi.fn(),
    });
  });

  it("should register all note actions with the factory", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    expect(mockRegisterActions).toHaveBeenCalledTimes(1);
    expect(mockRegisterActions).toHaveBeenCalledWith(
      mockFactory,
      expect.any(Array)
    );
  });

  it("should register exactly 6 actions", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    const registeredActions = mockRegisterActions.mock.calls[0]?.[1];
    expect(registeredActions).toHaveLength(7);
  });

  it("should register PARSE_HTML action", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    expect(mockCreateActionRegistration).toHaveBeenCalledWith(
      ActionName.PARSE_HTML,
      expect.any(Function)
    );
  });

  it("should register CLEAN_HTML action", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    expect(mockCreateActionRegistration).toHaveBeenCalledWith(
      ActionName.CLEAN_HTML,
      expect.any(Function)
    );
  });

  it("should register SAVE_NOTE action", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    expect(mockCreateActionRegistration).toHaveBeenCalledWith(
      ActionName.SAVE_NOTE,
      expect.any(Function)
    );
  });

  it("should register SCHEDULE_ALL_FOLLOWUP_TASKS action", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    expect(mockCreateActionRegistration).toHaveBeenCalledWith(
      ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
      expect.any(Function)
    );
  });

  it("should register PROCESS_SOURCE action", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    expect(mockCreateActionRegistration).toHaveBeenCalledWith(
      ActionName.PROCESS_SOURCE,
      expect.any(Function)
    );
  });

  it("should call createActionRegistration exactly 6 times", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    expect(mockCreateActionRegistration).toHaveBeenCalledTimes(7);
  });

  it("should register actions in the correct order", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    const calls = mockCreateActionRegistration.mock.calls;
    expect(calls[0]?.[0]).toBe(ActionName.PARSE_HTML);
    expect(calls[1]?.[0]).toBe(ActionName.CLEAN_HTML);
    expect(calls[2]?.[0]).toBe(ActionName.SAVE_NOTE);
    expect(calls[3]?.[0]).toBe(ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS);
    expect(calls[4]?.[0]).toBe(ActionName.PROCESS_SOURCE);
    expect(calls[5]?.[0]).toBe(ActionName.SCHEDULE_INSTRUCTION_LINES);
  });

  it("should pass the correct action classes to createActionRegistration", async () => {
    // Import the actual action classes after mocking
    const { ParseHtmlAction } = await import(
      "../../note/actions/parse-html/action"
    );
    const { CleanHtmlAction } = await import(
      "../../note/actions/clean-html/action"
    );
    const { SaveNoteAction } = await import(
      "../../note/actions/save-note/action"
    );
    const { ScheduleAllFollowupTasksAction } = await import(
      "../../note/actions/schedule-tasks/action"
    );
    const { ProcessSourceAction } = await import(
      "../../note/actions/process-source/action"
    );
    const { ScheduleInstructionsAction } = await import(
      "../../note/actions/schedule-instructions/action"
    );
    const { CheckDuplicatesAction } = await import(
      "../../note/actions/check-duplicates/action"
    );

    // Act
    registerNoteActions(mockFactory);

    // Assert
    const calls = mockCreateActionRegistration.mock.calls;
    expect(calls[0]?.[1]).toBe(ParseHtmlAction);
    expect(calls[1]?.[1]).toBe(CleanHtmlAction);
    expect(calls[2]?.[1]).toBe(SaveNoteAction);
    expect(calls[3]?.[1]).toBe(ScheduleAllFollowupTasksAction);
    expect(calls[4]?.[1]).toBe(ProcessSourceAction);
    expect(calls[5]?.[1]).toBe(ScheduleInstructionsAction);
    expect(calls[6]?.[1]).toBe(CheckDuplicatesAction);
  });

  it("should return void", () => {
    // Act
    const result = registerNoteActions(mockFactory);

    // Assert
    expect(result).toBeUndefined();
  });

  it("should handle factory parameter correctly", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    expect(mockRegisterActions).toHaveBeenCalledWith(
      mockFactory,
      expect.any(Array)
    );
  });

  it("should create action registrations with correct structure", () => {
    // Setup mock to return different values for each call
    const mockRegistrations = [
      { name: ActionName.PARSE_HTML, factory: vi.fn() },
      { name: ActionName.CLEAN_HTML, factory: vi.fn() },
      { name: ActionName.SAVE_NOTE, factory: vi.fn() },
      { name: ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS, factory: vi.fn() },
      { name: ActionName.PROCESS_SOURCE, factory: vi.fn() },
      { name: ActionName.SCHEDULE_INSTRUCTION_LINES, factory: vi.fn() },
      { name: ActionName.CHECK_DUPLICATES, factory: vi.fn() },
    ];

    mockCreateActionRegistration
      .mockReturnValueOnce(mockRegistrations[0])
      .mockReturnValueOnce(mockRegistrations[1])
      .mockReturnValueOnce(mockRegistrations[2])
      .mockReturnValueOnce(mockRegistrations[3])
      .mockReturnValueOnce(mockRegistrations[4])
      .mockReturnValueOnce(mockRegistrations[5])
      .mockReturnValueOnce(mockRegistrations[6]);

    // Act
    registerNoteActions(mockFactory);

    // Assert
    const registeredActions = mockRegisterActions.mock.calls[0]?.[1];
    expect(registeredActions).toEqual(mockRegistrations);
  });

  it("should work with different factory instances", () => {
    // Arrange
    const anotherFactory = new ActionFactory<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >();

    // Act
    registerNoteActions(anotherFactory);

    // Assert
    expect(mockRegisterActions).toHaveBeenCalledWith(
      anotherFactory,
      expect.any(Array)
    );
  });

  it("should maintain type safety with NotePipelineData and NoteWorkerDependencies", () => {
    // This test ensures TypeScript compilation works correctly
    // The function should accept the correct generic types
    const typedFactory: ActionFactory<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    > = mockFactory;

    // Act & Assert - should not throw TypeScript errors
    expect(() => registerNoteActions(typedFactory)).not.toThrow();
  });
});
