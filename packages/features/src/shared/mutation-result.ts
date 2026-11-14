export type MutationResult<TData = undefined> =
  | { success: true; message?: string; data?: TData }
  | { success: false; message: string };

export type MutationAction<TArgs extends unknown[], TData = undefined> = (
  ...args: TArgs
) => Promise<MutationResult<TData>>;
