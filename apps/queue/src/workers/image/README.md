# Image Worker

The Image Worker is responsible for processing and saving images as part of the note processing pipeline.

## Overview

- **Processes** images using image processing logic
- **Saves** processed images to storage
- **Updates** note records with image URLs
- **Tracks** status and logs progress

## Structure

```text
src/workers/image/
├── image-worker.ts      # Main worker class
├── types.ts            # Image-specific type definitions
├── index.ts            # Barrel exports
├── actions/            # Image processing actions
│   ├── index.ts
│   ├── process-image.ts
│   └── save-image.ts
└── tests/              # Unit tests (TODO)
```

## Usage

### Creating an Image Worker

```typescript
import { createImageWorker } from "./workers/image";
import { Queue } from "bullmq";

const imageQueue = new Queue("image-processing");
const worker = createImageWorker(imageQueue, serviceContainer);
```

### Adding a Job

```typescript
await imageQueue.add("process_image", {
  noteId: "note123",
  imageUrl: "https://example.com/image.jpg",
  imageType: "image/jpeg",
  fileName: "recipe.jpg",
  options: {
    resize: { width: 800, height: 600, quality: 80 },
    format: "jpeg",
  },
});
```

## Data Flow

1. **Input**: `ImageJobData` with image info
2. **Process**: Process the image (resize, format, etc.)
3. **Save**: Save processed image to storage
4. **Update**: Update note record with image URL

## Dependencies

- `imageProcessor.processImage`
- `imageProcessor.saveImage`
- `database.updateNoteImage`
- Logging, error handling, and status broadcasting utilities

## Testing

- Unit tests should cover action logic and worker integration
- Error handling and edge cases

## Future Enhancements

- [ ] Add comprehensive unit tests
- [ ] Support for more image formats
- [ ] Image optimization and compression
- [ ] Metrics and monitoring
