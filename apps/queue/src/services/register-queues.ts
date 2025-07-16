import { Queue } from "bullmq";
import { createQueue } from "../queues/createQueue";

export interface IQueueService {
  noteQueue: Queue;
  imageQueue: Queue;
  ingredientQueue: Queue;
  instructionQueue: Queue;
  categorizationQueue: Queue;
  sourceQueue: Queue;
}

// Default queue service implementation
export class QueueService implements IQueueService {
  public readonly noteQueue: Queue;
  public readonly imageQueue: Queue;
  public readonly ingredientQueue: Queue;
  public readonly instructionQueue: Queue;
  public readonly categorizationQueue: Queue;
  public readonly sourceQueue: Queue;

  constructor() {
    this.noteQueue = createQueue("note");
    this.imageQueue = createQueue("image");
    this.ingredientQueue = createQueue("ingredient");
    this.instructionQueue = createQueue("instruction");
    this.categorizationQueue = createQueue("categorization");
    this.sourceQueue = createQueue("source");
  }
}

export function registerQueues(): IQueueService {
  return new QueueService();
}
