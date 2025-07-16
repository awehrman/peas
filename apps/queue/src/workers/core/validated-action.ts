import { BaseAction } from "./base-action";
import type { ActionContext } from "./types";
import type { z } from "zod";
import type { ParseResult } from "../../schemas";

export abstract class ValidatedAction<
  Schema extends z.ZodTypeAny,
  D,
  TOutput = ParseResult,
> extends BaseAction<z.infer<Schema>, D> {
  constructor(public schema: Schema) {
    super();
  }

  async execute(
    data: z.infer<Schema>,
    deps: D,
    ctx: ActionContext
  ): Promise<TOutput> {
    const result = this.schema.safeParse(data);
    if (!result.success) {
      throw new Error(result.error.issues.map((i) => i.message).join(", "));
    }
    return this.run(result.data, deps, ctx);
  }

  // Subclasses implement this instead of execute
  abstract run(
    data: z.infer<Schema>,
    deps: D,
    ctx: ActionContext
  ): Promise<TOutput>;
}
