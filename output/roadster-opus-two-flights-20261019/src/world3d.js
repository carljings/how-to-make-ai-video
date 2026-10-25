// world3d.js — the 3D stage (three.js; WebGL on SwiftShader or Metal). World frame = the v9 fits': +Z up, metres.
// Three venues share one renderer: 'ramp' (Tesla "The Ramp", 2026-10-16), 'lot' (Musk's parking-lot kickflip video) and
// 'lab' (an abstract torque lab, schematic). Car, ramp, lot and both pose tracks are the v9/v4 image-informed CG
// reconstructions — not factory CAD, not measured dynamics.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { rng, clamp } from './lib.js';

async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.json(); }
async function getBin(u) { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.arrayBuffer(); }

export async function loadModel(base) {
  const [carMeta, carBuf, sceneMeta, sceneBuf, poses, lotMeta, lotBuf, kick] = await Promise.all([
    getJSON(base + 'car.json'), getBin(base + 'car.bin'), getJSON(base + 'scene.json'), getBin(base + 'scene.bin'), getJSON(base + 'poses.json'),
    getJSON(base + 'lot.json'), getBin(base + 'lot.bin'), getJSON(base + 'kickflip.json')]);
  return { carMeta, carBuf, sceneMeta, sceneBuf, poses, lotMeta, lotBuf, kick };
}

// one exported part → a BufferGeometry whose index is sorted by the per-vertex material, one group per material
function partGeometry(meta, buf, name) {
  const e = meta.parts[name];
  const pos = new Float32Array(buf, e.pos, e.vertices * 3), nor = new Float32Array(buf, e.nor, e.vertices * 3);
  const mat = new Uint8Array(buf, e.mat, e.vertices), idx = new Uint32Array(buf, e.idx, e.indices);
  const buckets = new Map();
  for (let k = 0; k < idx.length; k += 3) {
    const m = mat[idx[k]];
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(idx[k], idx[k + 1], idx[k + 2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor.slice(), 3));
  const all = []; let start = 0;
  for (const [m, list] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    all.push(...list); g.addGroup(start, list.length, m); start += list.length;
  }
  g.setIndex(all);
  return g;
}

function carMaterials(names) {
  const P = (o) => new THREE.MeshPhysicalMaterial(o), S = (o) => new THREE.MeshStandardMaterial(o);
  const lamp = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const lib = {
    paint: P({ color: 0xa9aeb5, roughness: 0.42, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.35 }),   // v2 pearl silver-white
    glass: P({ color: 0x07090c, roughness: 0.04, metalness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.02, envMapIntensity: 1.3 }),
    satin_black: S({ color: 0x111215, roughness: 0.45, metalness: 0.2 }),
    underbody: S({ color: 0x24272d, roughness: 0.62, metalness: 0.25 }),
    panel_gap: S({ color: 0x040405, roughness: 0.9 }),
    liner: S({ color: 0x0c0d0f, roughness: 0.9 }),
    lamp_white: lamp(0xe8f0ff, 0.95), lamp_red: lamp(0xff1e2a, 4.0), lamp_amber: lamp(0xffa020, 3.0),
    under_frame: S({ color: 0x3e434b, roughness: 0.72, metalness: 0.25, envMapIntensity: 0.5 }),
    nozzle: S({ color: 0x6a707b, roughness: 0.3, metalness: 0.9 }),
    tyre: S({ color: 0x0a0a0b, roughness: 0.82 }),
    rim: S({ color: 0xc6c9cf, roughness: 0.22, metalness: 1.0 }),
    rim_dark: S({ color: 0x2a2c31, roughness: 0.3, metalness: 0.9 }),
    brake: S({ color: 0x70737a, roughness: 0.4, metalness: 0.9 }),
    caliper: S({ color: 0xb3141a, roughness: 0.35, metalness: 0.3 }),
    fan: S({ color: 0x1d1f23, roughness: 0.6 }),
  };
  return names.map((n) => lib[n] || S({ color: 0x777777 }));
}

function sceneMaterials(names) {
  const S = (o) => new THREE.MeshStandardMaterial(o);
  const glow = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const lib = {
    concrete: S({ color: 0x9a9da3, roughness: 0.86, metalness: 0.0 }),
    slab_back: S({ color: 0x2c2f35, roughness: 0.8 }), slab_side: S({ color: 0x3a3e45, roughness: 0.75 }),
    neon_red: glow(0xff1a26, 1.7), neon_white: glow(0xdfeaff, 1.5),
    lattice: S({ color: 0x23262c, roughness: 0.45, metalness: 0.7 }),
    floor_red: glow(0xff2020, 1.8), paint_line: S({ color: 0xe8eaee, roughness: 0.7 }),
    lamp_disc: glow(0xffffff, 4.0), centre_line: S({ color: 0xe6e8ec, roughness: 0.7 }),
  };
  return names.map((n) => lib[n] || S({ color: 0x777777 }));
}

function lotMaterials(names) {
  const S = (o) => new THREE.MeshStandardMaterial(o), P = (o) => new THREE.MeshPhysicalMaterial(o);
  const lib = {
    lineup_white: P({ color: 0x9da2a8, roughness: 0.35, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12 }),
    lineup_red: P({ color: 0x5a0c10, roughness: 0.35, metalness: 0.3, clearcoat: 1 }),
    truck_white: S({ color: 0xa3a7ad, roughness: 0.4 }), steel: S({ color: 0x6b6e73, roughness: 0.38, metalness: 1 }),
    bronze: S({ color: 0x8c6a3a, roughness: 0.3, metalness: 1 }), lineup_glass: P({ color: 0x050607, roughness: 0.05, clearcoat: 1 }),
    lineup_under: S({ color: 0x0b0b0c, roughness: 0.8 }), lineup_rim: S({ color: 0x55575c, roughness: 0.3, metalness: 0.9 }),
    tyre: S({ color: 0x080808, roughness: 0.85 }), trim_dark: S({ color: 0x0a0a0b, roughness: 0.6 }),
    lamp_white_dim: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(1.4) }),
    zinc: S({ color: 0x4d4f53, roughness: 0.45, metalness: 1 }), jack_steel: S({ color: 0x141518, roughness: 0.5, metalness: 0.5 }),
    wood_pole: S({ color: 0x2a2018, roughness: 0.85 }), pale_structure: S({ color: 0x8d9095, roughness: 0.55 }),
    tent_grey: S({ color: 0x3a3b3e, roughness: 0.8 }), equipment_orange: S({ color: 0x9a3a0a, roughness: 0.5 }), cable: S({ color: 0x111111, roughness: 0.5 }),
  };
  return names.map((n) => lib[n] || S({ color: 0x777777 }));
}

// car-local 3x4 (column-major X, Y, Z, O) → Matrix4, re-orthonormalised after interpolation
function m4From3x4(c, out) {
  const X = new THREE.Vector3(c[0], c[1], c[2]).normalize();
  const Z = new THREE.Vector3(c[6], c[7], c[8]);
  Z.addScaledVector(X, -Z.dot(X)).normalize();
  const Y = new THREE.Vector3().crossVectors(Z, X);
  return out.set(X.x, Y.x, Z.x, c[9], X.y, Y.y, Z.y, c[10], X.z, Y.z, Z.z, c[11], 0, 0, 0, 1);
}

// The Ramp: v4 RampState at 240 Hz of source time ev (Tesla's continuous wide take)
export class Poses {
  constructor(p) { this.p = p; }
  _i(ev) { const f = (ev - this.p.ev0) / this.p.dt; const i = Math.max(0, Math.min(this.p.count - 2, Math.floor(f))); return [i, clamp(f - i, 0, 1)]; }
  matrix(ev, out = new THREE.Matrix4()) {
    const [i, u] = this._i(ev), a = this.p.matrices[i], b = this.p.matrices[i + 1];
    return m4From3x4(a.map((x, k) => x + (b[k] - x) * u), out);
  }
  wheelAngle(ev) { const [i, u] = this._i(ev); return this.p.wheel_angle[i] + (this.p.wheel_angle[i + 1] - this.p.wheel_angle[i]) * u; }
  jets(ev) {
    const [i, u] = this._i(ev), a = this.p.jets[i], b = this.p.jets[i + 1], o = {};
    this.p.jet_names.forEach((n, k) => { o[n] = a[k] + (b[k] - a[k]) * u; });
    return o;
  }
  cloud(ev) {   // the source's ground cloud from the v9 puff list (birth in ev)
    const out = [];
    for (const p of this.p.cloud_puffs) {
      const age = ev - p.birth; if (age <= 0) continue;
      const g = 1 - Math.exp(-age / 0.55);
      for (let j = 0; j < 3; j++) {
        const r = (0.6 + (p.r1 - 0.6) * g) * (1.2 + 0.25 * j);
        out.push({ c: [p.x + p.drift * g + (j - 1) * 0.5 * r, p.y + (j - 1) * 0.3 * r, 0.35 * r + p.rise * g + 0.2 * j * r], r, a: 0.17 * Math.min(1, age / 0.35) / (1 + 0.4 * j) });
      }
    }
    return out;
  }
}

// the kickflip (Musk's lot video): v4 motion.wide_pose sampled at 240 Hz of that video's clock (5.0–12.0 s);
// a screen-space reconstruction through an assumed lens, not a measured trajectory, height, speed or angle
export class FlightPoses {
  constructor(k) { this.k = k; }
  _i(s) { const f = (s - this.k.t0) * this.k.hz; const i = Math.max(0, Math.min(this.k.count - 2, Math.floor(f))); return [i, clamp(f - i, 0, 1)]; }
  matrix(s, out = new THREE.Matrix4()) { const [i, u] = this._i(s), a = this.k.matrices[i], b = this.k.matrices[i + 1]; return m4From3x4(a.map((x, j) => x + (b[j] - x) * u), out); }
  plumes(s) { const [i, u] = this._i(s), a = this.k.plumes[i], b = this.k.plumes[i + 1], o = {}; this.k.plume_names.forEach((n, j) => { o[n] = a[j] + (b[j] - a[j]) * u; }); return o; }
  roll(s) { const [i, u] = this._i(s); return this.k.roll_left_deg[i] + (this.k.roll_left_deg[i + 1] - this.k.roll_left_deg[i]) * u; }
  cloud(s) {
    const out = [];
    for (const p of this.k.cloud_puffs) {
      if (s < p.born) continue;
      const r = Math.min(p.rmax, p.r0 + p.grow * (s - p.born));
      out.push({ c: [p.x, p.y, Math.max(p.zc, 0.45 * r)], r, a: 0.16 * p.density * Math.min(1, 0.4 + (s - p.born)) });
    }
    return out;
  }
}

// soft round sprite texture for clouds
function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// The car's longitudinal section at car-local y = y0 as a texture over x ∈ [X0, X1], z ∈ [Z0, Z1]:
// R = inside the body (section segments drawn, then flood-filled from the border), G = the gap under the floor down to
// the road plane z = 0 within the floor span, B = G blurred (a smooth "nearness to the gap" field for isobars).
const SEC = { X0: -2.6, X1: 2.6, Z0: -0.12, Z1: 1.5, NX: 624, NZ: 194 };
function sectionMask(meta, buf, y0 = 0.0) {
  const e = meta.parts.body, pos = new Float32Array(buf, e.pos, e.vertices * 3), idx = new Uint32Array(buf, e.idx, e.indices);
  const { X0, X1, Z0, Z1, NX, NZ } = SEC, wall = new Uint8Array(NX * NZ);
  const px = (x) => (x - X0) / (X1 - X0) * NX, pz = (z) => (z - Z0) / (Z1 - Z0) * NZ;
  const plot = (x, z) => { const i = Math.floor(x), j = Math.floor(z); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const ii = i + a, jj = j + b; if (ii >= 0 && ii < NX && jj >= 0 && jj < NZ) wall[jj * NX + ii] = 1; } };
  for (let k = 0; k < idx.length; k += 3) {
    const P = [0, 1, 2].map((q) => [pos[idx[k + q] * 3], pos[idx[k + q] * 3 + 1], pos[idx[k + q] * 3 + 2]]);
    const pts = [];
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const da = P[a][1] - y0, db = P[b][1] - y0;
      if ((da < 0) !== (db < 0)) { const u = da / (da - db); pts.push([P[a][0] + (P[b][0] - P[a][0]) * u, P[a][2] + (P[b][2] - P[a][2]) * u]); }
    }
    if (pts.length !== 2) continue;
    const ax = px(pts[0][0]), az = pz(pts[0][1]), bx = px(pts[1][0]), bz = pz(pts[1][1]);
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * 2));
    for (let s = 0; s <= n; s++) plot(ax + (bx - ax) * s / n, az + (bz - az) * s / n);
  }
  // flood fill the outside from the border
  const out = new Uint8Array(NX * NZ), stack = [];
  for (let i = 0; i < NX; i++) stack.push(i, (NZ - 1) * NX + i);
  for (let j = 0; j < NZ; j++) stack.push(j * NX, j * NX + NX - 1);
  while (stack.length) {
    const p = stack.pop(); if (out[p] || wall[p]) continue; out[p] = 1;
    const i = p % NX, j = (p - i) / NX;
    if (i > 0) stack.push(p - 1); if (i < NX - 1) stack.push(p + 1); if (j > 0) stack.push(p - NX); if (j < NZ - 1) stack.push(p + NX);
  }
  const inside = (i, j) => !out[j * NX + i];
  const span = meta.floor_span, G = new Float32Array(NX * NZ), floorZ = new Float32Array(NX);
  const jRoad = Math.ceil(pz(0));
  for (let i = 0; i < NX; i++) {
    const x = X0 + (i + 0.5) / NX * (X1 - X0);
    let jb = -1; for (let j = 0; j < NZ; j++) if (inside(i, j)) { jb = j; break; }
    floorZ[i] = jb < 0 ? -1 : Z0 + jb / NZ * (Z1 - Z0);
    if (jb < 0 || x < span[0] || x > span[1]) continue;
    for (let j = jRoad; j < jb; j++) G[j * NX + i] = 1;
  }
  // blur G (separable box, 3 passes) → a smooth field reaching ~0.35 m beyond the gap
  let B = G.slice(); const R = 22, tmp = new Float32Array(NX * NZ);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < NZ; j++) { let acc = 0; for (let i = -R; i <= R; i++) acc += B[j * NX + clamp(i, 0, NX - 1)]; for (let i = 0; i < NX; i++) { tmp[j * NX + i] = acc / (2 * R + 1); acc += B[j * NX + Math.min(NX - 1, i + R + 1)] - B[j * NX + Math.max(0, i - R)]; } }
    for (let i = 0; i < NX; i++) { let acc = 0; for (let j = -R; j <= R; j++) acc += tmp[clamp(j, 0, NZ - 1) * NX + i]; for (let j = 0; j < NZ; j++) { B[j * NX + i] = acc / (2 * R + 1); acc += tmp[Math.min(NZ - 1, j + R + 1) * NX + i] - tmp[Math.max(0, j - R) * NX + i]; } }
  }
  let bmax = 0; for (const v of B) bmax = Math.max(bmax, v);
  const data = new Uint8Array(NX * NZ * 4);
  for (let p = 0; p < NX * NZ; p++) { data[p * 4] = out[p] ? 0 : 255; data[p * 4 + 1] = G[p] * 255; data[p * 4 + 2] = Math.min(255, B[p] / bmax * 255); data[p * 4 + 3] = 255; }
  const tex = new THREE.DataTexture(data, NX, NZ, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return { tex, floorZ };
}

const POINT_VS = /* glsl */`
  attribute vec3 seed; attribute float rnd;
  uniform float uTime, uSize, uScale, uMaxPx; uniform vec3 uMin, uBox, uDrift;
  varying float vA;
  void main() {
    vec3 p = seed * uBox + uDrift * uTime * (0.6 + 0.8 * rnd);
    p += 0.35 * vec3(sin(uTime * 1.7 + rnd * 40.0), sin(uTime * 1.3 + rnd * 70.0), sin(uTime * 2.1 + rnd * 90.0));
    p = uMin + mod(p, uBox);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uMaxPx, uSize * (0.6 + 0.8 * rnd) * uScale / -mv.z);
    vA = 0.55 + 0.45 * rnd;
  }`;
const POINT_FS = /* glsl */`
  uniform vec3 uColor; uniform float uAlpha; varying float vA;
  void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard;
    gl_FragColor = vec4(uColor, uAlpha * vA * (1.0 - r) * (1.0 - r)); }`;

const JET_VS = /* glsl */`
  attribute float nz; attribute float rnd; attribute vec2 off;
  uniform vec3 uP[7]; uniform vec3 uD[7]; uniform float uL[7]; uniform vec3 uCol[7]; uniform float uTime, uLen, uSpread, uSize, uScale;
  varying float vA; varying vec3 vC;
  void main() {
    int k = int(nz);
    float age = fract(uTime * (1.6 + 0.8 * rnd) + rnd * 13.0);
    vec3 d = normalize(uD[k]);
    vec3 a = normalize(abs(d.z) < 0.9 ? cross(d, vec3(0.0, 0.0, 1.0)) : cross(d, vec3(1.0, 0.0, 0.0)));
    vec3 b = cross(d, a);
    vec3 p = uP[k] + d * age * uLen * (0.75 + 0.5 * rnd) + (a * off.x + b * off.y) * (0.04 + uSpread * age);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(22.0, uSize * (0.4 + 1.6 * age) * uScale / -mv.z);
    vA = uL[k] * (1.0 - age) * smoothstep(0.0, 0.08, age);
    vC = uCol[k];
  }`;
const JET_FS = /* glsl */`
  varying float vA; varying vec3 vC;
  void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0 || vA < 0.002) discard;
    gl_FragColor = vec4(vC, vA * (1.0 - r)); }`;

// the section plane: pass 0 = opaque caps (car section, deck section), pass 1 = the air (pressure field, molecules,
// isobars, the fan's flow out of the gap, the seals). Coordinates are car-local (x along the car, z up from the road).
const SLICE_VS = /* glsl */`
  varying vec2 vP;
  #include <clipping_planes_pars_vertex>
  void main() { vP = vec2(position.x, position.z); vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
  }`;
const SLICE_FS = /* glsl */`
  uniform sampler2D uMask; uniform vec4 uBox; uniform float uTime, uDiff, uAlpha, uLip, uDeck, uDeckT, uFan, uSeal, uPass, uFront, uLaser;
  uniform vec2 uSealX;
  varying vec2 vP;
  #include <clipping_planes_pars_fragment>
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec4 M(vec2 q) { vec2 uv = vec2((q.x - uBox.x) / (uBox.y - uBox.x), (q.y - uBox.z) / (uBox.w - uBox.z));
    return (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) ? texture2D(uMask, uv) : vec4(0.0); }
  void main() {
    #include <clipping_planes_fragment>
    float front = uFront;                                         // the laser sweep: x > front not yet cut open
    if (vP.x > front + 0.002) discard;
    vec4 m = M(vP);
    bool car = m.r > 0.5;
    bool deck = uDeck > 0.5 && vP.y < 0.0 && vP.y > -uDeckT && vP.x < uLip;
    float laser = uLaser * exp(-abs(vP.x - front) * 40.0);
    if (uPass < 0.5) {
      if (car) {
        float e = 0.014, n = min(min(M(vP + vec2(e, 0.0)).r, M(vP - vec2(e, 0.0)).r), min(M(vP + vec2(0.0, e)).r, M(vP - vec2(0.0, e)).r));
        float rim = 1.0 - smoothstep(0.3, 0.5, n);
        vec3 c = mix(vec3(0.035, 0.04, 0.05), vec3(0.075, 0.085, 0.1), clamp(vP.y, 0.0, 1.0));
        c = mix(c, vec3(1.25, 1.45, 1.7), rim) + laser * vec3(2.0, 2.4, 3.0);
        gl_FragColor = vec4(c, 1.0);
      } else if (deck) {
        float top = 1.0 - smoothstep(0.0, 0.02, -vP.y);
        vec3 c = vec3(0.12, 0.125, 0.135) + 0.018 * step(0.5, fract((vP.x + vP.y) * 10.0));
        c = mix(c, vec3(0.75, 0.78, 0.85), top * 0.7) + laser * vec3(2.0, 2.4, 3.0);
        gl_FragColor = vec4(c, 1.0);
      } else discard;
      return;
    }
    if (car || deck) discard;
    float gapness = (uDeck > 0.5 && vP.x < uLip) ? m.b : 0.0;
    float D = uDiff;
    float low = D * clamp(gapness * 1.25, 0.0, 1.0);
    vec3 O = vec3(1.0, 0.42, 0.10), Bl = vec3(0.16, 0.52, 1.0), Nn = vec3(0.45, 0.55, 0.68);
    vec3 tint = mix(mix(Nn, O, D), Bl, low);
    float edge = length(vec2(vP.x / 4.4, (vP.y - 0.45) / 2.3));
    float fade = 1.0 - smoothstep(0.55, 1.0, edge);
    float a = (0.05 + 0.08 * D + 0.2 * low) * fade;
    // molecules: one per 4.5 cm cell (some), fewer and slower in the low-pressure gap
    vec2 cs = vec2(0.045);
    vec2 cell = floor(vP / cs), f = vP / cs - cell;
    float r = h21(cell), keep = mix(0.30, 0.06, low);
    float sp = mix(1.4, 0.4, low);
    vec2 ctr = fract(vec2(r * 7.13, r * 3.71) + uTime * sp * (vec2(h21(cell + 7.0), h21(cell + 3.0)) - 0.5));
    float dd = length(f - (0.25 + 0.5 * ctr));
    float dot = (r < keep ? 1.0 : 0.0) * (1.0 - smoothstep(0.07, 0.16, dd));
    vec3 dc = mix(mix(vec3(0.8, 0.86, 0.95), vec3(1.0, 0.68, 0.38), D), vec3(0.55, 0.85, 1.0), low);
    // isobars flowing toward the gap (outside air pushing toward the lower pressure)
    float fld = m.b * step(vP.x, uLip);
    float iso = D * (1.0 - smoothstep(0.0, 0.05, abs(fract(fld * 4.0 + uTime * 0.9) - 0.5) - 0.42)) * smoothstep(0.04, 0.14, fld) * (1.0 - smoothstep(0.8, 0.98, fld));
    // the gap itself: a bright blue band (it is only ~0.1 m high), its air drawn to the rear
    float gapCore = m.g * step(vP.x, uLip) * (uDeck > 0.5 ? 1.0 : 0.0);
    float pulse = 0.55 + 0.45 * sin(vP.x * 14.0 + uTime * 9.0);
    float band = gapCore * D * (0.65 + 0.35 * uFan * pulse);
    float jet = uFan * D * step(vP.x, uSealX.y) * (1.0 - smoothstep(0.0, 1.8, uSealX.y - vP.x)) * exp(-pow((vP.y - 0.15 - 0.06 * (uSealX.y - vP.x)) / (0.05 + 0.05 * (uSealX.y - vP.x)), 2.0))
      * (0.55 + 0.45 * sin(vP.x * 10.0 + uTime * 12.0));
    // seals: bright posts at the floor's front and rear ends, from the road to the floor
    float seal = 0.0;
    for (int k = 0; k < 2; k++) { float sx = k == 0 ? uSealX.x : uSealX.y; seal += (1.0 - smoothstep(0.012, 0.03, abs(vP.x - sx))) * step(0.0, vP.y) * step(vP.y, 0.16) * step(sx, uLip + 0.0001); }
    vec3 col = tint * a + dc * dot * fade * (0.45 + 0.4 * D) + O * iso * 0.55 * fade
             + vec3(0.35, 0.75, 1.5) * band + vec3(0.5, 0.85, 1.3) * jet * 0.9 + vec3(1.4, 1.7, 2.0) * seal * uSeal + laser * vec3(1.2, 1.6, 2.2) * fade;
    float al = clamp(a + dot * fade * 0.7 + iso * 0.45 * fade + band * 0.9 + jet * 0.6 + seal * uSeal + laser * 0.8, 0.0, 1.0);
    gl_FragColor = vec4(col * uAlpha, al * uAlpha);
  }`;

const GRID_FS = /* glsl */`
  uniform float uK; uniform vec3 uColor; varying vec3 vW;
  float line(float x, float w) { float d = abs(fract(x - 0.5) - 0.5); return 1.0 - smoothstep(w * 0.5, w, d); }
  void main() {
    float r = length(vW.xy - vec2(0.0, 0.0));
    float g = max(line(vW.x, 0.02), line(vW.y, 0.02)) * 0.5 + max(line(vW.x / 5.0, 0.006), line(vW.y / 5.0, 0.006));
    float fade = exp(-r * 0.055);
    gl_FragColor = vec4(uColor * g * fade * uK + vec3(0.012, 0.016, 0.024) * fade, 1.0);
  }`;

export class World {
  constructor(W, H, model) {
    this.W = W; this.H = H; this.model = model;
    this.poses = new Poses(model.poses); this.flight = new FlightPoses(model.kick);
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(W, H, false);
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;   // hue-preserving: red neon stays red
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
    this.canvas = canvas;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060a);
    scene.fog = new THREE.FogExp2(0x05070c, 0.012);
    const pm = new THREE.PMREMGenerator(r);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = this.env; scene.environmentIntensity = 0.22;
    const cam = this.camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 800);
    cam.up.set(0, 0, 1);

    // ---- the cut: two clip planes, intersected (removed only where BOTH clip): the near half of the section AND the
    // part the laser has already swept. "Off" = planes pushed far away.
    this.clipY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6); this.clipX = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e6);
    const clipped = (mats) => { for (const m of mats) { m.clippingPlanes = [this.clipY, this.clipX]; m.clipIntersection = true; } return mats; };

    // ---- venues
    this.rampGroup = new THREE.Group(); this.lotGroup = new THREE.Group(); this.labGroup = new THREE.Group();
    scene.add(this.rampGroup, this.lotGroup, this.labGroup);
    const sm = clipped(sceneMaterials(model.sceneMeta.materials));
    for (const part of ['ramp', 'neon', 'lattice', 'venue']) {
      if (!model.sceneMeta.parts[part]) continue;
      const mesh = new THREE.Mesh(partGeometry(model.sceneMeta, model.sceneBuf, part), sm);
      mesh.castShadow = part !== 'neon'; mesh.receiveShadow = part === 'ramp';
      this.rampGroup.add(mesh);
    }
    const lm = lotMaterials(model.lotMeta.materials);
    for (const part of Object.keys(model.lotMeta.parts)) {
      const mesh = new THREE.Mesh(partGeometry(model.lotMeta, model.lotBuf, part), lm);
      mesh.castShadow = true; mesh.receiveShadow = true; this.lotGroup.add(mesh);
    }
    // the visible overhead lines of the kickflip source video (role unknown): kept; they can be highlighted
    this.cableMat = new THREE.MeshStandardMaterial({ color: 0x2b2e34, roughness: 0.5, emissive: 0x3a4250, emissiveIntensity: 0.6 });
    for (const L of model.kick.overhead_lines) {
      const curve = new THREE.CatmullRomCurve3(L.points.map((q) => new THREE.Vector3(...q)));
      this.lotGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, L.points.length * 4), Math.max(0.035, L.radius), 6, false), this.cableMat));
    }
    // lab: a glowing metric grid
    this.gridMat = new THREE.ShaderMaterial({ uniforms: { uK: { value: 1 }, uColor: { value: new THREE.Color(0x3a8fd0) } },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: GRID_FS });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), this.gridMat); grid.position.z = 0.001; this.labGroup.add(grid);
    // shared floor for ramp and lot
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: 0x0c0e13, roughness: 0.5, metalness: 0.0 }));
    this.floor.receiveShadow = true; scene.add(this.floor);

    // ---- cars: the hero (car 0) and a twin for side-by-side experiments (car 1); wheels as children
    const cm = clipped(carMaterials(model.carMeta.materials));
    this.lampMat = cm[model.carMeta.materials.indexOf('lamp_white')];
    this.lampRed = cm[model.carMeta.materials.indexOf('lamp_red')];
    const geo = { body: partGeometry(model.carMeta, model.carBuf, 'body') };
    for (const n of ['wheelF', 'wheelR', 'wheelStaticF', 'wheelStaticR']) geo[n] = partGeometry(model.carMeta, model.carBuf, n);
    this.cars = [0, 1].map(() => {
      const g = new THREE.Group(); g.matrixAutoUpdate = false;
      const body = new THREE.Mesh(geo.body, cm); body.castShadow = true; body.receiveShadow = true; g.add(body);
      const wheels = model.carMeta.wheel_placements.map((wp) => {
        const spin = new THREE.Mesh(geo[wp.name[0] === 'F' ? 'wheelF' : 'wheelR'], cm), fixed = new THREE.Mesh(geo[wp.name[0] === 'F' ? 'wheelStaticF' : 'wheelStaticR'], cm);
        for (const m of [spin, fixed]) { m.matrixAutoUpdate = false; m.castShadow = true; g.add(m); }
        return { wp, spin, fixed };
      });
      scene.add(g); return { g, wheels };
    });

    // ---- four spot slots (the shot places them) + a hemi fill; slot 0 casts shadows
    this.spots = [0, 1, 2, 3].map((k) => {
      const l = new THREE.SpotLight(0xffffff, 0, 160, 0.4, 0.55, 2);
      scene.add(l, l.target);
      if (k === 0) { l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02; l.shadow.camera.near = 2; l.shadow.camera.far = 160; }
      return l;
    });
    this.hemi = new THREE.HemisphereLight(0x9fb4d8, 0x0a0b10, 0.25); scene.add(this.hemi);
    // fake light shafts along slots 0–2 (haze; staging, not data)
    this.beams = [0, 1, 2].map(() => {
      const len = 30;
      const g = new THREE.ConeGeometry(1, len, 48, 1, true); g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2);
      const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(0xdfe8ff) }, uK: { value: 0.05 }, uLen: { value: len } },
        vertexShader: `varying vec3 vN; varying vec3 vV; varying float vZ; uniform float uLen;
          void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vZ = position.z / uLen; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `varying vec3 vN; varying vec3 vV; varying float vZ; uniform vec3 uColor; uniform float uK;
          void main() { float f = pow(abs(dot(vN, vV)), 1.6); float a = uK * f * (1.0 - smoothstep(0.15, 1.0, vZ)) * smoothstep(0.0, 0.06, vZ); gl_FragColor = vec4(uColor * a, a); }` });
      const m = new THREE.Mesh(g, mat); scene.add(m); return m;
    });
    // the deck's free end: a thin glowing edge
    const lip = model.sceneMeta.ramp.LIP;
    this.lipBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, model.sceneMeta.ramp.W, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    this.lipBar.position.set(lip[0] + 0.035, 0, lip[2] - 0.03); this.lipBar.visible = false; this.rampGroup.add(this.lipBar);

    // ---- air particles (air vision): a box of drifting motes centred where the shot asks
    {
      const N = 60000, R = rng(7), seed = new Float32Array(N * 3), rnd = new Float32Array(N);
      for (let i = 0; i < N; i++) { seed[i * 3] = R(); seed[i * 3 + 1] = R(); seed[i * 3 + 2] = R(); rnd[i] = R(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      g.setAttribute('seed', new THREE.BufferAttribute(seed, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1));
      this.airMat = new THREE.ShaderMaterial({ vertexShader: POINT_VS, fragmentShader: POINT_FS, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uSize: { value: 0.07 }, uScale: { value: H * 0.9 }, uMaxPx: { value: 4.5 },
          uMin: { value: new THREE.Vector3(-26, -18, -1) }, uBox: { value: new THREE.Vector3(40, 36, 30) }, uDrift: { value: new THREE.Vector3(0.6, 0.25, 0.15) },
          uColor: { value: new THREE.Color(0x9fd2ff) }, uAlpha: { value: 0 } } });
      this.air = new THREE.Points(g, this.airMat); this.air.frustumCulled = false; scene.add(this.air);
    }
    // ---- pressure impact field on car 0: molecules fly straight at the body and flash on impact. Outer surface: dense,
    // warm; the floor facing the road (the sealed gap): sparse, cool, slow. The cut hides those on the removed half.
    {
      const e = model.carMeta.parts.body, pos = new Float32Array(model.carBuf, e.pos, e.vertices * 3), nor = new Float32Array(model.carBuf, e.nor, e.vertices * 3);
      const R = rng(23), NO = 12000, NG = 900, N = NO + NG;
      const tg = new Float32Array(N * 3), nm = new Float32Array(N * 3), sd = new Float32Array(N), cls = new Float32Array(N);
      const outer = [], floorI = [];
      for (let i = 0; i < e.vertices; i++) { const nz = nor[i * 3 + 2], z = pos[i * 3 + 2]; (nz < -0.75 && z < 0.3 ? floorI : outer).push(i); }
      for (let k = 0; k < N; k++) {
        const g = k >= NO, list = g ? floorI : outer, i = list[Math.floor(R() * list.length)];
        tg.set([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], k * 3); nm.set([nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]], k * 3); sd[k] = R(); cls[k] = g ? 1 : 0;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(tg, 3)); g.setAttribute('nrm', new THREE.BufferAttribute(nm, 3));
      g.setAttribute('sd', new THREE.BufferAttribute(sd, 1)); g.setAttribute('cls', new THREE.BufferAttribute(cls, 1));
      this.hitMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOuter: { value: 0 }, uGap: { value: 0 }, uScale: { value: H * 0.9 }, uCutY: { value: -1e6 } },
        vertexShader: `attribute vec3 nrm; attribute float sd; attribute float cls; uniform float uTime, uOuter, uGap, uScale, uCutY; varying vec3 vC; varying float vA;
          void main() {
            float rate = cls > 0.5 ? 0.55 : 1.6, ph = fract(uTime * rate + sd * 7.3), dist = cls > 0.5 ? 0.06 : 2.4;
            float fly = clamp(ph / 0.82, 0.0, 1.0), hit = smoothstep(0.82, 0.86, ph) * (1.0 - smoothstep(0.86, 1.0, ph));
            vec3 p = position + normalize(nrm) * dist * (1.0 - fly) + normalize(nrm) * 0.03;
            vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
            float k = cls > 0.5 ? uGap : uOuter;
            gl_PointSize = min(30.0, (0.035 + 0.16 * hit) * uScale / -mv.z);
            vC = cls > 0.5 ? vec3(0.35, 0.72, 1.0) : mix(vec3(0.75, 0.88, 1.0), vec3(1.0, 0.55, 0.2), hit);
            vA = k * (cls > 0.5 ? 0.9 : (0.35 + 1.3 * hit)) * smoothstep(0.0, 0.12, ph) * step(uCutY, position.y);
          }`,
        fragmentShader: `varying vec3 vC; varying float vA; void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0 || vA < 0.003) discard; gl_FragColor = vec4(vC * 1.6, vA * (1.0 - r)); }` });
      this.hits = new THREE.Points(g, this.hitMat); this.hits.frustumCulled = false; this.hits.matrixAutoUpdate = false; scene.add(this.hits);
    }
    // ---- jets: per car, seven comoving schematic plumes (NOSE, FL, FR, RL, RR, SL, SR); positions/length schematic
    this.jetSets = [0, 1].map((s) => {
      const per = 1900, NZ = 7, N = per * NZ, R = rng(11 + s);
      const nz = new Float32Array(N), rnd = new Float32Array(N), off = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) { nz[i] = Math.floor(i / per); rnd[i] = R(); const a = R() * Math.PI * 2, rr = Math.sqrt(R()); off[i * 2] = Math.cos(a) * rr; off[i * 2 + 1] = Math.sin(a) * rr; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      g.setAttribute('nz', new THREE.BufferAttribute(nz, 1)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1)); g.setAttribute('off', new THREE.BufferAttribute(off, 2));
      const mat = new THREE.ShaderMaterial({ vertexShader: JET_VS, fragmentShader: JET_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uP: { value: Array.from({ length: 7 }, () => new THREE.Vector3()) }, uD: { value: Array.from({ length: 7 }, () => new THREE.Vector3(0, 0, -1)) },
          uL: { value: [0, 0, 0, 0, 0, 0, 0] }, uCol: { value: Array.from({ length: 7 }, () => new THREE.Color()) }, uTime: { value: 0 }, uLen: { value: 3.2 }, uSpread: { value: 0.22 },
          uSize: { value: 0.16 }, uScale: { value: H * 0.9 } } });
      const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
      return { pts, mat };
    });
    // ---- cloud sprites (a pool; the shot fills it)
    { const tex = puffTexture(); this.puffPool = Array.from({ length: 90 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x9aa6b6, transparent: true, depthWrite: false, opacity: 0, fog: true })); sp.visible = false; scene.add(sp); return sp; }); }
    // ---- the section plane (car-local XZ at y = 0), two passes; follows car 0
    {
      const { tex, floorZ } = sectionMask(model.carMeta, model.carBuf, 0.0);
      this.floorZ = floorZ;
      const plane = new THREE.PlaneGeometry(10.4, 6.4, 1, 1); plane.rotateX(Math.PI / 2); plane.translate(0, 0, 1.0);   // x ∈ [−5.2, 5.2], z ∈ [−2.2, 4.2]
      const mk = (pass) => new THREE.ShaderMaterial({ vertexShader: SLICE_VS, fragmentShader: SLICE_FS, side: THREE.DoubleSide, clipping: false,
        transparent: pass === 1, depthWrite: pass === 0, blending: pass === 1 ? THREE.NormalBlending : THREE.NoBlending, toneMapped: false,
        uniforms: { uMask: { value: tex }, uBox: { value: new THREE.Vector4(SEC.X0, SEC.X1, SEC.Z0, SEC.Z1) }, uTime: { value: 0 }, uDiff: { value: 1 }, uAlpha: { value: 1 },
          uLip: { value: 1e3 }, uDeck: { value: 1 }, uDeckT: { value: model.sceneMeta.ramp.T }, uFan: { value: 0 }, uSeal: { value: 0 }, uPass: { value: pass },
          uFront: { value: 5.2 }, uLaser: { value: 0 }, uSealX: { value: new THREE.Vector2(...[...model.carMeta.floor_span].reverse()) } } });
      this.sliceCap = new THREE.Mesh(plane, mk(0)); this.sliceAir = new THREE.Mesh(plane, mk(1));
      for (const m of [this.sliceCap, this.sliceAir]) { m.matrixAutoUpdate = false; m.frustumCulled = false; m.visible = false; scene.add(m); }
      this.sliceAir.renderOrder = 5;
    }
    // ---- overlays: arrows, spheres, dashed lines, arcs (glowing, unlit, drawn over everything)
    this.arrows = []; this.spheres = []; this.dashes = []; this.arcs = []; this.rings = [];
    this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType }));
    this.composer.addPass(new RenderPass(scene, cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.42, 1.55);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  _glowMat() { return new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false, depthWrite: false, depthTest: false }); }
  arrow(i) {
    if (!this.arrows[i]) {
      const mat = this._glowMat(), shaft = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), mat), head = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24), mat);
      shaft.renderOrder = head.renderOrder = 10; const g = new THREE.Group(); g.add(shaft, head); this.scene.add(g);
      this.arrows[i] = { g, shaft, head };
    }
    return this.arrows[i];
  }
  _pool(list, i, make) { if (!list[i]) { list[i] = make(); this.scene.add(list[i]); } return list[i]; }

  _poseCar(car, M, wheelAng) {
    car.g.visible = !!M; if (!M) return;
    car.g.matrix.copy(M); car.g.matrixWorldNeedsUpdate = true;
    for (const w of car.wheels) {
      const T = new THREE.Matrix4().makeTranslation(...w.wp.centre), S = new THREE.Matrix4().makeScale(1, w.wp.side < 0 ? -1 : 1, 1);
      w.fixed.matrix.multiplyMatrices(T, S); w.spin.matrix.multiplyMatrices(T, S).multiply(new THREE.Matrix4().makeRotationY(wheelAng ?? 0));
    }
  }
  _jets(set, M, J) {
    set.pts.visible = !!(J && M); if (!set.pts.visible) return;
    const u = set.mat.uniforms, R3 = new THREE.Matrix3().setFromMatrix4(M);
    ['NOSE', 'FL', 'FR', 'RL', 'RR', 'SL', 'SR'].forEach((n, k) => {
      const nzz = this.model.carMeta.nozzles[n];
      u.uP.value[k].set(...nzz.pos).applyMatrix4(M);
      u.uD.value[k].set(...((J.dirs && J.dirs[n]) || nzz.dir)).applyMatrix3(R3).normalize();
      u.uL.value[k] = Math.sqrt(Math.max(0, (J.levels || {})[n] || 0)) * (J.gain ?? 1) * (n === 'NOSE' ? (J.nose ?? 0.6) : 1);
      u.uCol.value[k].set((J.colors && J.colors[n]) || 0xbdeefa).multiplyScalar(0.5);   // per-nozzle colour (left/right coding)
    });
    u.uTime.value = J.time; u.uLen.value = J.len ?? 3.2; u.uSize.value = J.size ?? 0.16;
  }

  // st: { world: 'ramp'|'lot'|'lab', carM, wheelAng, car2M, wheelAng2, cam: {pos, target, fov, roll}, exposure, bloom, fog, hemi,
  //   rig: [{pos, aim, color, cd, angle, range, beam}] ×≤4, beams, lip, lineGlow, air: {alpha, time, centre},
  //   impacts: {outer, gap, time}, jets/jets2: {levels, dirs, time, gain, len, nose}, puffs: [{c, r, a, color}],
  //   cut: {on, x (sweep front, car-local), diff, fan, seal, lip (car-local), deck, alpha, time},
  //   arrows: [{a, b, width, color, k, alpha, glow}], spheres, dashes, arcs }
  set(st) {
    const v = st.world || 'ramp';
    this.rampGroup.visible = v === 'ramp'; this.lotGroup.visible = v === 'lot'; this.labGroup.visible = v === 'lab'; this.floor.visible = v !== 'lab';
    this.floor.material.color.set(v === 'lot' ? 0x111215 : 0x0c0e13); this.floor.material.roughness = v === 'lot' ? 0.85 : 0.5; this.floor.material.envMapIntensity = v === 'lot' ? 0.12 : 1.0;
    this.scene.background.set(v === 'lot' ? 0x05070b : v === 'lab' ? 0x020306 : 0x04060a);
    this.scene.fog.color.set(v === 'lab' ? 0x020306 : 0x05070c);
    this.scene.environmentIntensity = st.env ?? (v === 'lot' ? 0.14 : 0.22);
    if (this.lampMat) this.lampMat.color.set(0xe8f0ff).multiplyScalar(0.95 * (st.lampK ?? 1));
    if (this.lampRed) this.lampRed.color.set(0xff1e2a).multiplyScalar(4.0 * (st.redK ?? 1));
    this._poseCar(this.cars[0], st.carM, st.wheelAng);
    this._poseCar(this.cars[1], st.car2M || null, st.wheelAng2);
    const c = this.camera;
    c.position.set(...st.cam.pos); c.fov = st.cam.fov; c.updateProjectionMatrix(); c.up.set(0, 0, 1); c.lookAt(...st.cam.target);
    if (st.cam.roll) c.rotateZ(st.cam.roll);
    c.updateMatrixWorld();
    this.renderer.toneMappingExposure = st.exposure ?? 1.0;
    this.bloom.strength = st.bloom ?? 0.5;
    this.scene.fog.density = st.fog ?? 0.012;
    this.hemi.intensity = st.hemi ?? 0.25;
    this.gridMat.uniforms.uK.value = st.grid ?? 1;
    this.cableMat.emissiveIntensity = st.lineGlow ?? 0.6;
    this.cableMat.emissive.set((st.lineGlow ?? 0) > 1 ? 0x7fd8ff : 0x3a4250);
    const rig = st.rig || [];
    this.spots.forEach((l, k) => {
      const R = rig[k];
      if (!R) { l.intensity = 0; return; }
      l.position.set(...R.pos); l.target.position.set(...R.aim); l.target.updateMatrixWorld();
      l.color.set(R.color ?? 0xdfe8ff); l.intensity = R.cd; l.angle = (R.angle ?? 20) * Math.PI / 180; l.distance = R.range ?? 160; l.penumbra = R.pen ?? 0.55;
    });
    this.beams.forEach((m, k) => {
      const l = this.spots[k], R = rig[k];
      m.visible = !!R && l.intensity > 1 && (R.beam ?? 1) > 0 && (st.beams ?? 1) > 0;
      if (!m.visible) return;
      const len = 30, rad = Math.tan(l.angle) * len; m.scale.set(rad, rad, 1);
      m.position.copy(l.position); m.lookAt(l.target.position);
      m.material.uniforms.uColor.value.set(R.color ?? 0xdfe8ff); m.material.uniforms.uK.value = 0.09 * (st.beams ?? 1) * (R.beam ?? 1) * Math.min(1.5, l.intensity / 1800);
    });
    this.lipBar.visible = v === 'ramp' && (st.lip ?? 0) > 0.001;
    if (this.lipBar.visible) this.lipBar.material.color.setRGB(1, 1, 1).multiplyScalar(4 * st.lip);
    // air
    const air = st.air || {};
    this.airMat.uniforms.uAlpha.value = air.alpha ?? 0; this.air.visible = (air.alpha ?? 0) > 0.001;
    this.airMat.uniforms.uTime.value = air.time ?? 0;
    if (air.centre) this.airMat.uniforms.uMin.value.set(air.centre[0] - 20, air.centre[1] - 18, air.centre[2] - 15);
    if (air.color) this.airMat.uniforms.uColor.value.set(air.color); else this.airMat.uniforms.uColor.value.set(0x9fd2ff);
    // the cut (section) — planes from car 0's frame
    const cut = st.cut;
    const M = st.carM;
    if (cut && cut.on && M) {
      const R3 = new THREE.Matrix3().setFromMatrix4(M), O = new THREE.Vector3().setFromMatrixPosition(M);
      const ny = new THREE.Vector3(0, 1, 0).applyMatrix3(R3).normalize(), nx = new THREE.Vector3(1, 0, 0).applyMatrix3(R3).normalize();
      // removed = car-local y < 0 (the half nearer a camera on the −y side) AND x < the sweep front (the laser runs tail → nose)
      this.clipY.setFromNormalAndCoplanarPoint(ny, O);
      const front = new THREE.Vector3(cut.x ?? 5.2, 0, 0).applyMatrix4(M);
      this.clipX.setFromNormalAndCoplanarPoint(nx, front);
      for (const m of [this.sliceCap, this.sliceAir]) {
        m.visible = true; m.matrix.copy(M); m.matrixWorldNeedsUpdate = true;
        const u = m.material.uniforms;
        u.uTime.value = cut.time ?? 0; u.uDiff.value = cut.diff ?? 1; u.uAlpha.value = cut.alpha ?? 1; u.uLip.value = cut.lip ?? 1e3; u.uDeck.value = cut.deck ?? 1;
        u.uFan.value = cut.fan ?? 0; u.uSeal.value = cut.seal ?? 0; u.uFront.value = cut.x ?? 5.2; u.uLaser.value = cut.laser ?? 0;
      }
      this.hitMat.uniforms.uCutY.value = 0.0;
    } else {
      this.clipY.set(new THREE.Vector3(0, 1, 0), 1e6); this.clipX.set(new THREE.Vector3(1, 0, 0), 1e6);
      this.sliceCap.visible = this.sliceAir.visible = false; this.hitMat.uniforms.uCutY.value = -1e6;
    }
    // pressure impacts (car-local field, drawn with car 0's matrix)
    const im = st.impacts;
    this.hits.visible = !!im && !!M && (im.outer > 0.001 || im.gap > 0.001);
    if (this.hits.visible) { this.hits.matrix.copy(M); this.hits.matrixWorldNeedsUpdate = true; this.hitMat.uniforms.uTime.value = im.time; this.hitMat.uniforms.uOuter.value = im.outer; this.hitMat.uniforms.uGap.value = im.gap; }
    this._jets(this.jetSets[0], M, st.jets);
    this._jets(this.jetSets[1], st.car2M, st.jets2);
    // cloud
    const PF = st.puffs || [];
    this.puffPool.forEach((sp, i) => {
      const p = PF[i]; sp.visible = !!p && p.a > 0.002; if (!sp.visible) return;
      sp.position.set(...p.c); sp.scale.set(2.2 * p.r, 2.2 * p.r, 1); sp.material.opacity = p.a; sp.material.color.set(p.color ?? 0x9aa6b6);
    });
    // overlays
    const A = st.arrows || [];
    this.arrows.forEach((a) => { a.g.visible = false; });
    A.forEach((spec, i) => {
      const a = this.arrow(i), from = new THREE.Vector3(...spec.a), to = new THREE.Vector3(...spec.b);
      const dir = to.clone().sub(from), L0 = dir.length() * (spec.k ?? 1); if (L0 < 1e-3) return;
      dir.normalize();
      const headL = Math.min(L0 * 0.45, spec.width * 3.2), shaftL = Math.max(0.001, L0 - headL);
      a.g.visible = true; a.g.position.copy(from); a.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      a.shaft.scale.set(spec.width * 0.5, shaftL, spec.width * 0.5); a.shaft.position.set(0, shaftL / 2, 0);
      a.head.scale.set(spec.width * 1.25, headL, spec.width * 1.25); a.head.position.set(0, shaftL + headL / 2, 0);
      a.shaft.material.color.set(spec.color).multiplyScalar(spec.glow ?? 2.2); a.shaft.material.opacity = spec.alpha ?? 1;
    });
    const SP = st.spheres || [];
    this.spheres.forEach((m) => { m.visible = false; });
    SP.forEach((q, i) => { const m = this._pool(this.spheres, i, () => { const mm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), this._glowMat()); mm.renderOrder = 11; return mm; });
      m.visible = true; m.position.set(...q.p); m.scale.setScalar(q.r); m.material.color.set(q.color ?? 0xffffff).multiplyScalar(q.glow ?? 2.0); m.material.opacity = q.alpha ?? 1; });
    const DS = st.dashes || [];
    this.dashes.forEach((m) => { m.visible = false; });
    let di = 0;
    for (const d of DS) {   // a dashed line: short cylinders along a → b, optionally scrolling
      const A0 = new THREE.Vector3(...d.a), B0 = new THREE.Vector3(...d.b), dir = B0.clone().sub(A0), L0 = dir.length(), per = d.period ?? 0.5, n = Math.max(1, Math.floor(L0 / per));
      dir.normalize(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const seg = L0 / n, len = seg * (d.duty ?? 0.55), sh = ((d.scroll ?? 0) % 1 + 1) % 1;
      for (let k = 0; k < n; k++) {
        const m = this._pool(this.dashes, di++, () => { const mm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), this._glowMat()); mm.renderOrder = 10; return mm; });
        const s0 = seg * (k + sh); const s1 = Math.min(L0, s0 + len); if (s1 <= s0) { m.visible = false; continue; }
        m.visible = true; m.quaternion.copy(q); m.scale.set(d.width * 0.5, s1 - s0, d.width * 0.5);
        m.position.copy(A0).addScaledVector(dir, (s0 + s1) / 2);
        m.material.color.set(d.color ?? 0xffffff).multiplyScalar(d.glow ?? 1.8); m.material.opacity = d.alpha ?? 1;
      }
    }
    // shock rings: a flat glowing annulus (centre, normal, radius); thickness grows with the radius
    const RG = st.rings || [];
    this.rings.forEach((m) => { m.visible = false; });
    RG.forEach((q, i) => {
      const m = this._pool(this.rings, i, () => { const mm = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); mm.renderOrder = 9; return mm; });
      if (!(q.alpha > 0.003) || q.r <= 0) return;
      m.visible = true; m.position.set(...q.c); m.scale.setScalar(q.r);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...(q.normal || [0, 0, 1])).normalize());
      m.material.color.set(q.color ?? 0xbdeefa).multiplyScalar(q.glow ?? 1.4); m.material.opacity = q.alpha;
    });
    const AR = st.arcs || [];
    this.arcs.forEach((m) => { m.visible = false; });
    AR.forEach((q, i) => {
      const g = this._pool(this.arcs, i, () => { const mat = this._glowMat(); const gg = new THREE.Group(); const tube = new THREE.Mesh(new THREE.BufferGeometry(), mat); const head = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20), mat); tube.renderOrder = head.renderOrder = 10; gg.add(tube, head); gg.tube = tube; gg.head = head; gg.key = ''; return gg; });
      const span = q.a1 - q.a0; if (Math.abs(span) < 1e-3) return;
      const key = `${q.r.toFixed(3)}|${q.width.toFixed(3)}|${Math.abs(span).toFixed(3)}`;
      if (g.key !== key) { g.tube.geometry.dispose(); g.tube.geometry = new THREE.TorusGeometry(q.r, q.width * 0.5, 8, 72, Math.abs(span)); g.key = key; }
      g.tube.rotation.set(0, 0, span > 0 ? q.a0 : q.a0 + span);
      const ae = q.a1, tip = new THREE.Vector3(Math.cos(ae) * q.r, Math.sin(ae) * q.r, 0), tan = new THREE.Vector3(-Math.sin(ae), Math.cos(ae), 0).multiplyScalar(Math.sign(span));
      g.head.visible = q.head !== false;
      g.head.position.copy(tip); g.head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan); g.head.scale.set(q.width * 1.6, q.width * 3.6, q.width * 1.6);
      g.position.set(...q.c);
      // orient: local z → axis; local x → q.ref (projected ⟂ axis) so a0/a1 are measured from a known direction
      const zA = new THREE.Vector3(...q.axis).normalize(), xA = new THREE.Vector3(...(q.ref || [1, 0, 0])); xA.addScaledVector(zA, -xA.dot(zA)).normalize();
      const yA = new THREE.Vector3().crossVectors(zA, xA);
      g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
      g.tube.material.color.set(q.color ?? 0xffffff).multiplyScalar(q.glow ?? 2.0); g.tube.material.opacity = q.alpha ?? 1; g.visible = true;
    });
  }

  render() { this.composer.render(); return this.canvas; }
  // world point → canvas pixel (x, y, visible-in-front)
  project(p) { const v = new THREE.Vector3(...p).project(this.camera); return [(v.x + 1) / 2 * this.W, (1 - v.y) / 2 * this.H, v.z < 1]; }

  // pose helpers
  rampM(ev) { return this.poses.matrix(ev); }
  kickM(s) { return this.flight.matrix(s); }
  apply(M, p) { return new THREE.Vector3(...p).applyMatrix4(M).toArray(); }
  dir(M, d) { return new THREE.Vector3(...d).applyMatrix3(new THREE.Matrix3().setFromMatrix4(M)).normalize().toArray(); }
  com(M) { return this.apply(M, this.model.carMeta.com); }
}
