import type { LayerType } from "./micro-json.js";

export interface LayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerAnchorPoint {
  x: number;
  y: number;
}

export interface ParsedLayer {
  /** Unique identifier within the file (e.g. PSD layer ID or path) */
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  bounds: LayerBounds;
  anchorPoint: LayerAnchorPoint;
  opacity: number;
  /** Child layers (for group type) */
  children?: ParsedLayer[];
  /** For text layers */
  textContent?: string;
  fontFamily?: string;
  fontSize?: number;
  /** Original file layer index */
  index: number;
  /** Depth in hierarchy (0 = top-level) */
  depth: number;
}

export interface ParsedFile {
  id: string;
  name: string;
  width: number;
  height: number;
  colorMode: "rgb" | "cmyk" | "grayscale";
  /** Pixels per inch */
  ppi: number;
  layers: ParsedLayer[];
  /** Whether the file was auto-segmented (was originally flat) */
  wasAutoSegmented: boolean;
  parsedAt: string;
}

export interface CheckpointResult {
  valid: boolean;
  errors: CheckpointError[];
  warnings: CheckpointWarning[];
}

export interface CheckpointError {
  code: string;
  message: string;
  layerId?: string;
}

export interface CheckpointWarning {
  code: string;
  message: string;
  layerId?: string;
}
