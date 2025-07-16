# Shared Worker Utilities

The Shared Worker Utilities provide common functionality that is used across all workers in the queue processing system. These utilities handle cross-cutting concerns like error handling, retry logic, and status broadcasting.

## Overview

The shared utilities provide:

- **Error Handling**: Wrapper actions for consistent error handling
- **Retry Logic**: Configurable retry mechanisms with exponential backoff
- **Status Broadcasting**: Real-time status updates via WebSocket
- **Common Patterns**: Reusable patterns for worker actions

## Architecture

```text
src/workers/shared/
├── error-handling.ts     # Error handling wrapper actions
├── retry.ts             # Retry logic with exponential backoff
├── broadcast-status.ts  # WebSocket status broadcasting
└── index.ts             # Barrel exports
```

## Key Components

### Error Handling

The `ErrorHandlingWrapperAction` provides consistent error handling for all actions:

```typescript
export class ErrorHandlingWrapperAction extends BaseAction<TInput, TOutput> {
  constructor(private wrappedAction: BaseAction<TInput, TOutput>) {
    super();
  }
}
```

**Features:**

- **Automatic Wrapping**: Wraps any action with error handling
- **Context Preservation**: Maintains error context for debugging
- **Logging**: Automatic error logging with structured data
- **Recovery**: Graceful error recovery and cleanup
- **Metrics**: Error tracking and monitoring

**Usage:**

```typescript
const action = new MyAction();
const wrappedAction = new ErrorHandlingWrapperAction(action);
```

### Retry Logic

The `RetryWrapperAction` provides configurable retry mechanisms:

```typescript
export class RetryWrapperAction extends BaseAction<TInput, TOutput> {
  constructor(
    private wrappedAction: BaseAction<TInput, TOutput>,
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
- **Metrics**: Retry attempt tracking

**Configuration:**

```typescript
interface RetryConfig {
  maxAttempts?: number; // Default: 3
  baseDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 30000ms
  retryableErrors?: string[]; // Error types to retry
  jitter?: boolean; // Default: true
}
```

**Usage:**

```typescript
const action = new MyAction();
const retryConfig = {
  maxAttempts: 5,
  baseDelay: 2000,
  maxDelay: 60000,
};
const retryAction = new RetryWrapperAction(action, retryConfig);
```

### Status Broadcasting

The status broadcasting system provides real-time updates:

```typescript
export class BroadcastProcessingAction extends BaseAction<any, any> {
  async execute(data: any, deps: any, context: ActionContext): Promise<any> {
    // Broadcast "PROCESSING" status
  }
}

export class BroadcastCompletedAction extends BaseAction<any, any> {
  async execute(data: any, deps: any, context: ActionContext): Promise<any> {
    // Broadcast "COMPLETED" status
  }
}
```

**Features:**

- **Real-time Updates**: WebSocket-based status broadcasting
- **Automatic Integration**: Automatically added to worker pipelines
- **Context Awareness**: Includes job and worker context
- **Error Handling**: Graceful handling of broadcast failures
- **Performance**: Non-blocking status updates

**Status Types:**

- `PENDING`: Job is queued but not yet processing
- `PROCESSING`: Job is currently being processed
- `COMPLETED`: Job completed successfully
- `FAILED`: Job failed with an error

**Usage:**

```typescript
// Automatically added by BaseWorker.addStatusActions()
this.addStatusActions(actions, data);
```

## Common Patterns

### Action Composition

Combine multiple wrappers for comprehensive action handling:

```typescript
// Create base action
const baseAction = new MyAction();

// Add retry logic
const retryAction = new RetryWrapperAction(baseAction, {
  maxAttempts: 3,
  baseDelay: 1000,
});

// Add error handling
const finalAction = new ErrorHandlingWrapperAction(retryAction);
```

### Dependency Injection

Shared utilities support dependency injection:

```typescript
interface SharedDeps {
  logger: {
    log: (message: string, level?: string) => void;
  };
  addStatusEventAndBroadcast: (event: StatusEvent) => Promise<void>;
}
```

### Configuration

Shared utilities use centralized configuration:

```typescript
import { RETRY_DEFAULTS, WEBSOCKET_DEFAULTS } from "../../config";

const retryConfig = {
  maxAttempts: RETRY_DEFAULTS.MAX_ATTEMPTS,
  baseDelay: RETRY_DEFAULTS.BASE_DELAY_MS,
  maxDelay: RETRY_DEFAULTS.MAX_DELAY_MS,
};

const broadcastConfig = {
  maxClients: WEBSOCKET_DEFAULTS.MAX_CLIENTS,
  rateLimitMs: WEBSOCKET_DEFAULTS.RATE_LIMIT_MS,
};
```

## Error Handling Strategy

The shared utilities implement a comprehensive error handling strategy:

1. **Prevention**: Input validation and pre-flight checks
2. **Detection**: Automatic error detection and classification
3. **Recovery**: Retry logic for transient failures
4. **Reporting**: Structured error reporting and logging
5. **Monitoring**: Error metrics and alerting

### Error Classification

Errors are classified for appropriate handling:

- **Transient Errors**: Network timeouts, temporary service unavailability
- **Permanent Errors**: Invalid input, missing dependencies
- **System Errors**: Memory issues, configuration problems
- **Business Logic Errors**: Domain-specific validation failures

### Retry Strategy

The retry strategy is designed for reliability:

- **Exponential Backoff**: Increasing delays between attempts
- **Jitter**: Random delay variation to prevent thundering herd
- **Maximum Limits**: Configurable attempt and delay limits
- **Conditional Retry**: Retry only on appropriate error types

## Performance Considerations

The shared utilities are optimized for performance:

- **Non-blocking**: Status broadcasting doesn't block job processing
- **Efficient Caching**: Retry state is cached for performance
- **Memory Management**: Automatic cleanup of retry state
- **Metrics**: Performance monitoring for optimization

## Testing

The shared utilities are designed for comprehensive testing:

```typescript
// Test error handling
const mockAction = new MockAction();
const errorHandler = new ErrorHandlingWrapperAction(mockAction);
await errorHandler.execute(data, deps, context);

// Test retry logic
const retryAction = new RetryWrapperAction(mockAction, {
  maxAttempts: 2,
  baseDelay: 100,
});
await retryAction.execute(data, deps, context);

// Test status broadcasting
const broadcastAction = new BroadcastProcessingAction();
await broadcastAction.execute(data, deps, context);
```

## Integration

The shared utilities integrate seamlessly with the core system:

```typescript
export class MyWorker extends BaseWorker<MyJobData, MyDependencies> {
  protected createActionPipeline(
    data: MyJobData,
    context: ActionContext
  ): BaseAction<unknown, unknown>[] {
    const actions: BaseAction<unknown, unknown>[] = [];

    // Add status broadcasting (automatic)
    this.addStatusActions(actions, data);

    // Add wrapped action with retry and error handling
    const baseAction = this.createWrappedAction("my_action", this.dependencies);
    actions.push(baseAction);

    return actions;
  }
}
```

## Future Enhancements

- [ ] Add circuit breaker pattern
- [ ] Implement distributed tracing
- [ ] Add more sophisticated retry strategies
- [ ] Support for custom error handlers
- [ ] Add performance profiling tools
- [ ] Implement dead letter queue support
