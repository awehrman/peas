import { serviceContainer } from "../services/container";
import type {
  TypedQueue,
  CategorizationJobData,
  CategorizationActionName,
} from "../types";

export const categorizationQueue: TypedQueue<
  CategorizationJobData,
  CategorizationActionName
> = serviceContainer.queues.categorizationQueue as TypedQueue<
  CategorizationJobData,
  CategorizationActionName
>;
