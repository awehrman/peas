import { WorkerAction } from "./types";

/**
 * Type for action creators that can create actions with dependencies
 */
export type ActionCreator<TData = unknown, TDeps = unknown> = (
  deps?: TDeps
) => WorkerAction<TData, TDeps>;

/**
 * ActionFactory allows registering and creating actions by name.
 * Supports dependency injection and singleton/per-job instantiation.
 */
export class ActionFactory {
  private registry = new Map<string, ActionCreator<unknown, unknown>>();

  /**
   * Register an action constructor by name.
   * @param name Unique action name
   * @param creator Function that returns a new action instance
   */
  register<TData = unknown, TDeps = unknown>(
    name: string,
    creator: ActionCreator<TData, TDeps>
  ): void {
    // Allow re-registration - this is safe for multiple worker instances
    this.registry.set(name, creator as ActionCreator<unknown, unknown>);
  }

  /**
   * Create an action by name, injecting dependencies if needed.
   * @param name Action name
   * @param deps Dependencies to inject
   */
  create<TData = unknown, TDeps = unknown>(
    name: string,
    deps?: TDeps
  ): WorkerAction<TData, TDeps> {
    const creator = this.registry.get(name);
    if (!creator) {
      throw new Error(
        `Action '${name}' is not registered in the ActionFactory.`
      );
    }
    return creator(deps) as WorkerAction<TData, TDeps>;
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
