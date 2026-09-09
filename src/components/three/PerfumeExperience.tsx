"use client";

import dynamic from "next/dynamic";
import { Component, useRef, useState, type ReactNode } from "react";
import { useDeviceCapabilities } from "@/hooks/useDeviceCapabilities";
import { ImageFallbackHero } from "./ImageFallbackHero";
import { SceneLoader } from "./SceneLoader";
import type { Product } from "@/lib/types";

/**
 * Entry point for the product-page 3D experience.
 *
 * It NEVER breaks the page:
 *  • SSR / first paint → the image hero (also the permanent fallback)
 *  • no WebGL / save-data → image hero
 *  • reduced-motion → static, user-orbitable 3D
 *  • otherwise → the scroll-choreographed cinematic experience
 *  • any runtime failure (chunk load, WebGL context loss, GLB + procedural) →
 *    falls back to the image hero
 */

type ExperienceProps = {
  product: Product;
  mode: "cinematic" | "static";
  isMobile: boolean;
  onFail: () => void;
};

const Experience3D = dynamic<ExperienceProps>(
  () =>
    import("./Experience3D")
      .then((m) => ({ default: m.Experience3D }))
      .catch(() => ({
        default: (p: ExperienceProps) => (
          <ImageFallbackHero product={p.product} reason="error" />
        ),
      })),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-[100svh] min-h-[560px] w-full bg-ink">
        <SceneLoader />
      </div>
    ),
  },
);

class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function PerfumeExperience({ product }: { product: Product }) {
  const caps = useDeviceCapabilities();
  const [failed, setFailed] = useState(false);
  const failGuard = useRef(false);

  const handleFail = () => {
    if (failGuard.current) return;
    failGuard.current = true;
    setFailed(true);
  };

  const use3D =
    caps.ready && !failed && (caps.mode === "cinematic" || caps.mode === "static");

  if (!use3D) {
    return (
      <ImageFallbackHero
        product={product}
        reason={
          failed
            ? "error"
            : !caps.ready
              ? "loading"
              : product.modelUrl
                ? "no-model"
                : "no-model"
        }
      />
    );
  }

  return (
    <SceneBoundary
      fallback={<ImageFallbackHero product={product} reason="error" />}
    >
      <Experience3D
        product={product}
        mode={caps.mode === "static" ? "static" : "cinematic"}
        isMobile={caps.isMobile}
        onFail={handleFail}
      />
    </SceneBoundary>
  );
}
