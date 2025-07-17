import { Queue } from "bullmq";
import { createNoteWorker } from "./note";
import { createImageWorker } from "./image";
import { createIngredientWorker } from "./ingredient";
import { createInstructionWorker } from "./instruction";
import { createCategorizationWorker } from "./categorization";
import { createSourceWorker } from "./source";
import type { IServiceContainer } from "../services/container";

/**
 * Start all workers for the given queues and service container
 * This function avoids circular dependencies by being called after the service container is fully initialized
 */
export function startWorkers(
  queues: {
    noteQueue: Queue;
    imageQueue: Queue;
    ingredientQueue: Queue;
    instructionQueue: Queue;
    categorizationQueue: Queue;
    sourceQueue: Queue;
  },
  serviceContainer: IServiceContainer
): void {
  try {
    // Create and start all workers
    const noteWorker = createNoteWorker(queues.noteQueue, serviceContainer);
    const imageWorker = createImageWorker(queues.imageQueue, serviceContainer);
    const ingredientWorker = createIngredientWorker(
      queues.ingredientQueue,
      serviceContainer
    );
    const instructionWorker = createInstructionWorker(
      queues.instructionQueue,
      serviceContainer
    );
    const categorizationWorker = createCategorizationWorker(
      queues.categorizationQueue,
      serviceContainer
    );
    const sourceWorker = createSourceWorker(
      queues.sourceQueue,
      serviceContainer
    );

    // Log successful worker startup
    serviceContainer.logger.log("✅ Note worker created and started");
    serviceContainer.logger.log("✅ Image worker created and started");
    serviceContainer.logger.log("✅ Ingredient worker created and started");
    serviceContainer.logger.log("✅ Instruction worker created and started");
    serviceContainer.logger.log("✅ Categorization worker created and started");
    serviceContainer.logger.log("✅ Source worker created and started");

    // Store workers for graceful shutdown (if needed)
    serviceContainer._workers = {
      noteWorker,
      imageWorker,
      ingredientWorker,
      instructionWorker,
      categorizationWorker,
      sourceWorker,
    };
  } catch (error) {
    serviceContainer.logger.log(
      `❌ Failed to start workers: ${error}`,
      "error"
    );
    throw error;
  }
}
