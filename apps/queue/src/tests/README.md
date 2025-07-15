# Queue App Tests

This directory contains all tests for the queue application, organized to mirror the source code structure.

## Directory Structure

```
tests/
├── services/           # Tests for dependency injection and service container
│   └── container.test.ts
├── utils/              # Tests for utility functions
│   ├── error-handler.test.ts
│   ├── health-monitor.test.ts
│   ├── performance.test.ts
│   └── status-broadcaster.test.ts
├── workers/            # Tests for worker management and processing
│   ├── factory.test.ts
│   ├── manager.test.ts
│   ├── ingredients/    # Ingredient worker tests
│   │   ├── worker.test.ts
│   │   ├── process-job.test.ts
│   │   └── event-handlers.test.ts
│   ├── instructions/   # Instruction worker tests
│   │   ├── worker.test.ts
│   │   ├── process-job.test.ts
│   │   └── event-handlers.test.ts
│   └── notes/          # Notes worker tests
│       ├── worker.test.ts
│       ├── process-job.test.ts
│       ├── event-handlers.test.ts
│       ├── validation.test.ts
│       └── subtask-queues.test.ts
├── utils/              # Shared test utilities
│   └── worker-test-utils.ts
├── index.ts            # Test exports for discovery
└── README.md           # This file
```

## Test Organization

### Services Tests (`/services`)

- **container.test.ts**: Tests for the dependency injection container
  - Singleton pattern verification
  - Service dependency injection
  - Custom dependency creation
  - Resource cleanup and error handling
  - Configuration loading

### Workers Tests (`/workers`)

- **factory.test.ts**: Tests for worker factory functionality
  - Worker creation for different types (ingredients, instructions, notes, images, categorization)
  - Error handling during worker creation
  - Queue validation and null/undefined handling
  - Factory interface compliance

- **manager.test.ts**: Tests for worker management
  - Worker lifecycle management (start/stop)
  - Error handling during worker operations
  - Worker status tracking
  - Integration tests for multiple worker types
  - Partial failure scenarios

#### Worker-Specific Tests

Each worker type (ingredients, instructions, notes) has its own test suite:

- **worker.test.ts**: Tests for worker setup and configuration
  - Worker creation with correct configuration
  - Event handler registration (completed, failed, error)
  - Concurrency settings
  - Integration with BullMQ

- **process-job.test.ts**: Tests for job processing logic
  - Successful job processing
  - Validation error handling
  - Service health checks
  - Database error handling
  - Status event error handling
  - Retry logic and error classification
  - Batch processing scenarios

- **event-handlers.test.ts**: Tests for worker event handlers
  - Completed job logging
  - Failed job error handling
  - Error event processing

- **validation.test.ts** (notes only): Tests for data validation
  - Job data validation
  - Note structure validation

- **subtask-queues.test.ts** (notes only): Tests for subtask queue management
  - Queue creation and management
  - Job distribution to subtask queues

### Utils Tests (`/utils`)

- **error-handler.test.ts**: Tests for error handling utilities
  - Error creation and classification
  - Validation error handling
  - Retry logic and backoff calculation
  - Error logging with different severity levels
  - QueueError creation and handling

- **health-monitor.test.ts**: Tests for health monitoring
  - Health status caching
  - Component health checks (database, Redis, queue)
  - Error handling in health checks
  - Unhealthy service detection

- **performance.test.ts**: Tests for performance tracking
  - Performance measurement
  - Duration calculation
  - Average duration computation
  - Performance monitoring utilities

- **status-broadcaster.test.ts**: Tests for status broadcasting
  - Status event creation
  - WebSocket broadcasting
  - Error handling in status events

### Test Utilities (`/utils`)

- **worker-test-utils.ts**: Shared utilities for worker testing
  - BullMQ Worker mocking
  - Event listener capture
  - Common mock setup and teardown
  - Test environment management

## Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test --watch

# Run tests with coverage
yarn test:coverage

# Run specific test file
yarn test workers/ingredients/process-job.test.ts

# Run specific worker tests
yarn test workers/ingredients/
yarn test workers/instructions/
yarn test workers/notes/
```

## Test Patterns

### Mocking Strategy

- **External Dependencies**: Database (Prisma), Redis, WebSocket, and parser modules are mocked
- **Console Methods**: Console.log and console.error are mocked for testing logging behavior
- **BullMQ**: Worker and Queue classes are mocked with captured event listeners and process functions
- **Error Handling**: ErrorHandler utilities are mocked to test error scenarios
- **Health Monitoring**: HealthMonitor is mocked to test healthy/unhealthy service states

### Test Structure

- **Setup Order**: Mocks are defined before importing modules under test
- **Test Organization**: `describe > describe > it` pattern for clear test hierarchy
- **Isolation**: Each test is isolated with `beforeEach`/`afterEach` for setup/teardown
- **Async Testing**: Proper use of `async/await` with Promise-based assertions

### Error Testing Patterns

- **QueueError Testing**: Tests throw `QueueError` instances (not raw `Error`) to match real error handling
- **Mock Implementation**: Use call counters or `mockImplementationOnce` for complex error scenarios
- **Health Monitor**: Use `vi.spyOn` to override health check results
- **Event Handlers**: Mock event handler registration to capture and verify event listeners

### Coverage Goals

- **Happy Path**: Successful processing scenarios
- **Error Conditions**: Validation errors, service failures, database errors
- **Edge Cases**: Empty data, malformed inputs, boundary conditions
- **Integration**: Component interaction and error propagation
- **Lifecycle**: Worker startup, shutdown, and error recovery

## Adding New Tests

1. **Create test file** in the appropriate directory matching the source structure
2. **Follow naming convention**: `{module}.test.ts`
3. **Import with relative paths**: Use relative imports from test location
4. **Mock dependencies**: Set up mocks before importing modules under test
5. **Test patterns**: Follow established patterns for error handling and async testing
6. **Update documentation**: Update this README when adding new test categories

### Example Test Structure

```typescript
// Mock dependencies before imports
vi.mock("../../../../src/config/redis");
vi.mock("../../../../src/workers/example/process-job");

// Import after mocks
import { setupExampleWorker } from "../../../../src/workers/example/worker";

describe("Example Worker", () => {
  beforeEach(() => {
    // Setup test environment
  });

  afterEach(() => {
    // Cleanup
  });

  describe("setupExampleWorker", () => {
    it("should create worker with correct configuration", () => {
      // Test implementation
    });
  });
});
```
