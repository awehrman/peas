import { BlobShapeGenerator } from "../shape-generators/blob-shape-generator.js";
import { darkenHexColor } from "../utils/color-utils.js";
import { renderContourPea } from "./contour-pea.js";
/**
 * Renders peas to SVG format
 */
export class SVGRenderer {
    blobGenerator;
    constructor() {
        this.blobGenerator = new BlobShapeGenerator();
    }
    /**
     * Renders a regular pea to SVG
     */
    renderRegularPea(config) {
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
    renderBlobPea(config) {
        return renderContourPea(config);
    }
    /**
     * Renders multiple blob peas to SVG
     */
    renderManyBlobPeas(configs) {
        return configs.map((config) => this.renderBlobPea(config)).join("");
    }
    /**
     * Renders multiple regular peas to SVG
     */
    renderManyRegularPeas(configs) {
        return configs.map((config) => this.renderRegularPea(config)).join("");
    }
}
