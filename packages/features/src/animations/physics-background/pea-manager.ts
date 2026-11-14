import { PEA_GENERATOR_CONFIG } from "./config.js";

import type { BlobPeaConfig } from "@peas/pea-svg-generator";
import {
  PeaGenerator,
  renderBlobPeaSvg,
  toSvgDataUrl,
} from "@peas/pea-svg-generator";

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
   * Create images for each blob pea config
   */
  private createBlobPeaImages(peas: BlobPeaConfig[]): HTMLImageElement[] {
    return peas.map((pea) => {
      const img = new window.Image();
      img.src = toSvgDataUrl(renderBlobPeaSvg(pea));
      return img;
    });
  }
}

// Global instance
export const peaManager = new PeaManager();
