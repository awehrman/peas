import { Queue } from "bullmq";

import { createQueue } from "../queues/create-queue";
import { QueueName } from "../types";

export interface IQueueService {
  noteQueue: Queue;
  imageQueue: Queue;
  ingredientQueue: Queue;
  instructionQueue: Queue;
  categorizationQueue: Queue;
  sourceQueue: Queue;
  patternTrackingQueue: Queue;
}

// Default queue service implementation
export class QueueService implements IQueueService {
  public readonly noteQueue: Queue;
  public readonly imageQueue: Queue;
  public readonly ingredientQueue: Queue;
  public readonly instructionQueue: Queue;
  public readonly categorizationQueue: Queue;
  public readonly sourceQueue: Queue;
  public readonly patternTrackingQueue: Queue;

  constructor() {
    this.noteQueue = createQueue(QueueName.NOTE);
    this.imageQueue = createQueue(QueueName.IMAGE);
    this.ingredientQueue = createQueue(QueueName.INGREDIENT);
    this.instructionQueue = createQueue(QueueName.INSTRUCTION);
    this.categorizationQueue = createQueue(QueueName.CATEGORIZATION);
    this.sourceQueue = createQueue(QueueName.SOURCE);
    this.patternTrackingQueue = createQueue(QueueName.PATTERN_TRACKING);
  }
}

export function registerQueues(): IQueueService {
  return new QueueService();
}
