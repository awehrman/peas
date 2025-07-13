import type {
  BlobPeaConfig,
  BlobPeaHighlight,
  PeaHighlight,
} from "../types.js";
import { PEA_COLORS, MIXED_COLOR_COMBINATIONS } from "../colors.js";
import { BaseGenerator } from "./base-generator.js";
import { clamp } from "../utils/geometry-utils.js";
import { findNonCollidingPosition } from "../utils/collision-utils.js";

/**
 * Configuration for highlight generation
 */
interface HighlightConfig {
  minScale: number;
  maxScale: number;
  clusterSpread: number;
  nudgeIntensity: number;
  maxSafeDistance: number;
}

/**
 * Default highlight configuration
 */
const DEFAULT_HIGHLIGHT_CONFIG: HighlightConfig = {
  minScale: 0.1,
  maxScale: 0.2,
  clusterSpread: 0.7,
  nudgeIntensity: 0.3,
  maxSafeDistance: 0.6,
};

/**
 * Generates blob pea configurations
 */
export class BlobPeaConfigGenerator extends BaseGenerator {
  /**
   * Generates blob pea configurations (implements abstract method)
   */
  public generatePeaConfigs(): BlobPeaConfig[] {
    return this.generateBlobPeaConfigs();
  }

  /**
   * Generates organized blob pea configurations
   */
  public generateBlobPeaConfigs(): BlobPeaConfig[] {
    const configs: BlobPeaConfig[] = [];
    let id = 1;

    // Generate blob peas with single colors
    PEA_COLORS.forEach((color, colorIndex) => {
      const peaWidth = 70;
      const peaHeight = 64;
      const { x, y } = this.calculatePeaPosition(
        colorIndex,
        peaWidth,
        peaHeight
      );

      // Create variations with different highlight positions
      const highlightGroups = this.getHighlightGroups();

      highlightGroups.forEach((highlights, highlightIndex) => {
        const nonCollidingHighlights = this.generateNonCollidingHighlights(
          highlights,
          peaWidth,
          peaHeight,
          color.base
        );

        configs.push({
          id: id++,
          x,
          y: y + highlightIndex * 70,
          width: peaWidth,
          height: peaHeight,
          color,
          highlights: nonCollidingHighlights,
          description: `${color.name} blob - ${this.getHighlightDescription(nonCollidingHighlights)}`,
          blobSeed: Math.random() * 10000,
        });
      });
    });

    // Generate mixed color blob peas
    MIXED_COLOR_COMBINATIONS.forEach((combo, comboIndex) => {
      const baseColor = PEA_COLORS.find((c) => c.name === combo.base);
      const highlightColor = PEA_COLORS.find((c) => c.name === combo.highlight);

      if (baseColor && highlightColor) {
        const peaWidth = 70;
        const peaHeight = 64;
        const { x, y } = this.calculatePeaPosition(
          PEA_COLORS.length + comboIndex,
          peaWidth,
          peaHeight
        );

        const baseHighlights = this.getRandomHighlightGroup().map((h) => ({
          ...h,
          color: highlightColor.highlight,
        }));

        const highlights = this.generateNonCollidingHighlights(
          baseHighlights,
          peaWidth,
          peaHeight,
          baseColor.base
        );

        configs.push({
          id: id++,
          x,
          y,
          width: peaWidth,
          height: peaHeight,
          color: baseColor,
          highlights,
          description: `${baseColor.name} blob base with ${highlightColor.name} highlights`,
          blobSeed: Math.random() * 10000,
        });
      }
    });

    return configs;
  }

  /**
   * Generates many random blob pea configurations
   */
  public generateManyBlobPeaConfigs(count: number = 200): BlobPeaConfig[] {
    const configs: BlobPeaConfig[] = [];
    const peaWidth = 70;
    const peaHeight = 64;
    const cols = Math.ceil(Math.sqrt(count));
    let id = 1;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = this.options.margin + col * (peaWidth + 20);
      const y = this.options.margin + row * (peaHeight + 20);
      const color = PEA_COLORS[Math.floor(Math.random() * PEA_COLORS.length)]!;

      const highlights = this.generateRandomHighlights(
        color.base,
        peaWidth,
        peaHeight
      );

      configs.push({
        id: id++,
        x,
        y,
        width: peaWidth,
        height: peaHeight,
        color,
        highlights,
        description: `${color.name} blob with ${highlights.length} highlights`,
        blobSeed: Math.random() * 10000,
      });
    }

    return configs;
  }

  /**
   * Generates random highlights for a blob pea with collision detection
   */
  private generateRandomHighlights(
    baseColor: string,
    peaWidth: number,
    peaHeight: number
  ): BlobPeaHighlight[] {
    const numHighlights = Math.floor(Math.random() * 3) + 1; // 1-3 highlights
    const direction = Math.floor(Math.random() * 4); // 0=N, 1=E, 2=W, 3=S
    const highlights: BlobPeaHighlight[] = [];

    for (let h = 0; h < numHighlights; h++) {
      const highlight = this.generateSingleHighlight(
        baseColor,
        peaWidth,
        peaHeight,
        direction
      );

      // Calculate bounds for collision detection
      const maxDistX =
        (peaWidth / 2 - highlight.rx) *
        DEFAULT_HIGHLIGHT_CONFIG.maxSafeDistance;
      const maxDistY =
        (peaHeight / 2 - highlight.ry) *
        DEFAULT_HIGHLIGHT_CONFIG.maxSafeDistance;

      // Find a non-colliding position
      const nonCollidingPosition = findNonCollidingPosition(
        highlight,
        highlights,
        maxDistX,
        maxDistY,
        50, // max attempts
        2 // padding between highlights
      );

      if (nonCollidingPosition) {
        // Update highlight with non-colliding position
        const nonCollidingHighlight = {
          ...highlight,
          x: nonCollidingPosition.x,
          y: nonCollidingPosition.y,
        };
        highlights.push(nonCollidingHighlight);
      }
      // If no position found, skip this highlight
    }

    return highlights;
  }

  /**
   * Generates a single highlight
   */
  private generateSingleHighlight(
    baseColor: string,
    peaWidth: number,
    peaHeight: number,
    direction: number
  ): BlobPeaHighlight {
    const config = DEFAULT_HIGHLIGHT_CONFIG;

    // Calculate scale and dimensions
    const scale =
      config.minScale + Math.random() * (config.maxScale - config.minScale);
    const highlightRadiusX = (peaWidth * scale) / 2;
    const highlightRadiusY = (peaHeight * scale) / 2;

    // Calculate safe positioning bounds
    const maxDistX = (peaWidth / 2 - highlightRadiusX) * config.maxSafeDistance;
    const maxDistY =
      (peaHeight / 2 - highlightRadiusY) * config.maxSafeDistance;

    // Generate position with cluster spread and directional nudge
    const position = this.calculateHighlightPosition(
      maxDistX,
      maxDistY,
      direction,
      config
    );

    // Use moderately light highlights for better contrast
    const highlightColor = this.generateHighlightColor(baseColor);

    return {
      x: position.x,
      y: position.y,
      rx: highlightRadiusX,
      ry: highlightRadiusY,
      opacity: 0.8 + Math.random() * 0.2, // 0.8-1.0 opacity
      color: highlightColor,
      scale: scale,
      blobSeed: Math.random() * 10000,
    };
  }

  /**
   * Generates non-colliding highlights for organized peas
   */
  private generateNonCollidingHighlights(
    baseHighlights: PeaHighlight[],
    peaWidth: number,
    peaHeight: number,
    baseColor: string
  ): BlobPeaHighlight[] {
    const highlights: BlobPeaHighlight[] = [];

    baseHighlights.forEach((h) => {
      const highlight: BlobPeaHighlight = {
        ...h,
        scale: 0.8,
        blobSeed: Math.random() * 10000,
        rx: (peaWidth * 0.8) / 2,
        ry: (peaHeight * 0.8) / 2,
        color: this.generateHighlightColor(baseColor),
        opacity: 0.8 + Math.random() * 0.2,
      };

      // Calculate bounds for collision detection
      const maxDistX =
        (peaWidth / 2 - highlight.rx) *
        DEFAULT_HIGHLIGHT_CONFIG.maxSafeDistance;
      const maxDistY =
        (peaHeight / 2 - highlight.ry) *
        DEFAULT_HIGHLIGHT_CONFIG.maxSafeDistance;

      // Find a non-colliding position
      const nonCollidingPosition = findNonCollidingPosition(
        highlight,
        highlights,
        maxDistX,
        maxDistY,
        50, // max attempts
        2 // padding between highlights
      );

      if (nonCollidingPosition) {
        // Update highlight with non-colliding position
        const nonCollidingHighlight = {
          ...highlight,
          x: nonCollidingPosition.x,
          y: nonCollidingPosition.y,
        };
        highlights.push(nonCollidingHighlight);
      }
      // If no position found, skip this highlight
    });

    return highlights;
  }

  /**
   * Calculates highlight position with cluster spread and directional nudge
   */
  private calculateHighlightPosition(
    maxDistX: number,
    maxDistY: number,
    direction: number,
    config: HighlightConfig
  ) {
    let baseX = 0;
    let baseY = 0;

    // Add random offset for cluster spread
    const clusterSpread = config.clusterSpread + Math.random() * 0.3;
    baseX += (Math.random() - 0.5) * maxDistX * clusterSpread;
    baseY += (Math.random() - 0.5) * maxDistY * clusterSpread;

    // Apply directional nudge
    const nudgeIntensity = config.nudgeIntensity + Math.random() * 0.4;
    switch (direction) {
      case 0: // North
        baseY -= maxDistY * nudgeIntensity;
        break;
      case 1: // East
        baseX += maxDistX * nudgeIntensity;
        break;
      case 2: // West
        baseX -= maxDistX * nudgeIntensity;
        break;
      case 3: // South
        baseY += maxDistY * nudgeIntensity;
        break;
    }

    // Clamp to ensure highlights stay within bounds
    return {
      x: clamp(baseX, -maxDistX, maxDistX),
      y: clamp(baseY, -maxDistY, maxDistY),
    };
  }
}
