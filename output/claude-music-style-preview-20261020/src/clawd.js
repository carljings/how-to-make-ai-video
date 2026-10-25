// clawd.js — Clawd, the Claude Code pixel creature, as an original 3D voxel toy built in code.
// Front grid MEASURED from the official app animation's front pose (Claude.app install-hub clawd-laptop.mov, contact sheet
// supplied by Codex; 1 grid unit = 20 px there): body 8×6, two 1×1 black eyes on body row 1 at body columns 1 and 6,
// 2×2 arms on body rows 2–3, four 1×2 legs at body columns 0, 2, 5, 7. Depth is our interpretation (side poses show a
// deep, boxy body): body 6 deep, arms 2 deep (centred), legs 1 deep at the front and back rows (front view = 4 legs).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FRONT = [
  '..########..',
  '..#E####E#..',
  '############',
  '############',
  '..########..',
  '..########..',
  '..#.#..#.#..',
  '..#.#..#.#..',
];
export const CLAY = new THREE.Color('#D97757');      // Claude terracotta
export const COLS = 12, ROWS = 8, BODY_D = 6;
// grid cell (c, r) → model units, origin at the feet centre, +y up, +z = the face
export const cellX = (c) => c - COLS / 2 + 0.5;
export const cellY = (r) => ROWS - r - 0.5;
export const kindOf = (c, r) => {
  const ch = FRONT[r][c]; if (ch === '.') return null;
  if (ch === 'E') return 'eye';
  if (r >= 6) return 'leg';
  if (c < 2 || c > 9) return 'arm';
  return 'body';
};

// pixel seams: darker grooves on every unit line (object space), which glow when Clawd is charged
function seamMaterial(params, u) {
  const m = new THREE.MeshPhysicalMaterial(params);
  m.userData.uniforms = { uU: { value: u }, uSeam: { value: 0 }, uSeamCol: { value: new THREE.Color('#FF5A14') } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vObjN; uniform float uU;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position / uU; vObjN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vObjN; uniform float uSeam; uniform vec3 uSeamCol; float gSeam;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 an = abs(vObjN);
        vec2 gp = an.x > .5 ? vObj.yz : (an.y > .5 ? vObj.xz : vObj.xy);
        vec2 gd = abs(fract(gp) - .5);
        float gdist = .5 - max(gd.x, gd.y);
        gSeam = 1. - smoothstep(.012, .035, gdist);
        diffuseColor.rgb *= 1. - .16 * gSeam;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uSeamCol * gSeam * uSeam;');
  };
  return m;
}

export function makeClawd(u = 0.3) {
  const g = new THREE.Group();
  const body = seamMaterial({ color: CLAY, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3, emissive: new THREE.Color('#FF6A2A'), emissiveIntensity: 0 }, u);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#050404' });   // unlit: the eyes stay black pixels in every light (identity)
  const box = (w, h, d, x, y, z, m, r = 0.06) => {
    const geo = new RoundedBoxGeometry(w * u, h * u, d * u, 3, r * u * 2); geo.translate(x * u, y * u, z * u);
    const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
  };
  const parts = {};
  // body: columns 2–9, rows 0–5 → x −4..4, y 2..8
  parts.body = box(8, 6, BODY_D, 0, 5, 0, body, 0.1);
  parts.armL = box(2, 2, 2, -5, 5, 0, body); parts.armR = box(2, 2, 2, 5, 5, 0, body);
  parts.legs = [];
  for (const c of [2, 4, 7, 9]) for (const z of [BODY_D / 2 - 0.5, -BODY_D / 2 + 0.5]) parts.legs.push(box(1, 2, 1, cellX(c), 1, z, body, 0.05));
  parts.eyes = [box(1, 1, 0.3, cellX(3), cellY(1), BODY_D / 2 + 0.02, eyeM, 0.04), box(1, 1, 0.3, cellX(8), cellY(1), BODY_D / 2 + 0.02, eyeM, 0.04)];
  // each part keeps its rest offset so the animator can move arms / legs / eyes relative to it
  for (const m of [parts.armL, parts.armR, ...parts.legs, ...parts.eyes]) m.userData.rest = m.position.clone();
  g.userData = { parts, mats: { body, eyeM }, u };
  return g;
}

// the giant: one voxel per shell cell (front grid × depth), listed bottom row first (the order the hook builds it)
export function giantCells(depth = 4) {
  const cells = [];
  for (let r = ROWS - 1; r >= 0; r--) for (let c = 0; c < COLS; c++) {
    const k = kindOf(c, r); if (!k) continue;
    const zs = k === 'arm' ? [1, 2] : k === 'leg' ? [0, depth - 1] : [...Array(depth).keys()];
    for (const zi of zs) {
      const shell = k !== 'body' || zi === 0 || zi === depth - 1 || r === 0 || r === 5 || c === 2 || c === 9;
      if (!shell) continue;
      cells.push({ c, r, zi, kind: zi === depth - 1 && k === 'eye' ? 'eye' : (k === 'eye' ? 'body' : k), x: cellX(c), y: cellY(r), z: zi - (depth - 1) / 2 });
    }
  }
  return cells;
}
