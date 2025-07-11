import type { PeaConfig, BlobPeaConfig } from "../types.js";
import { BlobShapeGenerator } from "../shape-generators/blob-shape-generator.js";
import { darkenHexColor } from "../utils/color-utils.js";

/**
 * Renders peas to SVG format
 */
export class SVGRenderer {
  private blobGenerator: BlobShapeGenerator;

  constructor() {
    this.blobGenerator = new BlobShapeGenerator();
  }

  /**
   * Renders a regular pea to SVG
   */
  public renderRegularPea(config: PeaConfig): string {
    const { x, y, rx, ry, color, highlights } = config;
    const dynamicStroke = darkenHexColor(color.base, 0.2);

    let svg = `  <!-- Pea ${config.id}: ${config.description} -->\n`;
    svg += `  <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color.base}" stroke="${dynamicStroke}" stroke-width="1"/>\n`;

    highlights.forEach((highlight) => {
      const highlightX = x + highlight.x;
      const highlightY = y + highlight.y;
      const highlightColor = highlight.color || color.highlight;

      svg += `  <ellipse cx="${highlightX}" cy="${highlightY}" rx="${highlight.rx}" ry="${highlight.ry}" fill="${highlightColor}" opacity="${highlight.opacity}" stroke="none"/>\n`;
    });

    return svg;
  }

  /**
   * Renders a blob pea to SVG
   */
  public renderBlobPea(config: BlobPeaConfig): string {
    let svg = `<g transform="translate(${config.x}, ${config.y})">`;

    // Render main pea
    svg += this.blobGenerator.generateBlobPea(config);

    // Render highlights
    config.highlights.forEach((highlight) => {
      const highlightConfig: BlobPeaConfig = {
        id: config.id,
        x: highlight.x,
        y: highlight.y,
        width: config.width * highlight.scale,
        height: config.height * highlight.scale,
        color: {
          ...config.color,
          base: highlight.color ?? config.color.highlight,
          stroke: "none",
        },
        highlights: [],
        description: `highlight`,
        blobSeed: highlight.blobSeed,
      };

      // Position highlights relative to blob center
      const highlightX = config.width / 2 + highlight.x;
      const highlightY = config.height / 2 + highlight.y;

      svg += `<g transform="translate(${highlightX}, ${highlightY})">`;
      svg += this.blobGenerator
        .generateBlobPea(highlightConfig)
        .replace('stroke="1"', 'stroke="none"');
      svg += `</g>`;
    });

    svg += `</g>\n`;
    return svg;
  }

  /**
   * Renders multiple blob peas to SVG
   */
  public renderManyBlobPeas(configs: BlobPeaConfig[]): string {
    return configs.map((config) => this.renderBlobPea(config)).join("");
  }

  /**
   * Renders multiple regular peas to SVG
   */
  public renderManyRegularPeas(configs: PeaConfig[]): string {
    return configs.map((config) => this.renderRegularPea(config)).join("");
  }
}
