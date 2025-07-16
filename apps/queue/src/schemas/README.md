# Centralized Schema System

This directory contains a centralized schema system for the queue application. All Zod schemas and validation utilities are organized here for reuse across different workers.

## Structure

```
schemas/
├── base.ts          # Base schemas shared across all workers
├── note.ts          # Note-specific schemas
├── ingredient.ts    # Ingredient-specific schemas
├── index.ts         # Barrel exports and utilities
└── README.md        # This file
```

## Base Schemas

The `base.ts` file contains schemas that are shared across all workers:

- `SourceSchema` - Source information (URL, filename, etc.)
- `ProcessingOptionsSchema` - Processing options and flags
- `JobMetadataSchema` - Job metadata (ID, worker name, retry info)
- `BaseJobDataSchema` - Base job data that all workers extend
- `StatusEventSchema` - Status event structure
- `ErrorContextSchema` - Error context for debugging
- `ParsedSegmentSchema` - Parsed segment structure
- `ParseResultSchema` - Parse result structure

## Worker-Specific Schemas

Each worker has its own schema file that extends the base schemas:

### Note Schemas (`note.ts`)

- `NoteJobDataSchema` - Note job data
- `ParseHtmlDataSchema` - HTML parsing input
- `ParsedHtmlFileSchema` - Parsed HTML file structure
- `SaveNoteDataSchema` - Note saving input
- `ScheduleActionDataSchema` - Action scheduling data

### Ingredient Schemas (`ingredient.ts`)

- `IngredientJobDataSchema` - Ingredient job data
- `ProcessIngredientLineInputSchema` - Ingredient line processing input
- `ProcessIngredientLineOutputSchema` - Ingredient line processing output
- `SaveIngredientLineInputSchema` - Ingredient line saving input
- `SaveIngredientLineOutputSchema` - Ingredient line saving output

## Validation Utilities

Each schema file includes validation utilities:

### BaseValidation

Generic validation functions that can be used with any schema:

```typescript
import { BaseValidation } from "../../schemas";

const result = BaseValidation.validate(schema, data);
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

### Worker-Specific Validation

Each worker has its own validation class that extends BaseValidation:

```typescript
import { NoteValidation } from "../../schemas";

const result = NoteValidation.validateNoteJobData(data);
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

## Usage Examples

### In Actions

```typescript
import { ValidatedAction } from "../core/validated-action";
import { ParseHtmlDataSchema } from "../../schemas";

export class ParseHtmlAction extends ValidatedAction<
  typeof ParseHtmlDataSchema,
  ParseHtmlDeps,
  ParseHtmlOutput
> {
  constructor() {
    super(ParseHtmlDataSchema);
  }

  async run(
    data: ParseHtmlData,
    deps: ParseHtmlDeps
  ): Promise<ParseHtmlOutput> {
    // Action logic here
  }
}
```

### In Workers

```typescript
import { NoteValidation } from "../../schemas";

// Validate job data before processing
const validation = NoteValidation.validateNoteJobData(jobData);
if (!validation.success) {
  throw new Error(`Invalid job data: ${validation.error}`);
}
```

### In Test Routes

```typescript
import { NoteValidation } from "../../schemas";

router.post("/", (req, res) => {
  const validation = NoteValidation.validateNoteJobData(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }

  // Process valid data
  const jobData = validation.data;
});
```

## Adding New Schemas

### 1. Add to Base Schemas (if shared)

If the schema is used by multiple workers, add it to `base.ts`:

```typescript
export const NewSharedSchema = z.object({
  // schema definition
});
```

### 2. Add to Worker-Specific Schemas

If the schema is specific to one worker, add it to the worker's schema file:

```typescript
export const NewWorkerSchema = z.object({
  // schema definition
});
```

### 3. Add Validation Methods

Add validation methods to the appropriate validation class:

```typescript
export class WorkerValidation extends BaseValidation {
  static validateNewSchema(data: unknown) {
    return this.validate(NewWorkerSchema, data);
  }
}
```

### 4. Export from Index

Add the new schema to the exports in `index.ts`:

```typescript
export * from "./new-worker";
```

## Benefits

1. **DRY Principle** - No duplicate schema definitions
2. **Type Safety** - Consistent types across the application
3. **Validation** - Centralized validation logic
4. **Maintainability** - Easy to update schemas in one place
5. **Reusability** - Schemas can be shared between workers
6. **Consistency** - Standardized error messages and validation rules

## Migration Guide

When migrating existing workers to use the centralized schemas:

1. **Replace local schemas** with imports from `../../schemas`
2. **Update validation calls** to use the new validation classes
3. **Remove duplicate type definitions** that are now in the schema files
4. **Update imports** in actions and workers
5. **Test thoroughly** to ensure validation still works correctly

## Future Enhancements

- [ ] Add more worker-specific schemas (instruction, image, categorization, source)
- [ ] Add schema versioning for backward compatibility
- [ ] Add schema migration utilities
- [ ] Add schema documentation generation
- [ ] Add schema testing utilities
