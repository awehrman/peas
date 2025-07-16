# Queue Workers System

The Queue Workers System is a comprehensive, modular job processing framework built on BullMQ. It provides a robust, scalable, and observable solution for processing various types of jobs with built-in error handling, retry logic, and real-time status updates.

## Overview

The workers system is designed around these core principles:

- **Modularity**: Each worker is self-contained with its own actions, types, and documentation
- **Reliability**: Built-in error handling, retry logic, and graceful degradation
- **Observability**: Real-time status updates, comprehensive logging, and performance metrics
- **Type Safety**: Full TypeScript support with strong typing throughout
- **Scalability**: Configurable concurrency, caching, and performance optimization

## Architecture

```text
src/workers/
├── core/                  # Foundational infrastructure
│   ├── base-worker.ts    # Abstract base class for all workers
│   ├── base-action.ts    # Abstract base class for all actions
│   ├── action-factory.ts # Factory for creating and managing actions
│   ├── types.ts          # Core type definitions
│   ├── cache.ts          # In-memory caching system
│   ├── metrics.ts        # Performance metrics collection
│   ├── errors.ts         # Error types and utilities
│   └── README.md         # Core system documentation
├── shared/               # Common utilities
│   ├── error-handling.ts # Error handling wrapper actions
│   ├── retry.ts          # Retry logic with exponential backoff
│   ├── broadcast-status.ts # WebSocket status broadcasting
│   └── README.md         # Shared utilities documentation
├── note/                 # Note processing worker
│   ├── note-worker.ts    # Main worker class
│   ├── types.ts          # Note-specific types
│   ├── actions/          # Note processing actions
│   └── README.md         # Note worker documentation
├── ingredient/           # Ingredient processing worker
│   ├── ingredient-worker.ts
│   ├── types.ts
│   ├── actions/
│   └── README.md
├── instruction/          # Instruction processing worker
│   ├── instruction-worker.ts
│   ├── types.ts
│   ├── actions/
│   └── README.md
├── image/                # Image processing worker
│   ├── image-worker.ts
│   ├── types.ts
│   ├── actions/
│   └── README.md
├── categorization/       # Categorization worker
│   ├── categorization-worker.ts
│   ├── types.ts
│   ├── actions/
│   └── README.md
├── source/               # Source processing worker
│   ├── source-worker.ts
│   ├── types.ts
│   ├── actions/
│   └── README.md
├── types.ts              # Global worker types
└── index.ts              # Main exports
```

## Available Workers

### Core Infrastructure

- **[Core System](./core/README.md)**: Base classes, action factory, caching, metrics, and error handling
- **[Shared Utilities](./shared/README.md)**: Common patterns for error handling, retry logic, and status broadcasting

### Domain Workers

- **[Note Worker](./note/README.md)**: HTML parsing and note creation
- **[Ingredient Worker](./ingredient/README.md)**: Ingredient text parsing and storage
- **[Instruction Worker](./instruction/README.md)**: Instruction text processing and storage
- **[Image Worker](./image/README.md)**: Image processing and optimization
- **[Categorization Worker](./categorization/README.md)**: Recipe categorization and tagging
- **[Source Worker](./source/README.md)**: Source metadata processing

## Quick Start

### Creating a Worker

```typescript
import { BaseWorker } from "./core/base-worker";
import { BaseAction } from "./core/base-action";
import { ActionContext } from "./core/types";

// Define your job data and dependencies
interface MyJobData {
  id: string;
  content: string;
  noteId?: string;
}

interface MyDependencies {
  logger: { log: (msg: string) => void };
  database: { save: (data: any) => Promise<void> };
}

// Create your action
class MyAction extends BaseAction<MyJobData, MyDependencies> {
  name = "my_action";

  async execute(data: MyJobData, deps: MyDependencies, context: ActionContext) {
    deps.logger.log(`Processing job ${context.jobId}`);
    await deps.database.save(data);
    return { success: true };
  }
}

// Create your worker
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

    // Add your action with automatic retry and error handling
    actions.push(this.createWrappedAction("my_action", this.dependencies));

    return actions;
  }
}
```

### Using a Worker

```typescript
import { Queue } from "bullmq";
import { MyWorker } from "./workers/my-worker";
import { serviceContainer } from "./services";

// Create queue
const queue = new Queue("my-processing");

// Create worker
const worker = new MyWorker(queue, serviceContainer);

// Add job
await queue.add("process_data", {
  id: "job123",
  content: "data to process",
  noteId: "note456",
});

// Monitor status
const status = worker.getStatus();
console.log("Worker running:", status.isRunning);
```

## Key Features

### Action Pipeline System

Each worker executes a configurable pipeline of actions:

```typescript
protected createActionPipeline(
  data: MyJobData,
  context: ActionContext
): BaseAction<unknown, unknown>[] {
  const actions: BaseAction<unknown, unknown>[] = [];

  // Add status broadcasting
  this.addStatusActions(actions, data);

  // Add processing actions
  actions.push(this.createWrappedAction("parse_data", this.dependencies));
  actions.push(this.createWrappedAction("save_data", this.dependencies));

  return actions;
}
```

### Automatic Error Handling

All actions are automatically wrapped with error handling and retry logic:

```typescript
// This automatically includes:
// - Error handling with context preservation
// - Retry logic with exponential backoff
// - Performance metrics collection
// - Status broadcasting
actions.push(this.createWrappedAction("my_action", this.dependencies));
```

### Real-time Status Updates

Workers automatically broadcast status updates via WebSocket:

- `PENDING`: Job is queued but not yet processing
- `PROCESSING`: Job is currently being processed
- `COMPLETED`: Job completed successfully
- `FAILED`: Job failed with an error

### Performance Monitoring

Built-in metrics collection for monitoring and optimization:

```typescript
import { WorkerMetrics } from "./core/metrics";

// Get performance metrics
const metrics = WorkerMetrics.getMetrics();
console.log("Action performance:", metrics.actionExecutionTimes);
console.log("Job performance:", metrics.jobProcessingTimes);
```

## Configuration

The workers system uses centralized configuration:

```typescript
import { QUEUE_DEFAULTS, CACHE_DEFAULTS, PROCESSING_DEFAULTS } from "../config";

// Worker concurrency
const concurrency = QUEUE_DEFAULTS.WORKER_CONCURRENCY;

// Cache settings
const cacheTtl = CACHE_DEFAULTS.ACTION_TTL_MS;

// Processing limits
const processingTime = PROCESSING_DEFAULTS.INSTRUCTION_PROCESSING_TIME_MS;
```

## Error Handling

The system provides comprehensive error handling:

1. **Action-Level**: Each action can define custom error handling
2. **Worker-Level**: Automatic retry logic for transient failures
3. **System-Level**: Graceful degradation and recovery
4. **Monitoring**: Error tracking and alerting

### Error Types

- `ActionExecutionError`: Action-level errors with context
- `WorkerError`: Worker-level errors
- `ValidationError`: Input validation errors
- `DependencyError`: Missing dependency errors

## Performance Optimization

The system includes several performance optimizations:

- **Caching**: Intelligent caching for expensive operations
- **Concurrency**: Configurable worker concurrency
- **Metrics**: Performance monitoring for optimization
- **Memory Management**: Automatic cleanup of resources

## Testing

The system is designed for comprehensive testing:

```typescript
// Test individual actions
const action = new MyAction();
const result = await action.execute(data, deps, context);

// Test worker pipeline
const worker = new MyWorker(queue, deps);
await worker.processJob(jobData);

// Test error scenarios
const errorAction = new ErrorAction();
await expect(errorAction.execute(data, deps, context)).rejects.toThrow(
  ValidationError
);
```

## Monitoring and Observability

### Health Checks

Monitor worker health:

```typescript
// Check worker status
const status = worker.getStatus();
console.log("Worker running:", status.isRunning);

// Check queue depth
const queueDepth = await queue.count();
console.log("Queue depth:", queueDepth);
```

### Metrics

Track performance metrics:

```typescript
import { WorkerMetrics } from "./core/metrics";

// Get current metrics
const metrics = WorkerMetrics.getMetrics();

// Monitor specific actions
const actionMetrics = metrics.actionExecutionTimes.get("my_action");
console.log("Average execution time:", actionMetrics?.average);
```

### Logging

Comprehensive logging with structured data:

```typescript
// Worker logs include:
// - Job ID and context
// - Action execution times
// - Error details with stack traces
// - Performance metrics
```

## Troubleshooting

### Common Issues

1. **Worker Not Starting**
   - Check queue configuration
   - Verify dependencies are available
   - Review error logs

2. **Jobs Failing**
   - Check action implementation
   - Verify input data format
   - Review error context

3. **Performance Issues**
   - Monitor worker concurrency
   - Check cache hit rates
   - Review processing times

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.DEBUG = "workers:*";

// Or configure logger
serviceContainer.logger.log("Debug mode enabled", "debug");
```

## Best Practices

### Worker Design

1. **Single Responsibility**: Each worker should handle one domain
2. **Action Composition**: Break complex logic into smaller actions
3. **Error Handling**: Always handle errors gracefully
4. **Validation**: Validate input data early
5. **Logging**: Log important events and errors

### Performance

1. **Caching**: Cache expensive operations
2. **Concurrency**: Configure appropriate concurrency levels
3. **Monitoring**: Monitor performance metrics
4. **Optimization**: Profile and optimize slow operations

### Testing

1. **Unit Tests**: Test individual actions
2. **Integration Tests**: Test worker pipelines
3. **Error Tests**: Test error scenarios
4. **Performance Tests**: Test under load

## Future Enhancements

- [ ] Distributed caching support
- [ ] Circuit breaker pattern
- [ ] Advanced retry strategies
- [ ] Distributed tracing
- [ ] Performance profiling tools
- [ ] Dead letter queue support
- [ ] Batch processing optimization
- [ ] Real-time metrics dashboard

## Contributing

When adding new workers or modifying existing ones:

1. **Follow the Pattern**: Use the established worker pattern
2. **Add Documentation**: Update README files
3. **Add Tests**: Include comprehensive tests
4. **Update Types**: Maintain type safety
5. **Performance**: Consider performance implications

## Support

For questions and issues:

1. **Check Documentation**: Review worker-specific README files
2. **Check Logs**: Review application logs for errors
3. **Check Metrics**: Monitor performance metrics
4. **Create Issue**: Report bugs and feature requests
