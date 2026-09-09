"use client";

import { Suspense, useState, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  AdaptiveDpr,
  AdaptiveEvents,
} from "@react-three/drei";
import { CanvasLoader } from "./CanvasLoader";
import { Rig } from "./CinematicRig";

export function CinematicCanvas({
  modelUrl,
  accent,
  mode,
  isMobile,
  progressRef,
  onFail,
}: {
  modelUrl?: string | null;
  accent: string;
  mode: "cinematic" | "static";
  isMobile: boolean;
  progressRef: MutableRefObject<number>;
  onFail: () => void;
}) {
  const [modelBroken, setModelBroken] = useState(false);
  const effectiveModel = modelBroken ? null : (modelUrl ?? null);

  return (
    <Canvas
      className="!absolute inset-0"
      shadows={!isMobile}
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{
        antialias: !isMobile,
        alpha: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ position: [0, 0.4, 7], fov: 42 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            onFail();
          },
          { once: true },
        );
      }}
    >
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      <ambientLight intensity={0.35} />
      <spotLight
        position={[4, 7, 4]}
        angle={0.35}
        penumbra={1}
        intensity={isMobile ? 1.6 : 2.4}
        castShadow={!isMobile}
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-5, 1.5, -3]} intensity={1.1} color={accent} />

      <Suspense fallback={<CanvasLoader />}>
        <Rig
          key={effectiveModel ?? "procedural"}
          mode={mode}
          isMobile={isMobile}
          progressRef={progressRef}
          modelUrl={effectiveModel}
          accent={accent}
          onModelError={() => setModelBroken(true)}
        />
        <Environment resolution={isMobile ? 96 : 160} frames={1}>
          <Lightformer
            form="rect"
            intensity={2.2}
            position={[0, 4, 2]}
            scale={[9, 5, 1]}
            rotation={[-Math.PI / 2.2, 0, 0]}
            color="#fff6e0"
          />
          <Lightformer
            form="rect"
            intensity={1.4}
            position={[-4, 1, 3]}
            scale={[3, 4, 1]}
            color={accent}
          />
          <Lightformer
            form="ring"
            intensity={1.1}
            position={[4, 2, -3]}
            scale={[3, 3, 1]}
            color="#9fb7ff"
          />
        </Environment>
      </Suspense>

      <ContactShadows
        position={[0, -1.65, 0]}
        opacity={0.5}
        scale={13}
        blur={2.8}
        far={4}
        resolution={isMobile ? 256 : 512}
      />

      {mode === "static" ? (
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          target={[0, 0.2, 0]}
          minPolarAngle={Math.PI / 2.8}
          maxPolarAngle={Math.PI / 1.7}
        />
      ) : null}
    </Canvas>
  );
}
