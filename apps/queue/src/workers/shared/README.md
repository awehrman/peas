# Shared Worker Utilities

The Shared Worker Utilities provide common functionality that is used across all workers in the queue processing system. These utilities handle cross-cutting concerns like error handling, retry logic, status broadcasting, and database operations with comprehensive type safety and structured logging.

## Overview

The shared utilities provide:

- **Error Handling**: Wrapper actions for consistent error handling with context preservation
- **Retry Logic**: Configurable retry mechanisms with exponential backoff and jitter
- **Status Broadcasting**: Real-time status updates via WebSocket with structured events
- **Database Operations**: Shared database interaction patterns with type safety
- **Worker Management**: Factory functions for creating and managing workers
- **Pattern Tracking**: Utilities for tracking unique patterns across jobs
- **Action Registration**: Helper functions for registering actions with type safety

## Architecture

```text
src/workers/shared/
├── error-handling.ts           # Error handling wrapper actions
├── retry.ts                   # Retry logic with exponential backoff
├── error-broadcasting.ts      # Error broadcasting utilities
├── worker-factory.ts          # Worker creation and management
├── database-operations.ts     # Shared database operations
├── pattern-tracker.ts         # Pattern tracking utilities
├── status-utils.ts           # Status event utilities
├── action-registry.ts        # Action registration helpers
├── completion-status-action.ts # Completion status actions
└── index.ts                  # Barrel exports
```

## Key Components

### Error Handling

The `ErrorHandlingWrapperAction` provides consistent error handling for all actions:

```typescript
export class ErrorHandlingWrapperAction<
  TInput,
  TDeps,
  TOutput,
> extends BaseAction<TInput, TDeps, TOutput> {
  constructor(private wrappedAction: BaseAction<TInput, TDeps, TOutput>) {
    super();
  }
}
```

**Features:**

- **Automatic Wrapping**: Wraps any action with error handling
- **Context Preservation**: Maintains error context for debugging
- **Structured Logging**: Automatic error logging with metadata
- **Recovery**: Graceful error recovery and cleanup
- **Type Safety**: Full TypeScript support with generics

**Usage:**

```typescript
const action = new MyAction();
const wrappedAction = new ErrorHandlingWrapperAction(action);
```

### Retry Logic

The `RetryWrapperAction` provides configurable retry mechanisms with circuit breaker patterns:

```typescript
export class RetryWrapperAction<TInput, TDeps, TOutput> extends BaseAction<
  TInput,
  TDeps,
  TOutput
> {
  constructor(
    private wrappedAction: BaseAction<TInput, TDeps, TOutput>,
    private config: RetryConfig = {}
  ) {
    super();
  }
}
```

**Features:**

- **Exponential Backoff**: Intelligent retry delays
- **Configurable Limits**: Maximum attempts and delays
- **Conditional Retry**: Retry only on specific error types
- **Jitter**: Random delay variation to prevent thundering herd
- **Circuit Breaker**: Prevents repeated failures against unstable services
- **Type Safety**: Full TypeScript support with generics

**Configuration:**

```typescript
interface RetryConfig {
  maxAttempts?: number; // Default: 3
  baseDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 30000ms
  retryableErrors?: string[]; // Error types to retry
  jitter?: boolean; // Default: true
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
  };
}
```

**Usage:**

```typescript
const action = new MyAction();
const retryConfig = {
  maxAttempts: 5,
  baseDelay: 2000,
  maxDelay: 60000,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
  },
};
const retryAction = new RetryWrapperAction(action, retryConfig);
```

### Status Broadcasting

The status broadcasting utilities provide real-time status updates:

```typescript
export interface StatusEvent {
  importId: string;
  noteId?: string;
  status: NoteStatus;
  message?: string;
  context?: string;
  currentCount?: number;
  totalCount?: number;
  indentLevel?: number;
  metadata?: Record<string, unknown>;
}
```

**Features:**

- **Real-time Updates**: WebSocket-based status broadcasting
- **Progress Tracking**: Current/total count for progress bars
- **Context Awareness**: Rich context information
- **Metadata Support**: Additional structured data
- **Type Safety**: Strong typing for all status events

**Usage:**

```typescript
await addStatusEventAndBroadcast({
  importId: "import-123",
  noteId: "note-456",
  status: "PROCESSING",
  message: "Processing ingredient line",
  context: "parse_ingredients",
  currentCount: 5,
  totalCount: 10,
  indentLevel: 1,
});
```

### Database Operations

The `DatabaseOperations` class provides shared database interaction patterns:

```typescript
export class DatabaseOperations<TPrisma extends PrismaClient = PrismaClient> {
  constructor(private prisma: TPrisma) {}

  async createOrUpdateParsedIngredientLine(
    lineId: string,
    data: ParsedIngredientLineData
  ): Promise<void> {
    /* ... */
  }

  async replaceParsedSegments(
    ingredientLineId: string,
    segments: ParsedSegment[]
  ): Promise<void> {
    /* ... */
  }

  async findOrCreateIngredient(
    ingredientName: string,
    reference: string
  ): Promise<{ id: string; name: string; isNew: boolean }> {
    /* ... */
  }
}
```

**Features:**

- **Type Safety**: Generic Prisma client support
- **Pattern Tracking**: Automatic pattern tracking for ingredients
- **Batch Operations**: Efficient batch database operations
- **Error Handling**: Comprehensive error handling
- **Performance**: Optimized database queries

### Worker Factory

The worker factory utilities provide functions for creating and managing workers:

```typescript
export function createWorker<TWorker extends BaseWorker>(
  queue: IQueue,
  dependencies: unknown,
  WorkerClass: new (queue: IQueue, deps: unknown) => TWorker
): TWorker {
  /* ... */
}

export function closeWorkers(workers: BaseWorker[]): Promise<void> {
  /* ... */
}

export function getWorkerStatus(worker: BaseWorker): WorkerStatus {
  /* ... */
}
```

**Features:**

- **Type Safety**: Generic worker creation with proper typing
- **Lifecycle Management**: Worker creation and cleanup
- **Status Monitoring**: Worker status tracking
- **Error Handling**: Graceful worker shutdown

### Action Registry

The action registry provides helper functions for registering actions:

```typescript
export interface ActionRegistration<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
> {
  name: string;
  factory: () => BaseAction<TData, TDeps, TResult>;
}

export function registerActions<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
>(
  factory: ActionFactory<TData, TDeps, TResult>,
  actions: ActionRegistration<TData, TDeps, TResult>[]
): void {
  /* ... */
}
```

**Features:**

- **Type Safety**: Full TypeScript support with generics
- **Factory Integration**: Seamless integration with ActionFactory
- **Batch Registration**: Register multiple actions at once
- **Validation**: Action registration validation

## Usage Examples

### Error Handling with Retry

```typescript
import { ErrorHandlingWrapperAction } from "./error-handling";
import { RetryWrapperAction } from "./retry";

const action = new MyAction();
const errorHandledAction = new ErrorHandlingWrapperAction(action);
const retryableAction = new RetryWrapperAction(errorHandledAction, {
  maxAttempts: 3,
  baseDelay: 1000,
});
```

### Database Operations

```typescript
import { DatabaseOperations } from "./database-operations";

const dbOps = new DatabaseOperations(prisma);

await dbOps.createOrUpdateParsedIngredientLine("line-123", {
  blockIndex: 0,
  lineIndex: 1,
  reference: "2 cups flour",
  noteId: "note-456",
  parseStatus: "CORRECT",
});

await dbOps.replaceParsedSegments("line-123", [
  { index: 0, rule: "amount", type: "amount", value: "2" },
  { index: 1, rule: "unit", type: "unit", value: "cups" },
  { index: 2, rule: "ingredient", type: "ingredient", value: "flour" },
]);
```

### Status Broadcasting

```typescript
import { addStatusEventAndBroadcast } from "./error-broadcasting";

await addStatusEventAndBroadcast(deps, {
  importId: "import-123",
  noteId: "note-456",
  status: "PROCESSING",
  message: "Processing ingredient line",
  context: "parse_ingredients",
  currentCount: 5,
  totalCount: 10,
});
```

### Worker Management

```typescript
import { closeWorkers, createWorker } from "./worker-factory";

const workers = [
  createWorker(queue, deps, NoteWorker),
  createWorker(queue, deps, IngredientWorker),
  createWorker(queue, deps, InstructionWorker),
];

// Later...
await closeWorkers(workers);
```

### Action Registration

```typescript
import { createActionRegistration, registerActions } from "./action-registry";

registerActions(actionFactory, [
  createActionRegistration("process-ingredient", ProcessIngredientAction),
  createActionRegistration("save-ingredient", SaveIngredientAction),
  createActionRegistration("broadcast-status", BroadcastStatusAction),
]);
```

## Configuration

### Retry Configuration

```typescript
interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableErrors?: string[];
  jitter?: boolean;
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
  };
}
```

### Database Configuration

```typescript
interface DatabaseConfig {
  connectionLimit?: number;
  timeout?: number;
  retryAttempts?: number;
  batchSize?: number;
}
```

### Status Configuration

```typescript
interface StatusConfig {
  broadcastInterval?: number;
  maxRetries?: number;
  timeout?: number;
  batchSize?: number;
}
```

## Testing

The shared utilities are designed for easy testing:

### Mocking Dependencies

```typescript
const mockDeps = {
  logger: {
    log: vi.fn(),
  },
  addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
};
```

### Testing Error Handling

```typescript
const action = new ErrorHandlingWrapperAction(new FailingAction());
const result = await action.execute(input, mockDeps, context);

expect(mockDeps.logger.log).toHaveBeenCalledWith(
  expect.stringContaining("Action execution failed"),
  "error"
);
```

### Testing Retry Logic

```typescript
const action = new RetryWrapperAction(new FailingAction(), {
  maxAttempts: 2,
  baseDelay: 100,
});

const startTime = Date.now();
await action.execute(input, mockDeps, context);
const endTime = Date.now();

expect(endTime - startTime).toBeGreaterThan(100);
```

## Best Practices

### Error Handling

1. **Always wrap actions** with error handling
2. **Preserve context** in error messages
3. **Log errors** with structured data
4. **Handle specific errors** appropriately
5. **Provide fallback mechanisms**

### Retry Logic

1. **Use exponential backoff** for transient failures
2. **Implement circuit breakers** for unstable services
3. **Add jitter** to prevent thundering herd
4. **Monitor retry metrics** for optimization
5. **Set appropriate limits** to prevent infinite retries

### Status Broadcasting

1. **Broadcast frequently** for long-running operations
2. **Include progress information** when available
3. **Use consistent status codes** across workers
4. **Add context information** for debugging
5. **Handle broadcast failures** gracefully

### Database Operations

1. **Use batch operations** for efficiency
2. **Implement proper error handling** for database failures
3. **Use transactions** for related operations
4. **Monitor performance** and optimize queries
5. **Handle connection issues** gracefully

## Performance Considerations

### Caching

- **Cache expensive operations** when possible
- **Use appropriate TTL** for cache entries
- **Monitor cache hit rates** for optimization
- **Implement cache invalidation** strategies

### Batch Processing

- **Group related operations** into batches
- **Use appropriate batch sizes** for your use case
- **Monitor memory usage** with large batches
- **Handle partial failures** in batches

### Connection Management

- **Reuse connections** when possible
- **Implement connection pooling** for databases
- **Monitor connection usage** and limits
- **Handle connection failures** gracefully

## Monitoring and Observability

### Metrics

- **Retry attempt counts** and success rates
- **Error rates** by error type
- **Database operation** performance
- **Status broadcast** success rates

### Logging

- **Structured logging** with metadata
- **Error context** preservation
- **Performance timing** for operations
- **Debug information** for troubleshooting

### Health Checks

- **Worker status** monitoring
- **Database connectivity** checks
- **WebSocket connection** health
- **Queue depth** monitoring
