import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

import type { StructuredLogger } from "../types";

/**
 * Converts a binary image file to PNG format
 * @param inputPath - Path to the input image file
 * @param outputPath - Path where the converted PNG should be saved
 * @param logger - Logger instance for debugging
 * @returns Promise<boolean> - True if conversion was successful
 */
export async function convertBinaryImageToPng(
  inputPath: string,
  outputPath: string,
  logger: StructuredLogger
): Promise<boolean> {
  try {
    logger.log(
      `[IMAGE_CONVERTER] Converting binary image to PNG: ${inputPath} -> ${outputPath}`
    );

    // Use sharp to convert the image to PNG
    await sharp(inputPath).png().toFile(outputPath);

    // Verify the converted file exists and has content
    const stats = await fs.stat(outputPath);
    logger.log(
      `[IMAGE_CONVERTER] Conversion successful - output size: ${stats.size} bytes`
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.log(`[IMAGE_CONVERTER] Conversion failed: ${errorMessage}`);
    return false;
  }
}

/**
 * Converts a binary image file to JPG format
 * @param inputPath - Path to the input image file
 * @param outputPath - Path where the converted JPG should be saved
 * @param logger - Logger instance for debugging
 * @returns Promise<boolean> - True if conversion was successful
 */
export async function convertBinaryImageToJpg(
  inputPath: string,
  outputPath: string,
  logger: StructuredLogger
): Promise<boolean> {
  try {
    logger.log(
      `[IMAGE_CONVERTER] Converting binary image to JPG: ${inputPath} -> ${outputPath}`
    );

    // Use sharp to convert the image to JPG
    await sharp(inputPath).jpeg({ quality: 90 }).toFile(outputPath);

    // Verify the converted file exists and has content
    const stats = await fs.stat(outputPath);
    logger.log(
      `[IMAGE_CONVERTER] Conversion successful - output size: ${stats.size} bytes`
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.log(`[IMAGE_CONVERTER] Conversion failed: ${errorMessage}`);
    return false;
  }
}

/**
 * Converts a binary image file to a standard format (PNG by default)
 * @param inputPath - Path to the input image file
 * @param logger - Logger instance for debugging
 * @returns Promise<{ success: boolean; outputPath?: string; newFilename?: string }>
 */
export async function convertBinaryImageToStandardFormat(
  inputPath: string,
  logger: StructuredLogger
): Promise<{ success: boolean; outputPath?: string; newFilename?: string }> {
  try {
    const inputDir = path.dirname(inputPath);
    const inputName = path.basename(inputPath, path.extname(inputPath));

    // Try PNG first (better for images with transparency)
    const pngPath = path.join(inputDir, `${inputName}.png`);
    const pngSuccess = await convertBinaryImageToPng(
      inputPath,
      pngPath,
      logger
    );

    if (pngSuccess) {
      return {
        success: true,
        outputPath: pngPath,
        newFilename: `${inputName}.png`,
      };
    }

    // If PNG fails, try JPG
    logger.log(`[IMAGE_CONVERTER] PNG conversion failed, trying JPG...`);
    const jpgPath = path.join(inputDir, `${inputName}.jpg`);
    const jpgSuccess = await convertBinaryImageToJpg(
      inputPath,
      jpgPath,
      logger
    );

    if (jpgSuccess) {
      return {
        success: true,
        outputPath: jpgPath,
        newFilename: `${inputName}.jpg`,
      };
    }

    logger.log(`[IMAGE_CONVERTER] Both PNG and JPG conversion failed`);
    return { success: false };
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    const errorMessage = error instanceof Error ? error.message : String(error);
    /* istanbul ignore next -- @preserve */
    logger.log(`[IMAGE_CONVERTER] Conversion process failed: ${errorMessage}`);
    /* istanbul ignore next -- @preserve */
    return { success: false };
  }
}
