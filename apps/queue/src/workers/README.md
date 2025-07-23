# Queue Workers System

The Queue Workers System is a comprehensive, modular job processing framework built on BullMQ. It provides a robust, scalable, and observable solution for processing various types of jobs with built-in error handling, retry logic, and real-time status updates.

## Architecture

```text
src/workers/
├── core/                  # Foundational infrastructure
│   ├── base-worker.ts    # Abstract base class for all workers
│   ├── base-action.ts    # Abstract base class for all actions
│   ├── action-factory.ts # Factory for creating and managing actions
│   ├── types.ts          # Core type definitions
│   ├── worker-dependencies.ts # Base dependency creation
│   ├── status-actions/   # Status broadcasting actions
│   ├── action-wrappers/  # Retry and error handling wrappers
│   └── README.md         # Core system documentation
├── shared/               # Common utilities
│   ├── error-handling.ts # Error handling wrapper actions
│   ├── retry.ts          # Retry logic with exponential backoff
│   ├── error-broadcasting.ts # Error broadcasting utilities
│   ├── worker-factory.ts # Worker creation and management
│   ├── database-operations.ts # Shared database operations
│   ├── pattern-tracker.ts # Pattern tracking utilities
│   ├── status-utils.ts   # Status event utilities
│   ├── action-registry.ts # Action registration helpers
│   ├── completion-status-action.ts # Completion status actions
│   └── README.md         # Shared utilities documentation
├── note/                 # Note processing worker
│   ├── worker.ts         # Main worker class
│   ├── types.ts          # Note-specific types
│   ├── dependencies.ts   # Dependency injection
│   ├── pipeline.ts       # Action pipeline definition
│   ├── actions/          # Note processing actions
│   └── README.md         # Note worker documentation
├── ingredient/           # Ingredient processing worker
│   ├── worker.ts         # Main worker class
│   ├── types.ts          # Ingredient-specific types
│   ├── dependencies.ts   # Dependency injection
│   ├── pipeline.ts       # Action pipeline definition
│   ├── actions/          # Ingredient processing actions
│   └── README.md         # Ingredient worker documentation
├── instruction/          # Instruction processing worker
│   ├── worker.ts         # Main worker class
│   ├── types.ts          # Instruction-specific types
│   ├── dependencies.ts   # Dependency injection
│   ├── pipeline.ts       # Action pipeline definition
│   ├── actions/          # Instruction processing actions
│   └── README.md         # Instruction worker documentation
├── image/                # Image processing worker
│   ├── worker.ts         # Main worker class
│   ├── types.ts          # Image-specific types
│   ├── dependencies.ts   # Dependency injection
│   ├── pipeline.ts       # Action pipeline definition
│   ├── actions/          # Image processing actions
│   └── README.md         # Image worker documentation
├── categorization/       # Categorization worker
│   ├── worker.ts         # Main worker class
│   ├── types.ts          # Categorization-specific types
│   ├── dependencies.ts   # Dependency injection
│   ├── pipeline.ts       # Action pipeline definition
│   ├── actions/          # Categorization processing actions
│   └── README.md         # Categorization worker documentation
├── source/               # Source processing worker
│   ├── worker.ts         # Main worker class
│   ├── types.ts          # Source-specific types
│   ├── dependencies.ts   # Dependency injection
│   ├── pipeline.ts       # Action pipeline definition
│   ├── actions/          # Source processing actions
│   └── README.md         # Source worker documentation
├── types.ts              # Global worker types and interfaces
├── startup.ts            # Worker startup and management
├── index.ts              # Main exports
└── README.md             # This file
```

## Quick Start

### Creating a Worker

```typescript
import { BaseAction } from "./core/base-action";
import { BaseWorker } from "./core/base-worker";
import { ActionContext } from "./core/types";

// Define your job data and dependencies
interface MyJobData extends BaseJobData {
  id: string;
  content: string;
  noteId?: string;
}

interface MyDependencies extends BaseWorkerDependencies {
  myService: {
    process: (data: MyJobData) => Promise<unknown>;
  };
}

// Create your worker
export class MyWorker extends BaseWorker<MyJobData, MyDependencies, unknown> {
  protected registerActions(): void {
    // Register your actions
  }

  protected getOperationName(): string {
    return "my-worker";
  }

  protected createActionPipeline(
    data: MyJobData,
    context: ActionContext
  ): BaseAction<MyJobData, MyDependencies, unknown>[] {
    // Define your action pipeline
    return [];
  }
}
```

### Creating an Action

```typescript
import { BaseAction } from "./core/base-action";
import { ActionContext } from "./core/types";

export class MyAction extends BaseAction<MyInput, MyDependencies, MyOutput> {
  name = "my-action";

  async execute(
    input: MyInput,
    deps: MyDependencies,
    context: ActionContext
  ): Promise<MyOutput> {
    // Your action logic here
    return result;
  }
}
```

## Usage

### Starting Workers

```typescript
import { startWorkers } from "./startup";

const workers = startWorkers(queues, serviceContainer);
```

### Adding Jobs

```typescript
import { createNoteWorker } from "./note";

const worker = createNoteWorker(queue, container);
await queue.add("process-note", { content: "..." });
```

## Configuration

### Worker Configuration

```typescript
interface WorkerConfig {
  concurrency?: number;
  retryAttempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  timeoutMs?: number;
  healthCheckInterval?: number;
  gracefulShutdownTimeout?: number;
}
```

### Logging Configuration

```typescript
interface StructuredLogger {
  log: (
    message: string,
    level?: LogLevel,
    metadata?: Record<string, unknown>
  ) => void;
}
```

## Testing

The system is designed for easy testing with:

- Dependency injection patterns
- Abstracted BullMQ dependencies
- Mockable service interfaces
- Comprehensive test utilities

```typescript
import { createMockWorker } from "./__tests__/test-utils";

const mockWorker = createMockWorker(MyWorker, mockDependencies);
```
