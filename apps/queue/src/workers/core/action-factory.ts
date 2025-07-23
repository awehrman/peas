import type { ActionName } from "../../types";
import type { BaseAction, WorkerAction } from "../types";

/**
 * Action factory for creating and managing actions with consistent patterns
 */
export class ActionFactory<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
> {
  private actions = new Map<
    ActionName,
    () => BaseAction<TData, TDeps, TResult>
  >();
  private wrappers = new Map<
    ActionName,
    Array<
      (
        action: BaseAction<TData, TDeps, TResult>
      ) => BaseAction<TData, TDeps, TResult>
    >
  >();

  /**
   * Register a new action with the factory
   */
  register(
    name: ActionName,
    factory: () => BaseAction<TData, TDeps, TResult>
  ): void {
    this.actions.set(name, factory);
  }

  /**
   * Register an action with wrappers (retry, error handling, etc.)
   */
  registerWithWrappers(
    name: ActionName,
    factory: () => BaseAction<TData, TDeps, TResult>,
    wrappers: Array<
      (
        action: BaseAction<TData, TDeps, TResult>
      ) => BaseAction<TData, TDeps, TResult>
    >
  ): void {
    this.register(name, factory);
    this.wrappers.set(name, wrappers);
  }

  /**
   * Create an action instance with optional wrappers
   */
  create(name: ActionName, _deps: TDeps): WorkerAction<TData, TDeps, TResult> {
    const factory = this.actions.get(name);
    if (!factory) {
      throw new Error(`Action '${name}' not registered`);
    }

    let action = factory();
    const actionWrappers = this.wrappers.get(name);

    if (actionWrappers) {
      action = actionWrappers.reduce(
        (wrappedAction, wrapper) => wrapper(wrappedAction),
        action
      );
    }

    return action;
  }

  /**
   * Check if an action is registered
   */
  has(name: ActionName): boolean {
    return this.actions.has(name);
  }

  /**
   * Get all registered action names
   */
  getRegisteredActions(): ActionName[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Clear all registered actions (useful for testing)
   */
  clear(): void {
    this.actions.clear();
    this.wrappers.clear();
  }
}
