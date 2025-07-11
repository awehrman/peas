import type { PeaConfig, PeaGeneratorOptions, BlobPeaConfig } from "./types.js";
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
        configs.push({
          id: id++,
          x,
          y: y + highlightIndex * 70,
          width: peaWidth,
          height: peaHeight,
          color,
          highlights,
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
      configs.push({
        id: id++,
        x,
        y,
        width: peaWidth,
        height: peaHeight,
        color,
        highlights: [],
        description: `${color.name} blob`,
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

      svg += `  <ellipse cx="${highlightX}" cy="${highlightY}" rx="${highlight.rx}" ry="${highlight.ry}" fill="${highlightColor}" opacity="${highlight.opacity}"/>\n`;
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
        svg += this.blobGenerator.generateBlobPea(config);
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
