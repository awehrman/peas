import { IServiceContainer } from "../services/container";
import { WorkerFactory, createWorkerFactory } from "./factory";

export interface WorkerManager {
  startAllWorkers(): void;
  stopAllWorkers(): Promise<void>;
  getWorkerStatus(): Record<string, boolean>;
}

export class DefaultWorkerManager implements WorkerManager {
  private workers: Map<string, any> = new Map();
  private workerFactory: WorkerFactory;

  constructor(private container: IServiceContainer) {
    this.workerFactory = createWorkerFactory(container);
  }

  startAllWorkers(): void {
    try {
      // Start note worker
      const noteWorker = this.workerFactory.createNoteWorker(
        this.container.queues.noteQueue
      );
      this.workers.set("note", noteWorker);

      // Start ingredient worker
      const ingredientWorker = this.workerFactory.createIngredientWorker(
        this.container.queues.ingredientQueue
      );
      this.workers.set("ingredient", ingredientWorker);

      // Start instruction worker
      const instructionWorker = this.workerFactory.createInstructionWorker(
        this.container.queues.instructionQueue
      );
      this.workers.set("instruction", instructionWorker);

      // Start image worker
      const imageWorker = this.workerFactory.createImageWorker(
        this.container.queues.imageQueue
      );
      this.workers.set("image", imageWorker);

      // Start categorization worker
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
      const stopPromises = Array.from(this.workers.values()).map(
        async (worker) => {
          if (worker && typeof worker.close === "function") {
            await worker.close();
          }
        }
      );

      await Promise.allSettled(stopPromises);
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

// Factory function to create worker manager
export function createWorkerManager(
  container: IServiceContainer
): WorkerManager {
  return new DefaultWorkerManager(container);
}
