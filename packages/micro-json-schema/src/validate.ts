import { MicroJsonPresetSchema } from "./schema.js";
import type { MicroJsonPreset } from "@kinetia/shared-types";

export interface ValidationResult {
  success: true;
  data: MicroJsonPreset;
}

export interface ValidationFailure {
  success: false;
  errors: Array<{ path: string; message: string }>;
}

export function validateMicroJson(
  input: unknown
): ValidationResult | ValidationFailure {
  const result = MicroJsonPresetSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data as MicroJsonPreset };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

export function assertMicroJson(input: unknown): MicroJsonPreset {
  return MicroJsonPresetSchema.parse(input) as MicroJsonPreset;
}
