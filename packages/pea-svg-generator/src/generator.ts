import type { PeaConfig, BlobPeaConfig, PeaGeneratorOptions } from "./types.js";
import {
  RegularPeaGenerator,
  BlobPeaConfigGenerator,
} from "./generators/index.js";
import { SVGRenderer } from "./renderers/svg-renderer.js";

/**
 * Main pea generator that coordinates between different pea types and rendering
 */
export class PeaGenerator {
  private options: Required<PeaGeneratorOptions>;
  private regularGenerator: RegularPeaGenerator;
  private blobGenerator: BlobPeaConfigGenerator;
  private svgRenderer: SVGRenderer;

  constructor(options: PeaGeneratorOptions = {}) {
    this.options = {
      width: options.width ?? 1600,
      height: options.height ?? 900,
      peasPerRow: options.peasPerRow ?? 6,
      margin: options.margin ?? 140,
      outputPath: options.outputPath ?? "generated-peas.svg",
      useBlobs: options.useBlobs ?? false,
    };

    this.regularGenerator = new RegularPeaGenerator(options);
    this.blobGenerator = new BlobPeaConfigGenerator(options);
    this.svgRenderer = new SVGRenderer();
  }

  /**
   * Generates pea configurations based on the selected type
   */
  public generatePeaConfigs(): PeaConfig[] | BlobPeaConfig[] {
    if (this.options.useBlobs) {
      return this.blobGenerator.generateBlobPeaConfigs();
    }
    return this.regularGenerator.generatePeaConfigs();
  }

  /**
   * Generates many random blob pea configurations
   */
  public generateManyBlobPeaConfigs(count: number = 200): BlobPeaConfig[] {
    return this.blobGenerator.generateManyBlobPeaConfigs(count);
  }

  /**
   * Generates the complete SVG content
   */
  public generate(): string {
    let svg = `<svg width="${this.options.width}" height="${this.options.height}" xmlns="http://www.w3.org/2000/svg">\n`;

    if (this.options.useBlobs) {
      // Generate 200 random blob peas in a grid
      const configs = this.generateManyBlobPeaConfigs(200);
      svg += this.svgRenderer.renderManyBlobPeas(configs);
    } else {
      // Handle regular peas
      const configs = this.generatePeaConfigs() as PeaConfig[];
      svg += this.svgRenderer.renderManyRegularPeas(configs);
    }

    svg += "</svg>";
    return svg;
  }

  /**
   * Generates and logs the SVG content
   */
  public generateAndSave(): void {
    const svg = this.generate();
    const configs = this.generatePeaConfigs();

    console.log(`Generated ${configs.length} peas`);
    console.log("SVG content:");
    console.log(svg);
  }
}

/**
 * Convenience function to generate peas with default options
 */
export function generatePeas(options?: PeaGeneratorOptions): string {
  const generator = new PeaGenerator(options);
  return generator.generate();
}
