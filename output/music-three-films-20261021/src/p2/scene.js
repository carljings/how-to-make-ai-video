// A · P2 · 鼓槌砸下来之前，谁会先跳？ — macro “high-speed photography” of a drum skin, rice grains and a felt mallet.
// Opus 5.5, full film. Film time = source time of the original BGM (one passage 0–28.582 s, the last bar decays).
// The mallet strikes on the measured beat grid and how hard it strikes follows the measured sub-bass of that beat
// (src/music-map.json). Grains only REACT (they leave the skin after the hit); Clawd ANTICIPATES (it leaves before).
// The picture holds one beat at the first hit (3.056 s) and runs in slow motion at the climax; the music never stops.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeClawd } from '../common/clawd.js';
import { loadCues, makeSubs } from '../common/subs.js';

const film = window.film = { ready: false, duration: 28.6 };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });
const MAP = await (await fetch('../music-map.json')).json();

const W = 1080, H = 1920;
const BEAT = MAP.tempo.beat_s;
const T_BASS = 3.056, T_UNFREEZE = 3.588, T_WHY = 5.184, T_EXPO = 9.438, T_LOOP2 = 11.565, T_CLOSE = 13.692, T_DRAG1 = 15.819,
  T_DRAG1B = 17.946, T_DROP = 20.073, T_SLOW = 20.2, T_WIDE = 21.137, T_OUT = 24.328, T_LAST = 26.455, T_END = 28.582;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const ease = (u) => u * u * (3 - 2 * u);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(23);

// picture time: hold one beat at the first hit (a cut hides the jump back), slow motion at the climax (ends on a cut)
function vt(t) {
  if (t >= T_BASS && t < T_UNFREEZE) return T_BASS;
  if (t >= T_SLOW && t < T_WIDE) return T_SLOW + (t - T_SLOW) * 0.3;
  return t;
}

// ---- the beat: hits on the measured grid, strength from the measured sub-bass of each beat --------------------------
const sOf = (db) => clamp(1 + (db + 6) * 0.11, 0.5, 1.12);
const HITS = [];
MAP.beats.forEach((b, i) => {
  if (b < T_BASS - 0.01 || b > T_LAST + 0.01) return;
  if (b >= T_DRAG1B - 0.01 && b < T_DROP - 0.01) return;                  // wind-up bar: the mallet stays up
  let s = sOf(MAP.beat_sub_db[i]), kind = 'groove';
  if (b >= T_DRAG1 - 0.01 && b < T_DRAG1B - 0.01) { s = 0.3; kind = 'light'; } // thinned bar: light taps
  if (Math.abs(b - T_DROP) < 0.01) { s = 3.0; kind = 'drop'; }
  HITS.push({ t: b, s, kind });
});
const IMPACT = new THREE.Vector3(3.4, 0, -2.6);
const AX = new THREE.Vector3(IMPACT.x, 0, IMPACT.z).normalize(), PERP = new THREE.Vector3(-AX.z, 0, AX.x);

// ---- Clawd's hops: always BEFORE the hit; crab-hops round a ring, one slot per beat, 16 slots = one 8.5 s loop ---------
const RR = 1.4, C0 = { x: 0, z: -1.4 }, PHI0 = Math.PI / 2;
const slotXZ = (s) => { const a = PHI0 + 2 * Math.PI * s / 16; return [C0.x + RR * Math.cos(a), C0.z + RR * Math.sin(a)]; };
const HOPS = [];
{
  let slot = 0;
  for (const h of HITS) {
    if (h.kind === 'light') continue;
    const first = HOPS.length === 0, last = Math.abs(h.t - T_LAST) < 0.01;
    const lead = h.kind === 'drop' ? 0.2 : first ? 0.18 : 0.14;
    const T = h.kind === 'drop' ? 1.25 : first ? 0.48 : last ? 0.62 : 0.42;
    const hmax = h.kind === 'drop' ? 1.9 : first ? 0.8 : last ? 0.95 : 0.3 + 0.38 * h.s;
    const t0 = h.t - lead, prev = HOPS[HOPS.length - 1];
    if (prev && prev.t0 + prev.T > t0 - 0.04) continue;                     // still in the air: skip this beat
    HOPS.push({ t0, T, hmax, from: slot, to: last ? -1 : slot + 1, kind: h.kind, hit: h.t, last });
    if (!last) slot++;
  }
}
const posOf = (s) => (s === -1 ? [0, 0] : slotXZ(s));
function clawdState(tv) {
  const st = { x: 0, z: 0, y: 0, sq: 0, arms: 0, pitch: -0.1, eyes: 'open', hop: null, k: 0 };
  let cur = 0, hop = null, next = null, landed = -1e9;
  for (const h of HOPS) {
    if (tv >= h.t0 + h.T) { cur = h.to; landed = h.t0 + h.T; continue; }
    if (tv >= h.t0) { hop = h; break; }
    next = h; break;
  }
  if (hop) {
    const k = (tv - hop.t0) / hop.T, e = ease(k);
    if (hop.to === -1) { const [ax, az] = posOf(hop.from); st.x = lerp(ax, 0, e); st.z = lerp(az, 0, e); }
    else { const a = PHI0 + 2 * Math.PI * (hop.from + e) / 16; st.x = C0.x + RR * Math.cos(a); st.z = C0.z + RR * Math.sin(a); }
    st.y = 4 * hop.hmax * k * (1 - k); st.k = k; st.hop = hop;
    st.arms = hop.kind === 'drop' ? 2 * Math.sin(Math.PI * Math.min(1, k * 1.6)) : 1.3 * Math.sin(Math.PI * k);
    st.pitch = -0.06; st.sq = -0.05;
    if (hop.kind === 'drop') { st.eyes = k > 0.12 && k < 0.85 ? 'happy' : 'wide'; st.pitch = -0.18; }
  } else {
    [st.x, st.z] = posOf(cur);
    if (next && next.t0 - tv < 0.08) st.sq = 0.16 * (1 - (next.t0 - tv) / 0.08);       // crouch just before take-off
    if (tv - landed < 0.07) st.sq = Math.max(st.sq, 0.12 * (1 - (tv - landed) / 0.07)); // landing squash
  }
  if (tv < HOPS[0].t0) {                                                       // intro: looks up at the mallet, already nodding to the beat
    const q = ((tv - MAP.tempo.phase_s) % BEAT + BEAT) % BEAT;
    st.pitch = -0.24 + 0.09 * Math.exp(-q / 0.12); st.sq = Math.max(st.sq, 0.075 * Math.exp(-q / 0.09));
    if (tv > 1.3 && tv < 1.42) st.eyes = 'closed';                               // one blink
  }
  if (tv >= T_CLOSE && tv < T_DRAG1) st.eyes = 'closed';
  if (tv >= T_DRAG1 && !hop && tv < T_DROP) {                                    // the drag: it waits, crouched, eyes wide
    st.eyes = 'wide'; st.pitch = -0.3;
    st.sq = Math.max(st.sq, 0.09 + 0.1 * smooth(T_DRAG1B - 0.4, T_DRAG1B + 0.6, tv) + 0.06 * smooth(19.55, 19.85, tv));
    if (tv >= T_DRAG1B) st.y += 0.012 * Math.abs(Math.sin(Math.PI * (tv - T_DRAG1B) / (BEAT / 4)));
  }
  if (tv >= T_LAST + 0.62) { st.pitch = -0.32; st.arms = 1.2 + 0.8 * Math.sin((tv - T_LAST) * 6.5); }    // the end: looks up, waves
  return st;
}

// ---- renderer + scene -------------------------------------------------------------------------------------------------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#020203');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.16;
const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 400);

// drum skin: polar grid displaced on the CPU every frame
const R = 26, RINGS = 200, SEGS = 240;
const skinGeo = new THREE.BufferGeometry();
const skinPos = new Float32Array((RINGS + 1) * SEGS * 3), skinUV = new Float32Array((RINGS + 1) * SEGS * 2), skinXZ = new Float32Array((RINGS + 1) * SEGS * 2);
for (let i = 0; i <= RINGS; i++) {
  const r = R * Math.pow(i / RINGS, 1.65);
  for (let j = 0; j < SEGS; j++) {
    const a = (j / SEGS) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, k = i * SEGS + j;
    skinPos[k * 3] = x; skinPos[k * 3 + 2] = z; skinUV[k * 2] = x / (2 * R) + 0.5; skinUV[k * 2 + 1] = z / (2 * R) + 0.5; skinXZ[k * 2] = x; skinXZ[k * 2 + 1] = z;
  }
}
const sidx = [];
for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEGS; j++) {
  const a = i * SEGS + j, b = i * SEGS + (j + 1) % SEGS, c = (i + 1) * SEGS + j, d = (i + 1) * SEGS + (j + 1) % SEGS;
  sidx.push(a, b, c, b, d, c);
}
skinGeo.setAttribute('position', new THREE.BufferAttribute(skinPos, 3));
skinGeo.setAttribute('uv', new THREE.BufferAttribute(skinUV, 2));
skinGeo.setIndex(sidx);
function fiberTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 2048; const g = c.getContext('2d');
  g.fillStyle = '#d9cfbd'; g.fillRect(0, 0, 2048, 2048);
  for (let i = 0; i < 26000; i++) {
    const x = rng() * 2048, y = rng() * 2048, a = rng() * Math.PI, l = 6 + rng() * 26, v = 190 + rng() * 50 | 0;
    g.strokeStyle = `rgba(${v},${v - 8},${v - 22},${0.18 + rng() * 0.25})`; g.lineWidth = 0.6 + rng() * 1.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const fib = fiberTexture();
const skin = new THREE.Mesh(skinGeo, new THREE.MeshStandardMaterial({ map: fib, bumpMap: fib, bumpScale: 0.6, color: '#d9ccb6', roughness: 0.82, metalness: 0 }));
skin.receiveShadow = true; scene.add(skin);
const chrome = new THREE.MeshStandardMaterial({ color: '#d8dde4', metalness: 1, roughness: 0.12 });
const hoop = new THREE.Mesh(new THREE.TorusGeometry(R + 0.4, 0.55, 16, 200), chrome); hoop.rotation.x = Math.PI / 2; hoop.position.y = 0.25; scene.add(hoop);
for (let i = 0; i < 18; i++) {
  const a = (i / 18) * Math.PI * 2, lug = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.2, 12), chrome);
  lug.position.set(Math.cos(a) * (R + 1.2), -0.6, Math.sin(a) * (R + 1.2)); scene.add(lug);
}
const shell = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.9, R + 0.9, 18, 120, 1, true), new THREE.MeshStandardMaterial({ color: '#5b1d14', roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide }));
shell.position.y = -9.1; scene.add(shell);

let ACT = [];   // hits that can still move something at the current picture time (filled once per frame)
function skinH(x, z, tv) {
  let h = 0;
  for (const hit of ACT) {
    const u = tv - hit.t;
    if (u < 0) continue;
    const dx = x - IMPACT.x, dz = z - IMPACT.z, r2 = dx * dx + dz * dz, r = Math.sqrt(r2);
    const D = u < 0.035 ? u / 0.035 : Math.exp(-(u - 0.035) / 0.075);
    h += hit.s * (-0.3 * D * Math.exp(-r2 / 2.2) + 0.07 * Math.exp(-u / 0.22) * Math.exp(-((r - 10 * u) ** 2) / 0.6) * Math.min(1, r / 2));
  }
  return h;
}
function updateSkin(tv) {
  const n = skinXZ.length / 2;
  if (!ACT.length) { for (let k = 0; k < n; k++) skinPos[k * 3 + 1] = 0; }
  else for (let k = 0; k < n; k++) { const x = skinXZ[k * 2], z = skinXZ[k * 2 + 1]; skinPos[k * 3 + 1] = (Math.abs(x - IMPACT.x) < 14 && Math.abs(z - IMPACT.z) < 14) ? skinH(x, z, tv) : 0; }
  skinGeo.attributes.position.needsUpdate = true;
  skinGeo.computeVertexNormals();
}

// rice grains: two levels of detail, chosen per frame by distance to the camera
const NG = 5600;
const grainMat = new THREE.MeshPhysicalMaterial({ color: '#e9e1d2', roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.5 });
const gHiGeo = new THREE.SphereGeometry(1, 12, 8); gHiGeo.scale(0.105, 0.042, 0.045);
const gLoGeo = new THREE.SphereGeometry(1, 7, 4); gLoGeo.scale(0.105, 0.042, 0.045);
const grainsHi = new THREE.InstancedMesh(gHiGeo, grainMat, NG), grainsLo = new THREE.InstancedMesh(gLoGeo, grainMat, NG);
for (const g of [grainsHi, grainsLo]) { g.castShadow = true; g.receiveShadow = true; g.frustumCulled = false; scene.add(g); }
const G = [];
for (let i = 0; i < NG; i++) {
  const r = 0.2 + 10.1 * Math.pow(rng(), 1.3), a = rng() * Math.PI * 2;
  const x = Math.cos(a) * r, z = Math.sin(a) * r, dx = x - IMPACT.x, dz = z - IMPACT.z, dl = Math.hypot(dx, dz) + 1e-6;
  G.push({ x, z, ux: dx / dl, uz: dz / dl, yaw: rng() * Math.PI * 2, tilt: (rng() - 0.5) * 0.3, v: 0.6 + rng() * 0.8, spin: (rng() - 0.5) * 30, ph: rng(), out: 0.25 + rng() * 0.5 });
}
const GRAV = 22;
const DROPHIT = HITS.find((h) => h.kind === 'drop');
function grainState(g, tv) {
  let best = 0, rot = 0, ox = 0, oz = 0;
  const r = Math.hypot(g.x - IMPACT.x, g.z - IMPACT.z);
  for (const hit of ACT) {
    const delay = 0.025 + r / 30, u = tv - hit.t - delay;
    if (u <= 0) continue;
    const v0 = hit.s * 3.6 * g.v * Math.exp(-r / (hit.s > 1 ? 5.2 : 3.2));
    const y = v0 * u - 0.5 * GRAV * u * u;
    if (y > best) { best = y; rot = u * g.spin * Math.min(1, v0 / 3); }
  }
  // the big hit throws grains outwards for good (their resting place changes after the drop)
  const ud = tv - DROPHIT.t - 0.025 - r / 30;
  if (ud > 0) {
    const v0 = DROPHIT.s * 3.6 * g.v * Math.exp(-r / 5.2), land = 2 * v0 / GRAV, d = g.out * v0 * 0.3 * Math.min(ud, land);
    ox = g.ux * d; oz = g.uz * d;
  }
  return [best, rot, ox, oz];
}
const MG = new THREE.Matrix4(), QG = new THREE.Quaternion(), EG = new THREE.Euler(), VG = new THREE.Vector3(), SG = new THREE.Vector3(1, 1, 1);
function updateGrains(tv) {
  let nh = 0, nl = 0;
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (let i = 0; i < NG; i++) {
    const g = G[i];
    let [lift, rot, ox, oz] = grainState(g, tv);
    if (tv < T_BASS) {                                                          // thin intro: a small pop on every 8th note near Clawd
      const q = ((tv - MAP.tempo.phase_s) % (BEAT / 2) + BEAT / 2) % (BEAT / 2);
      lift += (0.01 + 0.032 * g.v * Math.max(0, 1 - Math.hypot(g.x, g.z) / 4)) * Math.exp(-q / 0.07);
    }
    if (tv >= T_DRAG1B && tv < T_DROP) lift += 0.024 * Math.abs(Math.sin(Math.PI * (tv / (BEAT / 4) + g.ph)) ** 3); // 16th-note shiver
    EG.set(g.tilt + rot * 0.6, g.yaw + rot, rot * 0.3); QG.setFromEuler(EG);
    const x = g.x + ox, z = g.z + oz;
    VG.set(x, skinH(x, z, tv) + 0.041 + lift, z);
    MG.compose(VG, QG, SG);
    const d2 = (x - cx) ** 2 + (VG.y - cy) ** 2 + (z - cz) ** 2;
    if (d2 < 9) grainsHi.setMatrixAt(nh++, MG); else grainsLo.setMatrixAt(nl++, MG);
  }
  grainsHi.count = nh; grainsLo.count = nl;
  grainsHi.instanceMatrix.needsUpdate = grainsLo.instanceMatrix.needsUpdate = true;
}

// Clawd (rounded voxels, ~1.2 × 0.8 units): one rig per eye state
const U = 0.1;
function buildClawd(eyes, opts = {}) {
  const g = makeClawd(THREE, { unit: U, depth: 4, rounded: RoundedBoxGeometry, radius: 0.16, roughness: 0.48, pose: { eyes }, ...opts });
  g.children.forEach((m) => { m.userData.y0 = m.position.y; m.castShadow = true; });
  return g;
}
const RIGS = { open: buildClawd('open'), closed: buildClawd('closed'), wide: buildClawd('wide'), happy: buildClawd('happy') };
Object.values(RIGS).forEach((g) => scene.add(g));
function poseRig(g, st, tv, yaw) {
  g.position.set(st.x, skinH(st.x, st.z, tv) + st.y, st.z);
  g.rotation.set(st.pitch, yaw, 0, 'YXZ');
  g.scale.set(1 + st.sq * 0.5, 1 - st.sq, 1 + st.sq * 0.5);
  g.children.forEach((m) => { if (m.userData.part === 'arm') m.position.y = m.userData.y0 + st.arms * U; });
}

// long-exposure light trails of Clawd's hops: loop 1 (amber) and loop 2 (cyan), revealed as time passes
function trailTube(ta, tb, color, radius) {
  const pts = [], times = [];
  ACT = [];
  for (let t = ta; t <= tb + 1e-6; t += 1 / 90) { const s = clawdState(t); pts.push(new THREE.Vector3(s.x, s.y + 0.92, s.z)); times.push(t); }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2), pts.length - 1, radius, 6, false);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  mesh.frustumCulled = false; mesh.renderOrder = 5; scene.add(mesh);
  return { mesh, times, segs: pts.length - 1 };
}
const trailA = trailTube(T_BASS - 0.2, T_LOOP2, new THREE.Color(1.7, 0.85, 0.28), 0.03);
const trailB = trailTube(T_LOOP2, T_DRAG1 - 0.05, new THREE.Color(0.45, 1.3, 1.8), 0.042);
function revealTrail(tr, tv, alpha) {
  let n = 0; while (n < tr.times.length - 1 && tr.times[n + 1] <= tv) n++;
  tr.mesh.geometry.setDrawRange(0, n * 6 * 6);
  tr.mesh.material.opacity = alpha; tr.mesh.visible = alpha > 0.01 && n > 0;
}

// mallet: felt head + wooden shaft
const mallet = new THREE.Group();
const headR = 1.55;
const felt = new THREE.MeshPhysicalMaterial({ color: '#e9dfcf', roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: '#ffffff', bumpMap: fib, bumpScale: 1.5 });
const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 56, 36), felt); head.scale.set(1, 0.92, 1); head.castShadow = true;
const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.5, 28), chrome); ferrule.position.y = headR * 0.92 + 0.15;
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 30, 20), new THREE.MeshStandardMaterial({ color: '#8b5a33', roughness: 0.45 }));
shaft.position.y = headR * 0.92 + 15.4;
mallet.add(head, ferrule, shaft); mallet.rotation.z = -0.28; scene.add(mallet);
const REST = 2.6;
function malletBase(tv) {                     // where the head's bottom hovers between strikes
  if (tv < 2.3) return 1.9 + 0.1 * Math.sin(tv * 2.3);
  if (tv < T_BASS) return lerp(1.9, REST + 1.0, smooth(2.3, 2.85, tv));
  if (tv < T_DRAG1 - 0.3) return REST;
  if (tv < T_DRAG1B) return lerp(REST, 0.8, smooth(T_DRAG1 - 0.3, T_DRAG1 + 0.15, tv));
  if (tv < T_DROP - 0.25) return lerp(0.8, REST + 1.0, smooth(T_DRAG1B, T_DRAG1B + 1.3, tv)) + 0.02 * Math.sin(tv * 47);
  if (tv < T_LAST + 0.3) return REST;
  return lerp(REST, REST + 16, smooth(T_LAST + 0.3, T_LAST + 1.9, tv));
}
function malletY(tv) {
  let y = malletBase(tv);
  for (const h of HITS) {
    const pre = h.kind === 'drop' ? 0.22 : h.kind === 'light' ? 0.13 : 0.16, u = tv - h.t;
    if (u < -pre || u > 0.42) continue;
    if (u < 0) y = Math.min(y, malletBase(h.t - pre) * Math.pow(-u / pre, 1.7));
    else y = Math.min(y, Math.max(-0.28 * h.s * Math.exp(-u / 0.05) * (u < 0.04 ? 1 : 0.3), malletBase(h.t + 0.42) * (1 - Math.exp(-u / 0.085))));
  }
  return y;
}

// out-of-focus studio lights far behind the drum (they read as big soft bokeh discs through the DOF)
for (const [x, y, z, c, r] of [[-14, 7, -30, '#ffb36b', 1.1], [9, 9, -34, '#7fd6ff', 1.3], [22, 4, -26, '#ffd9a6', 0.9], [-26, 11, -22, '#9fc6ff', 1.0], [2, 14, -40, '#ffcf8a', 1.5], [30, 12, -36, '#ffb36b', 1.2]]) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.55), toneMapped: true }));
  b.position.set(x, y, z); scene.add(b);
}
// floating dust in the light beams
const dustTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t; })();
const ND = 420, dustPos = new Float32Array(ND * 3), DUST = [];
for (let i = 0; i < ND; i++) DUST.push({ x: (rng() - 0.5) * 9, y: 0.2 + rng() * 4.5, z: -4 + rng() * 8, vx: (rng() - 0.5) * 0.06, vy: 0.01 + rng() * 0.03, ph: rng() * 6.28 });
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: dustTex, size: 0.045, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe2b8' }));
dust.frustumCulled = false; scene.add(dust);
function updateDust(t) {
  DUST.forEach((d, i) => { dustPos[i * 3] = d.x + d.vx * t + 0.05 * Math.sin(t * 0.7 + d.ph); dustPos[i * 3 + 1] = d.y + d.vy * t + 0.04 * Math.sin(t * 0.9 + d.ph * 2); dustPos[i * 3 + 2] = d.z + 0.05 * Math.cos(t * 0.6 + d.ph); });
  dustGeo.attributes.position.needsUpdate = true;
}

// lights
const key = new THREE.SpotLight('#ffc78e', 2.6, 0, 0.55, 0.85, 0); key.position.set(-10, 3.6, 3); key.target.position.set(0.3, 0, -0.6);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 2; key.shadow.camera.far = 40; key.shadow.bias = -0.0004; key.shadow.radius = 3;
scene.add(key, key.target);
const rim = new THREE.SpotLight('#86dcff', 3.0, 0, 0.6, 0.7, 0); rim.position.set(7, 5.5, -10); rim.target.position.set(0.2, 0.6, 0); scene.add(rim, rim.target);
const top = new THREE.SpotLight('#fff2df', 0.55, 0, 0.45, 0.9, 0); top.position.set(1, 14, 3); top.target.position.set(1, 0, -1); scene.add(top, top.target);
const hemi = new THREE.HemisphereLight('#3b4458', '#0b0806', 0.25); scene.add(hemi);
const faceFill = new THREE.PointLight('#ffe6cc', 0, 6, 1.5); scene.add(faceFill);

// ---- post: one scene render (MSAA x2 + depth texture) → depth-of-field (half-res gather) → bloom → output ------------
const rtMain = new THREE.WebGLRenderTarget(W, H, { samples: 2, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(W, H) });
const rtBlur = new THREE.WebGLRenderTarget(W / 2, H / 2, { type: THREE.HalfFloatType });
const rtComp = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const DOFU = { tColor: { value: rtMain.texture }, tDepth: { value: rtMain.depthTexture }, tBlur: { value: rtBlur.texture }, near: { value: 0.05 }, far: { value: 400 },
  focus: { value: 5 }, K: { value: 1.4 }, maxPx: { value: 16 }, texel: { value: new THREE.Vector2(1 / W, 1 / H) } };
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const COC = `uniform sampler2D tColor; uniform sampler2D tDepth; uniform float near, far, focus, K, maxPx; uniform vec2 texel; varying vec2 vUv;
  float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
  float coc(float z){ return maxPx * clamp(K * abs(z - focus) / z, 0.0, 1.0); }`;
const blurQuad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: DOFU, vertexShader: VS, fragmentShader: COC + `
  void main(){
    float zc = lin(texture2D(tDepth, vUv).x), cc = coc(zc);
    vec3 acc = texture2D(tColor, vUv).rgb; float ws = 1.0;
    for (int i = 1; i < 36; i++) {
      float fi = float(i); float r = sqrt(fi / 36.0); float a = fi * 2.39996323;
      vec2 o = vec2(cos(a), sin(a)) * r * cc; vec2 uv = vUv + o * texel;
      float zs = lin(texture2D(tDepth, uv).x), cs = coc(zs), d = r * cc;
      float cov = zs < zc ? cs : min(cs, cc);
      float w = clamp(cov - d + 1.0, 0.0, 1.0);
      acc += texture2D(tColor, uv).rgb * w; ws += w;
    }
    gl_FragColor = vec4(acc / ws, 1.0);
  }` }));
const compQuad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: DOFU, vertexShader: VS, fragmentShader: COC + `uniform sampler2D tBlur;
  void main(){
    float cc = coc(lin(texture2D(tDepth, vUv).x));
    vec3 s = texture2D(tColor, vUv).rgb, b = texture2D(tBlur, vUv).rgb;
    gl_FragColor = vec4(mix(s, b, smoothstep(0.7, 2.6, cc)), 1.0);
  }` }));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.24, 0.4, 0.92);
const output = new OutputPass(); output.renderToScreen = true;

// ---- shots (cuts on beats / bar lines) ------------------------------------------------------------------------------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// camera helpers on the Clawd → mallet axis: d = distance behind Clawd (away from the mallet), h = height, s = sideways
const onAxis = (cx, cz, d, h, s = 0) => V(cx - AX.x * d + PERP.x * s, h, cz - AX.z * d + PERP.z * s);
const ahead = (cx, cz, d, h, s = 0) => V(cx + AX.x * d + PERP.x * s, h, cz + AX.z * d + PERP.z * s);
function shotAt(t, cl) {
  if (t < T_BASS) {                            // moves from frame 1: low macro on Clawd's face, pulling back to reveal the mallet over it
    const k = 1 - Math.pow(1 - clamp(t / 2.75, 0, 1), 3), kt = 1 - Math.pow(1 - clamp(t / 2.4, 0, 1), 2);
    return { pos: onAxis(0, 0, lerp(2.5, 4.3, k), lerp(0.36, 0.57, k), lerp(1.05, 0.35, k)), tgt: ahead(0, 0, lerp(0.15, 4.0, kt), lerp(0.62, 1.75, kt), lerp(0.25, 0.1, kt)), fov: 42, K: 1.3, maxPx: 16 };
  }
  if (t < T_UNFREEZE) { const k = smooth(T_BASS, T_UNFREEZE, t); return { pos: onAxis(0, 0, lerp(5.2, 4.8, k), 0.5, lerp(-1.25, -1.1, k)), tgt: ahead(0, 0, 3.4, 1.1, 0.35), fov: 42, K: 1.1, maxPx: 14 }; }
  if (t < T_WHY) { const k = smooth(T_UNFREEZE, T_WHY, t); return { pos: onAxis(cl.x, cl.z, 4.8, lerp(0.75, 0.9, k), -1.1), tgt: ahead(cl.x, cl.z, 2.6, 1.2, 0.2), fov: 44, K: 1.1, maxPx: 15 }; }
  if (t < T_EXPO) { const zt = lerp(cl.z, IMPACT.z, 0.3); return { pos: V(cl.x - 6.0, 1.3, zt + 0.55), tgt: V(cl.x + 3.0, -0.2, zt), fov: 38, K: 0.9, maxPx: 13 }; }
  if (t < T_CLOSE) { const k = smooth(T_EXPO, T_CLOSE, t); const c = V(C0.x, 0, C0.z);
    return { pos: c.clone().add(V(-4.6, lerp(7.6, 7.2, k), 5.3).applyAxisAngle(V(0, 1, 0), lerp(-0.08, 0.06, k))), tgt: c.clone().add(V(0.35, 0.1, -0.2)), fov: 40, K: 0.6, maxPx: 11 }; }
  if (t < T_DRAG1) { const c = V(cl.x, 0, cl.z), o = c.clone().sub(V(C0.x, 0, C0.z)).normalize(); return { pos: c.clone().addScaledVector(o, 5.2).add(V(0, 1.8, 0)), tgt: c.clone().add(V(0, 0.62, 0)).addScaledVector(o, -0.6), fov: 42, K: 0.8, maxPx: 12 }; }
  if (t < T_DROP) { const k = smooth(T_DRAG1, T_DROP, t); return { pos: onAxis(cl.x, cl.z, lerp(5.4, 4.6, k), lerp(1.25, 1.1, k), 0.3), tgt: ahead(cl.x, cl.z, 4.0, lerp(1.05, 1.25, k), 0.1), fov: 52, K: 1.1, maxPx: 15 }; }
  if (t < T_WIDE) { const k = smooth(T_DROP, T_WIDE, t); return { pos: onAxis(cl.x, cl.z, lerp(6.2, 5.4, k), lerp(0.55, 0.75, k), lerp(0.4, -1.3, k)), tgt: ahead(cl.x, cl.z, 3.2, 1.45, lerp(0.1, 0.5, k)), fov: 52, K: 0.9, maxPx: 13 }; }
  if (t < T_OUT) { const k = smooth(T_WIDE, T_OUT, t); return { pos: onAxis(cl.x, cl.z, lerp(6.6, 6.0, k), lerp(2.6, 2.9, k), lerp(-1.6, -1.2, k)), tgt: ahead(cl.x, cl.z, 1.4, 0.55, 0), fov: 42, K: 0.8, maxPx: 12 }; }
  const k = smooth(T_OUT, T_LAST + 1.0, t);
  return { pos: onAxis(0, 0, lerp(6.4, 4.6, k), lerp(3.2, 7.4, k), lerp(-1.2, 0.2, k)), tgt: ahead(0, 0, lerp(1.2, 0.5, k), 0.2, 0), fov: 40, K: 0.55, maxPx: 10 };
}
function shake(t) {                            // a tiny camera kick on each strike (stronger on the drop)
  let a = 0;
  for (const h of HITS) { const u = vt(t) - h.t; if (u >= 0 && u < 0.25) a += (h.kind === 'drop' ? 0.05 : 0.006 * h.s) * Math.exp(-u / 0.06); }
  return V(Math.sin(t * 91) * a, Math.sin(t * 73 + 1) * a, 0);
}

// ---- 2D overlay: callouts, timing chart, measured bass meter, stamps --------------------------------------------------
const labels = document.createElement('div'); labels.className = 'labels'; stage.appendChild(labels);
const flashEl = document.getElementById('flash');
const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
function callout(anchor, lx, ly, html, cls = '', a = 1) {
  const [x, y] = project(anchor);
  return { svg: `<g opacity="${a.toFixed(3)}"><path d="M${lx},${ly} L${x.toFixed(1)},${y.toFixed(1)}" stroke="rgba(255,255,255,.85)" stroke-width="2.5" fill="none"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#fff"/></g>`,
    div: `<div class="lab ${cls}" style="left:${lx + 10}px;top:${ly - 26}px;opacity:${a.toFixed(3)}">${html}</div>` };
}
const mean = (a, b) => { const v = MAP.beats.map((t, i) => [t, MAP.beat_sub_db[i]]).filter(([t]) => t >= a - 0.01 && t < b - 0.01).map(([, d]) => d); return v.reduce((s, x) => s + x, 0) / v.length; };
const METER = [['抽薄前', mean(13.692, T_DRAG1)], ['抽薄时', mean(T_DRAG1, T_DROP)], ['回来后', mean(T_DROP, 22.2)]];
function drawOverlay(t, tv, st) {
  let svg = '', div = '';
  const add = (o) => { svg += o.svg; div += o.div; };
  const top = (x, y, z) => V(x, y, z);
  if (t < 3.0) {
    const out = 1 - smooth(2.3, 2.55, t), a1 = smooth(0.2, 0.45, t) * out, a2 = smooth(0.6, 0.85, t) * out, a3 = smooth(1.35, 1.6, t) * out;
    add(callout(top(st.x, skinH(st.x, st.z, tv) + st.y + 0.62, st.z), 560, 1060, 'Clawd', '', a1));
    add(callout(onAxis(0, 0, 1.25, 0.06, -0.55), 90, 1500, '米粒', 'cool', a2));
    add(callout(top(IMPACT.x - AX.x * 1.2, mallet.position.y - headR * 0.6, IMPACT.z - AX.z * 1.2), 690, 860, '鼓槌', 'warm', a3));
  } else if (t >= T_BASS && t < T_UNFREEZE) {
    add(callout(top(st.x, skinH(st.x, st.z, tv) + st.y + 0.3, st.z), 620, 640, '已经在空中<small>Clawd · 撞击前就起跳</small>', 'warm', smooth(T_BASS, T_BASS + 0.12, t)));
    add(callout(ahead(0, 0, 1.6, 0.06, -0.7), 430, 1360, '还贴在鼓皮上<small>米粒 · 等着被震</small>', 'cool', smooth(T_BASS + 0.08, T_BASS + 0.2, t)));
    add(callout(V(IMPACT.x - AX.x * 0.9, 0.35, IMPACT.z - AX.z * 0.9), 640, 1060, '刚砸到鼓皮', '', smooth(T_BASS + 0.04, T_BASS + 0.16, t)));
    div += `<div class="stamp" style="left:76px;right:auto;top:1236px">高速定格 · 撞击瞬间</div>`;
  } else if (t >= T_WHY && t < T_EXPO) {
    const x0 = 160, x1 = 850, span = 1.6, pxs = (x1 - x0) / span, tl = tv - 1.25;   // window: 1.25 s back, 0.35 s ahead
    const X = (tt) => x0 + (tt - tl) * pxs;
    let ch = '<div class="chart"><div class="row" style="top:14px">拍子 · 细分</div><div class="row" style="top:96px;color:#ffc46b">Clawd 起跳</div><div class="row" style="top:162px;color:#9fe6ff">米粒起跳</div>';
    const first = Math.floor((tl - MAP.tempo.phase_s) / (BEAT / 4));
    for (let q = first; q < first + 20; q++) {
      const tb = MAP.tempo.phase_s + q * BEAT / 4, x = X(tb);
      if (x < 150 || x > 860) continue;
      ch += q % 4 === 0 ? `<div class="tick" style="left:${x.toFixed(1)}px;top:50px;height:166px;opacity:${tb <= tv ? 1 : 0.45}"></div>` : `<div class="small" style="left:${x.toFixed(1)}px;top:54px;height:26px"></div>`;
    }
    for (const h of HOPS) { const x = X(h.t0); if (x > 150 && x < 860 && h.t0 <= tv) ch += `<div class="mk" style="left:${x.toFixed(1)}px;top:104px;background:#ffb648;box-shadow:0 0 12px #ffb648"></div>`; }
    for (const h of HITS) { const tg = h.t + 0.06, x = X(tg); if (x > 150 && x < 860 && tg <= tv) ch += `<div class="mk" style="left:${x.toFixed(1)}px;top:170px;background:#7fd8ff;box-shadow:0 0 12px #7fd8ff"></div>`; }
    { const past = HITS.filter((h) => h.t <= tv && X(h.t) > 160).slice(-2);
      if (past.length === 2) { const xa = X(past[0].t), xb = X(past[1].t); ch += `<div class="br" style="left:${xa.toFixed(1)}px;width:${(xb - xa).toFixed(1)}px;top:40px"></div><div class="brl" style="left:${((xa + xb) / 2).toFixed(1)}px;top:4px">${(past[1].t - past[0].t).toFixed(2)} 秒</div>`; } }
    ch += `<div class="now" style="left:${X(tv).toFixed(1)}px;top:44px;height:176px"></div><div class="row" style="top:190px;left:790px;font-size:21px;color:#bbb">示意</div></div>`;
    div += ch;
  } else if (t >= T_EXPO && t < T_DRAG1) {
    div += `<div class="stamp" style="left:76px;right:auto;top:${t < T_LOOP2 ? 318 : 418}px;opacity:${smooth(T_EXPO, T_EXPO + 0.3, t)}">长曝光 · 橙 = 第1遍 · 蓝 = 第2遍</div>`;
  } else if (t >= T_DRAG1 && t < T_DROP) {
    const a = smooth(T_DRAG1B + 0.1, T_DRAG1B + 0.4, t);
    add(callout(top(st.x, skinH(st.x, st.z, tv) + 0.62, st.z), 610, 1090, '蹲下蓄力<small>Clawd · 知道要来</small>', 'warm', a));
    add(callout(onAxis(st.x, st.z, 1.1, 0.06, -0.5), 90, 1290, '几乎不动<small>米粒 · 只会等被震</small>', 'cool', a));
  } else if (t >= T_SLOW && t < T_WIDE) {
    div += `<div class="stamp" style="left:76px;right:auto;top:1236px">高速摄影 · 慢放 ×0.3</div>`;
  } else if (t >= 21.16 && t < T_OUT) {
    const lo = -14, hi = -4, Hb = 150;
    let m = `<div class="meter" style="opacity:${smooth(21.16, 21.4, t) * (1 - smooth(24.1, 24.3, t))}"><div class="ttl">低音（实测 · 每拍平均）</div>`;
    METER.forEach(([lb, db], i) => {
      const cx = 190 + i * 245, grow = smooth(21.3 + 0.32 * i, 21.6 + 0.32 * i, t), h = Hb * clamp((db - lo) / (hi - lo), 0, 1) * grow;
      const col = i === 1 ? '#5c86a8' : '#ffb648';
      m += `<div class="bar" style="left:${cx}px;height:${h.toFixed(1)}px;background:${col};box-shadow:0 0 18px ${col}"></div>`;
      m += `<div class="val" style="left:${cx}px;bottom:${(66 + h).toFixed(1)}px;opacity:${grow}">${db.toFixed(1)} dB</div><div class="lb" style="left:${cx}px">${lb}</div>`;
    });
    m += `<div class="eq" style="opacity:${smooth(22.5, 22.8, t)}">回来后 ≈ 抽薄前</div></div>`;
    div += m;
  }
  labels.innerHTML = `<svg class="lines" width="${W}" height="${H}">${svg}</svg>${div}`;
  let f = 0;
  if (t >= T_BASS && t < T_BASS + 0.13) f = 0.55 * (1 - (t - T_BASS) / 0.13);
  if (t >= T_DROP && t < T_DROP + 0.2) f = Math.max(f, 0.35 * (1 - (t - T_DROP) / 0.2));
  flashEl.style.opacity = f.toFixed(3);
}

let expoK = 0;
const cues = (await loadCues('./cues.json')).cues;
const subs = makeSubs(stage, cues);

film.render = async (t) => {
  const tv = vt(t);
  ACT = HITS.filter((h) => h.t <= tv + 0.01 && h.t > tv - 1.3);
  const st = clawdState(tv);
  const sh = shotAt(t, st);
  camera.position.copy(sh.pos).add(shake(t)); camera.fov = sh.fov; camera.updateProjectionMatrix(); camera.lookAt(sh.tgt); camera.updateMatrixWorld();
  updateSkin(tv); updateGrains(tv); updateDust(t);
  mallet.position.set(IMPACT.x, malletY(tv) + headR * 0.92, IMPACT.z);
  if (tv < T_BASS) {                            // intro: the mallet ticks side to side like a metronome, extremes on the beats
    const sw = Math.cos(Math.PI * (tv - MAP.tempo.phase_s) / BEAT) * (1 - smooth(2.15, 2.55, tv));
    mallet.position.addScaledVector(PERP, 0.42 * sw); mallet.rotation.z = -0.28 + 0.06 * sw;
  } else mallet.rotation.z = -0.28;
  const yaw = Math.atan2(camera.position.x - st.x, camera.position.z - st.z) - 0.35;
  for (const [name, g] of Object.entries(RIGS)) { g.visible = name === st.eyes; if (g.visible) poseRig(g, st, tv, yaw); }
  // long exposure: the scene dims (as a long exposure set for light trails would) and the trails glow
  const ea = smooth(T_EXPO - 0.05, T_EXPO + 0.35, t) * (1 - smooth(T_DRAG1 - 0.1, T_DRAG1 + 0.5, t));
  expoK = ea * (t >= T_CLOSE ? 0.12 : 1);
  faceFill.intensity = (t >= T_CLOSE && t < T_DRAG1 ? 1.0 : 0) + (t >= T_DRAG1 && t < T_DROP ? 0.6 : 0);
  faceFill.position.copy(camera.position).lerp(V(st.x, 0.6, st.z), t < T_DRAG1 ? 0.3 : 0.55);
  revealTrail(trailA, Math.max(tv, T_BASS), ea * (tv >= T_LOOP2 ? 0.75 : 1)); revealTrail(trailB, tv, ea);
  // light: dimmer and cooler while it waits; a rim flare at the hits that matter
  const dragK = smooth(T_DRAG1, T_DRAG1 + 0.6, tv) * (1 - smooth(T_DROP - 0.05, T_DROP + 0.1, tv));
  key.intensity = lerp(2.6, 1.7, dragK) * (1 - 0.62 * expoK); top.intensity = 0.55 * (1 - 0.7 * expoK); scene.environmentIntensity = 0.16 * (1 - 0.6 * expoK); rim.intensity = lerp(3.0, 3.6, dragK) + (t >= T_BASS && t < T_UNFREEZE ? 1.5 : 0) + 3 * Math.exp(-Math.max(0, tv - T_DROP) / 0.15) * (tv >= T_DROP ? 1 : 0);
  bloom.strength = 0.24 + 0.3 * (tv >= T_DROP ? Math.exp(-(tv - T_DROP) / 0.4) : 0) + 0.25 * expoK;
  // render: scene → DOF → bloom → output
  const focus = camera.position.distanceTo(V(st.x, skinH(st.x, st.z, tv) + st.y + 0.45, st.z));
  DOFU.focus.value = focus; DOFU.K.value = sh.K; DOFU.maxPx.value = sh.maxPx; DOFU.near.value = camera.near; DOFU.far.value = camera.far;
  renderer.setRenderTarget(rtMain); renderer.render(scene, camera);
  renderer.setRenderTarget(rtBlur); blurQuad.render(renderer);
  renderer.setRenderTarget(rtComp); compQuad.render(renderer);
  bloom.render(renderer, null, rtComp, 0, false);
  output.render(renderer, null, rtComp);
  drawOverlay(t, tv, st);
  subs(t);
  await new Promise((r) => requestAnimationFrame(() => r()));
};
await document.fonts.load('700 80px "Noto Sans CJK SC"');
await document.fonts.load('400 30px "Noto Sans CJK SC"');
film.ready = true;
