import { Queue } from "bullmq";
import { IContainer } from "../di";
import { setupNoteWorker } from "./note";
import { setupIngredientWorker } from "./ingredient";
import { setupInstructionWorker } from "./instruction";
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
  constructor(private container: IContainer) {}

  createNoteWorker(queue: Queue) {
    return setupNoteWorker(queue);
  }

  createIngredientWorker(queue: Queue) {
    return setupIngredientWorker(queue);
  }

  createInstructionWorker(queue: Queue) {
    return setupInstructionWorker(queue);
  }

  createImageWorker(queue: Queue) {
    return setupImageWorker(queue);
  }

  createCategorizationWorker(queue: Queue) {
    return setupCategorizationWorker(queue);
  }
}

// Factory function to create worker factory with container
export function createWorkerFactory(container: IContainer): WorkerFactory {
  return new DefaultWorkerFactory(container);
}
