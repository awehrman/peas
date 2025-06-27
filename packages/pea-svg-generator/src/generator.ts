import type { PeaConfig, PeaGeneratorOptions } from "./types.js";
import { PEA_COLORS, HIGHLIGHT_POSITIONS, MIXED_COLOR_COMBINATIONS } from "./colors.js";

export class PeaGenerator {
  private options: Required<PeaGeneratorOptions>;

  constructor(options: PeaGeneratorOptions = {}) {
    this.options = {
      width: options.width ?? 1200,
      height: options.height ?? 600,
      peasPerRow: options.peasPerRow ?? 6,
      margin: options.margin ?? 100,
      outputPath: options.outputPath ?? "generated-peas.svg"
    };
  }

  public generatePeaConfigs(): PeaConfig[] {
    const configs: PeaConfig[] = [];
    let id = 1;

    // Generate peas with single colors
    PEA_COLORS.forEach((color, colorIndex) => {
      const row = Math.floor(colorIndex / this.options.peasPerRow);
      const col = colorIndex % this.options.peasPerRow;
      
      const x = this.options.margin + col * 200;
      const y = this.options.margin + row * 150;

      // Create variations with different highlight positions
      const highlightGroups = this.getHighlightGroups();
      
      highlightGroups.forEach((highlights, highlightIndex) => {
        configs.push({
          id: id++,
          x,
          y: y + highlightIndex * 50,
          rx: 35,
          ry: 32,
          color,
          highlights,
          description: `${color.name} - ${this.getHighlightDescription(highlights)}`
        });
      });
    });

    // Generate mixed color peas
    MIXED_COLOR_COMBINATIONS.forEach((combo, comboIndex) => {
      const baseColor = PEA_COLORS.find(c => c.name === combo.base);
      const highlightColor = PEA_COLORS.find(c => c.name === combo.highlight);
      
      if (baseColor && highlightColor) {
        const row = Math.floor((PEA_COLORS.length + comboIndex) / this.options.peasPerRow);
        const col = (PEA_COLORS.length + comboIndex) % this.options.peasPerRow;
        
        const x = this.options.margin + col * 200;
        const y = this.options.margin + row * 150;

        const highlights = this.getRandomHighlightGroup().map(h => ({
          ...h,
          color: highlightColor.highlight
        }));

        configs.push({
          id: id++,
          x,
          y,
          rx: 35,
          ry: 32,
          color: baseColor,
          highlights,
          description: `${baseColor.name} base with ${highlightColor.name} highlights`
        });
      }
    });

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
    
    let svg = `  <!-- Pea ${config.id}: ${config.description} -->\n`;
    svg += `  <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color.base}" stroke="${color.stroke}" stroke-width="1"/>\n`;
    
    highlights.forEach(highlight => {
      const highlightX = x + highlight.x;
      const highlightY = y + highlight.y;
      const highlightColor = highlight.color || color.highlight;
      
      svg += `  <ellipse cx="${highlightX}" cy="${highlightY}" rx="${highlight.rx}" ry="${highlight.ry}" fill="${highlightColor}" opacity="${highlight.opacity}"/>\n`;
    });
    
    return svg;
  }

  public generate(): string {
    const configs = this.generatePeaConfigs();
    
    let svg = `<svg width="${this.options.width}" height="${this.options.height}" xmlns="http://www.w3.org/2000/svg">\n`;
    
    configs.forEach(config => {
      svg += this.generatePeaSVG(config);
    });
    
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