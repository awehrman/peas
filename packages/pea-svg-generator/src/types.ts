export interface PeaColor {
  name: string;
  base: string;
  stroke: string;
  highlight: string;
}

export interface PeaHighlight {
  x: number;
  y: number;
  rx: number;
  ry: number;
  opacity: number;
  color?: string;
}

export interface PeaConfig {
  id: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: PeaColor;
  highlights: PeaHighlight[];
  description: string;
}

export interface BlobPeaConfig {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: PeaColor;
  highlights: PeaHighlight[];
  description: string;
  blobSeed: number; // For consistent blob shape generation
}

export interface PeaGeneratorOptions {
  width?: number;
  height?: number;
  peasPerRow?: number;
  margin?: number;
  outputPath?: string;
  useBlobs?: boolean; // New option to use blob shapes
}
