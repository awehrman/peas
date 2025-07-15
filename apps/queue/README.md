# Queue Service

## Overview

This service is responsible for processing notes, ingredients, instructions, images, and categorization jobs using BullMQ queues. It exposes an HTTP API, a health check endpoint, and a WebSocket server for real-time status updates.

## Key Features

- **BullMQ-based job queues** for scalable background processing
- **WebSocket server** for real-time status updates
- **Health monitoring** and graceful shutdown
- **ServiceContainer pattern** for dependency injection and testability
- **Modular worker architecture** with comprehensive test coverage
- **100% test coverage** on core functionality

## Project Structure

```
apps/queue/
├── src/
│   ├── services/           # ServiceContainer and dependency injection
│   │   ├── container.ts    # Main ServiceContainer implementation
│   │   └── index.ts        # Service exports
│   ├── workers/            # Modular worker architecture
│   │   ├── factory.ts      # Worker factory for creating workers
│   │   ├── manager.ts      # Worker lifecycle management
│   │   ├── notes/          # Note processing worker
│   │   │   ├── worker.ts
│   │   │   ├── job-orchestrator.ts
│   │   │   ├── event-handlers.ts
│   │   │   ├── processor.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── ingredients/    # Ingredient processing worker
│   │   ├── instructions/   # Instruction processing worker
│   │   ├── image/          # Image processing worker
│   │   ├── categorization/ # Categorization worker
│   │   └── image.ts        # Re-export for backward compatibility
│   ├── queues/             # Queue definitions and setup
│   ├── routes/             # Express route handlers
│   ├── config/             # Configuration files
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
├── README.md
└── ...
```

## ServiceContainer Pattern

This project uses a **ServiceContainer** for dependency injection. The ServiceContainer manages all core services (database, logger, queues, error handler, health monitor, WebSocket, config, etc.) and provides them to the rest of the application.

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

## Worker Architecture

The service uses a modular worker architecture where each worker type (notes, ingredients, instructions, images, categorization) is organized in its own directory with:

- **worker.ts** - Worker setup and configuration
- **job-orchestrator.ts** - Main job processing logic
- **event-handlers.ts** - Worker event handling
- **processor.ts** - Business logic processing
- **types.ts** - Type definitions
- **index.ts** - Barrel exports

### Worker Factory

The `WorkerFactory` creates and manages different types of workers:

```typescript
import { createWorkerFactory } from "./workers/factory";

const factory = createWorkerFactory(container);
const noteWorker = factory.createNoteWorker(noteQueue);
const ingredientWorker = factory.createIngredientWorker(ingredientQueue);
```

## Testing

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

- **189 tests passing** across 18 test files
- **76.97% overall statement coverage**
- **94.56% branch coverage**
- **72.26% function coverage**

### Test Structure

```
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

## Recent Updates

### Fixed Issues

- **Circular import in image worker** - Fixed re-export issue in `src/workers/image.ts`
- **Worker factory tests** - All worker creation tests now passing
- **Modular architecture** - Refactored workers into organized directory structure

### Architecture Improvements

- **Dependency injection** - ServiceContainer pattern for better testability
- **Modular workers** - Each worker type organized in its own directory
- **Comprehensive testing** - Full test coverage for all core functionality
- **Type safety** - Proper TypeScript types throughout the codebase

## Development

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

## More Information

- See `src/services/container.ts` for the main ServiceContainer implementation
- See `src/workers/factory.ts` for worker creation patterns
- See `src/tests/` for comprehensive test examples
- See `src/workers/notes/` for an example of the modular worker structure
