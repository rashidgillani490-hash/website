"use client";

import { useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { CinematicBottle, type CinematicBottleHandle } from "./CinematicBottle";
import { SprayEffect } from "./SprayEffect";
import { rigFrame, capTransform } from "./rig-math";

const tmp = new Vector3();

/**
 * Drives the camera, bottle and cap from the smoothed scroll progress
 * (`progressRef`, updated outside React by Framer Motion). All choreography
 * maths live in `rig-math.ts`. No drei imports — keeps it unit-mountable.
 */
export function Rig({
  mode,
  isMobile,
  progressRef,
  modelUrl,
  accent,
  onModelError,
}: {
  mode: "cinematic" | "static";
  isMobile: boolean;
  progressRef: MutableRefObject<number>;
  modelUrl?: string | null;
  accent: string;
  onModelError: () => void;
}) {
  const handle = useRef<CinematicBottleHandle>(null);
  const capBaseY = useRef<number | null>(null);
  const { camera } = useThree();

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const bottle = handle.current?.bottle;
    const cap = handle.current?.cap;
    if (cap && capBaseY.current === null) capBaseY.current = cap.position.y;

    if (mode === "static") {
      // Reduced-motion: no autoplay. The viewer drags to rotate (OrbitControls).
      return;
    }

    const f = rigFrame(progressRef.current, isMobile);

    camera.position.lerp(tmp.set(f.camX, f.camY, f.camZ), 0.09);
    camera.lookAt(0, f.lookY, 0);

    if (bottle) {
      bottle.rotation.y = MathUtils.damp(bottle.rotation.y, f.bottleRotY, 6, delta);
      bottle.scale.setScalar(f.bottleScale);
      bottle.position.y = f.bottleY;
    }

    if (cap && capBaseY.current !== null) {
      const c = capTransform(f.capOpen);
      cap.position.y = capBaseY.current + c.dY;
      cap.position.x = c.x;
      cap.rotation.z = c.rotZ;
      cap.rotation.x = c.rotX;
      if (f.capOpen >= 1) {
        cap.position.y += Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      }
    }
  });

  return (
    <>
      <group position={[0, -0.55, 0]}>
        <CinematicBottle
          ref={handle}
          modelUrl={modelUrl}
          accent={accent}
          onModelError={onModelError}
        />
      </group>
      <SprayEffect
        progressRef={progressRef}
        enabled={mode === "cinematic"}
        count={isMobile ? 60 : 200}
      />
    </>
  );
}
