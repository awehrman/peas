import { BlobPeaConfigGenerator } from "../generators/blob-pea-config-generator.js";
import { renderContourPea } from "./contour-pea.js";
import type { BlobPeaConfig } from "../types.js";

/**
 * Renders a single blob pea as a standalone SVG document, with its highlights
 * "locked" into the same group so the pea can be rotated or scaled as a unit
 */
export function renderBlobPeaSvg(pea: BlobPeaConfig): string {
  const { width, height } = pea;
  // The renderer uses local positions and the same layers as the 500-pea sheet.
  const localPea = { ...pea, x: 0, y: 0 };
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${renderContourPea(localPea)}</svg>`;
}

/**
 * Encodes an SVG document as a data URL usable anywhere an image URL is
 * expected, in both the browser and Node
 */
export function toSvgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Generates one random blob pea, drawn from the same pool as the login
 * page's falling peas, as an image data URL
 */
export function generateRandomBlobPeaDataUrl(): string {
  const [pea] = new BlobPeaConfigGenerator().generateManyBlobPeaConfigs(1);
  if (!pea) throw new Error("Failed to generate a blob pea");

  return toSvgDataUrl(renderBlobPeaSvg(pea));
}
