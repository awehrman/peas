# Note Worker

The Note Worker is responsible for processing HTML content and creating notes in the database. It follows a pipeline-based architecture where each step transforms the data and passes it to the next step.

## Pipeline Stages

The note processing pipeline consists of the following stages:

1. **Stage 1 (NoteJobData)**: Initial job data containing HTML content and metadata
2. **Stage 2 (NotePipelineStage2)**: After HTML parsing, contains parsed HTML structure
3. **Stage 3 (NotePipelineStage3)**: After note creation, contains the created note

## Actions

The worker uses the following actions in sequence:

- **NoteStartProcessingStatusAction**: Broadcasts processing status at the start using importId
- **CleanHtmlAction**: Removes style and icon tags from HTML content
- **ParseHtmlAction**: Parses HTML content into structured data
- **SaveNoteAction**: Saves the parsed note to the database
- **ScheduleImagesAction**: Schedules image processing tasks
- **ScheduleSourceAction**: Schedules source processing tasks
- **ScheduleIngredientsAction**: Schedules ingredient processing tasks
- **ScheduleInstructionsAction**: Schedules instruction processing tasks
- **ScheduleAllFollowupTasksAction**: Schedules all follow-up processing tasks

## Error Handling

The worker implements comprehensive error handling:

- **Retry Logic**: Failed actions are retried with exponential backoff
- **Error Logging**: All errors are logged with context information
- **Graceful Degradation**: Non-critical failures don't stop the entire pipeline
- **Status Updates**: Processing status is broadcast throughout the pipeline

## Dependencies

The worker requires the following dependencies:

- **parseHTML**: Function to parse HTML content
- **createNote**: Function to create notes in the database
- **addStatusEventAndBroadcast**: Function to broadcast status updates
- **Queues**: Various queues for scheduling follow-up tasks

## Usage

```typescript
import { createNoteWorker } from "./note-worker";

const worker = createNoteWorker(queue, serviceContainer);
await worker.process(jobData);
```
