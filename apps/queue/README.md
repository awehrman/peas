# Queue Service

A production-ready, action-based queue processing service built with BullMQ, featuring comprehensive error handling, monitoring, and real-time status updates.

## 🎯 Overview

This service processes notes, ingredients, instructions, images, and categorization jobs using a sophisticated action-based worker system. It provides an HTTP API, health monitoring, WebSocket real-time updates, and a ServiceContainer for dependency injection.

## 🏗️ Architecture

The system is built around **actions** - small, focused units of work that can be composed into pipelines. Each worker extends `BaseWorker` and defines its own action pipeline with automatic error handling, retry logic, and performance monitoring.

### Key Components

- **BaseWorker**: Abstract base class providing common worker functionality
- **BaseAction**: Abstract base class for all actions with timing and error handling
- **ActionFactory**: Registry for creating actions by name with dependency injection
- **ServiceContainer**: Dependency injection container for all services
- **Shared Actions**: Reusable actions for common patterns (error handling, retry, status broadcasting)
- **Error System**: Comprehensive error types and handling
- **Caching**: In-memory caching for expensive operations
- **Metrics**: Built-in performance monitoring and metrics collection

## 📁 Project Structure

```text
apps/queue/
├── src/
│   ├── services/           # ServiceContainer and dependency injection
│   │   ├── container.ts    # Main ServiceContainer implementation
│   │   └── index.ts        # Service exports
│   ├── workers/            # Action-based worker system
│   │   ├── core/           # Core infrastructure
│   │   │   ├── base-worker.ts      # Base worker class
│   │   │   ├── cache.ts           # Action result caching
│   │   │   ├── errors.ts          # Error types and handling
│   │   │   ├── metrics.ts         # Performance metrics
│   │   │   └── index.ts           # Core exports
│   │   ├── shared/         # Shared utilities
│   │   │   ├── broadcast-status.ts # Status broadcasting
│   │   │   ├── error-handling.ts  # Error handling actions
│   │   │   ├── retry.ts           # Retry logic
│   │   │   └── index.ts           # Shared exports
│   │   ├── actions/        # Action system
│   │   │   ├── core/       # Action infrastructure
│   │   │   │   ├── base-action.ts # Base action class
│   │   │   │   ├── action-factory.ts # Action factory
│   │   │   │   ├── types.ts       # Action types
│   │   │   │   └── index.ts       # Core action exports
│   │   │   ├── note/       # Note processing actions
│   │   │   ├── ingredient/ # Ingredient processing actions
│   │   │   ├── instruction/# Instruction processing actions
│   │   │   ├── image/      # Image processing actions
│   │   │   ├── categorization/ # Categorization actions
│   │   │   └── index.ts    # Action exports
│   │   ├── note-worker.ts         # Note processing worker
│   │   ├── ingredient-worker.ts   # Ingredient processing worker
│   │   ├── instruction-worker.ts  # Instruction processing worker
│   │   ├── image-worker.ts        # Image processing worker
│   │   ├── categorization-worker.ts # Categorization worker
│   │   ├── index.ts               # Main exports
│   │   └── README.md              # Worker architecture documentation
│   ├── queues/             # Queue definitions and setup
│   ├── routes/             # Express route handlers
│   ├── config/             # Configuration files
│   ├── parsers/            # HTML and content parsing
│   ├── utils/              # Utility modules
│   │   ├── error-handler.ts
│   │   ├── health-monitor.ts
│   │   ├── performance.ts
│   │   ├── status-broadcaster.ts
│   │   └── index.ts
│   ├── tests/              # Comprehensive test suite
│   │   ├── workers/        # Worker tests
│   │   ├── services/       # Service tests
│   │   └── utils/          # Utility tests
│   ├── websocket-server.ts # WebSocket server implementation
│   ├── index.ts            # Main entry point
│   └── ...
├── package.json
└── README.md
```

## 🚀 Features

### Production-Ready Features

- **Type Safety**: Full TypeScript support with proper types and interfaces
- **Error Handling**: Comprehensive error types and recovery mechanisms
- **Performance Monitoring**: Built-in metrics collection and monitoring
- **Caching**: Intelligent caching for expensive operations
- **Retry Logic**: Exponential backoff with circuit breaker patterns
- **Status Broadcasting**: Real-time status updates via WebSocket
- **Validation**: Input validation for all actions
- **Service Integration**: Seamless integration with service container
- **Health Monitoring**: Worker status and health checks
- **Graceful Shutdown**: Proper cleanup of resources

### Monitoring & Observability

- **Metrics Collection**: Automatic collection of job processing times, success rates, and queue depths
- **Error Tracking**: Detailed error logging with context and stack traces
- **Performance Insights**: Action-level timing and caching statistics
- **Health Monitoring**: Worker status and health checks
- **Bull Board**: Web-based queue monitoring interface

## 🔧 ServiceContainer Pattern

This project uses a **ServiceContainer** for dependency injection. The ServiceContainer manages all core services and provides them to the rest of the application.

### Required Services

```typescript
interface IServiceContainer {
  queues: IQueueService; // Queue instances (note, ingredient, instruction, image, categorization)
  database: IDatabaseService; // Database operations (prisma, createNote)
  errorHandler: IErrorHandlerService; // Error handling utilities
  healthMonitor: IHealthMonitorService; // Health checks
  webSocket: IWebSocketService; // WebSocket management
  statusBroadcaster: IStatusBroadcasterService; // Status broadcasting
  parsers: IParserService; // Parsing operations (parseHTML)
  logger: ILoggerService; // Logging
  config: IConfigService; // Configuration
}
```

### Example Usage

```typescript
import { ServiceContainer } from "./services/container";

const container = ServiceContainer.getInstance();
const db = container.database;
const logger = container.logger;
```

### For Testing

```typescript
import { createServiceContainer } from "./services/container";

const mockLogger = { log: vi.fn() };
const testContainer = createServiceContainer({ logger: mockLogger });
```

## 👷 Worker System

### Creating a New Worker

1. **Extend BaseWorker**:

```typescript
export class MyWorker extends BaseWorker<MyJobData, MyDependencies> {
  protected registerActions(): void {
    // Register your actions
    this.actionFactory.register("my_action", () => new MyAction());
  }

  protected getOperationName(): string {
    return "my_operation";
  }

  protected createActionPipeline(
    data: MyJobData,
    context: ActionContext
  ): ActionPipeline<MyJobData, MyJobResult> {
    const actions: ActionPipeline<MyJobData, MyJobResult> = [];

    // Add status broadcasting (automatic if noteId exists)
    this.addStatusActions(actions, data);

    // Add your action pipeline with automatic wrapping
    actions.push(
      this.createWrappedAction(ActionName.MY_ACTION, this.dependencies)
    );

    return actions;
  }
}
```

2. **Create Actions with Validation**:

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

3. **Register Actions**:

```typescript
export function registerMyActions(factory: ActionFactory) {
  factory.register("my_action", () => new MyAction());
}
```

### Using Workers

```typescript
import { createNoteWorker } from "./workers";
import { noteQueue } from "../queues/note";

// Create worker with automatic dependency injection
const noteWorker = createNoteWorker(noteQueue, serviceContainer);

// Get worker status
const status = noteWorker.getStatus();

// Close worker gracefully
await noteWorker.close();
```

## 📊 Action Pipeline

The note worker executes this optimized pipeline:

1. **Broadcast Processing Status** (automatic if noteId exists)
2. **Parse HTML** (with caching, retry + error handling)
3. **Save Note** (with retry + error handling)
4. **Schedule Follow-up Tasks** (with error handling only):
   - Categorization
   - Image processing
   - Ingredient extraction
   - Instruction extraction
5. **Broadcast Completion Status** (automatic if noteId exists)

## 🔄 Shared Actions

### Status Broadcasting

- `BroadcastProcessingAction`: Broadcasts "PROCESSING" status
- `BroadcastCompletedAction`: Broadcasts "COMPLETED" status
- `BroadcastFailedAction`: Broadcasts "FAILED" status
- `createStatusAction()`: Helper to create custom status actions

### Error Handling

- `ErrorHandlingWrapperAction`: Wraps other actions with error handling
- `LogErrorAction`: Logs errors and continues
- `CaptureErrorAction`: Captures errors for monitoring
- `ErrorRecoveryAction`: Attempts error recovery
- `withErrorHandling()`: Helper to wrap actions with error handling

### Retry Logic

- `RetryAction`: Implements exponential backoff retry
- `RetryWrapperAction`: Wraps other actions with retry logic
- `CircuitBreakerAction`: Implements circuit breaker pattern
- `withRetry()`: Helper to wrap actions with retry logic
- `withCircuitBreaker()`: Helper to wrap actions with circuit breaker

## 🚨 Error Types

- `WorkerError`: Base error class for all worker errors
- `NoteProcessingError`: Specific to note processing failures
- `ActionValidationError`: When action validation fails
- `ActionExecutionError`: When action execution fails
- `MissingDependencyError`: When required dependencies are missing
- `ServiceUnhealthyError`: When service health checks fail

## 💾 Caching System

- **Smart Caching**: Automatic caching for parse and fetch operations
- **TTL Support**: Configurable cache expiration times
- **Cache Statistics**: Monitor cache hit rates and performance
- **Cache Cleanup**: Automatic cleanup of expired entries

## 📈 Metrics Collection

- **Job Metrics**: Processing times, success/failure rates
- **Action Metrics**: Individual action performance
- **Queue Metrics**: Queue depths and throughput
- **Worker Metrics**: Worker status and health
- **Custom Metrics**: Easy to add domain-specific metrics

## 🧪 Testing

This project uses [Vitest](https://vitest.dev/) for testing with comprehensive coverage:

### Running Tests

```sh
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn test:watch

# Run tests with UI
yarn test:ui
```

### Test Coverage

The test suite achieves **100% coverage** on core functionality:

- **Over 180 tests passing** across 18+ test files
- **Over 75% overall statement coverage**
- **Over 90% branch coverage**
- **Over 70% function coverage**

### Test Structure

```text
src/tests/
├── workers/           # Worker tests
│   ├── factory.test.ts
│   ├── manager.test.ts
│   ├── notes/         # Note worker tests
│   ├── ingredients/   # Ingredient worker tests
│   ├── instructions/  # Instruction worker tests
│   └── ...
├── services/          # Service tests
│   └── container.test.ts
└── utils/             # Utility tests
    ├── error-handler.test.ts
    ├── health-monitor.test.ts
    ├── performance.test.ts
    └── status-broadcaster.test.ts
```

## 🚀 Performance Optimizations

- **Action Caching**: Expensive operations are automatically cached
- **Concurrent Processing**: Configurable concurrency levels
- **Memory Management**: Automatic cleanup of old metrics and cache entries
- **Efficient Pipelines**: Optimized action execution order

## 🔌 API Endpoints

- **`POST /import`**: Process uploaded HTML files
- **`GET /import/status`**: Get import processing status
- **`POST /notes`**: Queue a note for processing
- **`GET /health`**: Health check endpoint
- **`/bull-board`**: Bull Board queue monitoring interface

## 🌐 WebSocket Server

Real-time status updates via WebSocket on port 8080 (configurable):

```typescript
// Client connection
const ws = new WebSocket('ws://localhost:8080');

// Status event format
{
  noteId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  message?: string;
  context?: string;
  currentCount?: number;
  totalCount?: number;
  createdAt: Date;
}
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Yarn package manager
- Redis (for BullMQ queues)
- PostgreSQL (for data storage)

### Setup

```sh
# Install dependencies
yarn install

# Run tests
yarn test:coverage

# Start development server
yarn dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDISHOST=localhost
REDISPORT=6379
REDISUSERNAME=
REDISPASSWORD=

# Server
PORT=4200
WS_PORT=8080
WS_HOST=localhost
WS_URL=ws://localhost:8080

# Queue Configuration
BATCH_SIZE=10
MAX_RETRIES=3
BACKOFF_MS=1000
MAX_BACKOFF_MS=30000
```

### WebSocket Configuration

The queue service supports configurable WebSocket URLs through environment variables:

- `WS_URL`: Full WebSocket URL (e.g., `wss://example.com:8080`)
- `WS_HOST`: WebSocket host (defaults to `localhost`)
- `WS_PORT`: WebSocket port (defaults to `8080`)

If `WS_URL` is provided, it takes precedence. Otherwise, the URL is constructed from `WS_HOST` and `WS_PORT` with the appropriate protocol (`wss` in production, `ws` in development).

For frontend applications, use these Next.js environment variables:

- `NEXT_PUBLIC_WEBSOCKET_URL`: Full WebSocket URL
- `NEXT_PUBLIC_WEBSOCKET_HOST`: WebSocket host
- `NEXT_PUBLIC_WEBSOCKET_PORT`: WebSocket port

## 📝 Type Safety & Linter Notes

- If you see a linter warning about a missing type declaration for `@peas/parser`, you can safely ignore it for now, or add a declaration file:
  - Create a file `@types/peas__parser/index.d.ts` with:

    ```ts
    declare module "@peas/parser";
    ```

  - Or install a type package if one becomes available.

## 🎯 Benefits

- **Production Ready**: Built-in monitoring, error handling, and performance optimization
- **Modularity**: Each action is a small, focused unit
- **Reusability**: Actions can be shared across workers
- **Testability**: Actions can be tested in isolation with mock services
- **Flexibility**: Easy to modify pipelines and add new actions
- **Observability**: Built-in logging, error handling, status broadcasting, and metrics
- **Reliability**: Retry logic, circuit breakers, and health checks
- **Performance**: Caching, concurrent processing, and optimized pipelines

## 🔄 Extending the System

To add a new worker type:

1. Create domain-specific actions in `actions/{domain}/`
2. Define proper types in `types.ts`
3. Add validation in `validation.ts`
4. Extend `BaseWorker` for your worker
5. Register actions in the factory
6. Create a factory function for easy instantiation

The system is designed to be easily extensible while maintaining consistency, reliability, and performance across all workers.

## 🔗 Queue Integration

The note worker is designed to work with the existing queue system:

```typescript
// In apps/queue/src/queues/note.ts
import { createQueue } from "./createQueue";
export const noteQueue = createQueue("noteQueue");

// The worker automatically connects to this queue
const noteWorker = createNoteWorker(noteQueue, serviceContainer);
```

This ensures seamless integration with your existing BullMQ setup and queue management system.

## 📚 More Information

- See `src/services/container.ts` for the main ServiceContainer implementation
- See `src/workers/` for the action-based worker system
- See `src/tests/` for comprehensive test examples
- See `src/workers/README.md` for detailed worker architecture documentation
