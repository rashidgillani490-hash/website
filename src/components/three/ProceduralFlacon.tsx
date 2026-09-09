"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Group } from "three";

export interface FlaconHandle {
  /** The whole bottle (rotate / scale this). */
  bottle: Group | null;
  /** The cap group (lift / tilt this to "open"). Base position is [0, 2.42, 0]. */
  cap: Group | null;
}

/**
 * Procedurally-modelled flacon with the cap split into its own group so it can
 * be animated open. Used by the cinematic experience as the demo model and as
 * the fallback when a GLB fails to load.
 */
export const ProceduralFlacon = forwardRef<
  FlaconHandle,
  { accent?: string }
>(function ProceduralFlacon({ accent = "#c8a866" }, ref) {
  const bottle = useRef<Group>(null);
  const cap = useRef<Group>(null);

  useImperativeHandle(ref, () => ({
    get bottle() {
      return bottle.current;
    },
    get cap() {
      return cap.current;
    },
  }));

  return (
    <group ref={bottle} position={[0, -0.4, 0]}>
      {/* Body */}
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[1.5, 2, 0.85]} />
        <meshPhysicalMaterial
          color={accent}
          transmission={0.92}
          thickness={1.3}
          roughness={0.07}
          ior={1.46}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          attenuationColor={accent}
          attenuationDistance={1.6}
        />
      </mesh>

      {/* Shoulder */}
      <mesh position={[0, 1.72, 0]}>
        <cylinderGeometry args={[0.28, 0.5, 0.32, 48]} />
        <meshPhysicalMaterial
          color={accent}
          transmission={0.85}
          thickness={0.6}
          roughness={0.1}
          ior={1.45}
          clearcoat={1}
        />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 2.02, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.32, 32]} />
        <meshStandardMaterial color="#d9cfbc" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* Liquid */}
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[1.34, 1.42, 0.68]} />
        <meshPhysicalMaterial
          color={accent}
          transmission={0.55}
          thickness={2}
          roughness={0.16}
          ior={1.38}
          attenuationColor={accent}
          attenuationDistance={0.75}
        />
      </mesh>

      {/* Base plinth */}
      <mesh receiveShadow position={[0, -0.45, 0]}>
        <boxGeometry args={[1.72, 0.12, 1.02]} />
        <meshStandardMaterial color="#111114" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Cap — animated open by the rig. Base at y = 2.42. */}
      <group ref={cap} position={[0, 2.42, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.55, 48]} />
          <meshStandardMaterial color="#0b0b0d" metalness={0.6} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <torusGeometry args={[0.3, 0.03, 20, 60]} />
          <meshStandardMaterial color={accent} metalness={1} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
});
