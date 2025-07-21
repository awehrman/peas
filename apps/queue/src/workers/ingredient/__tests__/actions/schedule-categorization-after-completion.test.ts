import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScheduleCategorizationAfterCompletionAction } from "../../actions/schedule-categorization-after-completion";
import type {
  IngredientJobData,
  ScheduleCategorizationAfterCompletionDeps,
} from "../../types";

interface TestContext {
  jobId: string;
  retryCount: number;
  queueName: string;
  noteId: string;
  operation: string;
  startTime: number;
  workerName: string;
  attemptNumber: number;
}

function createDeps(
  overrides: Partial<ScheduleCategorizationAfterCompletionDeps> = {}
): ScheduleCategorizationAfterCompletionDeps {
  return {
    categorizationQueue: {
      add: vi.fn().mockResolvedValue(undefined),
    },
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    logger: { log: vi.fn() },
    ...overrides,
  };
}

function createJobData(
  overrides: Partial<IngredientJobData> = {}
): IngredientJobData {
  return {
    ingredientLineId: "line-1",
    reference: "2 cups flour",
    blockIndex: 0,
    lineIndex: 0,
    noteId: "note-1",
    importId: "import-1",
    currentIngredientIndex: 3,
    totalIngredients: 5,
    ...overrides,
  };
}

describe("ScheduleCategorizationAfterCompletionAction", () => {
  let action: ScheduleCategorizationAfterCompletionAction;
  let deps: ScheduleCategorizationAfterCompletionDeps;
  let data: IngredientJobData;
  let context: TestContext;

  beforeEach(() => {
    action = new ScheduleCategorizationAfterCompletionAction();
    deps = createDeps();
    data = createJobData();
    context = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test",
      noteId: "note-1",
      operation: "schedule_categorization_after_completion",
      startTime: Date.now(),
      workerName: "worker",
      attemptNumber: 1,
    };
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("successfully schedules categorization and broadcasts status", async () => {
      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SCHEDULE_CATEGORIZATION] Scheduling categorization for note note-1 after ingredient completion"
        )
      );
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SCHEDULE_CATEGORIZATION] Successfully scheduled categorization for note note-1"
        )
      );

      // Verify categorization job was scheduled
      expect(deps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "note-1",
          title: "2 cups flour",
          content: "",
        }
      );

      // Verify status was broadcasted
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "note-1",
        noteId: "note-1",
        status: "PROCESSING",
        message: "Scheduled categorization after ingredient processing",
        context: "schedule_categorization_after_completion",
      });
    });

    it("handles categorization scheduling failure", async () => {
      const error = new Error("Queue connection failed");
      deps.categorizationQueue.add = vi.fn().mockRejectedValue(error);

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify error logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note note-1: Error: Queue connection failed"
        ),
        "error"
      );

      // Verify error status was broadcasted
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "note-1",
        noteId: "note-1",
        status: "FAILED",
        message:
          "Failed to schedule categorization: Error: Queue connection failed",
        context: "schedule_categorization_after_completion",
      });
    });

    it("handles non-Error exceptions during scheduling", async () => {
      deps.categorizationQueue.add = vi.fn().mockRejectedValue("String error");

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify error logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note note-1: String error"
        ),
        "error"
      );

      // Verify error status was broadcasted
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "note-1",
        noteId: "note-1",
        status: "FAILED",
        message: "Failed to schedule categorization: String error",
        context: "schedule_categorization_after_completion",
      });
    });

    it("handles missing reference in job data", async () => {
      data = createJobData({ reference: undefined });

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify categorization job was scheduled with undefined title
      expect(deps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "note-1",
          title: undefined,
          content: "",
        }
      );
    });

    it("handles empty reference in job data", async () => {
      data = createJobData({ reference: "" });

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify categorization job was scheduled with empty title
      expect(deps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "note-1",
          title: "",
          content: "",
        }
      );
    });

    it("handles complex job data with all fields", async () => {
      data = createJobData({
        ingredientLineId: "line-123",
        reference: "1/2 cup olive oil, extra virgin",
        blockIndex: 2,
        lineIndex: 5,
        noteId: "note-456",
        importId: "import-789",
        currentIngredientIndex: 10,
        totalIngredients: 15,
        options: {
          strictMode: true,
          allowPartial: false,
        },
      });

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify categorization job was scheduled with correct data
      expect(deps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "note-456",
          title: "1/2 cup olive oil, extra virgin",
          content: "",
        }
      );

      // Verify status was broadcasted with correct noteId
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "note-456",
        noteId: "note-456",
        status: "PROCESSING",
        message: "Scheduled categorization after ingredient processing",
        context: "schedule_categorization_after_completion",
      });
    });
  });
});
