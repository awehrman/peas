# Queue App Tests

This directory contains all tests for the queue application, organized to mirror the source code structure.

## Directory Structure

```
tests/
├── services/           # Tests for dependency injection and service container
│   └── container.test.ts
├── workers/            # Tests for worker management and factory
│   └── manager.test.ts
├── utils/              # Tests for utility functions
│   ├── error-handler.test.ts
│   ├── health-monitor.test.ts
│   └── performance.test.ts
├── websocket/          # Tests for WebSocket server functionality
│   └── websocket-server.test.ts
├── index.ts            # Test exports for discovery
└── README.md           # This file
```

## Test Organization

### Services Tests (`/services`)

- **container.test.ts**: Tests for the dependency injection container
  - Singleton pattern verification
  - Service dependency injection
  - Custom dependency creation
  - Resource cleanup
  - Configuration loading

### Workers Tests (`/workers`)

- **manager.test.ts**: Tests for worker management
  - Worker creation and factory
  - Worker lifecycle management
  - Error handling during worker operations
  - Worker status tracking

### Utils Tests (`/utils`)

- **error-handler.test.ts**: Tests for error handling utilities
  - Error creation and classification
  - Validation error handling
  - Retry logic and backoff calculation
  - Error logging with different severity levels

- **health-monitor.test.ts**: Tests for health monitoring
  - Health status caching
  - Component health checks
  - Database and Redis health monitoring

- **performance.test.ts**: Tests for performance tracking
  - Performance measurement
  - Duration calculation
  - Average duration computation

### WebSocket Tests (`/websocket`)

- **websocket-server.test.ts**: Tests for WebSocket functionality
  - Connection management
  - Message handling
  - Status broadcasting
  - Server lifecycle

## Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test --watch

# Run specific test file
yarn test services/container.test.ts

# Run tests with coverage
yarn test --coverage
```

## Test Patterns

### Mocking

- External dependencies are mocked (database, Redis, WebSocket)
- Console methods are mocked for testing logging
- Factory functions are mocked for testing worker creation

### Test Structure

- Each test file follows the pattern: `describe > describe > it`
- Setup and teardown use `beforeEach` and `afterEach`
- Tests are isolated and don't depend on each other

### Coverage

- Tests cover happy path scenarios
- Error conditions and edge cases
- Boundary conditions and validation
- Integration between components

## Adding New Tests

1. Create test file in the appropriate directory matching the source structure
2. Follow the existing naming convention: `{module}.test.ts`
3. Import the module being tested with relative paths
4. Add comprehensive test coverage including edge cases
5. Update this README if adding new test categories
