import { ActionFactory } from "../core/action-factory";
import type { BaseAction } from "../core/base-action";

/**
 * Generic action registration helper
 */
export interface ActionRegistration {
  name: string;
  factory: () => BaseAction<unknown, unknown>;
}

/**
 * Register multiple actions with an ActionFactory
 */
export function registerActions(
  factory: ActionFactory,
  actions: ActionRegistration[]
): void {
  for (const action of actions) {
    factory.register(action.name, action.factory);
  }
}

/**
 * Create action registration object
 */
export function createActionRegistration<TInput, TOutput>(
  name: string,
  actionClass: new () => BaseAction<TInput, TOutput>
): ActionRegistration {
  return {
    name,
    factory: () => new actionClass(),
  };
}
