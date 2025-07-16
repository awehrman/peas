import { BaseAction } from "./base-action";
import type { ActionContext } from "./types";
import type { ZodSchema, z } from "zod";

export abstract class ValidatedAction<
  Schema extends ZodSchema<any>,
  D,
  TOutput = unknown,
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
