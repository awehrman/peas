import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ProcessSourceData, ProcessSourceDeps } from "./types";

export class ProcessSourceAction extends BaseAction<
  ProcessSourceData,
  ProcessSourceDeps
> {
  name = "process_source";

  async execute(
    data: ProcessSourceData,
    deps: ProcessSourceDeps,
    context: ActionContext
  ) {
    console.log(
      `[${context.operation.toUpperCase()}] Processing source: ${data.title || "Untitled"}`
    );

    // Process the source using the injected dependency
    const processedSource = await deps.sourceProcessor.processSource(data);

    console.log(
      `[${context.operation.toUpperCase()}] Source processing completed: ${(processedSource.processedData as any)?.title || "Unknown"}` // eslint-disable-line @typescript-eslint/no-explicit-any -- Access unknown processed data structure
    );

    return {
      ...data,
      source: processedSource,
    };
  }
}
