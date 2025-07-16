# Note Worker

The Note Worker is responsible for processing HTML content and creating notes in the database. It's the primary entry point for note processing in the queue system.

## Overview

The Note Worker handles the complete lifecycle of note creation:

1. **HTML Parsing** - Converts raw HTML content into structured data
2. **Note Creation** - Saves the parsed content to the database
3. **Status Management** - Tracks processing status and broadcasts updates
4. **Follow-up Scheduling** - Queues additional processing tasks (categorization, image processing, etc.)

## Architecture

```text
src/workers/note/
├── note-worker.ts          # Main worker class
├── types.ts                # Note-specific type definitions
├── schema.ts               # Zod schemas and validation utilities for note processing
├── index.ts                # Barrel exports
├── actions/                # Note processing actions
│   ├── index.ts            # Action registration
│   ├── parse-html.ts       # HTML parsing action
│   ├── save-note.ts        # Database save action
│   ├── add-status-actions.ts # Status management
│   ├── schedule-*.ts       # Follow-up task scheduling
└── tests/                  # Unit tests (TODO)
```

## Key Components

### NoteWorker Class

- Extends `BaseWorker` for common functionality
- Manages the note processing pipeline
- Handles dependency injection and validation
- Provides type-safe action creation

### Actions

Each action is a single responsibility unit that handles one aspect of note processing:

- **ParseHtmlAction**: Converts HTML content to structured data
- **SaveNoteAction**: Persists the note to the database
- **AddStatusActionsAction**: Manages processing status and broadcasts updates
- **ScheduleActions**: Queue follow-up processing tasks

### Types

Comprehensive type definitions for:

- Worker dependencies
- Job data structures
- Action inputs/outputs
- Database models

### Schemas & Validation

All Zod schemas and validation utilities for note processing are defined in `schema.ts` at the root of the `note/` directory. These schemas are used to validate job data, parsed files, and action inputs/outputs throughout the note processing pipeline.

**Example usage in an action:**

```typescript
import { ZodNoteValidation } from "../schema";

// ... inside an action class ...
const validationResult = ZodNoteValidation.validateSaveNoteData(data);
if (!validationResult.success) {
  throw new Error(validationResult.error);
}
```

## Usage

### Creating a Note Worker

```typescript
import { createNoteWorker } from "./workers/note";
import { Queue } from "bullmq";

const noteQueue = new Queue("note-processing");
const worker = createNoteWorker(noteQueue, serviceContainer);
```

### Adding a Job

```typescript
await noteQueue.add("process-note", {
  content: "<html>...</html>",
  noteId: "optional-note-id",
  source: {
    url: "https://example.com/recipe",
    filename: "recipe.html",
  },
  options: {
    skipCategorization: false,
    skipImageProcessing: false,
  },
});
```

## Data Flow

1. **Input**: `NoteJobData` with HTML content
2. **Parse HTML**: Convert to `ParsedHTMLFile`
3. **Save Note**: Create `NoteWithParsedLines` in database
4. **Add Status**: Broadcast "PROCESSING" status
5. **Schedule Tasks**: Queue follow-up processing
6. **Complete**: Broadcast "COMPLETED" status

## Dependencies

The Note Worker requires these services from the container:

- `parsers.parseHTML`: HTML parsing function
- `database.createNote`: Database note creation
- Queue instances for follow-up processing
- Status broadcasting and error handling utilities

## Error Handling

- Each action has built-in retry logic for transient failures
- Comprehensive error context for debugging
- Graceful degradation for optional processing steps
- Status updates on failures for user feedback

## Testing

Unit tests should cover:

- Individual action behavior
- Worker pipeline integration
- Error scenarios and recovery
- Type safety validation

## Future Enhancements

- [ ] Add comprehensive unit tests
- [ ] Implement processing metrics
- [ ] Add support for batch processing
- [ ] Enhance error recovery strategies
- [ ] Add processing priority levels
