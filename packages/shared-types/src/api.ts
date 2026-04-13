import type { MicroJsonPreset, PhysicsConfig } from "./micro-json.js";
import type { ParsedFile, CheckpointResult } from "./layer.js";
import type { LayerPresetMapping, PresetCompatibility } from "./preset.js";

// ─── Generic wrappers ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// ─── Training ────────────────────────────────────────────────────────────────

export type TrainingJobStatus = "queued" | "processing" | "completed" | "failed";

export interface TrainingJobCreateRequest {
  /** Pre-signed upload URL will be provided, videoUrl set server-side */
  videoUrl: string;
  presetName?: string;
  category?: string;
}

export interface TrainingJob {
  id: string;
  userId: string;
  videoUrl: string;
  status: TrainingJobStatus;
  /** 0–100 */
  progress: number;
  resultPresetId: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export type ProjectStatus = "draft" | "processing" | "ready" | "exported";

export interface Project {
  id: string;
  userId: string;
  name: string;
  status: ProjectStatus;
  sourceFileUrl: string;
  sourceFileType: "psd" | "ai" | "svg";
  layerTree: ParsedFile | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateRequest {
  name: string;
  sourceFileType: "psd" | "ai" | "svg";
  /** Pre-signed URL for file upload */
  sourceFileUrl: string;
}

export interface ParseProjectResponse {
  project: Project;
  checkpoints: CheckpointResult;
}

export interface AutoMapRequest {
  /** If empty, use all user presets */
  presetIds?: string[];
}

export interface AutoMapResponse {
  mappings: LayerPresetMapping[];
  suggestions: PresetCompatibility[];
}

// ─── Export ───────────────────────────────────────────────────────────────────

export type ExportStatus = "pending" | "building" | "ready" | "failed";

export interface ExportPackage {
  id: string;
  projectId: string;
  packageUrl: string;
  aeProjectUrl: string | null;
  status: ExportStatus;
  createdAt: string;
}

// ─── CV Pipeline (internal) ───────────────────────────────────────────────────

export interface CVAnalyzeRequest {
  videoUrl: string;
  fps?: number;
  maxDurationSeconds?: number;
}

export interface CVAnalyzeResponse {
  preset: MicroJsonPreset;
  processingTimeMs: number;
}

// ─── Preset overrides payload ─────────────────────────────────────────────────

export interface UpdateLayerPresetRequest {
  presetId: string | null;
  overrides?: Partial<PhysicsConfig>;
}
