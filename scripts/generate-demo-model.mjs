/**
 * Generates the bundled demo 3D flacon:  public/models/demo-flacon.gltf
 *
 *   npm run model:demo
 *
 * A single self-contained glTF 2.0 file (geometry embedded as a base64 buffer)
 * so the cinematic 3D experience has a real GLB/GLTF asset to load out of the
 * box. Two nodes — "Bottle" and "Cap" — so the cap can be animated open.
 *
 * The client can replace this per-product from Admin → product → Media.
 */

import * as THREE from "three";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const OUT = resolve(process.cwd(), "public/models/demo-flacon.gltf");

/* ------------------------------------------------------------- materials */
const materials = [
  // 0 · gold-tinted glass
  {
    name: "GlassGold",
    pbrMetallicRoughness: {
      baseColorFactor: [0.86, 0.72, 0.45, 0.5],
      metallicFactor: 0.0,
      roughnessFactor: 0.12,
    },
    alphaMode: "BLEND",
    doubleSided: true,
  },
  // 1 · amber liquid
  {
    name: "Liquid",
    pbrMetallicRoughness: {
      baseColorFactor: [0.8, 0.52, 0.22, 0.9],
      metallicFactor: 0.0,
      roughnessFactor: 0.22,
    },
    alphaMode: "BLEND",
  },
  // 2 · polished gold
  {
    name: "Gold",
    pbrMetallicRoughness: {
      baseColorFactor: [0.83, 0.68, 0.4, 1],
      metallicFactor: 1.0,
      roughnessFactor: 0.26,
    },
  },
  // 3 · dark lacquer cap
  {
    name: "Cap",
    pbrMetallicRoughness: {
      baseColorFactor: [0.05, 0.05, 0.06, 1],
      metallicFactor: 0.5,
      roughnessFactor: 0.35,
    },
  },
];

/* --------------------------------------------------------------- parts */
function body() {
  return new THREE.BoxGeometry(1.5, 2.0, 0.85, 3, 4, 3).translate(0, 0.55, 0);
}
function shoulder() {
  return new THREE.CylinderGeometry(0.3, 0.52, 0.34, 48).translate(0, 1.15, 0);
}
function collar() {
  return new THREE.CylinderGeometry(0.17, 0.17, 0.28, 32).translate(0, 1.45, 0);
}
function liquid() {
  return new THREE.BoxGeometry(1.34, 1.4, 0.68).translate(0, 0.15, 0);
}
function base() {
  return new THREE.BoxGeometry(1.78, 0.14, 1.06).translate(0, -0.5, 0);
}
function capBody() {
  return new THREE.CylinderGeometry(0.34, 0.34, 0.5, 48);
}
function capRing() {
  const g = new THREE.TorusGeometry(0.3, 0.028, 20, 60);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0.22, 0);
  return g;
}

const bottleParts = [
  [body(), 0],
  [shoulder(), 0],
  [collar(), 2],
  [liquid(), 1],
  [base(), 2],
];
const capParts = [
  [capBody(), 3],
  [capRing(), 2],
];

/* ---------------------------------------------------- glTF serialisation */
const chunks = []; // { bytes: Buffer }
let byteLength = 0;
const bufferViews = [];
const accessors = [];

function align4() {
  while (byteLength % 4 !== 0) {
    chunks.push(Buffer.from([0]));
    byteLength += 1;
  }
}

function pushView(typedArray, target) {
  align4();
  const buf = Buffer.from(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength,
  );
  const view = {
    buffer: 0,
    byteOffset: byteLength,
    byteLength: buf.length,
    target,
  };
  chunks.push(buf);
  byteLength += buf.length;
  bufferViews.push(view);
  return bufferViews.length - 1;
}

function primitiveFor(geo, materialIndex) {
  const pos = geo.attributes.position.array; // Float32Array
  const nrm = geo.attributes.normal.array; // Float32Array
  const rawIdx = geo.index.array;
  const vertexCount = pos.length / 3;

  // min/max for POSITION (required)
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = pos[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }

  const posView = pushView(new Float32Array(pos), 34962);
  const nrmView = pushView(new Float32Array(nrm), 34962);

  const useUint32 = vertexCount > 65535;
  const idx = useUint32 ? new Uint32Array(rawIdx) : new Uint16Array(rawIdx);
  const idxView = pushView(idx, 34963);

  const posAcc = accessors.push({
    bufferView: posView,
    componentType: 5126,
    count: vertexCount,
    type: "VEC3",
    min,
    max,
  }) - 1;
  const nrmAcc = accessors.push({
    bufferView: nrmView,
    componentType: 5126,
    count: vertexCount,
    type: "VEC3",
  }) - 1;
  const idxAcc = accessors.push({
    bufferView: idxView,
    componentType: useUint32 ? 5125 : 5123,
    count: idx.length,
    type: "SCALAR",
  }) - 1;

  return {
    attributes: { POSITION: posAcc, NORMAL: nrmAcc },
    indices: idxAcc,
    material: materialIndex,
  };
}

const meshes = [
  { name: "Bottle", primitives: bottleParts.map(([g, m]) => primitiveFor(g, m)) },
  { name: "Cap", primitives: capParts.map(([g, m]) => primitiveFor(g, m)) },
];

align4();
const bin = Buffer.concat(chunks);

const gltf = {
  asset: { version: "2.0", generator: "Maison Lumiere demo flacon generator" },
  scene: 0,
  scenes: [{ nodes: [0, 1] }],
  nodes: [
    { name: "Bottle", mesh: 0 },
    { name: "Cap", mesh: 1, translation: [0, 1.78, 0] },
  ],
  meshes,
  materials,
  accessors,
  bufferViews,
  buffers: [
    {
      byteLength: bin.length,
      uri: `data:application/octet-stream;base64,${bin.toString("base64")}`,
    },
  ],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(gltf));
console.log(
  `Wrote ${OUT}  (${(JSON.stringify(gltf).length / 1024).toFixed(1)} KB, ` +
    `${accessors.length} accessors, ${bin.length} B geometry)`,
);
