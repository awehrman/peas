# Core Worker System

The Core Worker System provides the foundational infrastructure for all workers in the queue processing system. It defines the base classes, interfaces, and utilities that enable consistent, reliable, and observable job processing.

## Overview

The core system provides:

- **Base Classes**: Abstract base classes for workers and actions
- **Action System**: Factory pattern for creating and managing actions
- **Caching**: In-memory caching for expensive operations
- **Metrics**: Performance monitoring and observability
- **Error Handling**: Comprehensive error management and recovery
- **Type Safety**: Strong TypeScript types for all components

## Architecture

```text
src/workers/core/
├── base-worker.ts        # Abstract base class for all workers
├── base-action.ts        # Abstract base class for all actions
├── action-factory.ts     # Factory for creating and managing actions
├── types.ts             # Core type definitions
├── cache.ts             # In-memory caching system
├── metrics.ts           # Performance metrics collection
├── errors.ts            # Error types and utilities
└── index.ts             # Barrel exports
```

## Key Components

### BaseWorker Class

The `BaseWorker` class provides the foundation for all workers:

```typescript
export abstract class BaseWorker<
  TData extends BaseJobData = BaseJobData,
  TDeps extends BaseWorkerDependencies = BaseWorkerDependencies,
>
```

**Features:**

- **Action Pipeline Management**: Executes actions in sequence with automatic wrapping
- **Dependency Injection**: Injects services and dependencies into actions
- **Error Handling**: Automatic retry logic and error recovery
- **Status Broadcasting**: Real-time status updates via WebSocket
- **Caching**: Intelligent caching for expensive operations
- **Metrics**: Performance monitoring and observability
- **Health Monitoring**: Built-in health checks and monitoring

**Key Methods:**

- `createActionPipeline()`: Define the action sequence
- `registerActions()`: Register actions with the factory
- `getOperationName()`: Return the worker's operation name
- `addStatusActions()`: Add status broadcasting to pipeline

### BaseAction Class

The `BaseAction` class provides the foundation for all actions:

```typescript
export abstract class BaseAction<TData = any, TDeps = any>
  implements WorkerAction<TData, TDeps>
```

**Features:**

- **Timing**: Automatic execution timing and performance tracking
- **Error Handling**: Built-in error handling with custom error handlers
- **Validation**: Input validation support
- **Configuration**: Configurable retry and priority settings
- **Type Safety**: Full TypeScript type safety

**Key Methods:**

- `execute()`: Main action logic (abstract)
- `executeWithTiming()`: Execute with timing and error handling
- `onError()`: Custom error handling
- `validateInput()`: Input validation
- `withConfig()`: Create configured action instance

### ActionFactory

The `ActionFactory` manages action creation and registration:

```typescript
export class ActionFactory {
  register<TData, TDeps>(
    name: string,
    creator: (deps?: TDeps) => WorkerAction<TData, TDeps>
  ): void;
  create<TData, TDeps>(name: string, deps?: TDeps): WorkerAction<TData, TDeps>;
  isRegistered(name: string): boolean;
  list(): string[];
}
```

**Features:**

- **Registration**: Register action constructors by name
- **Creation**: Create action instances with dependency injection
- **Discovery**: List registered actions
- **Validation**: Check if actions are registered

### Caching System

The `globalActionCache` provides intelligent caching:

```typescript
export const globalActionCache = new ActionCache();
```

**Features:**

- **TTL-based**: Automatic expiration of cached values
- **Key Generation**: Intelligent cache key generation
- **Memory Management**: Automatic cleanup of expired entries
- **Performance**: Fast in-memory access

### Metrics System

The `WorkerMetrics` class provides performance monitoring:

```typescript
export class WorkerMetrics {
  static recordActionExecutionTime(
    actionName: string,
    duration: number,
    success: boolean
  ): void;
  static recordJobProcessingTime(
    workerName: string,
    duration: number,
    success: boolean
  ): void;
  static getMetrics(): MetricsData;
  static clearOldMetrics(maxValues?: number): void;
}
```

**Features:**

- **Action Timing**: Track individual action performance
- **Job Timing**: Track overall job processing time
- **Success Rates**: Monitor success/failure rates
- **Memory Management**: Automatic cleanup of old metrics

### Error System

Comprehensive error types and utilities:

```typescript
export class ActionExecutionError extends Error {
  constructor(
    message: string,
    workerName: string,
    actionName: string,
    originalError: Error,
    jobId: string
  );
}
```

**Error Types:**

- `ActionExecutionError`: Action-level errors
- `WorkerError`: Worker-level errors
- `ValidationError`: Input validation errors
- `DependencyError`: Missing dependency errors

## Usage

### Creating a Worker

```typescript
export class MyWorker extends BaseWorker<MyJobData, MyDependencies> {
  protected registerActions(): void {
    this.actionFactory.register("my_action", () => new MyAction());
  }

  protected getOperationName(): string {
    return "my_operation";
  }

  protected createActionPipeline(
    data: MyJobData,
    context: ActionContext
  ): BaseAction<unknown, unknown>[] {
    const actions: BaseAction<unknown, unknown>[] = [];

    // Add status broadcasting (automatic if noteId exists)
    this.addStatusActions(actions, data);

    // Add your action pipeline with automatic wrapping
    actions.push(this.createWrappedAction("my_action", this.dependencies));

    return actions;
  }
}
```

### Creating an Action

```typescript
export class MyAction extends BaseAction<MyData, MyDeps> {
  name = "my_action";

  async execute(data: MyData, deps: MyDeps, context: ActionContext) {
    // Validate input
    const validationError = this.validateInput(data);
    if (validationError) {
      throw validationError;
    }

    // Your action logic here
    return result;
  }

  private validateInput(data: MyData): Error | null {
    // Validation logic
    return null;
  }
}
```

### Using the Action Factory

```typescript
// Register actions
const factory = new ActionFactory();
factory.register("my_action", () => new MyAction());

// Create actions with dependencies
const action = factory.create("my_action", dependencies);
```

## Configuration

The core system uses the centralized configuration:

```typescript
import { QUEUE_DEFAULTS, CACHE_DEFAULTS, METRICS_DEFAULTS } from "../../config";

// Worker concurrency
protected getConcurrency(): number {
  return QUEUE_DEFAULTS.WORKER_CONCURRENCY;
}

// Cache TTL
globalActionCache.set(cacheKey, result, CACHE_DEFAULTS.ACTION_TTL_MS);

// Metrics retention
WorkerMetrics.clearOldMetrics(METRICS_DEFAULTS.MAX_METRICS_VALUES);
```

## Error Handling

The core system provides comprehensive error handling:

1. **Action-Level**: Each action can define custom error handling
2. **Worker-Level**: Automatic retry logic for transient failures
3. **System-Level**: Graceful degradation and recovery
4. **Monitoring**: Error tracking and alerting

## Performance

The core system is optimized for performance:

- **Caching**: Intelligent caching reduces redundant work
- **Concurrency**: Configurable worker concurrency
- **Metrics**: Performance monitoring for optimization
- **Memory Management**: Automatic cleanup of resources

## Testing

The core system is designed for testability:

- **Dependency Injection**: Easy to mock dependencies
- **Action Isolation**: Actions can be tested independently
- **Factory Pattern**: Easy to create test instances
- **Error Scenarios**: Comprehensive error testing support

## Future Enhancements

- [ ] Add distributed caching support
- [ ] Implement circuit breaker pattern
- [ ] Add more sophisticated metrics
- [ ] Support for action composition
- [ ] Add performance profiling tools
