# Queue Service

## Overview

This service is responsible for processingyarnotes, ingredients, instructions, images, and categorization jobs using BullMQ queues. It exposes an HTTP API, a health check endpoint, and a WebSocket server for real-time status updates.

## Key Features

- BullMQ-based job queues for scalable background processing
- WebSocket server for real-time status updates
- Health monitoring and graceful shutdown
- **ServiceContainer** pattern for dependency injection and testability

## Project Structure

```
apps/queue/
├── src/
│   ├── services/           # ServiceContainer and all core service definitions
│   ├── workers/            # Worker setup and management
│   ├── queues/             # Queue definitions
│   ├── routes/             # Express route handlers
│   ├── config/             # Configuration files
│   ├── utils/              # Utility modules
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

## Running Tests

This project uses [Vitest](https://vitest.dev/) for testing. To run the tests:

```sh
yarn test
```

Or to run the UI:

```sh
yarn test:ui
```

## More Information

- See `src/services/container.ts` for the main ServiceContainer implementation
- See `src/di/__tests__/container.test.ts` for example tests using the ServiceContainer
