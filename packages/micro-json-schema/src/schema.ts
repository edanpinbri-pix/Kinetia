import { z } from "zod";

export const EasingTypeSchema = z.enum([
  "linear",
  "easeIn", "easeOut", "easeInOut",
  "easeInQuad", "easeOutQuad", "easeInOutQuad",
  "easeInCubic", "easeOutCubic", "easeInOutCubic",
  "easeInBack", "easeOutBack", "easeInOutBack",
  "easeInElastic", "easeOutElastic", "easeInOutElastic",
  "easeInBounce", "easeOutBounce", "easeInOutBounce",
  "custom",
]);

export const EasingDefinitionSchema = z.object({
  type: EasingTypeSchema,
  bezier: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
}).refine(
  (v) => v.type !== "custom" || v.bezier !== undefined,
  { message: "bezier required when type is 'custom'" }
);

export const KeyframeSchema = z.object({
  time: z.number().min(0),
  value: z.number().min(0).max(1),
  easing: EasingDefinitionSchema,
});

export const PhysicsConfigSchema = z.object({
  tension: z.number().min(0).max(1),
  friction: z.number().min(0).max(1),
  mass: z.number().min(0.1).max(10),
  bounciness: z.number().min(0).max(1),
  velocityDecay: z.number().min(0).max(1),
  randomness: z.number().min(0).max(1),
});

export const AEPropertySchema = z.enum([
  "position.x", "position.y",
  "scale.x", "scale.y", "scale.uniform",
  "rotation",
  "opacity",
  "anchorPoint.x", "anchorPoint.y",
  "skew", "skewAxis",
]);

export const AnimationTrackSchema = z.object({
  property: AEPropertySchema,
  keyframes: z.array(KeyframeSchema).min(1),
  physicsOverride: PhysicsConfigSchema.partial().optional(),
  expression: z.string().optional(),
});

export const LayerTypeSchema = z.enum(["text", "vector", "image", "shape", "group"]);

export const PresetCategorySchema = z.enum([
  "entrance", "exit", "emphasis", "transition", "loop",
  "text-reveal", "kinetic-typography", "logo-intro", "particle", "custom",
]);

export const TargetConstraintsSchema = z.object({
  layerTypes: z.array(LayerTypeSchema).min(1),
  requiresCenterAnchor: z.boolean(),
  minDimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
});

export const PresetMetaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  category: PresetCategorySchema,
  tags: z.array(z.string()),
  duration: z.number().positive(),
  fps: z.number().min(1).max(120),
  thumbnailUrl: z.string().url(),
  createdAt: z.string().datetime(),
  confidence: z.number().min(0).max(1),
});

export const AnalysisMetadataSchema = z.object({
  sourceVideoHash: z.string(),
  opticalFlowMethod: z.string(),
  trackedElements: z.number().int().min(0),
  processingTimeMs: z.number().min(0),
  frameCount: z.number().int().min(1),
});

export const MicroJsonPresetSchema = z.object({
  version: z.literal("1.0.0"),
  id: z.string().uuid(),
  meta: PresetMetaSchema,
  targetConstraints: TargetConstraintsSchema,
  tracks: z.array(AnimationTrackSchema).min(1),
  physics: PhysicsConfigSchema,
  _analysis: AnalysisMetadataSchema.optional(),
});

export type MicroJsonPresetInput = z.input<typeof MicroJsonPresetSchema>;
export type MicroJsonPresetOutput = z.output<typeof MicroJsonPresetSchema>;
