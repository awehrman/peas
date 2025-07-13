import type {
  PeaConfig,
  BlobPeaConfig,
  PeaGeneratorOptions,
  PeaHighlight,
} from "../types.js";
import { HIGHLIGHT_POSITIONS } from "../colors.js";
import { lightenHexColor } from "../utils/color-utils.js";

/**
 * Base class for pea generators with common functionality
 */
export abstract class BaseGenerator {
  protected options: Required<PeaGeneratorOptions>;

  constructor(options: PeaGeneratorOptions = {}) {
    this.options = {
      width: options.width ?? 1600,
      height: options.height ?? 900,
      peasPerRow: options.peasPerRow ?? 6,
      margin: options.margin ?? 140,
      outputPath: options.outputPath ?? "generated-peas.svg",
      useBlobs: options.useBlobs ?? false,
    };
  }

  /**
   * Gets highlight groups for organized pea generation
   */
  protected getHighlightGroups() {
    const groups = [];
    const positions = [...HIGHLIGHT_POSITIONS];

    // Group highlights in sets of 2-3
    while (positions.length > 0) {
      const groupSize = Math.random() > 0.5 ? 2 : 3;
      const group = positions.splice(0, Math.min(groupSize, positions.length));
      groups.push(group);
    }

    return groups.slice(0, 3); // Limit to 3 variations per color
  }

  /**
   * Gets a random highlight group
   */
  protected getRandomHighlightGroup() {
    const startIndex = Math.floor(Math.random() * HIGHLIGHT_POSITIONS.length);
    const size = Math.random() > 0.5 ? 2 : 3;
    return HIGHLIGHT_POSITIONS.slice(startIndex, startIndex + size);
  }

  /**
   * Gets a description for highlight configuration
   */
  protected getHighlightDescription(highlights: PeaHighlight[]): string {
    if (highlights.length === 1) return "Single highlight";
    if (highlights.length === 2) return "Dual highlights";
    return "Multiple highlights";
  }

  /**
   * Calculates pea position in grid
   */
  protected calculatePeaPosition(
    index: number,
    peaWidth: number,
    peaHeight: number
  ) {
    const row = Math.floor(index / this.options.peasPerRow);
    const col = index % this.options.peasPerRow;

    const x = this.options.margin + col * (260 + peaWidth);
    const y = this.options.margin + row * (200 + peaHeight);

    return { x, y, row, col };
  }

  /**
   * Generates a lightened highlight color
   */
  protected generateHighlightColor(baseColor: string): string {
    return lightenHexColor(baseColor, 0.5);
  }

  /**
   * Abstract method to generate pea configurations
   */
  abstract generatePeaConfigs(): PeaConfig[] | BlobPeaConfig[];
}
