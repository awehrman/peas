import { BaseGenerator } from "./base-generator.js";
import { DEFAULT_HIGHLIGHT_CONFIG } from "./constants.js";
import { MIXED_COLOR_COMBINATIONS, PEA_COLORS, GREEN_COLOR_NAMES } from "../colors.js";
import { findNonCollidingPosition } from "../utils/collision-utils.js";
import { clamp } from "../utils/geometry-utils.js";
/**
 * Generates blob pea configurations
 */
export class BlobPeaConfigGenerator extends BaseGenerator {
    /**
     * Generates blob pea configurations (implements abstract method)
     */
    generatePeaConfigs() {
        return this.generateBlobPeaConfigs();
    }
    /**
     * Generates organized blob pea configurations
     */
    generateBlobPeaConfigs() {
        const configs = [];
        let id = 1;
        // Generate blob peas with single colors
        PEA_COLORS.forEach((color, colorIndex) => {
            const peaWidth = 70;
            const peaHeight = 64;
            const { x, y } = this.calculatePeaPosition(colorIndex, peaWidth, peaHeight);
            // Create variations with different highlight positions
            const highlightGroups = this.getHighlightGroups();
            highlightGroups.forEach((highlights, highlightIndex) => {
                const nonCollidingHighlights = this.generateNonCollidingHighlights(highlights, peaWidth, peaHeight, color.base);
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
                const { x, y } = this.calculatePeaPosition(PEA_COLORS.length + comboIndex, peaWidth, peaHeight);
                const baseHighlights = this.getRandomHighlightGroup().map((h) => ({
                    ...h,
                    color: highlightColor.highlight,
                }));
                const highlights = this.generateNonCollidingHighlights(baseHighlights, peaWidth, peaHeight, baseColor.base);
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
    generateManyBlobPeaConfigs(count = 200) {
        // Deterministic stream, independent of the original optional showcase layouts.
        let state = (this.options.seed >>> 0) || 42;
        const random = () => {
            state = (Math.imul(1664525, state) + 1013904223) >>> 0;
            return state / 4294967296;
        };
        const result = [];
        const cols = Math.max(1, this.options.peasPerRow);
        const rows = Math.ceil(count / cols);
        const cellWidth = (this.options.width - this.options.margin * 2) / cols;
        const cellHeight = (this.options.height - this.options.margin * 2) / rows;
        const maxDiameter = Math.min(cellWidth, cellHeight) * 0.91;
        const greens = PEA_COLORS.filter(({ name }) => GREEN_COLOR_NAMES.has(name));
        const accents = PEA_COLORS.filter(({ name }) => !GREEN_COLOR_NAMES.has(name));
        for (let i = 0; i < count; i++) {
            const column = i % cols;
            const row = Math.floor(i / cols);
            const size = maxDiameter * (0.65 + random() * 0.35);
            const aspect = 0.86 + random() * 0.28;
            const width = size * Math.sqrt(aspect);
            const height = size / Math.sqrt(aspect);
            const cellX = this.options.margin + column * cellWidth;
            const cellY = this.options.margin + row * cellHeight;
            const x = cellX + (cellWidth - width) / 2 + (random() - 0.5) * Math.max(0, cellWidth - width) * 0.8;
            const y = cellY + (cellHeight - height) / 2 + (random() - 0.5) * Math.max(0, cellHeight - height) * 0.8;
            // Bias toward greens without removing any user-selected accent swatches.
            const palette = random() < 0.68 ? greens : accents;
            const color = palette[Math.floor(random() * palette.length)];
            // The original's character comes from translucent, non-white spots.
            const dotCount = random() < 0.18 ? 1 : random() < 0.64 ? 2 : 3;
            const highlights = [];
            for (let j = 0; j < dotCount; j++) {
                let dx = 0, dy = 0;
                const rad = size * (0.07 + random() * 0.065);
                for (let attempt = 0; attempt < 20; attempt++) {
                    dx = (random() - 0.5) * width * 0.51;
                    dy = (random() - 0.5) * height * 0.51;
                    if (highlights.every(h => Math.hypot(dx - h.x, dy - h.y) > rad + h.rx + size * 0.045))
                        break;
                }
                highlights.push({
                    x: dx, y: dy, rx: rad, ry: rad * (0.9 + random() * 0.2),
                    opacity: 0.30 + random() * 0.28,
                    scale: 0.12, blobSeed: random() * 10000,
                });
            }
            result.push({
                id: i + 1, x, y, width, height, color, highlights,
                blobSeed: random() * 100000,
                description: `${color.name} subtle contour pea with ${dotCount} spots`,
            });
        }
        return result;
    }
    /**
     * Generates random highlights for a blob pea with collision detection
     */
    generateRandomHighlights(baseColor, peaWidth, peaHeight) {
        const numHighlights = Math.floor(Math.random() * 3) + 1; // 1-3 highlights
        const direction = Math.floor(Math.random() * 4); // 0=N, 1=E, 2=W, 3=S
        const highlights = [];
        for (let h = 0; h < numHighlights; h++) {
            const highlight = this.generateSingleHighlight(baseColor, peaWidth, peaHeight, direction);
            // Calculate bounds for collision detection
            const maxDistX = (peaWidth / 2 - highlight.rx) *
                DEFAULT_HIGHLIGHT_CONFIG.maxSafeDistance;
            const maxDistY = (peaHeight / 2 - highlight.ry) *
                DEFAULT_HIGHLIGHT_CONFIG.maxSafeDistance;
            // Find a non-colliding position
            const nonCollidingPosition = findNonCollidingPosition(highlight, highlights, maxDistX, maxDistY, 50, // max attempts
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
    generateSingleHighlight(baseColor, peaWidth, peaHeight, direction) {
        const config = DEFAULT_HIGHLIGHT_CONFIG;
        // Calculate scale and dimensions
        const scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
        const highlightRadiusX = (peaWidth * scale) / 2;
        const highlightRadiusY = (peaHeight * scale) / 2;
        // Calculate safe positioning bounds
        const maxDistX = (peaWidth / 2 - highlightRadiusX) * config.maxSafeDistance;
        const maxDistY = (peaHeight / 2 - highlightRadiusY) * config.maxSafeDistance;
        // Generate position with cluster spread and directional nudge
        const position = this.calculateHighlightPosition(maxDistX, maxDistY, direction, config);
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
    generateNonCollidingHighlights(baseHighlights, peaWidth, peaHeight, baseColor) {
        const highlights = [];
        baseHighlights.forEach((h) => {
            const highlight = {
                ...h,
                scale: 0.8,
                blobSeed: Math.random() * 10000,
                rx: (peaWidth * 0.8) / 2,
                ry: (peaHeight * 0.8) / 2,
                color: this.generateHighlightColor(baseColor),
                opacity: 0.8 + Math.random() * 0.2,
            };
            // Calculate bounds for collision detection
            const maxDistX = (peaWidth / 2 - highlight.rx) *
                DEFAULT_HIGHLIGHT_CONFIG.maxSafeDistance;
            const maxDistY = (peaHeight / 2 - highlight.ry) *
                DEFAULT_HIGHLIGHT_CONFIG.maxSafeDistance;
            // Find a non-colliding position
            const nonCollidingPosition = findNonCollidingPosition(highlight, highlights, maxDistX, maxDistY, 50, // max attempts
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
    calculateHighlightPosition(maxDistX, maxDistY, direction, config) {
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
