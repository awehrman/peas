# Core Worker Infrastructure

This directory contains the foundational infrastructure for the worker system, providing a modular and extensible architecture for processing jobs through action-based pipelines with comprehensive type safety and structured logging.

## Overview

The core module provides:

- **Base classes** for workers and actions with generic type support
- **Action factory** for creating and managing typed actions
- **Dependency injection** helpers for building worker dependencies
- **Status management** for job progress tracking
- **Structured logging** with metadata support
- **Error handling** with custom error types and context
- **Job processing** pipeline execution with type safety
- **Testability** through BullMQ abstraction and dependency injection

## Directory Structure

### Root Files

- **`base-worker.ts`** - Abstract base class for all workers with generic type support
- **`base-action.ts`** - Abstract base class for all actions with timing and error handling
- **`action-factory.ts`** - Factory for creating and registering typed actions
- **`types.ts`** - Core type definitions for workers, actions, and job processing
- **`worker-dependencies.ts`** - Base dependency creation utilities
- **`index.ts`** - Main barrel file exporting all core functionality

### Subdirectories

#### `status-actions/`

Actions for reporting job status and progress:

- **`processing-status-action.ts`** - `ProcessingStatusAction` for job start/processing
- **`completed-status-action.ts`** - `CompletedStatusAction` for job completion

#### `action-wrappers/`

Wrappers that add behavior to actions without modifying the original action:

- **`retry-wrapper.ts`** - Retry logic with exponential backoff
- **`error-handling-wrapper.ts`** - Error handling wrapper actions

## Key Concepts

### Workers

Workers extend `BaseWorker<TData, TDeps, TResult>` and implement:

- `registerActions()` - Register worker-specific actions
- `getOperationName()` - Return a unique operation name
- `createActionPipeline()` - Define the sequence of actions to execute
- `getConcurrency()` - Return worker concurrency level

### Actions

Actions extend `BaseAction<TInput, TDeps, TOutput>` and implement:

- `execute()` - The main action logic with proper typing
- Optional `onError()` - Custom error handling
- Optional `validateInput()` - Input validation

### Type Safety

The core system provides comprehensive type safety through:

- **Generic type constraints** for workers and actions
- **Type-safe action factories** with proper registration
- **Structured dependency injection** with interface contracts
- **Compile-time error detection** for type mismatches

## Usage Examples

### Creating a Typed Worker

```typescript
import { BaseAction } from "./core/base-action";
import { BaseWorker } from "./core/base-worker";
import { ActionContext } from "./core/types";

interface MyJobData extends BaseJobData {
  id: string;
  content: string;
}

interface MyDependencies extends BaseWorkerDependencies {
  myService: {
    process: (data: MyJobData) => Promise<unknown>;
  };
}

export class MyWorker extends BaseWorker<MyJobData, MyDependencies, unknown> {
  protected registerActions(): void {
    this.actionFactory.register("my-action", () => new MyAction());
  }

  protected getOperationName(): string {
    return "my-worker";
  }

  protected createActionPipeline(
    data: MyJobData,
    context: ActionContext
  ): BaseAction<MyJobData, MyDependencies, unknown>[] {
    return [this.createWrappedAction("my-action", this.dependencies)];
  }
}
```

### Creating a Typed Action

```typescript
import { BaseAction } from "./core/base-action";
import { ActionContext } from "./core/types";

interface MyInput {
  id: string;
  content: string;
}

interface MyOutput {
  success: boolean;
  result: string;
}

export class MyAction extends BaseAction<MyInput, MyDependencies, MyOutput> {
  name = "my-action";

  async execute(
    input: MyInput,
    deps: MyDependencies,
    context: ActionContext
  ): Promise<MyOutput> {
    deps.logger.log(`Processing ${input.id}`);

    const result = await deps.myService.process(input);

    return {
      success: true,
      result: String(result),
    };
  }
}
```

### Dependency Injection

```typescript
import { createBaseDependenciesFromContainer } from "./core/worker-dependencies";

export function createMyWorkerDependencies(
  container: IServiceContainer
): MyDependencies {
  return {
    ...createBaseDependenciesFromContainer(container),
    myService: {
      process: (data) => container.myService.process(data),
    },
  };
}
```

## Core Features

### 🔧 **Type Safety**

- **Generic Workers**: `BaseWorker<TData, TDeps, TResult>`
- **Generic Actions**: `BaseAction<TInput, TDeps, TOutput>`
- **Type-safe Factories**: `ActionFactory<TData, TDeps, TResult>`
- **Interface Contracts**: Strong typing for all dependencies

### 📊 **Structured Logging**

- **Consistent Interface**: `StructuredLogger` across all modules
- **Metadata Support**: Rich context information in logs
- **Performance Timing**: Automatic execution time tracking
- **Log Levels**: Debug, info, warn, error, fatal

### 🛡️ **Error Handling**

- **Context Preservation**: Error context with job and worker information
- **Custom Error Types**: `ActionExecutionError`, `ActionNotRegisteredError`
- **Graceful Degradation**: Fallback mechanisms for failures
- **Error Broadcasting**: Real-time error notifications

### 🔄 **Dependency Injection**

- **Service Container Integration**: Centralized dependency management
- **Modular Factories**: Separate factories for different dependency types
- **Testability**: Easy mocking and stubbing
- **Single Responsibility**: Each factory has a focused purpose

### 📈 **Observability**

- **Status Broadcasting**: Real-time job progress updates
- **Performance Metrics**: Action and job execution timing
- **Health Monitoring**: Worker status and queue depth
- **Progress Tracking**: Detailed progress for long-running jobs

## Configuration

### Worker Configuration

```typescript
interface WorkerConfig {
  concurrency?: number;
  retryAttempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  timeoutMs?: number;
}
```

### Action Configuration

```typescript
interface ActionConfig {
  retryable?: boolean;
  timeout?: number;
  priority?: number;
  cacheable?: boolean;
}
```

## Testing

The core system is designed for comprehensive testing:

### Mocking Dependencies

```typescript
import { createMockWorker } from "../__tests__/test-utils";

const mockDeps: MyDependencies = {
  ...createBaseDependenciesFromContainer(mockContainer),
  myService: {
    process: vi.fn().mockResolvedValue("mocked result"),
  },
};

const worker = createMockWorker(MyWorker, mockDeps);
```

### Testing Actions

```typescript
const action = new MyAction();
const result = await action.execute(
  { id: "test", content: "test" },
  mockDeps,
  mockContext
);

expect(result.success).toBe(true);
```

### Testing Pipelines

```typescript
const pipeline = worker.createActionPipeline(testData, mockContext);
const results = await Promise.all(
  pipeline.map((action) => action.execute(testData, mockDeps, mockContext))
);
```

## Performance Features

### Caching

- **Action Result Caching**: Cache expensive action results
- **Configurable TTL**: Time-based cache invalidation
- **Cache Keys**: Deterministic cache key generation
- **Memory Management**: Automatic cache cleanup

### Metrics

- **Execution Timing**: Action and job execution times
- **Performance Monitoring**: Throughput and latency tracking
- **Resource Usage**: Memory and CPU monitoring
- **Queue Metrics**: Queue depth and processing rates

### Optimization

- **Concurrency Control**: Configurable worker concurrency
- **Batch Processing**: Efficient batch job processing
- **Memory Management**: Automatic resource cleanup
- **Connection Pooling**: Optimized database connections

## Error Handling

### Error Types

```typescript
// Action execution errors
class ActionExecutionError extends Error {
  constructor(
    message: string,
    public actionName: string,
    public context: ErrorContext
  ) {
    super(message);
  }
}

// Action registration errors
class ActionNotRegisteredError extends Error {
  constructor(public actionName: string) {
    super(`Action '${actionName}' is not registered`);
  }
}

// Validation errors
class ActionValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
  }
}
```

### Error Context

```typescript
interface ErrorContext extends Record<string, unknown> {
  jobId?: string;
  operation?: string;
  noteId?: string;
  workerName?: string;
  attemptNumber?: number;
}
```

## Best Practices

### Worker Design

1. **Single Responsibility**: Each worker handles one domain
2. **Type Safety**: Use proper generic type constraints
3. **Dependency Injection**: Inject all dependencies
4. **Error Handling**: Implement comprehensive error handling
5. **Logging**: Use structured logging with metadata

### Action Design

1. **Pure Functions**: Actions should be stateless
2. **Input Validation**: Validate inputs early
3. **Error Handling**: Handle errors gracefully
4. **Performance**: Consider performance implications
5. **Testing**: Make actions easily testable

### Testing

1. **Unit Tests**: Test individual actions
2. **Integration Tests**: Test worker pipelines
3. **Mock Dependencies**: Mock external dependencies
4. **Error Scenarios**: Test error conditions
5. **Performance Tests**: Test under load

## Architecture Decisions

### Why Generic Types?

- **Type Safety**: Compile-time error detection
- **IDE Support**: Better autocomplete and refactoring
- **Self-Documenting**: Types serve as documentation
- **Maintainability**: Easier to maintain and refactor

### Why Dependency Injection?

- **Testability**: Easy to mock dependencies
- **Flexibility**: Easy to swap implementations
- **Separation of Concerns**: Clear dependency boundaries
- **Maintainability**: Easier to modify and extend

### Why Structured Logging?

- **Observability**: Better debugging and monitoring
- **Consistency**: Uniform logging format
- **Performance**: Efficient log processing
- **Integration**: Easy integration with log aggregation

### Why Action Pipelines?

- **Modularity**: Break complex logic into smaller pieces
- **Reusability**: Actions can be reused across workers
- **Testability**: Easy to test individual actions
- **Maintainability**: Easier to modify and extend
