import type { PeaConfig, BlobPeaConfig } from "../types.js";
import { BlobShapeGenerator } from "../shape-generators/blob-shape-generator.js";
import { darkenHexColor } from "../utils/color-utils.js";
import { renderContourPea } from "./contour-pea.js";

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
    return renderContourPea(config);
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
