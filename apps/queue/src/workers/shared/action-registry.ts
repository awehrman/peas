import { ActionFactory } from "../core/action-factory";
import type { BaseAction } from "../core/base-action";
import type { BaseJobData } from "../types";

/**
 * Generic action registration helper.
 * @template TData - The data type
 * @template TDeps - The dependencies type
 * @template TResult - The result type
 */
export interface ActionRegistration<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
  TResult = unknown,
> {
  name: string;
  factory: () => BaseAction<TData, TDeps, TResult>;
}

/**
 * Register multiple actions with an ActionFactory.
 * @template TData - The data type
 * @template TDeps - The dependencies type
 * @template TResult - The result type
 * @param factory - ActionFactory instance
 * @param actions - Array of action registrations
 */
export function registerActions<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
  TResult = unknown,
>(
  factory: ActionFactory<TData, TDeps, TResult>,
  actions: ActionRegistration<TData, TDeps, TResult>[]
): void {
  for (const action of actions) {
    factory.register(action.name, action.factory);
  }
}

/**
 * Create action registration object.
 * @template TData - The data type
 * @template TDeps - The dependencies type
 * @template TResult - The result type
 * @param name - Action name
 * @param actionClass - Action class constructor
 * @returns ActionRegistration object
 */
export function createActionRegistration<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
  TResult = unknown,
>(
  name: string,
  actionClass: new () => BaseAction<TData, TDeps, TResult>
): ActionRegistration<TData, TDeps, TResult> {
  return {
    name,
    factory: () => new actionClass(),
  };
}
