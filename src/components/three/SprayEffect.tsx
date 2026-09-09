"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  PointsMaterial,
} from "three";

function softDotTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,246,224,0.7)");
  g.addColorStop(1, "rgba(255,246,224,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

/**
 * A refined perfume-spray mist. Emits a short, soft cone of particles toward
 * the viewer once the scroll progress crosses `startAt`, then settles. Reads
 * `progressRef` directly so it never triggers React re-renders.
 */
export function SprayEffect({
  progressRef,
  enabled = true,
  startAt = 0.82,
  count = 200,
  origin = [0.18, 1.5, 0.35] as [number, number, number],
}: {
  progressRef: MutableRefObject<number>;
  enabled?: boolean;
  startAt?: number;
  count?: number;
  origin?: [number, number, number];
}) {
  const state = useRef({ phase: "idle" as "idle" | "active", elapsed: 0 });

  const { geometry, material, velocities, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const dot = softDotTexture();
    const material = new PointsMaterial({
      size: 0.06,
      ...(dot ? { map: dot } : {}),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      color: new Color("#f6f2ea"),
      sizeAttenuation: true,
    });
    return { geometry, material, velocities, seeds };
  }, [count]);

  function reset() {
    const pos = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin[0];
      pos[i * 3 + 1] = origin[1];
      pos[i * 3 + 2] = origin[2];
      // Cone toward camera (+z), rising (+y), gentle spread.
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.5;
      velocities[i * 3] = Math.cos(a) * r * 0.9;
      velocities[i * 3 + 1] = 0.5 + Math.random() * 0.9;
      velocities[i * 3 + 2] = 1.1 + Math.random() * 1.6;
      seeds[i] = 0.4 + Math.random() * 0.9;
    }
    geometry.attributes.position.needsUpdate = true;
    state.current.elapsed = 0;
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const p = progressRef.current;
    const s = state.current;

    if (!enabled) {
      material.opacity = 0;
      return;
    }

    if (s.phase === "idle" && p >= startAt) {
      s.phase = "active";
      reset();
    } else if (s.phase === "active" && p < startAt - 0.06) {
      s.phase = "idle";
      material.opacity = 0;
      return;
    }

    if (s.phase !== "active") return;

    s.elapsed += delta;
    const pos = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const drag = 1 - 1.6 * delta;
      velocities[i * 3] *= drag;
      velocities[i * 3 + 1] = velocities[i * 3 + 1] * drag - 0.9 * delta * seeds[i];
      velocities[i * 3 + 2] *= drag;
      pos[i * 3] += velocities[i * 3] * delta;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    geometry.attributes.position.needsUpdate = true;

    // Rise then fade over ~2s.
    const t = s.elapsed;
    const fadeIn = Math.min(t / 0.18, 1);
    const fadeOut = Math.max(0, 1 - Math.max(0, t - 0.5) / 1.6);
    material.opacity = 0.55 * fadeIn * fadeOut;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
