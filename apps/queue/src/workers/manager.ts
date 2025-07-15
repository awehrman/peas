import { IServiceContainer } from "../services/container";
import { WorkerFactory, createWorkerFactory } from "./factory";

/**
 * Worker Manager Module
 *
 * This module provides a centralized way to manage the lifecycle of all queue workers
 * in the application. It handles starting, stopping, and monitoring the status of
 * different types of workers (note, ingredient, instruction, image, categorization).
 *
 * The manager uses dependency injection to accept a service container and an optional
 * worker factory, making it highly testable and flexible.
 */

export interface WorkerManager {
  startAllWorkers(): void;

  stopAllWorkers(): Promise<void>;

  getWorkerStatus(): Record<string, boolean>;
}

export interface WorkerLike {
  close?: () => Promise<void>;
}

export class DefaultWorkerManager implements WorkerManager {
  private workers: Map<string, WorkerLike> = new Map();
  private workerFactory: WorkerFactory;

  constructor(
    private container: IServiceContainer,
    workerFactory?: WorkerFactory
  ) {
    this.workerFactory = workerFactory ?? createWorkerFactory(container);
  }

  protected getWorkers() {
    return this.workers;
  }

  startAllWorkers(): void {
    try {
      const noteWorker = this.workerFactory.createNoteWorker(
        this.container.queues.noteQueue
      );
      this.workers.set("note", noteWorker);

      const ingredientWorker = this.workerFactory.createIngredientWorker(
        this.container.queues.ingredientQueue
      );
      this.workers.set("ingredient", ingredientWorker);

      const instructionWorker = this.workerFactory.createInstructionWorker(
        this.container.queues.instructionQueue
      );
      this.workers.set("instruction", instructionWorker);

      const imageWorker = this.workerFactory.createImageWorker(
        this.container.queues.imageQueue
      );
      this.workers.set("image", imageWorker);

      const categorizationWorker =
        this.workerFactory.createCategorizationWorker(
          this.container.queues.categorizationQueue
        );
      this.workers.set("categorization", categorizationWorker);

      this.container.logger.log("All workers started successfully");
    } catch (error) {
      this.container.logger.log(`Error starting workers: ${error}`, "error");
      throw error;
    }
  }

  async stopAllWorkers(): Promise<void> {
    try {
      // Create promises for all worker close operations
      const stopPromises = Array.from(this.workers.values()).map(
        async (worker) => {
          if (worker && typeof worker.close === "function") {
            await worker.close();
          }
        }
      );

      // Wait for all workers to close (some may fail, but we continue)
      await Promise.allSettled(stopPromises);

      // Clear the workers map regardless of individual results
      this.workers.clear();
      this.container.logger.log("All workers stopped successfully");
    } catch (error) {
      this.container.logger.log(`Error stopping workers: ${error}`, "error");
      throw error;
    }
  }

  getWorkerStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    for (const [name, worker] of this.workers.entries()) {
      status[name] = worker !== null && worker !== undefined;
    }

    return status;
  }
}

export function createWorkerManager(
  container: IServiceContainer,
  workerFactory?: WorkerFactory
): WorkerManager {
  return new DefaultWorkerManager(container, workerFactory);
}
