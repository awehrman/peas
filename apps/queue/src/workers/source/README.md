# Source Worker

The Source Worker is responsible for processing and saving source information as part of the note processing pipeline.

## Overview

- **Processes** source data and metadata
- **Saves** processed source information to the database
- **Tracks** status and logs progress

## Structure

```text
src/workers/source/
├── source-worker.ts      # Main worker class
├── types.ts             # Source-specific type definitions
├── index.ts             # Barrel exports
├── actions/             # Source processing actions
│   ├── index.ts
│   ├── process-source.ts
│   ├── save-source.ts
│   ├── add-processing-status.ts
│   └── add-completed-status.ts
└── tests/               # Unit tests (TODO)
```

## Usage

### Creating a Source Worker

```typescript
import { createSourceWorker } from "./workers/source";
import { Queue } from "bullmq";

const sourceQueue = new Queue("source-processing");
const worker = createSourceWorker(sourceQueue, serviceContainer);
```

### Adding a Job

```typescript
await sourceQueue.add("process_source", {
  title: "Recipe Source",
  content: "Original recipe content...",
  sourceId: "source123",
  noteId: "note456",
});
```

## Data Flow

1. **Input**: `SourceJobData` with source information
2. **Process**: Process the source data
3. **Save**: Store processed source in the database
4. **Status**: Update processing status

## Dependencies

- `sourceProcessor.processSource`
- `database.saveSource`
- Logging, error handling, and status broadcasting utilities

## Testing

- Unit tests should cover action logic and worker integration
- Error handling and edge cases

## Future Enhancements

- [ ] Add comprehensive unit tests
- [ ] Support for more source types
- [ ] Metrics and monitoring
