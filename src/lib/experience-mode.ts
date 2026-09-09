export type ExperienceMode = "cinematic" | "static" | "image";

/**
 * Pure decision for how to present the product-page 3D experience:
 *   image     — probe not finished yet, no WebGL, or the device asked to save data
 *   static    — reduced-motion: show the model, no scroll choreography
 *   cinematic — the full scroll-driven experience
 *
 * Kept dependency-free so it can be unit-tested without React / framer-motion.
 */
export function decideExperienceMode(input: {
  ready: boolean;
  webgl: boolean;
  saveData: boolean;
  prefersReducedMotion: boolean;
}): ExperienceMode {
  if (!input.ready) return "image";
  if (!input.webgl || input.saveData) return "image";
  if (input.prefersReducedMotion) return "static";
  return "cinematic";
}
