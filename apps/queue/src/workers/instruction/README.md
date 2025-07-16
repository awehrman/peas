# Instruction Worker

The Instruction Worker is responsible for processing and saving instruction lines as part of the note processing pipeline.

## Overview

- **Processes** instruction lines using parsing logic
- **Saves** parsed instruction data to the database
- **Tracks** status and logs progress

## Structure

```text
src/workers/instruction/
├── instruction-worker.ts   # Main worker class
├── types.ts               # Instruction-specific type definitions
├── index.ts               # Barrel exports
├── actions/               # Instruction processing actions
│   ├── index.ts
│   ├── process-instruction-line.ts
│   └── save-instruction-line.ts
└── tests/                 # Unit tests (TODO)
```

## Usage

### Creating an Instruction Worker

```typescript
import { createInstructionWorker } from "./workers/instruction";
import { Queue } from "bullmq";

const instructionQueue = new Queue("instruction-processing");
const worker = createInstructionWorker(instructionQueue, serviceContainer);
```

### Adding a Job

```typescript
await instructionQueue.add("process_instruction_line", {
  instructionLineId: "abc123",
  originalText: "Mix flour and water.",
  lineIndex: 0,
  noteId: "note456",
});
```

## Data Flow

1. **Input**: `InstructionJobData` with instruction line info
2. **Process**: Parse the instruction line
3. **Save**: Store parsed steps in the database

## Dependencies

- `database.updateInstructionLine`
- `database.createInstructionSteps`
- `parseInstruction`
- Logging, error handling, and status broadcasting utilities

## Testing

- Unit tests should cover action logic and worker integration
- Error handling and edge cases

## Future Enhancements

- [ ] Add comprehensive unit tests
- [ ] Support for more complex instruction parsing
- [ ] Metrics and monitoring
