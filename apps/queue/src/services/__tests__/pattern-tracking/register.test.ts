import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import { ActionFactory } from "../../../workers/core/action-factory";
import type {
  PatternTrackingJobData,
  PatternTrackingWorkerDependencies,
} from "../../../workers/pattern-tracking/dependencies";
import { registerPatternTrackingActions } from "../../pattern-tracking/register";

// Mock the action registry functions
vi.mock("../../../workers/shared/action-registry", () => ({
  createActionRegistration: vi.fn(),
  registerActions: vi.fn(),
}));

// Mock the TrackPatternAction
vi.mock("../../pattern-tracking/actions/track-pattern/action", () => ({
  TrackPatternAction: vi.fn(),
}));

describe("Pattern Tracking Register", () => {
  let mockFactory: ActionFactory<
    PatternTrackingJobData,
    PatternTrackingWorkerDependencies,
    PatternTrackingJobData
  >;
  let mockCreateActionRegistration: ReturnType<typeof vi.fn>;
  let mockRegisterActions: ReturnType<typeof vi.fn>;
  let mockTrackPatternAction: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockFactory = {
      registerAction: vi.fn(),
    } as unknown as ActionFactory<
      PatternTrackingJobData,
      PatternTrackingWorkerDependencies,
      PatternTrackingJobData
    >;

    // Get the mocked functions
    const actionRegistryModule = await import(
      "../../../workers/shared/action-registry"
    );
    mockCreateActionRegistration = vi.mocked(actionRegistryModule.createActionRegistration);
    mockRegisterActions = vi.mocked(actionRegistryModule.registerActions);

    const trackPatternModule = await import(
      "../../pattern-tracking/actions/track-pattern/action"
    );
    mockTrackPatternAction = vi.mocked(trackPatternModule.TrackPatternAction);

    // Setup default mock implementations
    mockCreateActionRegistration.mockReturnValue({
      name: ActionName.TRACK_PATTERN,
      actionClass: mockTrackPatternAction,
    });
  });

  describe("registerPatternTrackingActions", () => {
    it("should register pattern tracking actions successfully", () => {
      registerPatternTrackingActions(mockFactory);

      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.TRACK_PATTERN,
        mockTrackPatternAction
      );

      expect(mockRegisterActions).toHaveBeenCalledWith(mockFactory, [
        {
          name: ActionName.TRACK_PATTERN,
          actionClass: mockTrackPatternAction,
        },
      ]);
    });

    it("should throw error when factory is null", () => {
      expect(() => registerPatternTrackingActions(null as unknown as ActionFactory<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >)).toThrow(
        "Invalid factory"
      );
    });

    it("should throw error when factory is undefined", () => {
      expect(() => registerPatternTrackingActions(undefined as unknown as ActionFactory<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >)).toThrow(
        "Invalid factory"
      );
    });

    it("should throw error when factory is not an object", () => {
      expect(() => registerPatternTrackingActions("not-an-object" as unknown as ActionFactory<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >)).toThrow(
        "Invalid factory"
      );
    });

    it("should throw error when factory is a number", () => {
      expect(() => registerPatternTrackingActions(123 as unknown as ActionFactory<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >)).toThrow(
        "Invalid factory"
      );
    });

    it("should throw error when factory is a boolean", () => {
      expect(() => registerPatternTrackingActions(true as unknown as ActionFactory<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >)).toThrow(
        "Invalid factory"
      );
    });

    it("should accept valid factory object", () => {
      const validFactory = {
        registerAction: vi.fn(),
        someOtherProperty: "value",
      } as unknown as ActionFactory<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      expect(() => registerPatternTrackingActions(validFactory)).not.toThrow();
    });
  });
});
