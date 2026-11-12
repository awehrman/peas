# Subtle contour pea (reference-led)

This is deliberately **not** the glossy/jellybean direction. It retains the original restrained, flat-contour style and 1–3 muted spots. The palette has been replaced with the 16 user-selected hex colors.

## Renderer
- darkened outer silhouette, visible as a narrow, slightly asymmetric rim
- inset fill at 92.5% scale, translated subtly to preserve the original off-center border character
- barely visible body gradient (~5.5% lightening, ~9.5% darkening)
- muted colored translucent spots; no white or specular reflections

## Generation
- deterministic `seed`, configurable `count` and `peasPerRow`
- mixed small size and aspect ratios
- 16 exact user-selected palette colors, with a green-heavy weighted distribution

To change aesthetic: `src/renderers/contour-pea.ts`. To change size, spot distribution or palette selection: `src/generators/blob-pea-config-generator.ts`.

## Recreate the 500-pea sheet

From this directory (Node 22+, TypeScript CLI installed):

```bash
tsc -p tsconfig.preview.json
node preview-500.mjs
```

The preview is SVG and every pea is still vector-based. `PeaGenerator({useBlobs: true, count: 500, seed: 20261112, peasPerRow: 25, width: 1800, height: 1300, margin: 23})` is the exact sample configuration. For your actual app, use existing generator APIs as before. `renderBlobPeaSvg()` shares the new treatment.

## Palette update — November 2026

The 16 unique source swatches from the five supplied screenshots are preserved as exact base hex colors in `src/colors.ts`. Only contour and spot colors are algorithmically derived. For the 500-piece preview, 68% of selections come from the seven green-family swatches; the remaining selections use the other nine swatches. Change `0.68` in `BlobPeaConfigGenerator.generateManyBlobPeaConfigs()` to adjust the balance.
