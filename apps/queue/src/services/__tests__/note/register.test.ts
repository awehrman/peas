import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../types/notes";
import { ActionFactory } from "../../../workers/core/action-factory";
import { registerNoteActions } from "../../note/register";

// Mock the action classes
vi.mock("../../note/parse-html", () => ({
  ParseHtmlAction: vi.fn().mockImplementation(() => ({
    name: ActionName.PARSE_HTML,
  })),
}));

vi.mock("../../note/clean-html", () => ({
  CleanHtmlAction: vi.fn().mockImplementation(() => ({
    name: ActionName.CLEAN_HTML,
  })),
}));

describe("registerNoteActions", () => {
  let mockFactory: ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >;
  let mockRegister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock register method
    mockRegister = vi.fn();

    // Create a mock ActionFactory with a register method
    mockFactory = {
      register: mockRegister,
    } as unknown as ActionFactory<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >;
  });

  it("should register all note actions with the factory", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    expect(mockRegister).toHaveBeenCalledTimes(3);

    // Check that PARSE_HTML action was registered
    expect(mockRegister).toHaveBeenCalledWith(
      ActionName.PARSE_HTML,
      expect.any(Function)
    );

    // Check that CLEAN_HTML action was registered
    expect(mockRegister).toHaveBeenCalledWith(
      ActionName.CLEAN_HTML,
      expect.any(Function)
    );

    // Check that SAVE_NOTE action was registered
    expect(mockRegister).toHaveBeenCalledWith(
      ActionName.SAVE_NOTE,
      expect.any(Function)
    );
  });

  it("should create action instances when factory methods are called", () => {
    // Act
    registerNoteActions(mockFactory);

    // Get the factory functions that were passed to register
    const parseHtmlCall = mockRegister.mock.calls.find(
      (call) => call[0] === ActionName.PARSE_HTML
    );
    const cleanHtmlCall = mockRegister.mock.calls.find(
      (call) => call[0] === ActionName.CLEAN_HTML
    );
    const saveNoteCall = mockRegister.mock.calls.find(
      (call) => call[0] === ActionName.SAVE_NOTE
    );

    // Assert
    expect(parseHtmlCall).toBeDefined();
    expect(cleanHtmlCall).toBeDefined();
    expect(saveNoteCall).toBeDefined();

    // Test that the factory functions create the correct action instances

    const parseHtmlAction = parseHtmlCall![1]();

    const cleanHtmlAction = cleanHtmlCall![1]();

    const saveNoteAction = saveNoteCall![1]();

    expect(parseHtmlAction.name).toBe(ActionName.PARSE_HTML);
    expect(cleanHtmlAction.name).toBe(ActionName.CLEAN_HTML);
    expect(saveNoteAction.name).toBe(ActionName.SAVE_NOTE);

    // Verify that the action instances were created successfully
    expect(parseHtmlAction).toBeDefined();
    expect(cleanHtmlAction).toBeDefined();
    expect(saveNoteAction).toBeDefined();
  });

  it("should register actions in the correct order", () => {
    // Act
    registerNoteActions(mockFactory);

    // Assert
    const calls = mockRegister.mock.calls;
    expect(calls).toHaveLength(3);

    // First call should be PARSE_HTML
    expect(calls?.[0]?.[0]).toBe(ActionName.PARSE_HTML);

    // Second call should be CLEAN_HTML
    expect(calls?.[1]?.[0]).toBe(ActionName.CLEAN_HTML);

    // Third call should be SAVE_NOTE
    expect(calls?.[2]?.[0]).toBe(ActionName.SAVE_NOTE);
  });

  it("should work with different factory instances", () => {
    // Arrange
    const mockFactory2 = {
      register: vi.fn(),
    } as unknown as ActionFactory<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >;

    // Act
    registerNoteActions(mockFactory);
    registerNoteActions(mockFactory2);

    // Assert
    expect(mockRegister).toHaveBeenCalledTimes(3);
    expect(mockFactory2.register).toHaveBeenCalledTimes(3);
  });

  it("should handle factory with additional methods without error", () => {
    // Arrange
    const extendedFactory = {
      register: mockRegister,
      has: vi.fn(),
      create: vi.fn(),
      clear: vi.fn(),
    } as unknown as ActionFactory<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >;

    // Act & Assert
    expect(() => registerNoteActions(extendedFactory)).not.toThrow();
    expect(mockRegister).toHaveBeenCalledTimes(3);
  });
});
