import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";
import { SaveSourceData, SaveSourceDeps } from "./types";

export class SaveSourceAction extends BaseAction<
  SaveSourceData,
  SaveSourceDeps
> {
  name = "save_source";

  async execute(
    data: SaveSourceData,
    deps: SaveSourceDeps,
    context: ActionContext
  ) {
    console.log(
      `[${context.operation.toUpperCase()}] Saving source: ${data.source?.processedData?.title || "Untitled"}`
    );

    // Save the source using the injected dependency
    const savedSource = await deps.database.saveSource(
      data.source.processedData
    );

    console.log(
      `[${context.operation.toUpperCase()}] Source saved successfully: ${savedSource.id}`
    );

    return {
      ...data,
      sourceId: savedSource.id,
      savedSource,
    };
  }
}
