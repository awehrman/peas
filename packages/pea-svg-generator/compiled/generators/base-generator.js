import { HIGHLIGHT_POSITIONS } from "../colors.js";
import { lightenHexColor } from "../utils/color-utils.js";
/**
 * Base class for pea generators with common functionality
 */
export class BaseGenerator {
    options;
    constructor(options = {}) {
        this.options = {
            width: options.width ?? 1600,
            height: options.height ?? 900,
            peasPerRow: options.peasPerRow ?? 6,
            margin: options.margin ?? 140,
            outputPath: options.outputPath ?? "generated-peas.svg",
            useBlobs: options.useBlobs ?? false,
            count: options.count ?? 200,
            seed: options.seed ?? 42,
        };
    }
    /**
     * Gets highlight groups for organized pea generation
     */
    getHighlightGroups() {
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
    getRandomHighlightGroup() {
        const startIndex = Math.floor(Math.random() * HIGHLIGHT_POSITIONS.length);
        const size = Math.random() > 0.5 ? 2 : 3;
        return HIGHLIGHT_POSITIONS.slice(startIndex, startIndex + size);
    }
    /**
     * Gets a description for highlight configuration
     */
    getHighlightDescription(highlights) {
        if (highlights.length === 1)
            return "Single highlight";
        if (highlights.length === 2)
            return "Dual highlights";
        return "Multiple highlights";
    }
    /**
     * Calculates pea position in grid
     */
    calculatePeaPosition(index, peaWidth, peaHeight) {
        const row = Math.floor(index / this.options.peasPerRow);
        const col = index % this.options.peasPerRow;
        const x = this.options.margin + col * (260 + peaWidth);
        const y = this.options.margin + row * (200 + peaHeight);
        return { x, y, row, col };
    }
    /**
     * Generates a lightened highlight color
     */
    generateHighlightColor(baseColor) {
        return lightenHexColor(baseColor, 0.5);
    }
}
