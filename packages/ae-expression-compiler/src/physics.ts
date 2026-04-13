import type { PhysicsConfig } from "@kinetia/shared-types";

/**
 * Generate AE spring expression for a property.
 * Returns an AE JS expression string implementing damped spring physics.
 *
 * Based on: position = target + amplitude * e^(-friction*t) * cos(frequency*t)
 */
export function springExpression(
  physics: PhysicsConfig,
  targetValue: number,
  propertyName: string
): string {
  const { tension, friction, mass, randomness } = physics;
  const frequency = Math.sqrt(tension / mass) * 10;
  const damping = friction * 2 * Math.sqrt(tension * mass) * 5;

  const randomSeed = randomness > 0
    ? `\nvar seed = seedRandom(index, true);\nvar jitter = (seed - 0.5) * ${(randomness * 50).toFixed(2)};`
    : "\nvar jitter = 0;";

  return `// Kinetia Spring — ${propertyName}
var target = ${targetValue.toFixed(4)};
var frequency = ${frequency.toFixed(4)};
var damping = ${damping.toFixed(4)};
var t = time - inPoint;
${randomSeed}
var amplitude = value - target;
target + amplitude * Math.exp(-damping * t) * Math.cos(frequency * t) + jitter;`;
}

/**
 * Generate AE bounce expression.
 * Simulates elastic bounce using decreasing sine oscillation.
 */
export function bounceExpression(
  physics: PhysicsConfig,
  propertyName: string
): string {
  const { bounciness, velocityDecay } = physics;
  const bounces = Math.max(1, Math.round(bounciness * 5));

  return `// Kinetia Bounce — ${propertyName}
var bounciness = ${bounciness.toFixed(4)};
var bounces = ${bounces};
var decay = ${velocityDecay.toFixed(4)};
var t = time - inPoint;
var dur = outPoint - inPoint;
if (t >= 0 && t <= dur) {
  var progress = t / dur;
  var bounce = Math.abs(Math.sin(Math.PI * bounces * progress)) * Math.pow(1 - progress, decay * 3);
  value * (1 - bounce) + bounce;
} else {
  value;
}`;
}

/**
 * Generate wiggle expression for organic randomness.
 */
export function wiggleExpression(randomness: number): string {
  const freq = (randomness * 3).toFixed(2);
  const amp = (randomness * 20).toFixed(2);
  return `wiggle(${freq}, ${amp})`;
}
