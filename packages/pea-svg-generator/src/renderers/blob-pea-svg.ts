import { BlobPeaConfigGenerator } from "../generators/blob-pea-config-generator.js";
import { BlobShapeGenerator } from "../shape-generators/blob-shape-generator.js";
import type { BlobPeaConfig } from "../types.js";

/**
 * Renders a single blob pea as a standalone SVG document, with its highlights
 * "locked" into the same group so the pea can be rotated or scaled as a unit
 */
export function renderBlobPeaSvg(pea: BlobPeaConfig): string {
  const { width, height, highlights } = pea;

  // The viewBox lets <img> scale the pea; without it the content keeps its intrinsic size
  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<g>`;

  const blobShapeGenerator = new BlobShapeGenerator(pea.blobSeed);
  svg += blobShapeGenerator.generateBlobPea(pea);

  highlights.forEach((highlight) => {
    const highlightConfig: BlobPeaConfig = {
      id: pea.id,
      x: 0,
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

    const highlightBlobGenerator = new BlobShapeGenerator(highlight.blobSeed);
    const highlightX = width / 2 + highlight.x;
    const highlightY = height / 2 + highlight.y;

    svg += `<g transform="translate(${highlightX}, ${highlightY})">`;
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
