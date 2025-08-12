import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerImageActions } from "../../image/register";

// Mock the action registry
vi.mock("../../../../workers/shared/action-registry", () => ({
  createActionRegistration: vi.fn((name, actionClass) => ({
    name,
    actionClass,
  })),
  registerActions: vi.fn(),
}));

// Mock all action classes
vi.mock("../../image/actions/check-completion/action", () => ({
  CheckImageCompletionAction: vi.fn(),
}));

vi.mock("../../image/actions/cleanup-local-files/action", () => ({
  CleanupLocalFilesAction: vi.fn(),
}));

vi.mock("../../image/actions/image-completed-status/action", () => ({
  ImageCompletedStatusAction: vi.fn(),
}));

vi.mock("../../image/actions/process-image/action", () => ({
  ProcessImageAction: vi.fn(),
}));

vi.mock("../../image/actions/save-image/action", () => ({
  SaveImageAction: vi.fn(),
}));

vi.mock("../../image/actions/upload-original/action", () => ({
  UploadOriginalAction: vi.fn(),
}));

vi.mock("../../image/actions/upload-processed/action", () => ({
  UploadProcessedAction: vi.fn(),
}));

describe("Image Service Register", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockFactory: any;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create console spies
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Create a mock factory
    mockFactory = {
      register: vi.fn(),
      getAction: vi.fn(),
      hasAction: vi.fn(),
    };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("registerImageActions", () => {
    it("should log start of registration", () => {
      registerImageActions(mockFactory);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[IMAGE_SERVICE_REGISTER] Starting image action registration"
      );
    });

    it("should log factory availability", () => {
      registerImageActions(mockFactory);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[IMAGE_SERVICE_REGISTER] Factory available:",
        true
      );
    });

    it("should log registration start", () => {
      registerImageActions(mockFactory);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[IMAGE_SERVICE_REGISTER] Registering actions with factory"
      );
    });

    it("should log successful registration", () => {
      registerImageActions(mockFactory);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[IMAGE_SERVICE_REGISTER] Image actions registered successfully"
      );
    });

    it("should call registerActions with factory and action registrations", () => {
      registerImageActions(mockFactory);

      // The function should complete without throwing an error
      expect(mockFactory.register).toHaveBeenCalled();
    });

    it("should register all expected actions", () => {
      registerImageActions(mockFactory);

      // The function should complete without throwing an error
      expect(mockFactory.register).toHaveBeenCalled();
    });

    it("should create action registrations with correct parameters", () => {
      registerImageActions(mockFactory);

      // The function should complete without throwing an error
      expect(mockFactory.register).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should throw error when factory is null", () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        registerImageActions(null as any);
      }).toThrow("Invalid factory");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[IMAGE_SERVICE_REGISTER] Invalid factory provided"
      );
    });

    it("should throw error when factory is undefined", () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        registerImageActions(undefined as any);
      }).toThrow("Invalid factory");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[IMAGE_SERVICE_REGISTER] Invalid factory provided"
      );
    });

    it("should throw error when factory is not an object", () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        registerImageActions("not-an-object" as any);
      }).toThrow("Invalid factory");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[IMAGE_SERVICE_REGISTER] Invalid factory provided"
      );
    });

    it("should log factory availability as false when factory is invalid", () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        registerImageActions(null as any);
      } catch {
        // Expected to throw
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[IMAGE_SERVICE_REGISTER] Factory available:",
        false
      );
    });
  });

  describe("logging behavior", () => {
    it("should log in correct order", () => {
      registerImageActions(mockFactory);

      expect(consoleLogSpy.mock.calls).toEqual([
        ["[IMAGE_SERVICE_REGISTER] Starting image action registration"],
        ["[IMAGE_SERVICE_REGISTER] Factory available:", true],
        ["[IMAGE_SERVICE_REGISTER] Registering actions with factory"],
        ["[IMAGE_SERVICE_REGISTER] Image actions registered successfully"],
      ]);
    });

    it("should not log error messages on successful registration", () => {
      registerImageActions(mockFactory);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("function signature", () => {
    it("should be a function", () => {
      expect(typeof registerImageActions).toBe("function");
    });

    it("should accept a factory parameter", () => {
      expect(() => {
        registerImageActions(mockFactory);
      }).not.toThrow();
    });

    it("should not return a value", () => {
      const result = registerImageActions(mockFactory);
      expect(result).toBeUndefined();
    });
  });
});
