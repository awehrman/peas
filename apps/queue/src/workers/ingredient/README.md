# Ingredient Worker

The Ingredient Worker is responsible for processing and saving ingredient lines as part of the note processing pipeline. It parses raw ingredient text into structured data and stores it in the database.

## Overview

The Ingredient Worker handles:

- **Ingredient Parsing**: Converts raw ingredient text into structured data
- **Data Extraction**: Extracts amounts, units, ingredients, and modifiers
- **Database Storage**: Saves parsed ingredient data to the database
- **Status Tracking**: Monitors processing status and provides real-time updates
- **Error Handling**: Comprehensive error handling and recovery

## Architecture

```text
src/workers/ingredient/
├── ingredient-worker.ts   # Main worker class
├── types.ts              # Ingredient-specific type definitions
├── index.ts              # Barrel exports
├── actions/              # Ingredient processing actions
│   ├── index.ts         # Action registration
│   ├── process-ingredient-line.ts
│   └── save-ingredient-line.ts
└── tests/                # Unit tests (TODO)
```

## Key Components

### IngredientWorker Class

- Extends `BaseWorker` for common functionality
- Manages the ingredient processing pipeline
- Handles dependency injection and validation
- Provides type-safe action creation

### Actions

Each action handles a specific aspect of ingredient processing:

- **ProcessIngredientLineAction**: Parses raw ingredient text into structured data
- **SaveIngredientLineAction**: Persists the parsed ingredient data to the database

### Types

Comprehensive type definitions for:

- Worker dependencies
- Job data structures
- Action inputs/outputs
- Parsed ingredient models

## Usage

### Creating an Ingredient Worker

```typescript
import { createIngredientWorker } from "./workers/ingredient";
import { Queue } from "bullmq";

const ingredientQueue = new Queue("ingredient-processing");
const worker = createIngredientWorker(ingredientQueue, serviceContainer);
```

### Adding a Job

```typescript
await ingredientQueue.add("process_ingredient_line", {
  ingredientLineId: "abc123",
  reference: "2 cups all-purpose flour",
  blockIndex: 0,
  lineIndex: 0,
  noteId: "note456",
  metadata: {
    source: "recipe.html",
  },
});
```

### Job Data Structure

```typescript
interface IngredientJobData {
  ingredientLineId: string;
  reference: string; // Raw ingredient text
  blockIndex: number; // Block index in the note
  lineIndex: number; // Line index within the block
  noteId: string; // Associated note ID
  metadata?: Record<string, unknown>;
}
```

## Data Flow

1. **Input**: `IngredientJobData` with raw ingredient text
2. **Parse**: Extract amounts, units, ingredients, and modifiers
3. **Validate**: Ensure parsed data meets quality standards
4. **Save**: Store structured data in the database
5. **Status**: Broadcast completion status

### Parsing Examples

The worker can parse various ingredient formats:

```typescript
// Simple ingredients
"2 cups flour" → { amount: 2, unit: "cups", ingredient: "flour" }

// Complex ingredients
"1/2 cup unsalted butter, softened" → {
  amount: 0.5,
  unit: "cup",
  ingredient: "butter",
  modifiers: ["unsalted", "softened"]
}

// Ingredients with ranges
"1-2 tablespoons olive oil" → {
  amount: { min: 1, max: 2 },
  unit: "tablespoons",
  ingredient: "olive oil"
}

// Ingredients with notes
"3 large eggs, room temperature" → {
  amount: 3,
  unit: "large",
  ingredient: "eggs",
  notes: "room temperature"
}
```

## Dependencies

The Ingredient Worker requires these services from the container:

- `database.updateIngredientLine`: Update ingredient line status
- `database.createParsedSegments`: Create parsed ingredient segments
- `parseIngredient`: Ingredient parsing function
- Status broadcasting and error handling utilities

## Error Handling

The worker implements comprehensive error handling:

- **Input Validation**: Validates job data before processing
- **Parsing Errors**: Handles malformed ingredient text gracefully
- **Database Errors**: Retries database operations on transient failures
- **Status Updates**: Provides real-time error status to users

### Common Error Scenarios

```typescript
// Invalid ingredient text
"invalid ingredient" → ValidationError

// Database connection issues
DatabaseConnectionError → Retry with exponential backoff

// Parsing failures
"1 cup of" → ParsingError (incomplete ingredient)
```

## Performance

The worker is optimized for performance:

- **Caching**: Caches parsed results for identical ingredients
- **Batch Processing**: Supports batch ingredient processing
- **Concurrency**: Configurable worker concurrency
- **Metrics**: Performance monitoring and optimization

## Testing

Unit tests should cover:

- **Parsing Logic**: Test various ingredient formats
- **Error Scenarios**: Test error handling and recovery
- **Database Operations**: Test data persistence
- **Integration**: Test worker pipeline integration

### Test Examples

```typescript
// Test ingredient parsing
const action = new ProcessIngredientLineAction();
const result = await action.execute(
  {
    reference: "2 cups flour",
    ingredientLineId: "test123",
    blockIndex: 0,
    lineIndex: 0,
    noteId: "note123",
  },
  deps,
  context
);

expect(result.parsedSegments).toHaveLength(1);
expect(result.parsedSegments[0].amount).toBe(2);
expect(result.parsedSegments[0].unit).toBe("cups");
expect(result.parsedSegments[0].ingredient).toBe("flour");
```

## Configuration

The worker uses centralized configuration:

```typescript
import { PROCESSING_DEFAULTS } from "../../config";

// Minimum ingredient text length
const minLength = PROCESSING_DEFAULTS.MIN_INGREDIENT_TEXT_LENGTH;

// Processing time limits
const processingTime = PROCESSING_DEFAULTS.INSTRUCTION_PROCESSING_TIME_MS;
```

## Troubleshooting

### Common Issues

1. **Parsing Failures**
   - Check ingredient text format
   - Verify parsing function is working
   - Review error logs for specific issues

2. **Database Errors**
   - Check database connection
   - Verify table schemas
   - Review transaction logs

3. **Performance Issues**
   - Monitor worker concurrency
   - Check cache hit rates
   - Review processing times

### Debug Mode

Enable debug logging for detailed troubleshooting:

```typescript
// Set environment variable
process.env.DEBUG = "ingredient-worker:*";

// Or configure logger
serviceContainer.logger.log("Debug mode enabled", "debug");
```

### Health Checks

Monitor worker health:

```typescript
// Check worker status
const status = worker.getStatus();
console.log("Worker running:", status.isRunning);

// Check queue depth
const queueDepth = await ingredientQueue.count();
console.log("Queue depth:", queueDepth);
```

## Future Enhancements

- [ ] Add comprehensive unit tests
- [ ] Support for more complex ingredient formats
- [ ] Implement ingredient normalization
- [ ] Add ingredient validation rules
- [ ] Support for international units
- [ ] Add ingredient substitution logic
- [ ] Implement ingredient categorization
- [ ] Add support for dietary restrictions
