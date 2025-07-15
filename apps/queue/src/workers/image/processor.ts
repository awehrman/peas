import { ImageProcessingStep, ImageProcessingResult } from "./types";

export const IMAGE_PROCESSING_STEPS: ImageProcessingStep[] = [
  {
    name: "Extracting image from HTML content",
    description: "Parse HTML and extract image data",
    estimatedDuration: 500,
  },
  {
    name: "Validating image format",
    description: "Verify image format and dimensions",
    estimatedDuration: 300,
  },
  {
    name: "Compressing image for storage",
    description: "Optimize image size and quality",
    estimatedDuration: 800,
  },
  {
    name: "Uploading to cloud storage",
    description: "Upload processed image to storage service",
    estimatedDuration: 1200,
  },
  {
    name: "Generating thumbnail",
    description: "Create thumbnail version for preview",
    estimatedDuration: 400,
  },
];

export class ImageProcessor {
  static async processImageStep(
    step: ImageProcessingStep,
    _stepIndex: number,
    _noteId: string
  ): Promise<"SUCCESS" | "ERROR"> {
    try {
      // Simulate processing time
      await new Promise((resolve) =>
        setTimeout(resolve, step.estimatedDuration)
      );

      // Simulate potential step failures (for testing)
      if (Math.random() < 0.1) {
        throw new Error(`Simulated failure in step: ${step.name}`);
      }

      return "SUCCESS";
    } catch (error) {
      console.error(`❌ Failed to process image step: ${step.name}`, error);
      return "ERROR";
    }
  }

  static async processImageSteps(
    noteId: string
  ): Promise<ImageProcessingResult> {
    let errorCount = 0;
    const totalSteps = IMAGE_PROCESSING_STEPS.length;
    let completedSteps = 0;

    for (let i = 0; i < IMAGE_PROCESSING_STEPS.length; i++) {
      const step = IMAGE_PROCESSING_STEPS[i]!;
      const result = await this.processImageStep(step, i, noteId);

      if (result === "SUCCESS") {
        completedSteps++;
      } else {
        errorCount++;
      }
    }

    const success = errorCount === 0;
    const imageUrl = success
      ? `https://example.com/images/${noteId}.jpg`
      : undefined;

    return {
      success,
      imageUrl,
      errorCount,
      totalSteps,
      completedSteps,
    };
  }

  static getProgressMessage(current: number, total: number): string {
    const percentage = Math.round((current / total) * 100);
    return `...[${percentage}%] Processed ${current} of ${total} image steps.`;
  }

  static getCompletionMessage(result: ImageProcessingResult): string {
    if (result.errorCount > 0) {
      return `Image processing completed with ${result.errorCount} step failures`;
    }
    return "Image processing completed successfully";
  }

  static getStepProgressMessage(
    step: ImageProcessingStep,
    stepIndex: number
  ): string {
    const progress = Math.round(
      ((stepIndex + 1) / IMAGE_PROCESSING_STEPS.length) * 100
    );
    return `...[${progress}%] ${step.name}`;
  }
}
