"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import type { BottleSceneProps } from "./BottleScene";

/**
 * Client-only wrapper. Three.js / R3F must never run during SSR, so the scene
 * is loaded with `ssr: false` and a graceful skeleton fallback.
 */
const BottleScene = dynamic(() => import("./BottleScene"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function ShowcaseCanvas(props: BottleSceneProps) {
  return <BottleScene {...props} />;
}
