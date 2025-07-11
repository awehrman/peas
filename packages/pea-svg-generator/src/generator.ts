import type {
  PeaConfig,
  PeaGeneratorOptions,
  BlobPeaConfig,
  PeaHighlight,
  BlobPeaHighlight,
} from "./types.js";
import {
  PEA_COLORS,
  HIGHLIGHT_POSITIONS,
  MIXED_COLOR_COMBINATIONS,
} from "./colors.js";
import { BlobGenerator } from "./blob-generator.js";

function darkenHexColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function lightenHexColor(hex: string, percent: number): string {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.min(255, Math.floor(r + (255 - r) * percent));
  g = Math.min(255, Math.floor(g + (255 - g) * percent));
  b = Math.min(255, Math.floor(b + (255 - b) * percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export class PeaGenerator {
  private options: Required<PeaGeneratorOptions>;
  private blobGenerator: BlobGenerator;

  constructor(options: PeaGeneratorOptions = {}) {
    this.options = {
      width: options.width ?? 1600,
      height: options.height ?? 900,
      peasPerRow: options.peasPerRow ?? 6,
      margin: options.margin ?? 140,
      outputPath: options.outputPath ?? "generated-peas.svg",
      useBlobs: options.useBlobs ?? false,
    };
    this.blobGenerator = new BlobGenerator();
  }

  public generatePeaConfigs(): PeaConfig[] | BlobPeaConfig[] {
    if (this.options.useBlobs) {
      return this.generateBlobPeaConfigs();
    }

    const configs: PeaConfig[] = [];
    let id = 1;

    // Generate peas with single colors
    PEA_COLORS.forEach((color, colorIndex) => {
      const row = Math.floor(colorIndex / this.options.peasPerRow);
      const col = colorIndex % this.options.peasPerRow;

      // Increased spacing between peas by 1 pea width/height
      const peaWidth = 35 * 2;
      const peaHeight = 32 * 2;
      const x = this.options.margin + col * (260 + peaWidth); // 260 + 70 = 330
      const y = this.options.margin + row * (200 + peaHeight); // 200 + 64 = 264

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
        const row = Math.floor(
          (PEA_COLORS.length + comboIndex) / this.options.peasPerRow
        );
        const col = (PEA_COLORS.length + comboIndex) % this.options.peasPerRow;

        // Increased spacing between peas by 1 pea width/height
        const peaWidth = 35 * 2;
        const peaHeight = 32 * 2;
        const x = this.options.margin + col * (260 + peaWidth);
        const y = this.options.margin + row * (200 + peaHeight);

        const highlights = this.getRandomHighlightGroup().map((h) => ({
          ...h,
          color: highlightColor.highlight,
          scale: 0.5,
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

  public generateBlobPeaConfigs(): BlobPeaConfig[] {
    const configs: BlobPeaConfig[] = [];
    let id = 1;

    // Generate blob peas with single colors
    PEA_COLORS.forEach((color, colorIndex) => {
      const row = Math.floor(colorIndex / this.options.peasPerRow);
      const col = colorIndex % this.options.peasPerRow;

      const peaWidth = 70;
      const peaHeight = 64;
      const x = this.options.margin + col * (260 + peaWidth);
      const y = this.options.margin + row * (200 + peaHeight);

      // Create variations with different highlight positions
      const highlightGroups = this.getHighlightGroups();

      highlightGroups.forEach((highlights, highlightIndex) => {
        const blobHighlights = highlights.map((h) => ({
          ...h,
          scale: 0.5,
          blobSeed: Math.random() * 10000,
        }));
        configs.push({
          id: id++,
          x,
          y: y + highlightIndex * 70,
          width: peaWidth,
          height: peaHeight,
          color,
          highlights: blobHighlights,
          description: `${color.name} blob - ${this.getHighlightDescription(highlights)}`,
          blobSeed: Math.random() * 10000,
        });
      });
    });

    // Generate mixed color blob peas
    MIXED_COLOR_COMBINATIONS.forEach((combo, comboIndex) => {
      const baseColor = PEA_COLORS.find((c) => c.name === combo.base);
      const highlightColor = PEA_COLORS.find((c) => c.name === combo.highlight);

      if (baseColor && highlightColor) {
        const row = Math.floor(
          (PEA_COLORS.length + comboIndex) / this.options.peasPerRow
        );
        const col = (PEA_COLORS.length + comboIndex) % this.options.peasPerRow;

        const peaWidth = 70;
        const peaHeight = 64;
        const x = this.options.margin + col * (260 + peaWidth);
        const y = this.options.margin + row * (200 + peaHeight);

        const highlights = this.getRandomHighlightGroup().map((h) => ({
          ...h,
          color: highlightColor.highlight,
          scale: 0.5,
          blobSeed: Math.random() * 10000,
        }));

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

  public generateManyBlobPeaConfigs(count: number = 200): BlobPeaConfig[] {
    const configs: BlobPeaConfig[] = [];
    const peaWidth = 70;
    const peaHeight = 64;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    let id = 1;
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = this.options.margin + col * (peaWidth + 20);
      const y = this.options.margin + row * (peaHeight + 20);
      const color = PEA_COLORS[Math.floor(Math.random() * PEA_COLORS.length)]!;

      // Generate 1-3 highlights with centered cluster + directional nudge
      const numHighlights = Math.floor(Math.random() * 3) + 1; // 1-3 highlights
      const direction = Math.floor(Math.random() * 4); // 0=N, 1=E, 2=W, 3=S
      const nudgeIntensity = 0.3 + Math.random() * 0.4; // 0.3-0.7 intensity
      const highlights: BlobPeaHighlight[] = [];

      for (let h = 0; h < numHighlights; h++) {
        // Ensure highlight is fully within the pea ellipse
        const scale = 0.08 + Math.random() * 0.08; // 0.08-0.16 scale (even smaller)
        const highlightRadiusX = (peaWidth * scale) / 2;
        const highlightRadiusY = (peaHeight * scale) / 2;
        // More conservative positioning to ensure highlights stay inside
        const maxDistX = (peaWidth / 2 - highlightRadiusX) * 0.6; // 60% of max safe distance
        const maxDistY = (peaHeight / 2 - highlightRadiusY) * 0.6; // 60% of max safe distance

        // Start with centered position, then nudge in direction
        let baseX = 0;
        let baseY = 0;

        // Add maximum random offset for extreme cluster spread
        const clusterSpread = 0.7 + Math.random() * 0.3; // 0.7-1.0 spread (extreme spacing)
        baseX += (Math.random() - 0.5) * maxDistX * clusterSpread;
        baseY += (Math.random() - 0.5) * maxDistY * clusterSpread;

        // Apply directional nudge
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
        const highlightX = Math.max(-maxDistX, Math.min(maxDistX, baseX));
        const highlightY = Math.max(-maxDistY, Math.min(maxDistY, baseY));

        // Use moderately light highlights for better contrast
        const highlightColor = lightenHexColor(color.base, 0.5); // Reduced lightening
        highlights.push({
          x: highlightX,
          y: highlightY,
          rx: highlightRadiusX,
          ry: highlightRadiusY,
          opacity: 0.8 + Math.random() * 0.2, // 0.8-1.0 opacity
          color: highlightColor,
          scale: scale,
          blobSeed: Math.random() * 10000, // Unique seed for each highlight
        });
      }

      configs.push({
        id: id++,
        x,
        y,
        width: peaWidth,
        height: peaHeight,
        color,
        highlights,
        description: `${color.name} blob with ${numHighlights} highlights`,
        blobSeed: Math.random() * 10000,
      });
    }
    return configs;
  }

  private getHighlightGroups() {
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

  private getRandomHighlightGroup() {
    const startIndex = Math.floor(Math.random() * HIGHLIGHT_POSITIONS.length);
    const size = Math.random() > 0.5 ? 2 : 3;
    return HIGHLIGHT_POSITIONS.slice(startIndex, startIndex + size);
  }

  private getHighlightDescription(highlights: any[]): string {
    if (highlights.length === 1) return "Single highlight";
    if (highlights.length === 2) return "Dual highlights";
    return "Multiple highlights";
  }

  private generatePeaSVG(config: PeaConfig): string {
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

  public generate(): string {
    let svg = `<svg width="${this.options.width}" height="${this.options.height}" xmlns="http://www.w3.org/2000/svg">\n`;

    if (this.options.useBlobs) {
      // Generate 200 random blob peas in a grid
      const configs = this.generateManyBlobPeaConfigs(200);
      configs.forEach((config) => {
        svg += `<g transform=\"translate(${config.x}, ${config.y})\">`;
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
          // Position highlights relative to blob center (config.width/2, config.height/2)
          const highlightX = config.width / 2 + highlight.x;
          const highlightY = config.height / 2 + highlight.y;
          svg += `<g transform=\"translate(${highlightX}, ${highlightY})\">`;
          svg += this.blobGenerator
            .generateBlobPea(highlightConfig)
            .replace('stroke="1"', 'stroke="none"');
          svg += `</g>`;
        });
        svg += `</g>\n`;
      });
    } else {
      // Handle regular peas
      (this.generatePeaConfigs() as PeaConfig[]).forEach((config) => {
        svg += this.generatePeaSVG(config);
      });
    }

    svg += "</svg>";
    return svg;
  }

  public generateAndSave(): void {
    const svg = this.generate();

    // In a real implementation, you'd write to file
    // For now, we'll just return the SVG content
    console.log(`Generated ${this.generatePeaConfigs().length} peas`);
    console.log("SVG content:");
    console.log(svg);
  }
}

export function generatePeas(options?: PeaGeneratorOptions): string {
  const generator = new PeaGenerator(options);
  return generator.generate();
}
