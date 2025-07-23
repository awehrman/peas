import { WorkerAction } from "./types";

/**
 * Type for action creators that can create actions with dependencies
 */
export type ActionCreator<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
> = (deps?: TDeps) => WorkerAction<TData, TDeps, TResult>;

/**
 * ActionFactory allows registering and creating actions by name.
 * Supports dependency injection and singleton/per-job instantiation.
 */
export class ActionFactory<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
> {
  private registry = new Map<string, ActionCreator<TData, TDeps, TResult>>();

  /**
   * Register an action constructor by name.
   * @param name Unique action name
   * @param creator Function that returns a new action instance
   */
  register(name: string, creator: ActionCreator<TData, TDeps, TResult>): void {
    this.registry.set(name, creator);
  }

  /**
   * Create an action by name, injecting dependencies if needed.
   * @param name Action name
   * @param deps Dependencies to inject
   */
  create(name: string, deps?: TDeps): WorkerAction<TData, TDeps, TResult> {
    const creator = this.registry.get(name);
    if (!creator) {
      const available = Array.from(this.registry.keys()).join(", ");
      throw new Error(
        `Action '${name}' is not registered in the ActionFactory. Registered actions: [${available}]`
      );
    }
    return creator(deps);
  }

  /**
   * Check if an action is registered.
   */
  isRegistered(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * List all registered action names.
   */
  list(): string[] {
    return Array.from(this.registry.keys());
  }
}

// Singleton instance for convenience
export const globalActionFactory = new ActionFactory();
