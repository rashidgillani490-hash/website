"use client";

import { Component, useEffect, type ReactNode } from "react";
import { useGLTF, Center } from "@react-three/drei";
import type { Object3D } from "three";

/**
 * Loads an uploaded GLB / GLTF model. On any failure (bad file, network, CORS,
 * unsupported extension) the error boundary calls `onError` and renders
 * nothing, letting the parent swap in the procedural flacon.
 */
function Gltf({
  url,
  onReady,
}: {
  url: string;
  onReady?: (scene: Object3D) => void;
}) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    scene.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    onReady?.(scene);
  }, [scene, onReady]);

  return (
    <Center>
      <primitive object={scene} dispose={null} />
    </Center>
  );
}

class ModelErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export function GLBModel({
  url,
  onError,
  onReady,
}: {
  url: string;
  onError: () => void;
  onReady?: (scene: Object3D) => void;
}) {
  return (
    <ModelErrorBoundary onError={onError}>
      <Gltf url={url} onReady={onReady} />
    </ModelErrorBoundary>
  );
}
