import type { EasingDefinition, EasingType } from "@kinetia/shared-types";

/**
 * Map named easing types to AE-compatible cubic bezier values.
 * AE expressions use bezier() or custom easing via key interpolation.
 */
const EASING_BEZIER_MAP: Record<EasingType, [number, number, number, number]> = {
  linear:            [0.00, 0.00, 1.00, 1.00],
  easeIn:            [0.42, 0.00, 1.00, 1.00],
  easeOut:           [0.00, 0.00, 0.58, 1.00],
  easeInOut:         [0.42, 0.00, 0.58, 1.00],
  easeInQuad:        [0.55, 0.09, 0.68, 0.53],
  easeOutQuad:       [0.25, 0.46, 0.45, 0.94],
  easeInOutQuad:     [0.46, 0.03, 0.52, 0.96],
  easeInCubic:       [0.55, 0.06, 0.68, 0.19],
  easeOutCubic:      [0.22, 0.61, 0.36, 1.00],
  easeInOutCubic:    [0.65, 0.05, 0.35, 0.95],
  easeInBack:        [0.60, -0.28, 0.74, 0.05],
  easeOutBack:       [0.18,  1.08, 0.43, 0.96],
  easeInOutBack:     [0.68, -0.55, 0.27, 1.55],
  easeInElastic:     [0.75, -0.50, 0.86, 0.14],
  easeOutElastic:    [0.14,  0.86, 0.26, 1.50],
  easeInOutElastic:  [0.87, -0.41, 0.19, 1.44],
  easeInBounce:      [0.76,  0.00, 0.92, 0.29],
  easeOutBounce:     [0.21,  0.85, 0.31, 1.00],
  easeInOutBounce:   [0.51,  0.00, 0.61, 1.03],
  custom:            [0.42, 0.00, 0.58, 1.00],
};

export function getEasingBezier(
  easing: EasingDefinition
): [number, number, number, number] {
  if (easing.type === "custom" && easing.bezier) return easing.bezier;
  return EASING_BEZIER_MAP[easing.type];
}

/**
 * Generate AE JS easing interpolation snippet for a given bezier.
 * Used inside expression eval blocks.
 */
export function easingToAESnippet(bezier: [number, number, number, number]): string {
  const [x1, y1, x2, y2] = bezier;
  return `ease(t, 0, 1, [${x1},${y1}], [${x2},${y2}])`;
}
