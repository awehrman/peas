import type { PeaConfig } from "../types.js";
import { PEA_COLORS, MIXED_COLOR_COMBINATIONS } from "../colors.js";
import { BaseGenerator } from "./base-generator.js";

/**
 * Generates regular elliptical pea configurations
 */
export class RegularPeaGenerator extends BaseGenerator {
  /**
   * Generates regular pea configurations
   */
  public generatePeaConfigs(): PeaConfig[] {
    const configs: PeaConfig[] = [];
    let id = 1;

    // Generate peas with single colors
    PEA_COLORS.forEach((color, colorIndex) => {
      const peaWidth = 35 * 2;
      const peaHeight = 32 * 2;
      const { x, y } = this.calculatePeaPosition(
        colorIndex,
        peaWidth,
        peaHeight
      );

      // Create variations with different highlight positions
      const highlightGroups = this.getHighlightGroups();

      highlightGroups.forEach((highlights, highlightIndex) => {
        configs.push({
          id: id++,
          x,
          y: y + highlightIndex * 70, // keep variation spacing as before
          rx: 35,
          ry: 32,
          color,
          highlights,
          description: `${color.name} - ${this.getHighlightDescription(highlights)}`,
        });
      });
    });

    // Generate mixed color peas
    MIXED_COLOR_COMBINATIONS.forEach((combo, comboIndex) => {
      const baseColor = PEA_COLORS.find((c) => c.name === combo.base);
      const highlightColor = PEA_COLORS.find((c) => c.name === combo.highlight);

      if (baseColor && highlightColor) {
        const peaWidth = 35 * 2;
        const peaHeight = 32 * 2;
        const { x, y } = this.calculatePeaPosition(
          PEA_COLORS.length + comboIndex,
          peaWidth,
          peaHeight
        );

        const highlights = this.getRandomHighlightGroup().map((h) => ({
          ...h,
          color: highlightColor.highlight,
          scale: 0.8,
          blobSeed: Math.random() * 10000,
        }));

        configs.push({
          id: id++,
          x,
          y,
          rx: 35,
          ry: 32,
          color: baseColor,
          highlights,
          description: `${baseColor.name} base with ${highlightColor.name} highlights`,
        });
      }
    });

    return configs;
  }
}
