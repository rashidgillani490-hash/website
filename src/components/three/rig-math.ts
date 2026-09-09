/**
 * Pure scroll → transform mapping for the cinematic rig. Kept dependency-free
 * so the choreography (dolly, arc, rotation, zoom, cap-open) is unit-testable
 * without a WebGL context.
 *
 * `progress` is 0 at the top of the experience section, 1 at the bottom.
 */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface RigFrame {
  /** Camera target position. */
  camX: number;
  camY: number;
  camZ: number;
  /** Point the camera looks at (Y only; X/Z stay 0). */
  lookY: number;
  /** Absolute bottle Y-rotation in radians. */
  bottleRotY: number;
  /** Uniform bottle scale. */
  bottleScale: number;
  /** Bottle lift. */
  bottleY: number;
  /** Cap "openness" 0..1. */
  capOpen: number;
  /** Whether the spray should be emitting. */
  spraying: boolean;
}

export function rigFrame(progress: number, isMobile: boolean): RigFrame {
  const p = clamp01(progress);
  return {
    camX: Math.sin(p * Math.PI) * (isMobile ? 0.35 : 0.9),
    camY: lerp(0.35, 1.0, smoothstep(0.1, 0.72, p)),
    camZ: lerp(7, isMobile ? 4.7 : 4.0, smoothstep(0.04, 0.62, p)),
    lookY: lerp(0.05, 0.85, smoothstep(0.2, 0.82, p)),
    bottleRotY: easeInOutCubic(p) * Math.PI * 2.4,
    bottleScale: lerp(1, isMobile ? 1.12 : 1.24, smoothstep(0.28, 0.78, p)),
    bottleY: lerp(0, 0.12, smoothstep(0.4, 0.95, p)),
    capOpen: smoothstep(0.34, 0.6, p),
    spraying: p >= 0.82,
  };
}

/** Cap local transform for a given openness (base position captured elsewhere). */
export function capTransform(open: number) {
  return {
    dY: open * 1.45,
    x: open * 0.5,
    rotZ: -open * 0.9,
    rotX: open * 0.35,
  };
}
