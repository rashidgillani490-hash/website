"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { decideExperienceMode, type ExperienceMode } from "@/lib/experience-mode";

export { decideExperienceMode };
export type { ExperienceMode };

/** One-off WebGL capability probe (memoised across the session). */
let cachedWebGL: boolean | null = null;
function probeWebGL(): boolean {
  if (cachedWebGL !== null) return cachedWebGL;
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    cachedWebGL = !!gl && typeof (gl as WebGLRenderingContext).getParameter === "function";
    // Free the probe context immediately.
    (gl as WebGLRenderingContext | null)
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  } catch {
    cachedWebGL = false;
  }
  return cachedWebGL;
}


export interface DeviceCapabilities {
  /** false until the client-side probe has run (SSR-safe default). */
  ready: boolean;
  webgl: boolean;
  isMobile: boolean;
  isCoarsePointer: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
  /** The recommended way to present the 3D experience on this device. */
  mode: ExperienceMode;
}

/**
 * Decides how (or whether) to run the cinematic 3D experience:
 *   image     — no WebGL, or the device asked to save data
 *   static    — reduced-motion: show the model but no scroll choreography
 *   cinematic — full scroll-driven experience (lighter on mobile)
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const prefersReducedMotion = !!useReducedMotion();
  const [state, setState] = useState<Omit<DeviceCapabilities, "prefersReducedMotion" | "mode">>({
    ready: false,
    webgl: false,
    isMobile: false,
    isCoarsePointer: false,
    saveData: false,
  });

  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 768px)");
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;

    const update = () =>
      setState({
        ready: true,
        webgl: probeWebGL(),
        isMobile: mqMobile.matches,
        isCoarsePointer: mqCoarse.matches,
        saveData: !!conn?.saveData,
      });

    update();
    mqMobile.addEventListener("change", update);
    mqCoarse.addEventListener("change", update);
    return () => {
      mqMobile.removeEventListener("change", update);
      mqCoarse.removeEventListener("change", update);
    };
  }, []);

  const mode = decideExperienceMode({
    ready: state.ready,
    webgl: state.webgl,
    saveData: state.saveData,
    prefersReducedMotion,
  });

  return { ...state, prefersReducedMotion, mode };
}
