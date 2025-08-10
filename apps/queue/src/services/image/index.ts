import { cleanupLocalFiles } from "./actions/cleanup-local-files/service";
import { uploadProcessed } from "./actions/upload-processed/service";

export { registerImageActions } from "./register";

// Export individual services for testing
export { processImage } from "./actions/process-image/service";
export { saveImage } from "./actions/save-image/service";
export { uploadOriginal } from "./actions/upload-original/service";
export { updateImageCompletedStatus } from "./actions/image-completed-status/service";
export { uploadProcessed };
export { cleanupLocalFiles };
