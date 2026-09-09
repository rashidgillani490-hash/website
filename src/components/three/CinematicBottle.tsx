"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import type { Group, Object3D } from "three";
import { GLBModel } from "./GLBModel";
import { ProceduralFlacon, type FlaconHandle } from "./ProceduralFlacon";

export interface CinematicBottleHandle {
  /** Outer group — rotate & scale this. */
  bottle: Group | null;
  /** Cap object — lift & tilt to open. `null` if the model has no cap node. */
  cap: Object3D | null;
}

/**
 * Renders the product's GLB/GLTF when available, else the procedural flacon.
 * Exposes a stable handle the scroll rig animates. A failed GLB calls
 * `onModelError` so the parent can re-render with the procedural fallback.
 */
export const CinematicBottle = forwardRef<
  CinematicBottleHandle,
  { modelUrl?: string | null; accent: string; onModelError: () => void }
>(function CinematicBottle({ modelUrl, accent, onModelError }, ref) {
  const outer = useRef<Group>(null);
  const glbCap = useRef<Object3D | null>(null);
  const flacon = useRef<FlaconHandle>(null);

  useImperativeHandle(ref, () => ({
    get bottle() {
      return outer.current;
    },
    get cap() {
      return modelUrl ? glbCap.current : (flacon.current?.cap ?? null);
    },
  }));

  return (
    <group ref={outer}>
      {modelUrl ? (
        <GLBModel
          url={modelUrl}
          onError={onModelError}
          onReady={(scene) => {
            glbCap.current =
              scene.getObjectByName("Cap") ??
              scene.getObjectByName("cap") ??
              null;
          }}
        />
      ) : (
        <ProceduralFlacon ref={flacon} accent={accent} />
      )}
    </group>
  );
});
