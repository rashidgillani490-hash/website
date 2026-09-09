"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Group } from "three";

/**
 * A procedurally-modelled perfume flacon. No external GLB asset is required so
 * the 3D showcase works offline and in CI. A real `.glb` can later be dropped
 * into `public/models/` and loaded with `useGLTF` without touching the scene.
 */
export function PerfumeBottle({
  accent = "#c8a866",
  spin = true,
}: {
  accent?: string;
  spin?: boolean;
}) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (spin && group.current) {
      group.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
      <group ref={group} position={[0, -0.4, 0]}>
        {/* Body */}
        <mesh castShadow position={[0, 0.6, 0]}>
          <boxGeometry args={[1.5, 2, 0.8]} />
          <meshPhysicalMaterial
            color={accent}
            transmission={0.9}
            thickness={1.2}
            roughness={0.08}
            ior={1.45}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.05}
            attenuationColor={accent}
            attenuationDistance={1.5}
          />
        </mesh>

        {/* Shoulder */}
        <mesh position={[0, 1.72, 0]}>
          <cylinderGeometry args={[0.28, 0.5, 0.32, 32]} />
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
          <cylinderGeometry args={[0.16, 0.16, 0.3, 24]} />
          <meshStandardMaterial color="#d9cfbc" metalness={0.9} roughness={0.25} />
        </mesh>

        {/* Cap */}
        <mesh castShadow position={[0, 2.42, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.55, 32]} />
          <meshStandardMaterial color="#0b0b0d" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 2.72, 0]}>
          <torusGeometry args={[0.3, 0.03, 16, 48]} />
          <meshStandardMaterial color={accent} metalness={1} roughness={0.2} />
        </mesh>

        {/* Liquid fill */}
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[1.34, 1.4, 0.66]} />
          <meshPhysicalMaterial
            color={accent}
            transmission={0.6}
            thickness={2}
            roughness={0.15}
            ior={1.38}
            attenuationColor={accent}
            attenuationDistance={0.8}
          />
        </mesh>

        {/* Base plinth */}
        <mesh receiveShadow position={[0, -0.45, 0]}>
          <boxGeometry args={[1.7, 0.12, 1]} />
          <meshStandardMaterial color="#111114" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
    </Float>
  );
}
