/**
 * Injects standard status actions (processing and completed) into the pipeline.
 * Used by workers that require generic status reporting.
 *
 * @param actions - The pipeline actions array to mutate.
 * @param getOperationName - Function returning the operation name for logging.
 * @param logger - Logger dependency with a log method.
 */
import { CompletedStatusAction } from "./completed-status-action";
import { ProcessingStatusAction } from "./processing-status-action";

import type { BaseJobData } from "../../types";
import type { BaseAction } from "../base-action";

export default function injectStandardStatusActions<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
  TResult = unknown,
>(
  actions: BaseAction<TData, TDeps, TResult | void>[],
  getOperationName: () => string,
  logger: { log: (msg: string) => void }
): void {
  logger.log(`[${getOperationName().toUpperCase()}] Adding status actions`);
  actions.unshift(
    new ProcessingStatusAction<TData, TDeps>() as BaseAction<
      TData,
      TDeps,
      TResult | void
    >
  );
  actions.push(
    new CompletedStatusAction<TData, TDeps>() as BaseAction<
      TData,
      TDeps,
      TResult | void
    >
  );
}
