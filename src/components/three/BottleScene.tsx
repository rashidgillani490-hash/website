"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  ContactShadows,
  PerspectiveCamera,
  Html,
  useProgress,
} from "@react-three/drei";
import { PerfumeBottle } from "./PerfumeBottle";
import { GLBModel } from "./GLBModel";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="h-px w-24 overflow-hidden bg-bone/20">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] uppercase tracking-luxe text-bone/50">
          Rendering flacon
        </span>
      </div>
    </Html>
  );
}

export interface BottleSceneProps {
  accent?: string;
  interactive?: boolean;
  className?: string;
  /** Optional uploaded GLB/GLTF; falls back to the procedural flacon on error. */
  modelUrl?: string | null;
}

export default function BottleScene({
  accent = "#c8a866",
  interactive = true,
  className,
  modelUrl,
}: BottleSceneProps) {
  const [failed, setFailed] = useState(false);
  const [modelBroken, setModelBroken] = useState(false);
  const showModel = !!modelUrl && !modelBroken;

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-bone/40">
        3D preview unavailable on this device.
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () => setFailed(true));
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0.6, 6]} fov={38} />
        <ambientLight intensity={0.4} />
        <spotLight
          position={[5, 8, 4]}
          angle={0.3}
          penumbra={1}
          intensity={2.4}
          castShadow
        />
        <pointLight position={[-4, 2, -4]} intensity={1.2} color={accent} />

        <Suspense fallback={<Loader />}>
          {showModel ? (
            <GLBModel url={modelUrl!} onError={() => setModelBroken(true)} />
          ) : (
            <PerfumeBottle accent={accent} spin={!interactive} />
          )}
          <Environment preset="studio" />
        </Suspense>

        <ContactShadows
          position={[0, -0.9, 0]}
          opacity={0.5}
          scale={10}
          blur={2.6}
          far={4}
        />

        {interactive ? (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.8}
            autoRotate
            autoRotateSpeed={0.6}
          />
        ) : null}
      </Canvas>
    </div>
  );
}
