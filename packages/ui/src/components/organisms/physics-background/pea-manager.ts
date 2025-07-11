import type { BlobPeaConfig } from "@peas/pea-svg-generator";
import { PeaGenerator, BlobShapeGenerator } from "@peas/pea-svg-generator";
import { PEA_GENERATOR_CONFIG } from "./config.js";

/**
 * Manages pea generation and image creation for the physics background
 */
export class PeaManager {
  private peaPool: BlobPeaConfig[] = [];
  private peaImages: HTMLImageElement[] = [];
  private isInitialized = false;

  /**
   * Initialize the pea pool and images
   */
  public initialize(): void {
    if (this.isInitialized) return;

    const generator = new PeaGenerator(PEA_GENERATOR_CONFIG);
    this.peaPool = generator.generateManyBlobPeaConfigs(
      PEA_GENERATOR_CONFIG.peaCount
    ) as BlobPeaConfig[];

    if (typeof window !== "undefined") {
      this.peaImages = this.createBlobPeaImages(this.peaPool);
    }

    this.isInitialized = true;
  }

  /**
   * Get a random pea index
   */
  public getRandomPeaIndex(): number {
    if (!this.isInitialized) {
      this.initialize();
    }
    if (this.peaPool.length === 0) return 0;
    return Math.floor(Math.random() * this.peaPool.length);
  }

  /**
   * Get a pea by index
   */
  public getPea(index: number): BlobPeaConfig | undefined {
    return this.peaPool[index];
  }

  /**
   * Get a pea image by index
   */
  public getPeaImage(index: number): HTMLImageElement | undefined {
    return this.peaImages[index];
  }

  /**
   * Generate SVG string for a blob pea config with "locked" highlights
   */
  private blobPeaConfigToSVG(pea: BlobPeaConfig): string {
    const { width, height, color, highlights } = pea;

    // Create a group that contains the main blob and all highlights as a single unit
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<g>`;

    // Generate the main blob pea using the new BlobShapeGenerator
    const blobShapeGenerator = new BlobShapeGenerator(pea.blobSeed);
    svg += blobShapeGenerator.generateBlobPea(pea);

    // Add highlights as part of the same group (no separate transforms)
    highlights.forEach((highlight) => {
      const highlightConfig: BlobPeaConfig = {
        id: pea.id,
        x: 0, // Position relative to the group, not the pea center
        y: 0,
        width: pea.width * highlight.scale,
        height: pea.height * highlight.scale,
        color: {
          ...pea.color,
          base: highlight.color ?? pea.color.highlight,
          stroke: "none",
        },
        highlights: [],
        description: `highlight`,
        blobSeed: highlight.blobSeed,
      };

      // Create a separate blob generator for each highlight to use its unique seed
      const highlightBlobGenerator = new BlobShapeGenerator(highlight.blobSeed);

      // Position the highlight relative to the pea center within the group
      const highlightX = width / 2 + highlight.x;
      const highlightY = height / 2 + highlight.y;

      svg += `<g transform=\"translate(${highlightX}, ${highlightY})\">`;
      svg += highlightBlobGenerator
        .generateBlobPea(highlightConfig)
        .replace('stroke="1"', 'stroke="none"');
      svg += `</g>`;
    });

    svg += `</g>`;
    svg += `</svg>`;
    return svg;
  }

  /**
   * Create images for each blob pea config
   */
  private createBlobPeaImages(peas: BlobPeaConfig[]): HTMLImageElement[] {
    return peas.map((pea) => {
      const img = new window.Image();
      const svg = this.blobPeaConfigToSVG(pea);
      img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
      return img;
    });
  }
}

// Global instance
export const peaManager = new PeaManager();
