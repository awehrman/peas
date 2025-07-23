import type { ActionContext, WorkerAction } from "../types";

/**
 * Executes a pipeline of actions for a job, logging progress and returning the result.
 */
export async function processJob<TData, TDeps, TResult>(
  actions: WorkerAction<TData, TDeps, TResult>[],
  data: TData,
  context: ActionContext,
  logger: { log: (msg: string, level?: string) => void },
  getOperationName: () => string,
  dependencies: TDeps
): Promise<TResult> {
  let currentData: TData = data;
  const actionNames = actions.map((a) => {
    // Extract the actual action name from wrapper names
    if (a.name.includes("error_handling_wrapper(")) {
      return a.name.replace("error_handling_wrapper(", "").replace(")", "");
    }
    if (a.name.includes("retry_wrapper(")) {
      return a.name.replace("retry_wrapper(", "").replace(")", "");
    }
    return a.name;
  });
  logger.log(
    `[${getOperationName().toUpperCase()}] Executing ${actions.length} actions: ${actionNames.join(", ")}`
  );
  for (const action of actions) {
    const actionStartTime = Date.now();
    // Extract clean action name for logging
    let cleanActionName = action.name;
    if (action.name.includes("error_handling_wrapper(")) {
      cleanActionName = action.name
        .replace("error_handling_wrapper(", "")
        .replace(")", "");
    }
    if (action.name.includes("retry_wrapper(")) {
      cleanActionName = action.name
        .replace("retry_wrapper(", "")
        .replace(")", "");
    }
    logger.log(
      `[${getOperationName().toUpperCase()}] Data for action ${cleanActionName}: ${JSON.stringify(currentData)}`
    );
    const result = await action.execute(currentData, dependencies, context);
    // Update currentData for the next action, assuming the result is compatible with TData
    currentData = result as unknown as TData;
    const actionDuration = Date.now() - actionStartTime;
    logger.log(
      `[${getOperationName().toUpperCase()}] ✅ ${cleanActionName} (${actionDuration}ms)`
    );
  }
  return currentData as unknown as TResult;
}
