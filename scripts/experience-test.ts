/**
 * Phase 4 — cinematic 3D experience checks.
 *
 *   npm run experience:test
 *
 * Verifies the bundled demo 3D asset, the experience-mode decision logic
 * (WebGL / save-data / reduced-motion fallbacks), and the fragrance helpers
 * that feed the post-experience product facts.
 */

import { loadEnv } from "./_env.ts";
loadEnv();

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { decideExperienceMode } from "../src/lib/experience-mode.ts";
import { rigFrame, capTransform, smoothstep, easeInOutCubic } from "../src/components/three/rig-math.ts";
import { recommendedOccasions, familyLine, primaryFamily } from "../src/lib/fragrance.ts";
import type { Product } from "../src/lib/types.ts";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const rec = (name: string, ok: boolean, detail?: string) => {
  checks.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
};

async function main() {
console.log("\nMaison Lumière — cinematic experience checks");
console.log("===========================================");

/* ---------------------------------------------------- demo 3D asset */
const MODEL = resolve(process.cwd(), "public/models/demo-flacon.gltf");
{
  const raw = readFileSync(MODEL, "utf8");
  const g = JSON.parse(raw);
  rec("model: valid glTF 2.0 JSON", g.asset?.version === "2.0");

  const names = (g.nodes ?? []).map((n: { name?: string }) => n.name);
  rec("model: has Bottle + Cap nodes (cap can animate open)", names.includes("Bottle") && names.includes("Cap"));
  rec("model: has meshes & materials", (g.meshes?.length ?? 0) >= 1 && (g.materials?.length ?? 0) >= 1);

  const b64 = String(g.buffers?.[0]?.uri ?? "").split(",")[1] ?? "";
  const bin = Buffer.from(b64, "base64");
  rec(
    "model: embedded buffer decodes to declared length",
    bin.length === g.buffers[0].byteLength && bin.length > 0,
    `${bin.length} B`,
  );
  const overflow = (g.bufferViews ?? []).some(
    (v: { byteOffset: number; byteLength: number }) => v.byteOffset + v.byteLength > bin.length,
  );
  rec("model: every bufferView is within bounds", !overflow);

  const posAccessors = (g.accessors ?? []).filter(
    (a: { type: string; min?: number[] }) => a.type === "VEC3" && Array.isArray(a.min),
  );
  rec("model: POSITION accessors carry min/max", posAccessors.length >= (g.meshes?.length ?? 0));

  rec("model: reasonable size for lazy load", statSync(MODEL).size < 600 * 1024, `${(statSync(MODEL).size / 1024).toFixed(0)} KB`);
}

/* ------------------------------------------- experience-mode decision */
{
  const base = { ready: true, webgl: true, saveData: false, prefersReducedMotion: false };
  rec("mode: capable desktop → cinematic", decideExperienceMode(base) === "cinematic");
  rec("mode: probe not ready → image", decideExperienceMode({ ...base, ready: false }) === "image");
  rec("mode: no WebGL → image fallback", decideExperienceMode({ ...base, webgl: false }) === "image");
  rec("mode: Save-Data → image fallback", decideExperienceMode({ ...base, saveData: true }) === "image");
  rec(
    "mode: reduced-motion → static (user-orbit, no choreography)",
    decideExperienceMode({ ...base, prefersReducedMotion: true }) === "static",
  );
  rec(
    "mode: no WebGL beats reduced-motion → image",
    decideExperienceMode({ ...base, webgl: false, prefersReducedMotion: true }) === "image",
  );
}

/* --------------------------------------------------- rig choreography */
{
  const start = rigFrame(0, false);
  const mid = rigFrame(0.5, false);
  const end = rigFrame(1, false);

  const capMid = rigFrame(0.5, false).capOpen;
  rec("rig: camera dollies in as you scroll", end.camZ < start.camZ - 1.5, `${start.camZ.toFixed(1)} → ${end.camZ.toFixed(1)}`);
  rec("rig: camera rises", end.camY > start.camY);
  rec("rig: bottle completes multiple turns", end.bottleRotY > Math.PI * 2);
  rec("rig: bottle zooms (scale grows)", end.bottleScale > start.bottleScale);
  rec(
    "rig: cap closed at start, opening mid-scroll, fully open after ~0.6",
    start.capOpen === 0 && capMid > 0.3 && capMid < 1 && rigFrame(0.62, false).capOpen === 1,
    `capOpen@0.5 = ${capMid.toFixed(2)}`,
  );
  rec("rig: spray only near the end", !mid.spraying && rigFrame(0.9, false).spraying);
  rec("rig: mobile pulls camera less far in (perf)", rigFrame(0.6, true).camZ > rigFrame(0.6, false).camZ);
  rec("rig: mobile scales the bottle less (perf)", rigFrame(0.8, true).bottleScale < rigFrame(0.8, false).bottleScale);
  rec("rig: capTransform maps openness to lift + tilt", capTransform(1).dY > 1 && capTransform(1).rotZ < 0);
  rec("rig: smoothstep clamps", smoothstep(0, 1, -1) === 0 && smoothstep(0, 1, 2) === 1);
  rec("rig: easeInOutCubic endpoints", easeInOutCubic(0) === 0 && easeInOutCubic(1) === 1);
}

/* --------------------------------------------- fragrance fact helpers */
{
  const p = (over: Partial<Product>): Product =>
    ({
      id: "x",
      slug: "x",
      name: "Test",
      tagline: "t",
      description: "d",
      story: "s",
      concentration: "Eau de Parfum",
      gender: "Unisex",
      collectionSlug: "c",
      families: ["woody", "amber"],
      notes: { top: [], heart: [], base: [] },
      perfumer: "p",
      sillage: "Bold",
      longevity: "8h+",
      images: [{ src: "", alt: "" }],
      accentColor: "#c8a866",
      sizes: [{ ml: 50, price: 1000, stock: 1, sku: "x-50" }],
      rating: 4.5,
      reviewCount: 1,
      featured: false,
      isNew: false,
      releaseYear: 2020,
      ...over,
    }) as Product;

  const derived = recommendedOccasions(p({}));
  rec("occasions: derived when none stored", derived.length > 0 && derived.length <= 6);
  rec(
    "occasions: bold + extrait add statement occasions",
    recommendedOccasions(p({ concentration: "Extrait de Parfum" })).some((o) =>
      /special|night/i.test(o),
    ),
  );
  rec(
    "occasions: explicit list passes through",
    JSON.stringify(recommendedOccasions(p({ occasions: ["Weddings", "Opera"] }))) ===
      JSON.stringify(["Weddings", "Opera"]),
  );
  rec("familyLine: joins families", familyLine(p({})) === "Woody · Amber");
  rec("primaryFamily: capitalises first family", primaryFamily(p({})) === "Woody");
  rec(
    "occasions: never empty even with unknown families",
    recommendedOccasions(p({ families: [], concentration: "Eau de Toilette", sillage: "Moderate" })).length > 0,
  );
}

const failed = checks.filter((c) => !c.ok);
console.log("\n-------------------------------------------");
console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) {
  failed.forEach((f) => console.log(`  - ${f.name}`));
  process.exit(1);
}
console.log("Cinematic experience assets & fallbacks verified.\n");
process.exit(0);
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
