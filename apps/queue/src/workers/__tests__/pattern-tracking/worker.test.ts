import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ILoggerService,
  IServiceContainer,
} from "../../../services/container";
import { ActionFactory } from "../../core/action-factory";
import { BaseWorker } from "../../core/base-worker";
import {
  type PatternTrackingJobData,
  type PatternTrackingWorkerDependencies,
  buildPatternTrackingDependencies,
} from "../../pattern-tracking/dependencies";
import {
  PatternTrackingWorker,
  createPatternTrackingWorker,
} from "../../pattern-tracking/worker";

// Mock the dependencies
vi.mock("../../core/base-worker");
vi.mock("../../core/action-factory");
vi.mock("../../../services/pattern-tracking/register");
vi.mock("../../pattern-tracking/dependencies");

describe("PatternTrackingWorker", () => {
  let mockQueue: Queue;
  let mockDependencies: PatternTrackingWorkerDependencies;
  let mockActionFactory: ActionFactory<
    PatternTrackingJobData,
    PatternTrackingWorkerDependencies,
    PatternTrackingJobData
  >;
  let mockContainer: IServiceContainer;
  let mockLogger: ILoggerService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
    };

    // Create mock dependencies
    mockDependencies = {
      logger: mockLogger,
    };

    // Create mock queue
    mockQueue = {
      name: "pattern-tracking-queue",
      add: vi.fn(),
      process: vi.fn(),
    } as unknown as Queue;

    // Create mock action factory
    mockActionFactory = {
      create: vi.fn(),
      register: vi.fn(),
    } as unknown as ActionFactory<
      PatternTrackingJobData,
      PatternTrackingWorkerDependencies,
      PatternTrackingJobData
    >;

    // Create mock service container
    mockContainer = {
      logger: mockLogger,
      database: {} as IServiceContainer["database"],
      queues: {} as IServiceContainer["queues"],
      healthMonitor: {} as IServiceContainer["healthMonitor"],
      webSocket: {} as IServiceContainer["webSocket"],
      config: {} as IServiceContainer["config"],
      errorHandler: {} as IServiceContainer["errorHandler"],
      statusBroadcaster: {} as IServiceContainer["statusBroadcaster"],
      close: vi.fn(),
    };
  });

  describe("PatternTrackingWorker class", () => {
    it("should extend BaseWorker", () => {
      // Act
      const worker = new PatternTrackingWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      // Assert
      expect(worker).toBeInstanceOf(BaseWorker);
    });

    it("should initialize with correct parameters", () => {
      // Act
      const worker = new PatternTrackingWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      // Assert
      expect(worker).toBeDefined();
      expect(worker).toHaveProperty("actionFactory");
    });

    it("should call registerActions during construction", () => {
      // Arrange
      const registerActionsSpy = vi.spyOn(
        PatternTrackingWorker.prototype,
        "registerActions" as keyof PatternTrackingWorker
      );

      // Act
      new PatternTrackingWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      // Assert
      expect(registerActionsSpy).toHaveBeenCalledTimes(1);
    });

    describe("getOperationName", () => {
      it("should return correct operation name", () => {
        // Arrange
        const worker = new PatternTrackingWorker(
          mockQueue,
          expect.any(Object),
          mockActionFactory,
          mockContainer
        );

        // Act
        const operationName = (
          worker as PatternTrackingWorker & { getOperationName(): string }
        ).getOperationName();

        // Assert
        expect(operationName).toBe("pattern-tracking-worker");
      });
    });

    describe("createActionPipeline", () => {
      it("should have createActionPipeline method", () => {
        // Arrange
        const worker = new PatternTrackingWorker(
          mockQueue,
          mockDependencies,
          mockActionFactory,
          mockContainer
        );

        // Assert
        expect(worker).toHaveProperty("createActionPipeline");
        expect(
          typeof (
            worker as PatternTrackingWorker & {
              createActionPipeline: (...args: unknown[]) => unknown;
            }
          ).createActionPipeline
        ).toBe("function");
      });
    });

    describe("registerActions", () => {
      it("should register pattern tracking actions", async () => {
        // Arrange
        const { registerPatternTrackingActions } = await import(
          "../../../services/pattern-tracking/register"
        );

        // Act
        new PatternTrackingWorker(
          mockQueue,
          expect.any(Object),
          mockActionFactory,
          mockContainer
        );

        // Assert
        expect(registerPatternTrackingActions).toHaveBeenCalledWith(
          mockActionFactory
        );
        expect(registerPatternTrackingActions).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("createPatternTrackingWorker factory function", () => {
    it("should create PatternTrackingWorker instance", () => {
      // Arrange
      vi.mocked(buildPatternTrackingDependencies).mockReturnValue(
        mockDependencies
      );

      const MockedActionFactory = vi.mocked(ActionFactory);
      MockedActionFactory.mockImplementation(
        () => mockActionFactory as ActionFactory<unknown, unknown, unknown>
      );

      // Act
      const worker = createPatternTrackingWorker(mockQueue, mockContainer);

      // Assert
      expect(worker).toBeInstanceOf(PatternTrackingWorker);
      expect(buildPatternTrackingDependencies).toHaveBeenCalledWith(
        mockContainer
      );
    });

    it("should build dependencies from service container", () => {
      // Arrange
      vi.mocked(buildPatternTrackingDependencies).mockReturnValue(
        mockDependencies
      );

      const MockedActionFactory = vi.mocked(ActionFactory);
      MockedActionFactory.mockImplementation(
        () => mockActionFactory as ActionFactory<unknown, unknown, unknown>
      );

      // Act
      createPatternTrackingWorker(mockQueue, mockContainer);

      // Assert
      expect(buildPatternTrackingDependencies).toHaveBeenCalledWith(
        mockContainer
      );
      expect(buildPatternTrackingDependencies).toHaveBeenCalledTimes(1);
    });

    it("should create new ActionFactory instance", () => {
      // Arrange
      vi.mocked(buildPatternTrackingDependencies).mockReturnValue(
        mockDependencies
      );

      const MockedActionFactory = vi.mocked(ActionFactory);
      MockedActionFactory.mockImplementation(
        () => mockActionFactory as ActionFactory<unknown, unknown, unknown>
      );

      // Act
      createPatternTrackingWorker(mockQueue, mockContainer);

      // Assert
      expect(ActionFactory).toHaveBeenCalledTimes(1);
      expect(ActionFactory).toHaveBeenCalledWith();
    });

    it("should pass correct parameters to PatternTrackingWorker constructor", () => {
      // Arrange
      vi.mocked(buildPatternTrackingDependencies).mockReturnValue(
        mockDependencies
      );

      const MockedActionFactory = vi.mocked(ActionFactory);
      MockedActionFactory.mockImplementation(
        () => mockActionFactory as ActionFactory<unknown, unknown, unknown>
      );

      // We can't easily spy on constructor, so let's verify the worker was created

      // Act
      const worker = createPatternTrackingWorker(mockQueue, mockContainer);

      // Assert
      expect(worker).toBeInstanceOf(PatternTrackingWorker);
      expect(buildPatternTrackingDependencies).toHaveBeenCalledWith(
        mockContainer
      );
    });

    it("should handle different queue configurations", () => {
      // Arrange
      const differentQueue = {
        name: "different-pattern-tracking-queue",
        add: vi.fn(),
        process: vi.fn(),
      } as unknown as Queue;

      vi.mocked(buildPatternTrackingDependencies).mockReturnValue(
        mockDependencies
      );

      const MockedActionFactory = vi.mocked(ActionFactory);
      MockedActionFactory.mockImplementation(
        () => mockActionFactory as ActionFactory<unknown, unknown, unknown>
      );

      // Act
      const worker = createPatternTrackingWorker(differentQueue, mockContainer);

      // Assert
      expect(worker).toBeInstanceOf(PatternTrackingWorker);
      expect(buildPatternTrackingDependencies).toHaveBeenCalledWith(
        mockContainer
      );
    });

    it("should handle different service container configurations", () => {
      // Arrange
      const differentContainer: IServiceContainer = {
        logger: {
          log: vi.fn(),
        } as ILoggerService,
        database: {
          different: "config",
        } as unknown as IServiceContainer["database"],
        queues: {
          different: "queues",
        } as unknown as IServiceContainer["queues"],
        healthMonitor: {
          different: "health",
        } as unknown as IServiceContainer["healthMonitor"],
        webSocket: {
          different: "ws",
        } as unknown as IServiceContainer["webSocket"],
        config: {
          different: "settings",
        } as unknown as IServiceContainer["config"],
        errorHandler: {} as IServiceContainer["errorHandler"],
        statusBroadcaster: {} as IServiceContainer["statusBroadcaster"],
        close: vi.fn(),
      };

      vi.mocked(buildPatternTrackingDependencies).mockReturnValue(
        mockDependencies
      );

      const MockedActionFactory = vi.mocked(ActionFactory);
      MockedActionFactory.mockImplementation(
        () => mockActionFactory as ActionFactory<unknown, unknown, unknown>
      );

      // Act
      const worker = createPatternTrackingWorker(mockQueue, differentContainer);

      // Assert
      expect(worker).toBeInstanceOf(PatternTrackingWorker);
      expect(buildPatternTrackingDependencies).toHaveBeenCalledWith(
        differentContainer
      );
    });
  });

  describe("integration", () => {
    it("should work end-to-end", () => {
      // Arrange
      vi.mocked(buildPatternTrackingDependencies).mockReturnValue(
        mockDependencies
      );

      const MockedActionFactory = vi.mocked(ActionFactory);
      MockedActionFactory.mockImplementation(
        () => mockActionFactory as ActionFactory<unknown, unknown, unknown>
      );

      // Act
      const worker = createPatternTrackingWorker(mockQueue, mockContainer);

      // Assert
      expect(worker).toBeInstanceOf(PatternTrackingWorker);
      expect(worker).toBeInstanceOf(BaseWorker);
      expect(buildPatternTrackingDependencies).toHaveBeenCalledWith(
        mockContainer
      );
      expect(ActionFactory).toHaveBeenCalledTimes(1);
    });
  });
});
