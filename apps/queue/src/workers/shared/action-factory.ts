import { ActionFactory } from "../core/action-factory";
import type { BaseJobData } from "../types";

/**
 * Shared action factory that registers common actions used across workers
 */
export class SharedActionFactory {
  /**
   * Register error handling actions with the given action factory
   */
  static registerErrorHandlingActions<
    TData extends BaseJobData,
    TDeps extends object,
    TResult,
  >(_actionFactory: ActionFactory<TData, TDeps, TResult>): void {
    // Note: Error handling actions have specific types and cannot be easily
    // registered in a generic factory. They should be registered separately
    // in each worker that needs them.
  }

  /**
   * Create a standard action factory with common actions pre-registered
   */
  static createStandardFactory<
    TData extends BaseJobData,
    TDeps extends object,
    TResult,
  >(): ActionFactory<TData, TDeps, TResult> {
    const factory = new ActionFactory<TData, TDeps, TResult>();
    // Common actions can be registered here when needed
    return factory;
  }
}
