import { Queue } from "bullmq";
import { IServiceContainer } from "../services/container";
import { setupNoteWorker } from "./notes";
import { setupIngredientWorker } from "./ingredients";
import { setupInstructionWorker } from "./instructions";
import { setupImageWorker } from "./image";
import { setupCategorizationWorker } from "./categorization";

export interface WorkerFactory {
  createNoteWorker(queue: Queue): ReturnType<typeof setupNoteWorker>;
  createIngredientWorker(
    queue: Queue
  ): ReturnType<typeof setupIngredientWorker>;
  createInstructionWorker(
    queue: Queue
  ): ReturnType<typeof setupInstructionWorker>;
  createImageWorker(queue: Queue): ReturnType<typeof setupImageWorker>;
  createCategorizationWorker(
    queue: Queue
  ): ReturnType<typeof setupCategorizationWorker>;
}

export class DefaultWorkerFactory implements WorkerFactory {
  constructor(private container: IServiceContainer) {}

  createNoteWorker(queue: Queue) {
    return setupNoteWorker(queue, {
      ingredientQueue: this.container.queues.ingredientQueue,
      instructionQueue: this.container.queues.instructionQueue,
      imageQueue: this.container.queues.imageQueue,
      categorizationQueue: this.container.queues.categorizationQueue,
    });
  }

  createIngredientWorker(queue: Queue) {
    return setupIngredientWorker(queue);
  }

  createInstructionWorker(queue: Queue) {
    return setupInstructionWorker(queue, {
      ingredientQueue: this.container.queues.ingredientQueue,
      instructionQueue: this.container.queues.instructionQueue,
      imageQueue: this.container.queues.imageQueue,
      categorizationQueue: this.container.queues.categorizationQueue,
    });
  }

  createImageWorker(queue: Queue) {
    return setupImageWorker(queue);
  }

  createCategorizationWorker(queue: Queue) {
    return setupCategorizationWorker(queue);
  }
}

export function createWorkerFactory(
  container: IServiceContainer
): WorkerFactory {
  return new DefaultWorkerFactory(container);
}
