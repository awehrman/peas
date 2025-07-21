import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WORKER_CONSTANTS } from "../../../config/constants";
import {
  createMockActionContext,
  createMockErrorHandler,
  createMockServiceContainer,
} from "../../__tests__/test-utils";
import * as actions from "../actions";
import * as pipeline from "../pipeline";
import { IngredientWorker, createIngredientWorker } from "../worker";

describe("IngredientWorker", () => {
  let queue: Queue;
  let container: ReturnType<typeof createMockServiceContainer>;
  let worker: IngredientWorker;

  beforeEach(() => {
    queue = { add: vi.fn(), close: vi.fn() } as unknown as Queue;
    container = createMockServiceContainer();
    worker = new IngredientWorker(queue, {
      ...container,
      logger: container.logger,
      addStatusEventAndBroadcast: vi.fn(),
      database: container.database,
      categorizationQueue: container.queues.categorizationQueue,
      parseIngredient: vi.fn(),
      ErrorHandler: createMockErrorHandler(),
    });
    vi.clearAllMocks();
  });

  it("registerActions calls registerIngredientActions", () => {
    const spy = vi.spyOn(actions, "registerIngredientActions");
    worker["registerActions"]();
    expect(spy).toHaveBeenCalledWith(worker["actionFactory"]);
  });

  it("getOperationName returns correct value", () => {
    expect(worker["getOperationName"]()).toBe(
      WORKER_CONSTANTS.NAMES.INGREDIENT
    );
  });

  it("addStatusActions logs as expected", () => {
    const logSpy = vi.spyOn(worker["dependencies"].logger, "log");
    worker["addStatusActions"]([], {
      noteId: "note-1",
      ingredientLineId: "id",
      reference: "ref",
      blockIndex: 0,
      lineIndex: 0,
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "addStatusActions called with data: noteId=note-1"
      )
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skipping generic status actions")
    );
  });

  it("createActionPipeline delegates to createIngredientPipeline with correct context", () => {
    const spy = vi.spyOn(pipeline, "createIngredientPipeline");
    const data = {
      noteId: "note-1",
      ingredientLineId: "id",
      reference: "ref",
      blockIndex: 0,
      lineIndex: 0,
    };
    const ctx = createMockActionContext({ noteId: "note-1" });
    worker["createActionPipeline"](data, ctx);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        addStatusActions: expect.any(Function),
        createWrappedAction: expect.any(Function),
        createErrorHandledAction: expect.any(Function),
        dependencies: worker["dependencies"],
      }),
      data,
      ctx
    );
  });
});

describe("createIngredientWorker", () => {
  it("creates an IngredientWorker with correct dependencies", () => {
    const queue = { add: vi.fn(), close: vi.fn() } as unknown as Queue;
    const container = createMockServiceContainer();
    const worker = createIngredientWorker(queue, container);
    expect(worker).toBeInstanceOf(IngredientWorker);
    expect(worker["dependencies"].database).toBe(container.database);
    expect(worker["dependencies"].categorizationQueue).toBe(
      container.queues.categorizationQueue
    );
    expect(typeof worker["dependencies"].parseIngredient).toBe("function");
  });
});
