// B · P3 · 把这首歌卷成一盘，里面藏着3个机关 — the measured original BGM coiled into a paper spiral (Opus 5.5, full film).
// One turn = one measured 4-bar loop (16 beats = 8.508 s), so repeats line up on the same spokes. Wall height = measured
// sub-bass (20–100 Hz, exaggerated); red pins = the fitted beat grid. Clawd walks on the wall top at the playhead
// (film time = source time, 0–37.09 s; the last bar decays). The red line is loop 1's bass shape, lifted and carried
// one turn outward — "what you expect" — so the thinned bass shows as a gap under it.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeClawd } from '../common/clawd.js';
import { loadCues, makeSubs } from '../common/subs.js';

const film = window.film = { ready: false, duration: 37.1 };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });
await document.fonts.load('700 80px "Noto Serif CJK SC"');
await document.fonts.load('700 40px "Noto Sans CJK SC"');
await document.fonts.load('400 40px "Noto Sans CJK SC"');

const MAP = await (await fetch('../music-map.json')).json();
const W = 1080, H = 1920, HOP = MAP.spectrogram.hop_s;
const BEAT = MAP.tempo.beat_s, BEATS = MAP.beats;
const T_BASS = 3.056, T_EXPLAIN = 5.184, T_ROUND = 9.438, T_LOOP2 = 11.565, T_DRAG1 = 15.819, T_DRAG1B = 17.946, T_DROP1 = 20.073,
  T_AHEAD = 24.328, T_DRAG2 = 28.582, T_DRAG2B = 30.709, T_DROP2 = 32.836, T_SUM = 33.76, T_LAST = 34.963, T_END = 37.09;
const LOOP = 16 * BEAT, T0 = T_BASS;
const R0 = 1.5, PITCH = 0.95, RW = 0.36;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const ease = (u) => u * u * (3 - 2 * u);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(31);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---- data -------------------------------------------------------------------------------------------------------------
const NF = MAP.spectrogram.frames.length, SONG = NF * HOP;
const movavg = (arr, k) => arr.map((_, i) => { let s = 0, n = 0; for (let j = i - k; j <= i + k; j++) if (j >= 0 && j < arr.length) { s += arr[j]; n++; } return s / n; });
const subS = movavg(MAP.sub_db_50ms.slice(0, NF), 2);
const bassH = subS.map((db) => 0.1 + 1.15 * Math.pow(clamp((db + 12) / 9, 0, 1), 1.5));
const hAt = (t) => { const f = clamp(t / HOP, 0, NF - 1), i = Math.floor(f), k = f - i; return bassH[i] * (1 - k) + bassH[Math.min(NF - 1, i + 1)] * k; };
const th = (t) => 2 * Math.PI * (t - T0) / LOOP;
const rad = (t) => R0 + PITCH * (t - T0) / LOOP;
const P = (t, dr = 0, y = 0) => { const a = th(t), r = rad(t) + dr; return V(r * Math.sin(a), y, -r * Math.cos(a)); };
const N = (t) => { const a = th(t); return V(Math.sin(a), 0, -Math.cos(a)); };          // outward
const D = (t) => { const a = th(t); return V(Math.cos(a), 0, Math.sin(a)); };           // direction of travel

// ---- renderer + scene -------------------------------------------------------------------------------------------------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// a warm room behind the desk (low shots look at a bright wall, not a void)
scene.background = canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f1dcb9'); gr.addColorStop(0.45, '#d9b98f'); gr.addColorStop(1, '#7a5638'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;
const camera = new THREE.PerspectiveCamera(40, W / H, 0.02, 300);

const paperTex = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const x = rng() * w, y = rng() * h, a = rng() * Math.PI, l = 4 + rng() * 16, v = 228 + rng() * 27 | 0;
    g.strokeStyle = `rgba(${v},${v - 6},${v - 16},${0.25 + rng() * 0.3})`; g.lineWidth = 0.5 + rng(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
});
paperTex.wrapS = paperTex.wrapT = THREE.RepeatWrapping;
const woodTex = canvasTex(2048, 2048, (g, w, h) => {
  g.fillStyle = '#6a4127'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 520; i++) { const y = rng() * h, a = 0.02 + rng() * 0.08; g.strokeStyle = `rgba(${rng() < 0.5 ? '38,20,9' : '150,96,58'},${a})`; g.lineWidth = 1 + rng() * 6;
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.004 + i) * 10 + (rng() - 0.5) * 3); g.stroke(); }
});
woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(5, 5);
const desk = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55 }));
desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);

// printed base disc: 16 beat spokes, 4 bar lines, labels
const DISC = 6.25;
const discTex = canvasTex(2048, 2048, (g, w, h) => {
  const cx = w / 2, cy = h / 2, s = (w / 2) / DISC;
  g.fillStyle = '#f5eddc'; g.beginPath(); g.arc(cx, cy, w / 2, 0, Math.PI * 2); g.fill();
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, bar = k % 4 === 0;
    g.strokeStyle = bar ? 'rgba(60,45,30,.55)' : 'rgba(60,45,30,.22)'; g.lineWidth = bar ? 5 : 3; g.setLineDash(bar ? [] : [14, 12]);
    g.beginPath(); g.moveTo(cx + Math.sin(a) * 0.9 * s, cy - Math.cos(a) * 0.9 * s); g.lineTo(cx + Math.sin(a) * 6.05 * s, cy - Math.cos(a) * 6.05 * s); g.stroke();
  }
  g.setLineDash([]); g.fillStyle = '#4a3a2b'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 46px "Noto Sans CJK SC"';
  ['第1小节', '第2小节', '第3小节', '第4小节'].forEach((txt, k) => { const a = (k + 0.5) / 4 * Math.PI * 2; g.fillText(txt, cx + Math.sin(a) * 5.95 * s, cy - Math.cos(a) * 5.95 * s); });
  g.font = '700 30px "Noto Sans CJK SC"'; g.fillStyle = '#9a3a2c';
  for (let k = 0; k < 4; k++) { const r = R0 + PITCH * k + 0.38; g.fillText(`第${k + 1}圈`, cx - 0.42 * s, cy - r * s); }
  g.font = '400 30px "Noto Sans CJK SC"'; g.fillStyle = '#6a5845';
  g.fillText('开智小曲 · 实测纸模型 · 一圈 = 4小节 = 8.5秒', cx, cy + 0.55 * s);
});
const disc = new THREE.Mesh(new THREE.CircleGeometry(DISC, 160), new THREE.MeshStandardMaterial({ map: discTex, roughness: 0.92 }));
disc.rotation.x = -Math.PI / 2; disc.position.y = 0.012; disc.receiveShadow = true; scene.add(disc);
const discEdge = new THREE.Mesh(new THREE.CylinderGeometry(DISC, DISC, 0.012, 160, 1, true), new THREE.MeshStandardMaterial({ color: '#d8ccb4' }));
discEdge.position.y = 0.006; scene.add(discEdge);

// opening: the spiral pops up out of the disc in song order (centre → rim) during the first 1.9 s
const GROW_T = 1.9, GROW_W = 1.4, GROW_END = SONG + GROW_W + 0.2;
const growFront = (t) => (t >= GROW_T ? 1e3 : GROW_END * (1 - Math.pow(1 - t / GROW_T, 2)));      // song-seconds raised so far
const growAt = (t, ts) => ease(clamp((growFront(t) - ts) / GROW_W, 0, 1));
const popTime = (ts) => GROW_T * (1 - Math.sqrt(Math.max(0, 1 - (ts + GROW_W) / GROW_END)));   // film time when song time ts is fully up
const GROW = { value: 1e3 };
function growify(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGrow = GROW;
    sh.vertexShader = 'attribute float aT;\nuniform float uGrow;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>\n  float gk = clamp((uGrow - aT) / ${GROW_W.toFixed(2)}, 0.0, 1.0); gk = gk * gk * (3.0 - 2.0 * gk);\n  transformed.y = 0.012 + (transformed.y - 0.012) * gk;`);
  };
  mat.customProgramCacheKey = () => 'grow';
  return mat;
}

// the ribbon (paper wall along the spiral), height = measured sub-bass
function ribbon(t0, t1, step = 0.02) {
  const top = [], inner = [], outer = [], uvT = [], uvS = [], tt = [];
  let arc = 0, prev = null;
  for (let t = t0; t <= t1 + 1e-6; t += step) {
    const c = P(t), n = N(t), h = hAt(t);
    if (prev) arc += c.distanceTo(prev); prev = c;
    const iT = c.clone().addScaledVector(n, -RW / 2).setY(h), oT = c.clone().addScaledVector(n, RW / 2).setY(h);
    top.push(iT, oT); inner.push(iT.clone().setY(0.012), iT); outer.push(oT, oT.clone().setY(0.012)); uvT.push([arc / 2, 0], [arc / 2, 0.2]); uvS.push([arc / 2, 0], [arc / 2, h / 2]); tt.push(t, t);
  }
  const ladder = (pts, uv) => {
    const pos = [], uvs = [], idx = [];
    pts.forEach((p, i) => { pos.push(p.x, p.y, p.z); uvs.push(...uv[i]); });
    for (let i = 0; i < pts.length / 2 - 1; i++) { const a = 2 * i, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  return { top: ladder(top, uvT), inner: ladder(inner, uvS), outer: ladder(outer, uvS) };
}
const rib = ribbon(0, SONG - 0.05);
const topMat = growify(new THREE.MeshStandardMaterial({ color: '#c9643d', roughness: 0.85, map: paperTex, side: THREE.DoubleSide }));
const sideMat = growify(new THREE.MeshStandardMaterial({ color: '#efe3cc', roughness: 0.9, map: paperTex, side: THREE.DoubleSide }));
const growDepth = growify(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
for (const [g, m] of [[rib.top, topMat], [rib.inner, sideMat], [rib.outer, sideMat]]) { const mesh = new THREE.Mesh(g, m); mesh.customDepthMaterial = growDepth; mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); }

// beat pins on the outer edge of the wall top
const NB = BEATS.length;
const needleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6); needleGeo.translate(0, 0.11, 0);
const needles = new THREE.InstancedMesh(needleGeo, new THREE.MeshStandardMaterial({ color: '#bfc3c8', metalness: 0.9, roughness: 0.3 }), NB);
const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#d7392b', roughness: 0.35, emissive: '#ff5a3a', emissiveIntensity: 0 }), NB);
needles.castShadow = heads.castShadow = true; scene.add(needles, heads);
const MM = new THREE.Matrix4();
const isBar = (b) => { const k = Math.round((b - MAP.downbeats[0]) / BEAT); return ((k % 4) + 4) % 4 === 0; };
function setPins(t) {
  BEATS.forEach((b, i) => {
    const gw = growAt(t, b), gp = ease(clamp((growFront(t) - b - GROW_W) / 0.7, 0, 1));
    const p = P(b, RW * 0.32), y = 0.012 + (hAt(b) - 0.012) * gw, pop = (t >= b && t < b + 0.18 ? 1 + 0.9 * (1 - (t - b) / 0.18) : 1) * (gp + 0.35 * Math.sin(Math.PI * gp));
    needles.setMatrixAt(i, MM.makeScale(1, Math.max(1e-3, gp), 1).setPosition(p.x, y, p.z));
    const r = Math.max(1e-4, (isBar(b) ? 0.06 : 0.042) * pop);
    heads.setMatrixAt(i, MM.makeScale(r, r, r).setPosition(p.x, y + 0.23 * gp, p.z));
  });
  needles.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
}
// “guessing the next beat”: a glowing ring settles over the next pin just before Clawd reaches it (schematic)
const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.75, 0.35), transparent: true, depthWrite: false, toneMapped: false });
const guess = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 8, 40), ringMat.clone()); m.rotation.x = Math.PI / 2; scene.add(m); return m; });

// numbered flags ①②③
const FLAGS = [{ t: T_BASS, n: '①' }, { t: T_LOOP2, n: '②' }, { t: T_DRAG1, n: '③' }].map((f) => {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 8), new THREE.MeshStandardMaterial({ color: '#2b1f16' })); pole.position.y = 0.475;
  const tex = canvasTex(256, 180, (c, w, h) => { c.fillStyle = '#d7392b'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 130px "Noto Sans CJK SC"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.n, w / 2, h / 2 + 6); });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24, 12, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, side: THREE.DoubleSide })); fl.position.set(0.18, 0.82, 0);
  g.add(pole, fl); const p = P(f.t - 0.12, -RW / 2 - 0.2); g.position.copy(p); g.lookAt(0, 0, 0); g.rotateY(Math.PI / 2);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
  const base = fl.geometry.attributes.position.array.slice();
  return { ...f, g, fl, base };
});
const upEarly = (t, i) => t < 2.7 && growFront(t) >= FLAGS[i].t + GROW_W;
const STAND = [
  (t) => (upEarly(t, 0) || t > T_AHEAD + 0.1 ? 1 : 0),
  (t) => (upEarly(t, 1) || (t > T_LOOP2 - 0.2 && t < T_LOOP2 + 1.9) || t > T_AHEAD + 0.1 ? 1 : 0),
  (t) => (upEarly(t, 2) || t > T_AHEAD + 0.1 ? 1 : 0),
];
function standFlags(t) {
  FLAGS.forEach((f, i) => { let k = 0; for (let d = -0.3; d <= 0.3001; d += 0.05) k += STAND[i](t + d); k = ease(k / 13); f.g.scale.set(1, lerp(0.08, 1, k), 1); f.g.visible = k > 0.02; });
}
function waveFlags(t) {
  for (const f of FLAGS) { const a = f.fl.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const x = f.base[i * 3]; a.array[i * 3 + 2] = 0.022 * Math.sin(t * 5 + x * 14) * (x + 0.17) / 0.34; } a.needsUpdate = true; }
}

// the two thinned passages, marked on the disc (unit 7: "you recognise it this time")
function strip(t0, t1, w) {
  const pos = [], idx = [];
  for (let t = t0, i = 0; t <= t1 + 1e-6; t += 0.04, i++) { const c = P(t), n = N(t); const a = c.clone().addScaledVector(n, -w / 2), b = c.clone().addScaledVector(n, w / 2); pos.push(a.x, 0.02, a.z, b.x, 0.02, b.z); if (i) idx.push(2 * i - 2, 2 * i, 2 * i - 1, 2 * i - 1, 2 * i, 2 * i + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.25, 0.15), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  m.renderOrder = 2; scene.add(m); return m;
}
const DIPS = [strip(T_DRAG1, T_DROP1, 0.8), strip(T_DRAG2, T_DROP2, 0.8)];
// the red line: loop 1's bass shape, traced, lifted and carried one turn outward
const WIRE_N = 420;
const wireMat = new THREE.MeshStandardMaterial({ color: '#e0261c', roughness: 0.4, emissive: '#c4160c', emissiveIntensity: 0.9 });
let wire = null;
const ghostWire = (() => { const pts = []; for (let i = 0; i < WIRE_N; i++) { const tt = T0 + LOOP * i / (WIRE_N - 1), q = P(tt); q.y = hAt(tt) + 0.03; pts.push(q); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), WIRE_N * 2, 0.02, 6, false), new THREE.MeshBasicMaterial({ color: '#e0261c', transparent: true, opacity: 0, depthWrite: false }));
  scene.add(m); return m; })();
function wirePoints(t) {
  const pts = [];
  const trace = smooth(T_LOOP2, T_LOOP2 + 0.7, t), carry = smooth(T_LOOP2 + 0.7, T_LOOP2 + 1.45, t), settle = smooth(T_LOOP2 + 1.45, T_LOOP2 + 1.85, t);
  const lift = 0.55 * Math.sin(Math.PI * carry) + (1 - settle) * 0.06 * carry, n = Math.max(2, Math.round(WIRE_N * trace));
  for (let i = 0; i < n; i++) {
    const tt = T0 + LOOP * i / (WIRE_N - 1), q = P(tt, PITCH * ease(carry));
    q.y = hAt(tt) + 0.03 + lift; pts.push(q);
  }
  return pts;
}
function updateWire(t) {
  const go = smooth(T_LOOP2 + 0.6, T_LOOP2 + 0.8, t) * (1 - smooth(T_DRAG1 - 0.3, T_DRAG1, t)); ghostWire.material.opacity = 0.45 * go; ghostWire.visible = go > 0.01;
  const on = t >= T_LOOP2 && t < T_AHEAD + 0.3;
  if (!on) { if (wire) wire.visible = false; return; }
  const animating = t < T_LOOP2 + 1.9 || !wire || !wire.userData.settled;
  if (animating) {
    if (wire) { scene.remove(wire); wire.geometry.dispose(); }
    const pts = wirePoints(t);
    wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(4, pts.length * 2), t < T_LOOP2 + 1.9 ? 0.04 : 0.024, 6, false), wireMat);
    wire.castShadow = true; wire.userData.settled = t >= T_LOOP2 + 1.9; scene.add(wire);
  }
  wire.visible = true;
}
// yellow tape measure: Clawd pulls it from one pin to the next (unit ①)
const tapeTex = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e1a12'; for (let i = 0; i <= 20; i++) g.fillRect(i / 20 * w, 0, 3, i % 4 === 0 ? 36 : 16); });
const tape = new THREE.Mesh(new THREE.BoxGeometry(1, 0.008, 0.07), new THREE.MeshStandardMaterial({ map: tapeTex, roughness: 0.4 }));
tape.castShadow = true; scene.add(tape);
// 16th-note paper tabs in the thinned bar (measured even 0.134 s spacing)
const TABS = []; for (let j = 0; j < 16; j++) TABS.push(T_DRAG1B + j * BEAT / 4);
const tabs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.1, 0.012), new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.8 }), 32);
tabs.castShadow = true; scene.add(tabs);
function setTabs(t) {
  let n = 0;
  for (const base of [T_DRAG1B, T_DRAG2B]) for (let j = 0; j < 16; j++) {
    const tj = base + j * BEAT / 4, k = clamp((t - tj) / 0.12, 0, 1), vis = t >= tj && t < base + 4 * BEAT + 1.2;
    const s = vis ? 1 + 0.4 * Math.sin(Math.PI * k) * (1 - k) : 0, p = P(tj, -RW * 0.25), y = hAt(tj);
    tabs.setMatrixAt(n++, MM.compose(V(p.x, y + 0.05 * s, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -th(tj), 0)), V(s, s, s)));
  }
  tabs.instanceMatrix.needsUpdate = true;
}
// paper confetti at the two returns
const NC = 260, BURSTS = [T_DROP1, T_DROP2];
const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.045), new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), NC * 2);
const CC = ['#f5eddc', '#c9643d', '#d7392b', '#f2c230', '#ffffff'].map((c) => new THREE.Color(c));
const CF = [];
for (let i = 0; i < NC * 2; i++) { confetti.setColorAt(i, CC[i % CC.length]); CF.push({ a: rng() * Math.PI * 2, up: 2.2 + rng() * 2.6, out: 0.4 + rng() * 1.4, sp: (rng() - 0.5) * 18, ax: rng(), drag: 0.6 + rng() * 0.8 }); }
confetti.castShadow = true; confetti.frustumCulled = false; scene.add(confetti);
const QC = new THREE.Quaternion(), EC = new THREE.Euler();
function setConfetti(t) {
  for (let b = 0; b < 2; b++) {
    const tb = BURSTS[b], u = t - tb, origin = P(tb + 0.1);
    for (let i = 0; i < NC; i++) {
      const k = b * NC + i, c = CF[k];
      if (u < 0 || u > 2.6) { confetti.setMatrixAt(k, MM.makeScale(0, 0, 0)); continue; }
      const fall = (1 - Math.exp(-c.drag * u)) / c.drag, x = origin.x + Math.cos(c.a) * c.out * fall, z = origin.z + Math.sin(c.a) * c.out * fall;
      const y = Math.max(0.02, hAt(tb + 0.1) + 0.2 + c.up * fall - 1.6 * u * u * 0.5 - 0.5 * u);
      EC.set(c.sp * u * c.ax, c.sp * u, c.sp * u * (1 - c.ax)); QC.setFromEuler(EC);
      confetti.setMatrixAt(k, MM.compose(V(x, y, z), QC, V(1, 1, 1)));
    }
  }
  confetti.instanceMatrix.needsUpdate = true;
}

// Clawd (rigs per eye state, legs animated)
const U = 0.032;
function buildClawd(eyes) {
  const g = makeClawd(THREE, { unit: U, depth: 4, rounded: RoundedBoxGeometry, radius: 0.16, roughness: 0.5, pose: { eyes } });
  g.children.forEach((m) => { m.userData.y0 = m.position.y; m.userData.h0 = 1; m.castShadow = true; });
  g.userData.legs = g.children.filter((m) => m.userData.part === 'leg');
  scene.add(g); return g;
}
const RIGS = { open: buildClawd('open'), wide: buildClawd('wide'), happy: buildClawd('happy') };
// leaps at the two returns: from the low wall up onto the risen wall
const LEAPS = [T_DROP1, T_DROP2].map((td) => ({ t0: td - 0.18, T: 0.62, h: 0.42 }));
function clawdPose(t) {
  const st = { y: 0.012 + (hAt(t) - 0.012) * growAt(t, t), arms: 0, sq: 0, legs: [0, 0, 0, 0], eyes: 'open' };
  const step = BEAT / 2, ph = ((t % step) + step) % step / step;               // a step every 8th note
  const walking = t >= T_BASS - 0.3;
  if (walking) { const a = Math.sin(Math.PI * ph) * 0.9; st.legs = Math.floor(t / step) % 2 ? [a, 0, a, 0] : [0, a, 0, a]; st.y += 0.006 * Math.abs(Math.sin(Math.PI * ph)); }
  for (const L of LEAPS) {
    const u = t - L.t0;
    if (u >= -0.5 && u < 0) st.sq = Math.max(st.sq, 0.18 * smooth(-0.5, -0.05, u));
    if (u >= 0 && u < L.T) { const k = u / L.T; st.y = lerp(hAt(L.t0), hAt(L.t0 + L.T + 0.05), ease(k)) + 4 * L.h * k * (1 - k); st.arms = 2 * Math.sin(Math.PI * Math.min(1, k * 1.4)); st.eyes = 'happy'; st.legs = [0, 0, 0, 0]; st.sq = -0.05; }
    if (u >= L.T && u < L.T + 0.08) st.sq = 0.14 * (1 - (u - L.T) / 0.08);
  }
  if ((t >= T_DRAG1 && t < T_DROP1 - 0.18) || (t >= T_DRAG2 && t < T_DROP2 - 0.18)) { st.eyes = 'wide'; }
  if (t >= T_DRAG2B - 0.1 && t < T_DROP2 - 0.18) st.arms = 0.6 + 0.6 * Math.abs(Math.sin(Math.PI * (t - T_DRAG2B) / BEAT));   // counting along
  if (t >= T_SUM + 0.8) { st.arms = 1 + 0.7 * Math.sin(t * 6); st.eyes = 'happy'; }
  return st;
}
function poseClawd(t, faceDir) {
  const st = clawdPose(t), c = P(t);
  for (const [name, g] of Object.entries(RIGS)) {
    g.visible = name === st.eyes; if (!g.visible) continue;
    g.position.set(c.x, st.y, c.z);
    g.rotation.set(0, Math.atan2(faceDir.x, faceDir.z), 0);
    g.scale.set(1 + st.sq * 0.5, 1 - st.sq, 1 + st.sq * 0.5);
    g.children.forEach((m) => { if (m.userData.part === 'arm') m.position.y = m.userData.y0 + st.arms * U; });
    g.userData.legs.forEach((m, i) => { const l = st.legs[i] * U; m.position.y = m.userData.y0 + l / 2; m.scale.y = Math.max(0.05, (2 * U - l) / (2 * U)); });
  }
  return st;
}

// lights: warm window light from the left
const sun = new THREE.DirectionalLight('#ffe0b8', 2.5); sun.position.set(-9, 13, 7); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); { const c = sun.shadow.camera; c.left = -7; c.right = 7; c.top = 7; c.bottom = -7; c.near = 1; c.far = 40; } sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
scene.add(sun);
const hemi = new THREE.HemisphereLight('#e2ecff', '#6a4a30', 0.7); scene.add(hemi);
const fill = new THREE.DirectionalLight('#ffd9b0', 0.9); fill.position.set(10, 6, -6); scene.add(fill);

// ---- post: scene (MSAA x2 + depth) → DOF (half-res gather) → soft bloom → output -----------------------------------
const rtMain = new THREE.WebGLRenderTarget(W, H, { samples: 2, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(W, H) });
const rtBlur = new THREE.WebGLRenderTarget(W / 2, H / 2, { type: THREE.HalfFloatType });
const rtComp = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const DOFU = { tColor: { value: rtMain.texture }, tDepth: { value: rtMain.depthTexture }, tBlur: { value: rtBlur.texture }, near: { value: 0.02 }, far: { value: 300 },
  focus: { value: 5 }, K: { value: 1.4 }, maxPx: { value: 14 }, texel: { value: new THREE.Vector2(1 / W, 1 / H) } };
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
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * cc * texel;
      float zs = lin(texture2D(tDepth, uv).x), cs = coc(zs), d = r * cc;
      float cov = zs < zc ? cs : min(cs, cc);
      float w = clamp(cov - d + 1.0, 0.0, 1.0);
      acc += texture2D(tColor, uv).rgb * w; ws += w;
    }
    gl_FragColor = vec4(acc / ws, 1.0);
  }` }));
const compQuad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: DOFU, vertexShader: VS, fragmentShader: COC + `uniform sampler2D tBlur;
  void main(){ float cc = coc(lin(texture2D(tDepth, vUv).x)); vec3 s = texture2D(tColor, vUv).rgb, b = texture2D(tBlur, vUv).rgb; gl_FragColor = vec4(mix(s, b, smoothstep(0.7, 2.6, cc)), 1.0); }` }));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.05, 0.3, 0.99);
const output = new OutputPass(); output.renderToScreen = true;

// ---- cameras: chase cam that trails the playhead along the spiral; fixed set-ups where something must be read ------
function chase(t, { lag = 0.7, back = 1.0, side = 0.7, up = 1.5, lead = 0.25, look = 0.2 } = {}) {
  const tc = t - lag, c = P(t), cl = P(tc);
  const pos = cl.clone().addScaledVector(N(tc), side).addScaledVector(D(tc), -back).add(V(0, hAt(tc) * 0.4 + up, 0));
  const tgt = c.clone().addScaledVector(D(t), lead).add(V(0, hAt(t) * 0.75 + look, 0));
  return { pos, tgt };
}
const OVER_A = { pos: V(0.0, 19.5, 13.5), tgt: V(0, 0, -0.6) };
const overPos = (t) => { const u = 1 - Math.pow(1 - clamp(t / 2.45, 0, 1), 2); return OVER_A.pos.clone().applyAxisAngle(V(0, 1, 0), -0.12 + 0.5 * u).lerp(OVER_A.tgt, 0.1 * u); };
function shot(t) {
  if (t < 2.45) return { pos: overPos(t), tgt: OVER_A.tgt, fov: 50, K: 0.25, maxPx: 6 };
  if (t < T_BASS) {                                          // dive from the overview into the model, landing on the first beat
    const k = ease(smooth(2.45, T_BASS, t)), o = { pos: overPos(2.45), tgt: OVER_A.tgt }, c = chase(T_BASS, { back: 1.1, side: 1.3, up: 0.85 });
    return { pos: o.pos.clone().lerp(c.pos, k), tgt: o.tgt.clone().lerp(c.tgt, k), fov: lerp(50, 44, k), K: lerp(0.25, 1.1, k), maxPx: lerp(6, 13, k) };
  }
  if (t < T_EXPLAIN) { const c = chase(t, { back: 1.2, side: 0.75, up: 1.45, lead: 0.35 }); return { ...c, fov: 44, K: 1.1, maxPx: 13 }; }
  if (t < T_ROUND) { const c = chase(t, { back: 1.5, side: 0.9, up: 1.85, lead: 0.6, look: 0.05 }); return { ...c, fov: 44, K: 0.9, maxPx: 12 }; }
  if (t < T_LOOP2) { const k = smooth(T_ROUND, T_LOOP2 - 0.4, t); const c = chase(t, { back: 1.6, side: 1.0, up: 2.1, lead: 0.7, look: 0 });
    const hi = { pos: V(-0.4, 7.6, 6.2), tgt: P(T_LOOP2).add(V(0, 0.3, 0)) }; return { pos: c.pos.lerp(hi.pos, k * 0.85), tgt: c.tgt.lerp(hi.tgt, k * 0.85), fov: 44, K: 0.7, maxPx: 10 }; }
  if (t < T_LOOP2 + 1.85) { const k = smooth(T_LOOP2, T_LOOP2 + 1.85, t); return { pos: V(lerp(-0.6, 0.6, k), lerp(9.0, 9.4, k), lerp(7.6, 7.2, k)), tgt: V(0, 0.2, -0.5), fov: 46, K: 0.35, maxPx: 7 }; }
  if (t < T_DRAG1) { const c = chase(t, { back: 1.3, side: 0.9, up: 1.6, lead: 0.45, look: 0.25 }); return { ...c, fov: 44, K: 0.9, maxPx: 12 }; }
  if (t < T_DROP1) { const k = smooth(T_DRAG1, T_DROP1, t), m = P(18.3), n = N(18.3), d = D(18.3);
    return { pos: m.clone().addScaledVector(n, lerp(2.5, 2.2, k)).addScaledVector(d, lerp(-0.6, -0.2, k)).add(V(0, lerp(1.55, 1.25, k), 0)), tgt: m.clone().addScaledVector(n, -0.2).addScaledVector(d, 0.2).add(V(0, 0.35, 0)), fov: 48, K: 1.0, maxPx: 12 }; }
  if (t < T_AHEAD) { const k = smooth(T_DROP1, T_AHEAD, t), m = P(20.25), n = N(20.25), d = D(20.25);
    return { pos: m.clone().addScaledVector(n, lerp(1.9, 2.7, k)).addScaledVector(d, lerp(0.75, 0.2, k)).add(V(0, lerp(1.6, 2.35, k), 0)), tgt: P(t).add(V(0, hAt(t) * 0.6 + 0.1, 0)), fov: 50, K: 0.9, maxPx: 12 }; }
  if (t < T_DRAG2) { const k = smooth(T_AHEAD, T_DRAG2, t);     // high: both thinned passages in one view, Clawd coming round
    const pos = V(0.0, lerp(15.5, 13.0, k), lerp(11.0, 9.8, k)).applyAxisAngle(V(0, 1, 0), lerp(-0.12, 0.05, k)); return { pos, tgt: V(0, 0, lerp(-0.3, -0.6, k)), fov: 46, K: 0.3, maxPx: 6 }; }
  if (t < T_DROP2) { const k = smooth(T_DRAG2, T_DROP2, t); const c = chase(t, { lag: 0.2, back: -1.75, side: 0.6, up: 0.75, lead: 0.0, look: 0.42 });
    return { pos: c.pos.add(V(0, -0.1 * k, 0)), tgt: c.tgt, fov: lerp(46, 42, k), K: 1.1, maxPx: 13 }; }
  if (t < T_SUM) { const c = chase(t, { lag: 0.2, back: -2.2, side: 0.8, up: 1.15, lead: 0, look: 0.45 }); return { ...c, fov: 48, K: 0.9, maxPx: 11 }; }
  const k = ease(smooth(T_SUM, T_SUM + 1.6, t)), c = chase(T_SUM, { lag: 0.2, back: -2.2, side: 0.8, up: 1.15, lead: 0, look: 0.45 }), o = { pos: V(0.0, 21.5, 12.6), tgt: V(0, 0, -1.0) };
  const pos = c.pos.clone().lerp(o.pos, k); pos.y = lerp(c.pos.y, o.pos.y, Math.sqrt(k));
  return { pos: pos.applyAxisAngle(V(0, 1, 0), 0.06 * smooth(T_SUM + 1.6, T_END, t)), tgt: c.tgt.lerp(o.tgt, k), fov: lerp(48, 50, k), K: lerp(0.9, 0.25, k), maxPx: lerp(11, 6, k) };
}

// ---- overlay tags --------------------------------------------------------------------------------------------------------
const labels = document.createElement('div'); labels.className = 'labels'; stage.appendChild(labels);
const flashEl = document.getElementById('flash');
const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
function tagAt(v, lx, ly, html, cls = '', a = 1) {
  const [x, y] = project(v);
  return { svg: `<g opacity="${a.toFixed(3)}"><path d="M${lx},${ly} L${x.toFixed(1)},${y.toFixed(1)}" stroke="#2a2119" stroke-width="3" fill="none"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#c23b2e" stroke="#fff" stroke-width="2"/></g>`,
    div: `<div class="tag ${cls}" style="left:${lx}px;top:${ly - 24}px;opacity:${a.toFixed(3)}">${html}</div>` };
}
function overlay(t) {
  let svg = '', div = ''; const add = (o) => { svg += o.svg; div += o.div; };
  const fy = (f) => f.g.position.clone().add(V(0, 0.8, 0));
  if (t < 2.4) {
    const out = 1 - smooth(2.15, 2.4, t), A = (ts) => smooth(popTime(ts) - 0.05, popTime(ts) + 0.2, t) * out;
    add(tagAt(fy(FLAGS[0]), 640, 1230, '① 3.1秒<small> 低音进来</small>', '', A(FLAGS[0].t)));
    add(tagAt(fy(FLAGS[1]), 680, 620, '② 11.6秒<small> 第2圈</small>', '', A(FLAGS[1].t)));
    add(tagAt(fy(FLAGS[2]), 60, 1300, '③ 15.8秒<small> 低音变薄</small>', '', A(FLAGS[2].t)));
    add(tagAt(P(t).add(V(0, hAt(t) + 0.3, 0)), 70, 640, 'Clawd<small> 正在播放的这一刻</small>', 'ink', smooth(0.1, 0.35, t) * out));
  } else if (t >= 3.3 && t < T_EXPLAIN) {
    add(tagAt(tape.position.clone(), 600, 1190, '0.53 秒<small> 一拍</small>', '', smooth(3.55, 3.7, t)));
  } else if (t >= T_LOOP2 + 0.2 && t < T_DRAG1) {
    add(tagAt(P(T_LOOP2 + 4.6).setY(hAt(T_LOOP2 + 4.6 - LOOP) + 0.05), 520, 1210, '红线 = 第1圈的形状', 'ink', smooth(T_LOOP2 + 0.3, T_LOOP2 + 0.6, t)));
  } else if (t >= 16.6 && t < T_DROP1) {
    const a = smooth(16.6, 16.9, t);
    add(tagAt(P(18.6).setY(hAt(18.6 - LOOP) + 0.05), 560, 690, '你以为低音在这', 'ink', a));
    add(tagAt(P(18.6).setY(hAt(18.6)), 560, 1210, '它实际在这', '', a));
  } else if (t >= T_AHEAD + 0.3 && t < T_DRAG2) {
    const a = smooth(T_AHEAD + 0.3, T_AHEAD + 0.6, t), b = smooth(T_AHEAD + 0.9, T_AHEAD + 1.2, t);
    add(tagAt(P(17.9).setY(0.05), 60, 1250, '第一道 · 15.8秒', 'ink', a));
    add(tagAt(P(30.7).setY(0.05), 620, 1250, '第二道 · 28.6秒<small> 几乎一样</small>', '', b));
  } else if (t >= T_SUM + 1.4) {
    const a = smooth(T_SUM + 1.4, T_SUM + 1.8, t);
    [['①', '拍子准', 0, 1230, 640], ['②', '一段反复', 1, 610, 680], ['③', '关键处拖一下', 2, 1300, 60]].forEach(([n, s, k, ly, lx]) => add(tagAt(fy(FLAGS[k]), lx, ly, `${n} ${s}`, '', a)));
  }
  labels.innerHTML = `<svg class="lines" width="${W}" height="${H}">${svg}</svg>${div}`;
  let f = 0;
  for (const td of [T_DROP1, T_DROP2]) if (t >= td && t < td + 0.22) f = Math.max(f, 0.35 * (1 - (t - td) / 0.22));
  flashEl.style.opacity = f.toFixed(3);
}

const cues = (await loadCues('./cues.json')).cues;
const subs = makeSubs(stage, cues);

film.render = async (t) => {
  const s = shot(t);
  const shakeA = [T_DROP1, T_DROP2].reduce((a, td) => a + (t >= td && t < td + 0.4 ? 0.035 * Math.exp(-(t - td) / 0.09) : 0), 0);
  camera.position.copy(s.pos).add(V(Math.sin(t * 87) * shakeA, Math.sin(t * 71 + 1) * shakeA, 0)); camera.fov = s.fov; camera.updateProjectionMatrix(); camera.lookAt(s.tgt); camera.updateMatrixWorld();
  GROW.value = growFront(t);
  setPins(t); setTabs(t); setConfetti(t); updateWire(t); waveFlags(t); standFlags(t);
  const dipA = smooth(T_AHEAD + 0.2, T_AHEAD + 0.6, t) * (1 - smooth(T_DRAG2 - 0.3, T_DRAG2 + 0.2, t)) * (0.55 + 0.25 * Math.sin(t * 6.3));
  DIPS.forEach((m) => { m.material.opacity = dipA; m.visible = dipA > 0.01; });
  // the guessing ring over the next pin (explanation units only)
  const nextB = BEATS.find((b) => b > t), showGuess = t >= T_EXPLAIN && t < T_LOOP2;
  const ni = BEATS.indexOf(nextB);
  guess.forEach((g, j) => {
    const bb = ni >= 0 ? BEATS[ni + j] : undefined, win = 0.45 + j * BEAT;
    g.visible = showGuess && bb !== undefined && bb - t < win;
    if (!g.visible) return;
    const k = clamp(1 - (bb - t) / win, 0, 1), p = P(bb, RW * 0.32);
    g.position.set(p.x, hAt(bb) + 0.23 + 0.12 * (1 - k), p.z); const sc = lerp(1.9, 1.0, k); g.scale.set(sc, sc, sc);
    g.material.opacity = (j === 0 ? 0.95 : 0.4) * k;
  });
  // tape: pulled from the 3.056 s pin to the next while Clawd walks
  tape.visible = t >= T_BASS && t < T_EXPLAIN;
  if (tape.visible) {
    const b1 = T_BASS, b2 = BEATS.find((x) => x > b1 + 0.01), k = clamp((t - b1) / (b2 - b1), 0, 1);
    const a = P(b1, RW * 0.32), b = P(lerp(b1, b2, k), RW * 0.32), y = Math.max(hAt(b1), hAt(lerp(b1, b2, k))) + 0.014;
    tape.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2); tape.scale.set(Math.max(0.001, a.distanceTo(b)), 1, 1); tape.rotation.set(0, -Math.atan2(b.z - a.z, b.x - a.x), 0);
  }
  // Clawd faces where it walks; it turns to the viewer while measuring, counting and at the end
  const toCam = camera.position.clone().sub(P(t)).setY(0).normalize();
  const faceK = Math.max(smooth(3.3, 3.6, t) * (1 - smooth(4.9, 5.2, t)), smooth(T_DRAG2 + 1.2, T_DRAG2 + 1.6, t) * (1 - smooth(T_DROP2 - 0.3, T_DROP2 - 0.1, t)), smooth(T_SUM + 0.5, T_SUM + 1.0, t), t < 2.5 ? 1 : 0);
  poseClawd(t, D(t).lerp(toCam, faceK).normalize());
  const cpos = P(t).add(V(0, hAt(t) + 0.13, 0));
  DOFU.focus.value = camera.position.distanceTo(cpos); DOFU.K.value = s.K; DOFU.maxPx.value = s.maxPx; DOFU.near.value = camera.near; DOFU.far.value = camera.far;
  renderer.setRenderTarget(rtMain); renderer.render(scene, camera);
  renderer.setRenderTarget(rtBlur); blurQuad.render(renderer);
  renderer.setRenderTarget(rtComp); compQuad.render(renderer);
  bloom.render(renderer, null, rtComp, 0, false);
  output.render(renderer, null, rtComp);
  overlay(t);
  subs(t);
  await new Promise((r) => requestAnimationFrame(() => r()));
};
film.ready = true;
