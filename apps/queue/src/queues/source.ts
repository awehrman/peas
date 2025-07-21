import { serviceContainer } from "../services/container";
import type {
  TypedQueue,
  CategorizationJobData,
  SourceActionName,
} from "../types";

export const sourceQueue: TypedQueue<CategorizationJobData, SourceActionName> =
  serviceContainer.queues.sourceQueue as TypedQueue<
    CategorizationJobData,
    SourceActionName
  >;
