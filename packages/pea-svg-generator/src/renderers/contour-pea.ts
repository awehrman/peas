import type { BlobPeaConfig } from "../types.js";
import { BlobShapeGenerator } from "../shape-generators/blob-shape-generator.js";
import {
  darkenHexColor,
  isLightColor,
  lightenHexColor,
} from "../utils/color-utils.js";

const fmt = (v: number) => Number(v.toFixed(2));

/**
 * Graphic, intentionally non-glossy pea. A slightly offset inset fill reveals
 * an uneven dark contour. A restrained radial tint adds depth without a specular
 * light source. Muted circular spots are the original generator's personality.
 * All coordinates are local: usable as individual sprites or a collage.
 */
export function renderContourPea(pea: BlobPeaConfig): string {
  const { width: w, height: h, color } = pea;
  const seed = pea.blobSeed;
  const outline = new BlobShapeGenerator(seed).generateBlobPath(w, h);
  const id = `contour-${pea.id}-${Math.floor(seed)}`;
  const baseDark = darkenHexColor(color.base, isLightColor(color.base) ? 0.3 : 0.16);
  const shadow = darkenHexColor(color.base, 0.095);
  const bright = lightenHexColor(color.base, 0.055);
  const insetScale = 0.925;
  const dx = w * 0.046;
  const dy = h * 0.028;
  const dots = pea.highlights.map(dot =>
    `<ellipse cx="${fmt(w / 2 + dot.x)}" cy="${fmt(h / 2 + dot.y)}" rx="${fmt(dot.rx)}" ry="${fmt(dot.ry)}" fill="${color.highlight}" opacity="${fmt(dot.opacity)}"/>`
  ).join("\n");
  return `<g transform="translate(${fmt(pea.x)} ${fmt(pea.y)})">
    <defs>
      <radialGradient id="${id}-wash" cx="64%" cy="63%" r="95%" fx="59%" fy="58%">
        <stop offset="0%" stop-color="${bright}"/>
        <stop offset="60%" stop-color="${color.base}"/>
        <stop offset="100%" stop-color="${shadow}"/>
      </radialGradient>
      <clipPath id="${id}-clip"><path d="${outline}"/></clipPath>
    </defs>
    <title>${pea.description.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</title>
    <path d="${outline}" fill="${baseDark}"/>
    <g clip-path="url(#${id}-clip)">
      <path d="${outline}" transform="translate(${fmt(dx)} ${fmt(dy)}) scale(${insetScale})" fill="url(#${id}-wash)"/>
      ${dots}
    </g>
  </g>`;
}
