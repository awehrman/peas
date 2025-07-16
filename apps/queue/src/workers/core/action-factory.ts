import { WorkerAction } from "./types";

/**
 * ActionFactory allows registering and creating actions by name.
 * Supports dependency injection and singleton/per-job instantiation.
 */
export class ActionFactory {
  private registry = new Map<string, (deps?: any) => WorkerAction<any, any>>();

  /**
   * Register an action constructor by name.
   * @param name Unique action name
   * @param creator Function that returns a new action instance
   */
  register<TData = any, TDeps = any>(
    name: string,
    creator: (deps?: TDeps) => WorkerAction<TData, TDeps>
  ) {
    // Allow re-registration - this is safe for multiple worker instances
    this.registry.set(name, creator as any);
  }

  /**
   * Create an action by name, injecting dependencies if needed.
   * @param name Action name
   * @param deps Dependencies to inject
   */
  create<TData = any, TDeps = any>(
    name: string,
    deps?: TDeps
  ): WorkerAction<TData, TDeps> {
    const creator = this.registry.get(name);
    if (!creator) {
      throw new Error(
        `Action '${name}' is not registered in the ActionFactory.`
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
