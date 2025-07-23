# Queue Service Architecture

This document outlines the architecture patterns and conventions used in the queue service.

## 🏗️ **Architecture Overview**

The queue service follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Routes)                       │
├─────────────────────────────────────────────────────────────┤
│                  Service Layer (Container)                  │
├─────────────────────────────────────────────────────────────┤
│                  Worker Layer (Actions)                     │
├─────────────────────────────────────────────────────────────┤
│                  Parser Layer (Parsers)                     │
├─────────────────────────────────────────────────────────────┤
│                  Database Layer (Prisma)                    │
└─────────────────────────────────────────────────────────────┘
```

## 📁 **Project Structure**

```
src/
├── config/           # Configuration and constants
├── middleware/       # Request/response middleware
├── parsers/          # HTML parsing logic
├── queues/           # Queue definitions
├── routes/           # API endpoints
├── schemas/          # Validation schemas
├── services/         # Service layer (DI container)
├── types/            # Type definitions
├── utils/            # Utility functions
├── workers/          # Worker implementations
│   ├── core/         # Base classes and utilities
│   ├── note/         # Note-specific workers
│   └── shared/       # Shared worker utilities
├── index.ts          # Main application entry
└── types.ts          # Core type definitions
```

## 🎯 **Core Design Principles**

### **1. Enum-Driven Architecture**

- All action names, queue names, and status values use enums
- Provides type safety and prevents magic strings
- Centralized in `types.ts` for consistency

```typescript
export enum ActionName {
  CLEAN_HTML = "clean_html",
  PARSE_HTML = "parse_html",
  SAVE_NOTE = "save_note",
  // ...
}

export enum QueueName {
  NOTES = "notes",
  INGREDIENTS = "ingredients",
  // ...
}
```

### **2. Service-Action Separation**

- **Services**: Handle business logic and external dependencies
- **Actions**: Handle job processing steps with timing and error handling
- Clear separation prevents circular dependencies

### **3. Dependency Injection**

- All dependencies managed through `ServiceContainer`
- Services registered once, injected everywhere
- Enables testing and modularity

### **4. Type Safety**

- Comprehensive TypeScript usage throughout
- Generic types for actions and workers
- Branded types where appropriate

## 🔧 **Key Components**

### **Service Container**

The central dependency injection container:

```typescript
export class ServiceContainer implements IServiceContainer {
  public readonly queues: IQueueService;
  public readonly database: IDatabaseService;
  public readonly parsers: IParserService;
  // ... other services

  public static async getInstance(): Promise<ServiceContainer> {
    // Singleton pattern with async initialization
  }
}
```

### **Action Factory**

Manages action registration and creation:

```typescript
export class ActionFactory<TData, TDeps, TResult> {
  register(
    name: ActionName,
    factory: () => BaseAction<TData, TDeps, TResult>
  ): void;
  create(name: ActionName, deps: TDeps): BaseAction<TData, TDeps, TResult>;
  registerWithWrappers(name: ActionName, factory, wrappers): void;
}
```

### **Base Action**

All actions extend this base class:

```typescript
export abstract class BaseAction<TData, TDeps, TResult> {
  abstract name: ActionName;
  abstract execute(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<TResult>;

  async executeWithTiming(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<ActionResult<TResult>>;
  withConfig(config: Partial<ActionConfig>): this;
}
```

### **Base Worker**

All workers extend this base class:

```typescript
export abstract class BaseWorker<TData, TDeps, TResult> {
  protected abstract actionFactory: ActionFactory<TData, TDeps, TResult>;
  protected abstract registerActions(): void;
  protected abstract createActionPipeline(
    data: TData,
    context: ActionContext
  ): WorkerAction<TData, TDeps, TResult>[];
}
```

## 📋 **Naming Conventions**

### **Files**

- `kebab-case` for file names
- Descriptive names that indicate purpose
- Group related functionality in directories

### **Classes**

- `PascalCase` for class names
- `I` prefix for interfaces (e.g., `IServiceContainer`)
- `Base` prefix for abstract base classes

### **Functions**

- `camelCase` for function names
- Verb-noun pattern for action names
- Descriptive names that explain purpose

### **Types**

- `PascalCase` for type names
- `T` prefix for generic type parameters
- Descriptive names that indicate structure

## 🔄 **Action Pipeline Pattern**

Actions are organized into pipelines for complex workflows:

```typescript
export function createNotePipeline(
  actionFactory: ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >,
  dependencies: NoteWorkerDependencies,
  data: NotePipelineData,
  context: ActionContext
): WorkerAction<NotePipelineData, NoteWorkerDependencies, NotePipelineData>[] {
  const actions: WorkerAction<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >[] = [];

  // Always start with clean and parse
  actions.push(actionFactory.create(ActionName.CLEAN_HTML, dependencies));
  actions.push(actionFactory.create(ActionName.PARSE_HTML, dependencies));

  // Conditionally add follow-up tasks
  if (!data.options?.skipFollowupTasks) {
    // Add scheduling actions
  }

  return actions;
}
```

## 🛡️ **Error Handling**

### **Structured Error Types**

```typescript
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  PARSING_ERROR = "PARSING_ERROR",
  // ...
}

export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}
```

### **Action-Level Error Handling**

- Each action can define custom error handling
- Automatic retry logic with exponential backoff
- Structured error logging with context

## 📊 **Health Monitoring**

### **Health Check Types**

```typescript
export enum HealthStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
}
```

### **Service Health**

- Database connectivity
- Redis connectivity
- Queue health
- Worker status

## 🧪 **Testing Patterns**

### **Action Testing**

```typescript
describe("CleanHtmlAction", () => {
  it("should clean HTML content", async () => {
    const action = new CleanHtmlAction();
    const result = await action.execute(testData, dependencies, context);
    expect(result).toBeDefined();
  });
});
```

### **Worker Testing**

```typescript
describe("NoteWorker", () => {
  it("should process note jobs", async () => {
    const worker = createNoteWorker(queue, container);
    // Test worker behavior
  });
});
```

## 🚀 **Performance Considerations**

### **Action Timing**

- All actions include timing information
- Performance metrics collected automatically
- Slow actions can be identified and optimized

### **Resource Management**

- Connection pooling for database
- Redis connection reuse
- Memory-efficient parsing

## 🔒 **Security**

### **Input Validation**

- All inputs validated with Zod schemas
- Type-safe parsing prevents injection attacks
- Sanitization of HTML content

### **Error Information**

- No sensitive data in error messages
- Structured logging for audit trails
- Rate limiting on API endpoints

## 📈 **Monitoring & Observability**

### **Structured Logging**

```typescript
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}
```

### **Metrics**

- Job processing times
- Success/failure rates
- Queue depths
- Worker utilization

## 🔄 **Deployment Considerations**

### **Environment Configuration**

- Environment-specific settings
- Feature flags for gradual rollouts
- Health check endpoints

### **Graceful Shutdown**

- Worker shutdown handling
- In-flight job completion
- Resource cleanup

## 📚 **Best Practices**

1. **Always use enums** for action names and status values
2. **Register actions** in the factory during worker initialization
3. **Use dependency injection** for all external dependencies
4. **Implement proper error handling** with structured error types
5. **Add timing information** to all actions for monitoring
6. **Validate inputs** with Zod schemas
7. **Use descriptive names** for all components
8. **Keep actions focused** on single responsibilities
9. **Test all components** with comprehensive test coverage
10. **Document complex logic** with clear comments

## 🔗 **Related Documentation**

- [Worker Implementation Guide](./workers/README.md)
- [Service Layer Documentation](./services/README.md)
- [Parser Implementation Guide](./parsers/README.md)
- [API Documentation](./routes/README.md)
