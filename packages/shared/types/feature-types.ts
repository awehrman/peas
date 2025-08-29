/**
 * Shared feature types and interfaces
 */

export interface FeatureConfig {
  name: string;
  version: string;
  enabled: boolean;
  dependencies: string[];
  config: Record<string, unknown>;
}

export interface FeatureDependency {
  name: string;
  version: string;
  required: boolean;
  optional?: boolean;
}

export interface FeatureContext {
  featureName: string;
  operation: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface FeatureState {
  isLoading: boolean;
  error?: Error;
  data?: unknown;
  lastUpdated?: string;
}

export interface FeatureOperation<T = unknown> {
  name: string;
  execute: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  retryable?: boolean;
  maxRetries?: number;
}

export interface FeatureHook<T = unknown> {
  state: FeatureState;
  operations: {
    execute: (operation: FeatureOperation<T>) => Promise<T>;
    reset: () => void;
    setData: (data: T) => void;
    setError: (error: Error) => void;
    setLoading: (loading: boolean) => void;
  };
}

export interface FeatureProvider<T = unknown> {
  featureName: string;
  context: FeatureContext;
  state: FeatureState;
  operations: {
    execute: (operation: FeatureOperation<T>) => Promise<T>;
    reset: () => void;
    setData: (data: T) => void;
    setError: (error: Error) => void;
    setLoading: (loading: boolean) => void;
  };
}

export interface FeatureRegistry {
  register: (feature: FeatureConfig) => void;
  unregister: (featureName: string) => void;
  get: (featureName: string) => FeatureConfig | undefined;
  getAll: () => FeatureConfig[];
  isRegistered: (featureName: string) => boolean;
  getDependencies: (featureName: string) => string[];
  checkDependencies: (featureName: string) => boolean;
}

export interface FeatureManager {
  registry: FeatureRegistry;
  enable: (featureName: string) => void;
  disable: (featureName: string) => void;
  isEnabled: (featureName: string) => boolean;
  getEnabledFeatures: () => string[];
  configure: (featureName: string, config: Record<string, unknown>) => void;
  getConfig: (featureName: string) => Record<string, unknown>;
}

export type FeatureStatus = 'idle' | 'loading' | 'success' | 'error';

export interface FeatureResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  status: FeatureStatus;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface FeatureEvent<T = unknown> {
  type: string;
  featureName: string;
  timestamp: string;
  data: T;
  metadata?: Record<string, unknown>;
}

export interface FeatureListener<T = unknown> {
  featureName: string;
  eventType: string;
  callback: (event: FeatureEvent<T>) => void;
  once?: boolean;
}

export interface FeatureEventEmitter {
  on: <T = unknown>(listener: FeatureListener<T>) => void;
  off: <T = unknown>(listener: FeatureListener<T>) => void;
  emit: <T = unknown>(event: FeatureEvent<T>) => void;
  removeAllListeners: (featureName?: string, eventType?: string) => void;
}

export interface FeatureModule<T = unknown> {
  name: string;
  version: string;
  exports: T;
  dependencies: FeatureDependency[];
  init?: () => Promise<void>;
  destroy?: () => Promise<void>;
}

export interface FeatureLoader {
  load: <T = unknown>(featureName: string) => Promise<FeatureModule<T>>;
  unload: (featureName: string) => Promise<void>;
  isLoaded: (featureName: string) => boolean;
  getLoadedModules: () => string[];
}

export const createFeatureContext = (
  featureName: string,
  operation: string,
  additional?: Partial<FeatureContext>
): FeatureContext => ({
  featureName,
  operation,
  timestamp: new Date().toISOString(),
  ...additional
});

export const createFeatureOperation = <T = unknown>(
  name: string,
  execute: () => Promise<T>,
  options?: Partial<FeatureOperation<T>>
): FeatureOperation<T> => ({
  name,
  execute,
  retryable: true,
  maxRetries: 3,
  ...options
});

export const createFeatureResult = <T = unknown>(
  success: boolean,
  data?: T,
  error?: Error,
  status: FeatureStatus = success ? 'success' : 'error'
): FeatureResult<T> => ({
  success,
  data,
  error,
  status,
  timestamp: new Date().toISOString()
});

export const createFeatureEvent = <T = unknown>(
  type: string,
  featureName: string,
  data: T,
  metadata?: Record<string, unknown>
): FeatureEvent<T> => ({
  type,
  featureName,
  timestamp: new Date().toISOString(),
  data,
  metadata
});
