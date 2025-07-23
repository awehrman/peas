# Note Worker

The Note Worker is responsible for processing HTML content and creating notes in the database. It follows a pipeline-based architecture with comprehensive type safety, structured logging, and robust error handling.

## Overview

The Note Worker processes HTML content through a series of actions that transform raw HTML into structured note data, with automatic scheduling of follow-up processing tasks for ingredients, instructions, images, and categorization.

## Architecture

```text
src/workers/note/
├── worker.ts         # Main NoteWorker class extending BaseWorker
├── types.ts          # Note-specific type definitions
├── dependencies.ts   # Dependency injection factory
├── pipeline.ts       # Action pipeline definition
├── actions/          # Note processing actions
│   ├── clean-html.ts # HTML cleaning and preprocessing
│   ├── parse-html.ts # HTML parsing and structure extraction
│   ├── save-note.ts  # Database note creation
│   └── schedule-*.ts # Follow-up task scheduling
└── README.md         # This documentation
```

## Pipeline Stages

The note processing pipeline consists of the following stages:

1. **Stage 1 (NoteJobData)**: Initial job data containing HTML content and metadata
2. **Stage 2 (NotePipelineStage2)**: After HTML parsing, contains parsed HTML structure
3. **Stage 3 (NotePipelineStage3)**: After note creation, contains the created note with parsed lines

## Actions

The worker uses the following actions in sequence:

### Core Processing Actions

- **CleanHtmlAction**: Removes style and icon tags from HTML content
  - Removes `<style>` and `<icons>` tags and their content
  - Logs character removal statistics
  - Broadcasts processing status

- **ParseHtmlAction**: Parses HTML content into structured data
  - Extracts title, ingredients, instructions, and images
  - Creates structured `ParsedHTMLFile` object
  - Handles parsing errors gracefully

- **SaveNoteAction**: Saves the parsed note to the database
  - Creates note record with parsed content
  - Creates parsed ingredient and instruction lines
  - Returns note with associated parsed lines

### Scheduling Actions

- **ScheduleImagesAction**: Schedules image processing tasks
  - Queues image processing jobs for extracted images
  - Handles image URL validation and processing

- **ScheduleSourceAction**: Schedules source processing tasks
  - Queues source metadata processing jobs
  - Handles source information extraction

- **ScheduleIngredientsAction**: Schedules ingredient processing tasks
  - Queues ingredient parsing jobs for each ingredient line
  - Handles ingredient line validation and processing

- **ScheduleInstructionsAction**: Schedules instruction processing tasks
  - Queues instruction processing jobs for each instruction line
  - Handles instruction line validation and processing

## Type Safety

The Note Worker implements comprehensive type safety:

```typescript
export class NoteWorker extends BaseWorker<
  NoteJobData,
  NoteWorkerDependencies,
  unknown
> {
  // Type-safe implementation
}

export interface NoteJobData extends BaseJobData {
  content: string;
  source?: {
    url?: string;
    filename?: string;
    contentType?: string;
    metadata?: Record<string, unknown>;
  };
  options?: {
    skipParsing?: boolean;
    skipCategorization?: boolean;
    skipImageProcessing?: boolean;
  };
}

export interface NoteWorkerDependencies extends BaseWorkerDependencies {
  htmlParser: {
    parseHtml: (data: NoteData) => Promise<{
      success: boolean;
      parsedData?: {
        title?: string;
        ingredients?: string[];
        instructions?: string[];
        images?: string[];
        metadata?: Record<string, unknown>;
      };
      errorMessage?: string;
      processingTime: number;
    }>;
  };
  database: {
    createNote: (
      data: Record<string, unknown>
    ) => Promise<DatabaseCreateResult>;
    updateNote: (
      noteId: string,
      data: Record<string, unknown>
    ) => Promise<DatabaseUpdateResult>;
    saveNoteMetadata: (
      noteId: string,
      metadata: Record<string, unknown>
    ) => Promise<DatabaseOperationResult>;
  };
}
```

## Dependencies

The worker requires the following dependencies:

### Core Dependencies

- **htmlParser**: HTML parsing utilities for extracting structured data
- **database**: Database operations for note creation and updates
- **addStatusEventAndBroadcast**: Status broadcasting function
- **logger**: Structured logging interface

### Queue Dependencies

- **ingredientQueue**: Queue for scheduling ingredient processing
- **instructionQueue**: Queue for scheduling instruction processing
- **imageQueue**: Queue for scheduling image processing
- **categorizationQueue**: Queue for scheduling categorization processing
- **sourceQueue**: Queue for scheduling source processing

## Usage

### Creating the Worker

```typescript
import { createNoteWorker } from "./note";

import { Queue } from "bullmq";

import { IServiceContainer } from "../../services/container";

const queue = new Queue("note-processing");
const worker = createNoteWorker(queue, serviceContainer);
```

### Adding Jobs

```typescript
await queue.add("process-note", {
  content: "<html>...</html>",
  importId: "import-123",
  source: {
    url: "https://example.com/recipe",
    filename: "recipe.html",
  },
  options: {
    skipParsing: false,
    skipCategorization: false,
    skipImageProcessing: false,
  },
});
```

### Monitoring Status

```typescript
// Status updates are automatically broadcast via WebSocket
// You can listen for status events:
// - PENDING: Job is queued
// - PROCESSING: Job is being processed
// - COMPLETED: Job completed successfully
// - FAILED: Job failed with error
```

## Error Handling

The worker implements comprehensive error handling:

### Retry Logic

- **Automatic Retry**: Failed actions are retried with exponential backoff
- **Configurable Limits**: Maximum retry attempts and delays
- **Circuit Breaker**: Prevents repeated failures against unstable services
- **Jitter**: Random delay variation to prevent thundering herd

### Error Logging

- **Structured Logging**: All errors are logged with metadata
- **Context Preservation**: Error context includes job ID, note ID, and operation
- **Performance Timing**: Error timing information for debugging
- **Stack Traces**: Full stack traces for debugging

### Graceful Degradation

- **Non-Critical Failures**: Non-critical failures don't stop the entire pipeline
- **Partial Success**: Partial processing results are preserved
- **Status Updates**: Processing status is broadcast throughout the pipeline
- **Recovery Mechanisms**: Automatic recovery from transient failures

## Performance Features

### Caching

- **HTML Parsing Cache**: Cached HTML parsing results for identical content
- **Database Query Cache**: Cached database queries for performance
- **Configurable TTL**: Time-based cache invalidation
- **Memory Management**: Automatic cache cleanup

### Optimization

- **Batch Processing**: Efficient batch database operations
- **Connection Pooling**: Optimized database connections
- **Memory Management**: Automatic resource cleanup
- **Concurrency Control**: Configurable worker concurrency

## Testing

The Note Worker is designed for comprehensive testing:

### Unit Testing

```typescript
import { createMockWorker } from "../__tests__/test-utils";

const mockDeps: NoteWorkerDependencies = {
  ...createBaseDependenciesFromContainer(mockContainer),
  htmlParser: {
    parseHtml: vi.fn().mockResolvedValue({
      success: true,
      parsedData: {
        title: "Test Recipe",
        ingredients: ["2 cups flour"],
        instructions: ["Mix ingredients"],
      },
      processingTime: 100,
    }),
  },
  database: {
    createNote: vi
      .fn()
      .mockResolvedValue({ id: "note-123", createdAt: new Date() }),
    updateNote: vi.fn().mockResolvedValue({ updatedAt: new Date() }),
    saveNoteMetadata: vi.fn().mockResolvedValue({ success: true }),
  },
};

const worker = createMockWorker(NoteWorker, mockDeps);
```

### Integration Testing

```typescript
const testData: NoteJobData = {
  content: "<html><body><h1>Test Recipe</h1></body></html>",
  importId: "test-import-123",
};

const result = await worker.process(testData);
expect(result.success).toBe(true);
```

### Error Testing

```typescript
// Test HTML parsing failure
mockDeps.htmlParser.parseHtml.mockRejectedValue(new Error("Parse failed"));

const result = await worker.process(testData);
expect(result.success).toBe(false);
expect(result.error).toContain("Parse failed");
```

## Configuration

### Worker Configuration

```typescript
interface NoteWorkerConfig {
  concurrency?: number; // Default: 2
  retryAttempts?: number; // Default: 3
  backoffMs?: number; // Default: 1000
  maxBackoffMs?: number; // Default: 30000
  timeoutMs?: number; // Default: 300000 (5 minutes)
}
```

### Processing Options

```typescript
interface ProcessingOptions {
  skipParsing?: boolean; // Skip HTML parsing step
  skipCategorization?: boolean; // Skip categorization processing
  skipImageProcessing?: boolean; // Skip image processing
}
```

## Monitoring and Observability

### Metrics

- **Processing Times**: HTML parsing and note creation timing
- **Success Rates**: Job success and failure rates
- **Queue Depth**: Queue depth monitoring
- **Error Rates**: Error rates by error type

### Logging

- **Structured Logging**: Consistent logging format with metadata
- **Performance Timing**: Action execution timing
- **Error Context**: Rich error context information
- **Debug Information**: Detailed debug information for troubleshooting

### Health Checks

- **Worker Status**: Worker running status
- **Queue Health**: Queue depth and processing rates
- **Database Health**: Database connectivity and performance
- **Memory Usage**: Memory usage monitoring

## Best Practices

### HTML Processing

1. **Content Validation**: Validate HTML content before processing
2. **Error Handling**: Handle malformed HTML gracefully
3. **Performance**: Optimize HTML parsing for large documents
4. **Caching**: Cache parsing results for identical content

### Database Operations

1. **Transactions**: Use transactions for related operations
2. **Batch Operations**: Use batch operations for efficiency
3. **Error Handling**: Handle database errors gracefully
4. **Connection Management**: Manage database connections properly

### Error Handling

1. **Retry Logic**: Implement appropriate retry logic
2. **Error Classification**: Classify errors appropriately
3. **Graceful Degradation**: Handle partial failures gracefully
4. **Monitoring**: Monitor error rates and patterns

### Performance

1. **Caching**: Cache expensive operations
2. **Batch Processing**: Use batch operations when possible
3. **Connection Pooling**: Use connection pooling for databases
4. **Memory Management**: Manage memory usage properly

## Troubleshooting

### Common Issues

1. **HTML Parsing Failures**
   - Check HTML content validity
   - Verify HTML structure
   - Review parsing error logs

2. **Database Connection Issues**
   - Check database connectivity
   - Verify connection pool settings
   - Review database error logs

3. **Queue Processing Delays**
   - Monitor queue depth
   - Check worker concurrency settings
   - Review processing performance

4. **Memory Issues**
   - Monitor memory usage
   - Check for memory leaks
   - Review large document processing

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Set environment variable
process.env.DEBUG = "note-worker:*";

// Or configure logger
serviceContainer.logger.log("Debug mode enabled", "debug");
```
