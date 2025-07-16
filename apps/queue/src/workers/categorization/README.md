# Categorization Worker

The Categorization Worker is responsible for analyzing and categorizing recipes as part of the note processing pipeline.

## Overview

- **Analyzes** recipe content to determine categories and tags
- **Saves** categorization results to the database
- **Tracks** status and logs progress

## Structure

```text
src/workers/categorization/
├── categorization-worker.ts   # Main worker class
├── types.ts                  # Categorization-specific type definitions
├── index.ts                  # Barrel exports
├── actions/                  # Categorization processing actions
│   ├── index.ts
│   ├── process-categorization.ts
│   └── save-categorization.ts
└── tests/                    # Unit tests (TODO)
```

## Usage

### Creating a Categorization Worker

```typescript
import { createCategorizationWorker } from "./workers/categorization";
import { Queue } from "bullmq";

const categorizationQueue = new Queue("categorization-processing");
const worker = createCategorizationWorker(
  categorizationQueue,
  serviceContainer
);
```

### Adding a Job

```typescript
await categorizationQueue.add("process_categorization", {
  noteId: "note123",
  title: "Chicken Pasta",
  content: "A delicious chicken pasta recipe...",
  ingredients: ["chicken", "pasta", "tomatoes"],
  instructions: ["Cook chicken", "Boil pasta"],
  options: {
    confidenceThreshold: 0.8,
    maxCategories: 5,
    maxTags: 10,
  },
});
```

## Data Flow

1. **Input**: `CategorizationJobData` with recipe content
2. **Process**: Analyze content to determine categories and tags
3. **Save**: Store categorization results in the database

## Dependencies

- `categorizer.categorizeRecipe`
- `database.updateNoteCategories`
- `database.updateNoteTags`
- Logging, error handling, and status broadcasting utilities

## Testing

- Unit tests should cover action logic and worker integration
- Error handling and edge cases

## Future Enhancements

- [ ] Add comprehensive unit tests
- [ ] Support for more sophisticated categorization algorithms
- [ ] Metrics and monitoring
