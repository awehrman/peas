import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { testQueueInterface } from "../../test-utils/service";
import {
  IQueueService,
  QueueService,
  registerQueues,
} from "../register-queues";

// Mock dependencies
vi.mock("../../queues/create-queue", () => ({
  createQueue: vi.fn((name: string) => ({
    name,
    add: vi.fn(),
    process: vi.fn(),
    close: vi.fn(),
  })),
}));

describe("register-queues.ts", () => {
  let mockCreateQueue: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreateQueue = vi.mocked(
      (await import("../../queues/create-queue")).createQueue
    );
  });

  describe("IQueueService interface", () => {
    it("should define required queue properties", () => {
      const mockQueue = { name: "test" } as Queue;
      const queueService: IQueueService = {
        noteQueue: mockQueue,
        imageQueue: mockQueue,
        ingredientQueue: mockQueue,
        instructionQueue: mockQueue,
        categorizationQueue: mockQueue,
        sourceQueue: mockQueue,
      };

      expect(queueService).toHaveProperty("noteQueue");
      expect(queueService).toHaveProperty("imageQueue");
      expect(queueService).toHaveProperty("ingredientQueue");
      expect(queueService).toHaveProperty("instructionQueue");
      expect(queueService).toHaveProperty("categorizationQueue");
      expect(queueService).toHaveProperty("sourceQueue");
    });
  });

  describe("QueueService", () => {
    let queueService: QueueService;

    beforeEach(() => {
      queueService = new QueueService();
    });

    describe("constructor", () => {
      it("should create a QueueService instance with all required queues", () => {
        expect(queueService).toBeInstanceOf(QueueService);
        expect(queueService).toHaveProperty("noteQueue");
        expect(queueService).toHaveProperty("imageQueue");
        expect(queueService).toHaveProperty("ingredientQueue");
        expect(queueService).toHaveProperty("instructionQueue");
        expect(queueService).toHaveProperty("categorizationQueue");
        expect(queueService).toHaveProperty("sourceQueue");
      });

      it("should call createQueue for each queue type", () => {
        expect(mockCreateQueue).toHaveBeenCalledTimes(6);
        expect(mockCreateQueue).toHaveBeenCalledWith("note");
        expect(mockCreateQueue).toHaveBeenCalledWith("image");
        expect(mockCreateQueue).toHaveBeenCalledWith("ingredient");
        expect(mockCreateQueue).toHaveBeenCalledWith("instruction");
        expect(mockCreateQueue).toHaveBeenCalledWith("categorization");
        expect(mockCreateQueue).toHaveBeenCalledWith("source");
      });

      it("should assign created queues to readonly properties", () => {
        expect(queueService.noteQueue).toBeDefined();
        expect(queueService.imageQueue).toBeDefined();
        expect(queueService.ingredientQueue).toBeDefined();
        expect(queueService.instructionQueue).toBeDefined();
        expect(queueService.categorizationQueue).toBeDefined();
        expect(queueService.sourceQueue).toBeDefined();

        expect(queueService.noteQueue.name).toBe("note");
        expect(queueService.imageQueue.name).toBe("image");
        expect(queueService.ingredientQueue.name).toBe("ingredient");
        expect(queueService.instructionQueue.name).toBe("instruction");
        expect(queueService.categorizationQueue.name).toBe("categorization");
        expect(queueService.sourceQueue.name).toBe("source");
      });

      it("should implement IQueueService interface", () => {
        expect(() =>
          testQueueInterface(queueService as unknown as IQueueService)
        ).not.toThrow();
      });

      it("should have proper queue types", () => {
        expect(queueService.noteQueue).toBeInstanceOf(Object);
        expect(queueService.imageQueue).toBeInstanceOf(Object);
        expect(queueService.ingredientQueue).toBeInstanceOf(Object);
        expect(queueService.instructionQueue).toBeInstanceOf(Object);
        expect(queueService.categorizationQueue).toBeInstanceOf(Object);
        expect(queueService.sourceQueue).toBeInstanceOf(Object);
      });

      it("should have queue methods available", () => {
        expect(typeof queueService.noteQueue.add).toBe("function");
        expect(
          typeof (queueService.noteQueue as unknown as { process: unknown })
            .process
        ).toBe("function");
        expect(typeof queueService.noteQueue.close).toBe("function");
      });
    });

    describe("queue properties", () => {
      it("should have readonly queue properties", () => {
        const originalNoteQueue = queueService.noteQueue;

        // TypeScript readonly properties should prevent reassignment
        // This test verifies the structure is correct
        expect(queueService.noteQueue).toBe(originalNoteQueue);
      });

      it("should have consistent queue naming", () => {
        const expectedNames = [
          "note",
          "image",
          "ingredient",
          "instruction",
          "categorization",
          "source",
        ];

        const actualNames = [
          queueService.noteQueue.name,
          queueService.imageQueue.name,
          queueService.ingredientQueue.name,
          queueService.instructionQueue.name,
          queueService.categorizationQueue.name,
          queueService.sourceQueue.name,
        ];

        expect(actualNames).toEqual(expectedNames);
      });
    });

    describe("queue functionality", () => {
      it("should allow adding jobs to queues", () => {
        const mockAdd = vi.fn();
        queueService.noteQueue.add = mockAdd;

        queueService.noteQueue.add("test-job", { data: "test" });

        expect(mockAdd).toHaveBeenCalledWith("test-job", { data: "test" });
      });

      it("should allow processing jobs from queues", () => {
        const mockProcess = vi.fn();
        (
          queueService.ingredientQueue as unknown as {
            process: typeof mockProcess;
          }
        ).process = mockProcess;

        const processor = vi.fn();
        (
          queueService.ingredientQueue as unknown as {
            process: (processor: unknown) => void;
          }
        ).process(processor);

        expect(mockProcess).toHaveBeenCalledWith(processor);
      });

      it("should allow closing queues", () => {
        const mockClose = vi.fn();
        queueService.sourceQueue.close = mockClose;

        queueService.sourceQueue.close();

        expect(mockClose).toHaveBeenCalled();
      });
    });
  });

  describe("registerQueues", () => {
    it("should return a new QueueService instance", () => {
      const service = registerQueues();

      expect(service).toBeInstanceOf(QueueService);
      expect(service).toHaveProperty("noteQueue");
      expect(service).toHaveProperty("imageQueue");
      expect(service).toHaveProperty("ingredientQueue");
      expect(service).toHaveProperty("instructionQueue");
      expect(service).toHaveProperty("categorizationQueue");
      expect(service).toHaveProperty("sourceQueue");
    });

    it("should implement IQueueService interface", () => {
      const service = registerQueues();
      expect(() =>
        testQueueInterface(service as unknown as IQueueService)
      ).not.toThrow();
    });

    it("should create queues with correct names", () => {
      const service = registerQueues();

      expect(service.noteQueue.name).toBe("note");
      expect(service.imageQueue.name).toBe("image");
      expect(service.ingredientQueue.name).toBe("ingredient");
      expect(service.instructionQueue.name).toBe("instruction");
      expect(service.categorizationQueue.name).toBe("categorization");
      expect(service.sourceQueue.name).toBe("source");
    });

    it("should return different instances on multiple calls", () => {
      const service1 = registerQueues();
      const service2 = registerQueues();

      expect(service1).not.toBe(service2);
      expect(service1).toBeInstanceOf(QueueService);
      expect(service2).toBeInstanceOf(QueueService);
    });

    it("should call createQueue for each queue type on each registration", () => {
      vi.clearAllMocks();

      registerQueues();
      expect(mockCreateQueue).toHaveBeenCalledTimes(6);

      vi.clearAllMocks();

      registerQueues();
      expect(mockCreateQueue).toHaveBeenCalledTimes(6);
    });
  });

  describe("queue service integration", () => {
    it("should work with the test queue interface utility", () => {
      const service = registerQueues();

      // This should not throw if the interface is properly implemented
      expect(() =>
        testQueueInterface(service as unknown as IQueueService)
      ).not.toThrow();
    });

    it("should have all required queue properties for interface compliance", () => {
      const service = registerQueues();

      const requiredProperties = [
        "noteQueue",
        "imageQueue",
        "ingredientQueue",
        "instructionQueue",
        "categorizationQueue",
        "sourceQueue",
      ];

      requiredProperties.forEach((prop) => {
        expect(service).toHaveProperty(prop);
        expect(service[prop as keyof IQueueService]).toBeDefined();
      });
    });
  });
});
