// P5 · 它想睡觉，但它的脚不同意 — an isometric clay bedroom at night. Every involuntary thing Clawd does is one mechanism:
// foot taps (predictable beat) → hums the repeat (familiar loop) → freezes (bass thinned) → leaps (bass back)
// → the song stops but the foot keeps the tempo (still playing in its head).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeClawd } from '../common/clawd.js';
import { loadCues, makeSubs } from '../common/subs.js';

const film = window.film = { ready: false };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });
await document.fonts.load('700 60px "Noto Sans CJK SC"');

const W = 1080, H = 1920, BEAT = 0.53178, PH = 0.3976;
const T_BASS = 3.056, T_SIT = 5.184, T_SING = 9.438, T_LOOP2 = 11.565, T_DRAG1 = 15.819, T_DRAG1B = 17.946, T_DROP1 = 20.073, T_SUM = 22.2, T_STOP = 26.455;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); };
const frac = (x) => x - Math.floor(x);
const phase = (t) => frac((t - PH) / BEAT);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(55);

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#151338');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.12;
const FW = 12.6;                                                        // orthographic frustum width (world units)
const camera = new THREE.OrthographicCamera(-FW / 2, FW / 2, FW / 2 * H / W, -FW / 2 * H / W, 0.1, 200);

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...o });
const box = (w, h, d, m, x, y, z, r = 0.06) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; scene.add(b); return b; };

// ---- room shell -------------------------------------------------------------------------------------------------------
const floorTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#a7744c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const y = i * h / 9; g.fillStyle = i % 2 ? '#9d6b45' : '#ae7c52'; g.fillRect(0, y, w, h / 9 - 4); g.fillStyle = '#7d5232'; g.fillRect(0, y + h / 9 - 4, w, 4); for (let k = 0; k < 3; k++) g.fillRect((rng() * w) | 0, y, 4, h / 9); } });
box(9, 0.4, 9, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }), 0, -0.2, 0, 0.04);
const wallMat = mat('#b7a0c8'), wallMat2 = mat('#a58cba');
box(9, 5.6, 0.36, wallMat, 0, 2.8, -4.68, 0.04);
box(0.36, 5.6, 9, wallMat2, -4.68, 2.8, 0, 0.04);
box(9.2, 0.25, 0.5, mat('#efe6d8'), 0, 0.12, -4.4, 0.04);                     // skirting
box(0.5, 0.25, 9.2, mat('#efe6d8'), -4.4, 0.12, 0, 0.04);
// window (back wall) with night sky
const skyTex = canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0c1446'); gr.addColorStop(1, '#3a3a8a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,240,${0.4 + rng() * 0.6})`; const s = rng() < 0.15 ? 4 : 2; g.fillRect(rng() * w, rng() * h * 0.8, s, s); }
  g.fillStyle = '#fff3c8'; g.beginPath(); g.arc(360, 140, 56, 0, 7); g.fill(); g.fillStyle = '#16205a'; g.beginPath(); g.arc(385, 125, 50, 0, 7); g.fill();
  g.fillStyle = '#1a1840'; for (let x = 0; x < w; x += 46) { const hh = 60 + rng() * 120; g.fillRect(x, h - hh, 40, hh); g.fillStyle = '#ffd98a'; for (let k = 0; k < 6; k++) if (rng() < 0.5) g.fillRect(x + 6 + (k % 2) * 16, h - hh + 12 + (k >> 1) * 28, 8, 10); g.fillStyle = '#1a1840'; } });
const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.4), new THREE.MeshBasicMaterial({ map: skyTex }));
win.position.set(1.6, 3.2, -4.49); scene.add(win);
box(2.9, 0.16, 0.2, mat('#efe6d8'), 1.6, 4.48, -4.42); box(2.9, 0.16, 0.34, mat('#efe6d8'), 1.6, 1.92, -4.35);
box(0.14, 2.6, 0.2, mat('#efe6d8'), 0.22, 3.2, -4.42); box(0.14, 2.6, 0.2, mat('#efe6d8'), 2.98, 3.2, -4.42); box(0.1, 2.4, 0.16, mat('#efe6d8'), 1.6, 3.2, -4.42);
box(0.5, 2.9, 0.16, mat('#f4a8b8'), -0.05, 3.0, -4.3, 0.08); box(0.5, 2.9, 0.16, mat('#f4a8b8'), 3.25, 3.0, -4.3, 0.08);   // curtains
// poster on the left wall: a framed pixel Clawd
const posterTex = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#fff6e6'; g.fillRect(0, 0, w, h); g.fillStyle = '#d97757';
  const B = ['..########..', '..#E####E#..', '############', '############', '..########..', '..########..', '..#.#..#.#..', '..#.#..#.#..'];
  B.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') { g.fillStyle = '#d97757'; g.fillRect(32 + x * 16, 80 + y * 16, 16, 16); } if (c === 'E') { g.fillStyle = '#222'; g.fillRect(32 + x * 16, 80 + y * 16, 16, 16); } }));
  g.fillStyle = '#5a4a72'; g.font = '700 30px "Noto Sans CJK SC"'; g.textAlign = 'center'; g.fillText('早点睡', w / 2, 260); });
const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.56), new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.8 }));
poster.rotation.y = Math.PI / 2; poster.position.set(-4.47, 3.6, 1.6); scene.add(poster);
box(0.08, 1.7, 1.39, mat('#6b4a8a'), -4.5, 3.6, 1.6, 0.03);
// rug, plant, shelf + books
const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.05, 64), mat('#f0b49c')); rug.position.set(1.6, 0.03, 1.5); rug.receiveShadow = true; scene.add(rug);
const rug2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.06, 64), mat('#f6d2bf')); rug2.position.set(1.6, 0.04, 1.5); rug2.receiveShadow = true; scene.add(rug2);
box(0.8, 0.8, 0.8, mat('#c8673e'), 3.7, 0.4, -3.7, 0.08);
for (let i = 0; i < 7; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), mat(i % 2 ? '#5fae6a' : '#4c9a5c')); lf.scale.set(0.55, 1.2, 0.35); const a = i / 7 * 6.28; lf.position.set(3.7 + Math.cos(a) * 0.3, 1.3 + (i % 3) * 0.25, -3.7 + Math.sin(a) * 0.3); lf.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); lf.castShadow = true; scene.add(lf); }
box(2.4, 0.14, 0.7, mat('#d7b48a'), -1.9, 3.75, -4.15);
['#e27d60', '#85cdca', '#e8a87c', '#c38d9e', '#41b3a3', '#f2d27a'].forEach((c, i) => box(0.22, 0.55 + (i % 3) * 0.1, 0.5, mat(c), -2.9 + i * 0.27, 4.1 + (i % 3) * 0.05, -4.15, 0.03));

// ---- bed, nightstand, lamp, phone, metronome ----------------------------------------------------------------------------
const BED = { x0: -4.3, x1: -1.5, z0: -4.3, z1: 0.6, top: 1.0 };
box(2.9, 0.5, 5.0, mat('#efe6d8'), -2.9, 0.42, -1.85, 0.12);                    // frame
box(2.7, 0.42, 4.8, mat('#ffffff', { roughness: 0.9 }), -2.9, 0.86, -1.85, 0.16); // mattress
box(2.9, 2.1, 0.32, mat('#efe6d8'), -2.9, 1.05, -4.36, 0.14);                    // headboard
const pillow = box(1.6, 0.36, 0.85, mat('#bfe8d8', { roughness: 0.95 }), -2.9, 1.22, -3.6, 0.17);
box(1.15, 1.05, 1.0, mat('#d7b48a'), -0.75, 0.52, -3.85, 0.08);                 // nightstand
box(0.9, 0.06, 0.08, mat('#b8915f'), -0.75, 0.75, -3.34, 0.02);
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.42, 24), mat('#f1c27d')); lampBase.position.set(-0.95, 1.26, -4.05); lampBase.castShadow = true; scene.add(lampBase);
const shadeMat = new THREE.MeshStandardMaterial({ color: '#ffe2b8', roughness: 0.8, emissive: '#ffb45c', emissiveIntensity: 0.9, side: THREE.DoubleSide });
const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.48, 0.5, 32, 1, true), shadeMat); shade.position.set(-0.95, 1.7, -4.05); scene.add(shade);
const lamp = new THREE.PointLight('#ffbf73', 9, 14, 1.6); lamp.position.set(-0.95, 1.62, -4.0); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; scene.add(lamp);
const phoneTex = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#10142e'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb36b'; g.font = '700 30px "Noto Sans CJK SC"'; g.textAlign = 'center'; g.fillText('开智小曲', w / 2, 90); g.fillText('▶', w / 2, 150);
  for (let i = 0; i < 22; i++) { const v = 30 + Math.abs(Math.sin(i * 1.7)) * 120; g.fillStyle = i < 14 ? '#ff9a5c' : '#5a5f8a'; g.fillRect(18 + i * 10, 360 - v / 2, 6, v); } });
const phone = new THREE.Group();
const phoneBody = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.04, 0.62, 2, 0.03), mat('#2a2a35', { roughness: 0.3 }));
const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.56), new THREE.MeshBasicMaterial({ map: phoneTex }));
phoneScreen.rotation.x = -Math.PI / 2; phoneScreen.position.y = 0.025; phone.add(phoneBody, phoneScreen); scene.add(phone);
const phoneLight = new THREE.PointLight('#ff9a5c', 0, 3.5, 1.5); scene.add(phoneLight);
const metro = new THREE.Group();
const mBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.62, 4), mat('#8a4b2c')); mBody.rotation.y = Math.PI / 4; mBody.position.y = 0.31; mBody.castShadow = true;
const rod = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5, 0.025), mat('#e9e0cf', { metalness: 0.6, roughness: 0.3 })); rod.geometry.translate(0, 0.25, 0);
const bob = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), mat('#f2c230', { metalness: 0.5 })); bob.position.y = 0.36; rod.add(bob);
const rodPivot = new THREE.Group(); rodPivot.position.set(0, 0.12, 0.12); rodPivot.add(rod);
const ghostRod = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.06, 0.5, 0.06).translate(0, 0.25, 0)), new THREE.LineDashedMaterial({ color: '#9fe2ff', dashSize: 0.04, gapSize: 0.03 }));
ghostRod.computeLineDistances(); const ghostPivot = new THREE.Group(); ghostPivot.position.copy(rodPivot.position); ghostPivot.add(ghostRod);
metro.add(mBody, rodPivot, ghostPivot); metro.position.set(-0.45, 1.05, -3.6); scene.add(metro);

// blanket: a draped height field over the mattress with a lump where Clawd is
const BW = 3.0, BL = 3.6, BX = -2.9, BZ = -1.65;
const blanketTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7fa6e0'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); }
  g.fillStyle = '#fff6c8'; for (let i = 0; i < 40; i++) { const x = rng() * w, y = rng() * h, r = 5 + rng() * 5; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); } });
const blGeo = new THREE.PlaneGeometry(BW, BL, 60, 72); blGeo.rotateX(-Math.PI / 2);
const blBase = blGeo.attributes.position.array.slice();
const blanket = new THREE.Mesh(blGeo, new THREE.MeshStandardMaterial({ map: blanketTex, roughness: 0.95, side: THREE.DoubleSide }));
blanket.castShadow = blanket.receiveShadow = true; scene.add(blanket);
function drapeBlanket(lump, lumpZ, lumpH, offset = new THREE.Vector3(), tilt = 0, flying = 0, wide = 0.42) {
  const p = blGeo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = blBase[i], z = blBase[i + 2];
    const ex = Math.max(0, Math.abs(x) - 1.32), ez = Math.max(0, z - 1.72);
    let y = BED.top + 0.12 - (ex > 0 ? Math.min(0.75, ex * 2.6) : 0) - (ez > 0 ? Math.min(0.75, ez * 2.6) : 0);
    y += lump * lumpH * Math.exp(-((x * x) / wide + ((z - lumpZ) ** 2) / 0.42));
    if (flying) { y = BED.top + flying * (1.6 + 0.5 * Math.sin(x * 2.1 + z * 1.3)) + z * tilt; }
    p[i] = x + BX + offset.x; p[i + 1] = y + offset.y; p[i + 2] = z + BZ + offset.z;
  }
  blGeo.attributes.position.needsUpdate = true; blGeo.computeVertexNormals();
}

// Clawd
const U = 0.13;
const variants = {};
for (const eyes of ['open', 'closed', 'wide', 'happy']) {
  const g = makeClawd(THREE, { unit: U, depth: 4, rounded: RoundedBoxGeometry, radius: 0.18, roughness: 0.55, pose: { eyes } });
  g.children.forEach((m) => { m.userData.y0 = m.position.y; m.userData.z0 = m.position.z; m.castShadow = true; });
  g.visible = false; scene.add(g); variants[eyes] = g;
}
// the foot that sticks out of the blanket (lie mode)
const footPivot = new THREE.Group(); footPivot.position.set(-1.6, BED.top + 0.2, -2.45); footPivot.rotation.y = -0.2; scene.add(footPivot);
const foot = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.2, 0.2, 2, 0.06), new THREE.MeshStandardMaterial({ color: '#d97757', roughness: 0.55 }));
foot.geometry.translate(0.22, 0, 0); foot.castShadow = true; footPivot.add(foot);
// feathers (drop)
const NFE = 90;
const feathers = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.07), new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.9, emissive: '#ffffff', emissiveIntensity: 0.15 }), NFE);
feathers.frustumCulled = false; scene.add(feathers);
const FE = Array.from({ length: NFE }, () => ({ a: rng() * 6.28, v: 1.2 + rng() * 2.4, up: 1.5 + rng() * 2.5, s: rng() * 6.28 }));

// lights
const hemi = new THREE.HemisphereLight('#6a78c8', '#2a2140', 0.75); scene.add(hemi);
const fillC = new THREE.SpotLight('#ffe2c6', 2.2, 0, 0.32, 0.8, 0); fillC.position.set(4, 8, 4); fillC.target.position.set(-2.9, 1.5, -2.9); scene.add(fillC, fillC.target);
const moon = new THREE.DirectionalLight('#9fb6ff', 0.75); moon.position.set(2, 7, -9); scene.add(moon);
const key = new THREE.DirectionalLight('#ffe7cf', 0.55); key.position.set(8, 10, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
{ const c = key.shadow.camera; c.left = -8; c.right = 8; c.top = 8; c.bottom = -8; c.near = 1; c.far = 40; } key.shadow.bias = -0.0005; scene.add(key);

const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.55, 0.6, 0.82); composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---- per-frame state ---------------------------------------------------------------------------------------------------
function state(t) {
  const ph = phase(t), down = 0.5 + 0.5 * Math.cos(2 * Math.PI * ph);
  const s = { mode: 'lie', eyes: 'closed', bounce: 0, pitch: 0, arms: 0, y: 0, sq: 0, phoneIn: false, foot: 0, light: 1, flicker: 1 };
  if (t < T_BASS) { s.mode = 'lie'; s.eyes = 'closed'; s.foot = down; }
  else if (t < T_SIT) { s.mode = 'lie'; s.eyes = 'wide'; s.bounce = down; s.foot = down; }
  else if (t < T_DRAG1) { s.mode = 'sit'; s.eyes = t >= T_LOOP2 ? 'happy' : 'open'; s.pitch = 0.05 + 0.24 * down; s.phoneIn = t >= T_SING; s.arms = t >= T_SING ? 1 : 0; }
  else if (t < T_DROP1 - 0.12) { s.mode = 'stand'; s.eyes = 'wide'; s.sq = 0.2 * ease((t - T_DRAG1) / 0.3); s.pitch = -0.15; s.light = 0.38;
    if (t >= T_DRAG1B) s.flicker = Math.floor(t / 0.13295) % 2 ? 1 : 0.35; }
  else if (t < T_SUM) { s.mode = 'fly'; s.eyes = 'happy'; const u = t - (T_DROP1 - 0.12); s.y = Math.max(0, 2.1 * Math.sin(Math.PI * clamp(u / 1.3, 0, 1))); s.arms = 2; s.pitch = -0.2; }
  else if (t < T_STOP) { s.mode = 'stand'; s.eyes = 'happy'; const h = 4 * ph * (1 - ph); s.y = 0.55 * h; s.arms = 2 * h; s.pitch = -0.1; }
  else { s.mode = 'lie'; s.eyes = 'open'; s.foot = down; s.light = 0.22; }
  return s;
}
function placeClawd(t, s) {
  for (const k in variants) variants[k].visible = false;
  const g = variants[s.eyes]; g.visible = true;
  g.children.forEach((m) => { m.position.y = m.userData.y0 + (m.userData.part === 'arm' ? s.arms * U : 0); });
  const legs = g.children.filter((m) => m.userData.part === 'leg');
  legs.forEach((m, i) => { m.rotation.x = 0; m.position.z = m.userData.z0 || 0; });
  if (s.mode === 'lie') {
    // tucked in: sitting against the pillow, blanket pulled up to the eyes
    g.position.set(-2.9, BED.top + 0.04 + 0.07 * s.bounce, -3.05);
    g.rotation.set(0.04 * s.bounce, 0.55, 0);
    g.scale.set(1, 1 - 0.04 * s.bounce, 1);
  } else if (s.mode === 'sit') {
    g.position.set(-2.9, BED.top + 0.05, -2.95); g.rotation.set(s.pitch, 0.55, 0); g.scale.set(1, 1, 1);
  } else {
    g.position.set(-2.9, BED.top + 0.05 + s.y, -2.0); g.rotation.set(s.pitch, 0.55, 0); g.scale.set(1 + s.sq * 0.5, 1 - s.sq, 1 + s.sq * 0.5);
  }
  return g;
}

const labels = document.createElement('div'); labels.className = 'labels'; stage.appendChild(labels);
const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
const NOTES = '♪ ♫ ♪ ♬';
function overlay(t, g) {
  let html = '', svg = '';
  const head = g.position.clone().add(new THREE.Vector3(0, 0.9, 0));
  const [hx, hy] = project(head);
  if (t >= T_SING && t < T_DRAG1) {
    if (t >= T_LOOP2) {
      html += `<div class="bub dim" style="left:${hx + 40}px;top:${hy - 330}px"><small>第1遍（8.5秒前）</small>${NOTES}</div>`;
      html += `<div class="bub" style="left:${hx + 70}px;top:${hy - 190}px"><small>第2遍</small>${NOTES}</div>`;
    } else html += `<div class="bub" style="left:${hx + 70}px;top:${hy - 190}px"><small>第1遍</small>${NOTES}</div>`;
    html += `<div class="tail" style="left:${hx + 40}px;top:${hy - 60}px"></div>`;
  }
  if (t >= T_SIT && t < T_SING) {
    const [mx, my] = project(metro.position.clone().add(new THREE.Vector3(0, 0.72, 0)));
    html += `<div class="lab" style="left:${mx + 34}px;top:${my - 70}px">下一拍 →</div>`;
  }
  if (state(t).mode === 'lie' && state(t).foot > 0.82) {
    const [fx, fy] = project(footPivot.position.clone().add(new THREE.Vector3(0.45, 0.05, 0.1)));
    html += `<div class="lab" style="left:${fx + 18}px;top:${fy - 34}px;color:#ffd36b;font-size:40px">嗒</div>`;
  }
  if (t >= T_STOP + 0.85) {
    html += `<div class="bub think" style="left:${hx + 30}px;top:${hy - 270}px">${NOTES} ↻</div>`;
    html += `<div class="tail" style="left:${hx + 22}px;top:${hy - 110}px;width:30px;height:30px"></div><div class="tail" style="left:${hx + 6}px;top:${hy - 62}px;width:18px;height:18px"></div>`;
  }
  labels.innerHTML = `<svg class="lines" width="${W}" height="${H}">${svg}</svg>${html}`;
}

const cues = (await loadCues('./cues.json')).cues;
const subs = makeSubs(stage, cues);

film.render = async (t) => {
  // iso camera (slow push-ins per unit)
  const zoom = t < T_BASS ? 1.0 : t < T_DRAG1 ? 1.08 : t < T_SUM ? 1.12 : t < T_STOP ? 1.04 : 1.1;
  camera.position.set(9.4, 11.6, 10.4); camera.lookAt(-2.25, 1.55, -2.45);
  camera.zoom = zoom * 1.72; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const s = state(t);
  const g = placeClawd(t, s);
  // blanket
  if (s.mode === 'lie') drapeBlanket(1, -1.0, 0.64 + 0.07 * s.bounce, undefined, 0, 0, 1.0);
  else if (s.mode === 'sit') drapeBlanket(1, -0.85, 0.3);
  else if (s.mode === 'fly') { const u = clamp((t - (T_DROP1 - 0.12)) / 1.3, 0, 1); drapeBlanket(0, 0, 0, new THREE.Vector3(0.4, 0, 0.6), 0.25, 0.4 + 1.0 * Math.sin(Math.PI * u)); }
  else drapeBlanket(0.2, 1.2, 0.2);
  footPivot.visible = s.mode === 'lie'; footPivot.rotation.z = 0.15 + 0.55 * s.foot;
  // phone
  if (s.phoneIn) { phone.position.copy(g.position).add(new THREE.Vector3(0.62, 0.62, 0.25)); phone.rotation.set(-1.1, 0.4, 0.3); }
  else if (t >= T_STOP) { phone.position.set(-0.75, 1.07, -3.55); phone.rotation.set(0, 0.3, 0); phoneScreen.material.color.set('#222'); }
  else { phone.position.set(-0.75, 1.07, -3.55); phone.rotation.set(0, 0.3, 0); phoneScreen.material.color.set('#ffffff'); }
  phoneLight.position.copy(phone.position).add(new THREE.Vector3(0, 0.3, 0)); phoneLight.intensity = t >= T_STOP ? 0 : (s.light < 0.5 ? 3.5 : 1.2);
  // metronome: extremes on the beats; dashed ghost at the next beat's extreme
  const ang = 0.45 * Math.cos(Math.PI * (t - PH) / BEAT);
  rodPivot.rotation.z = ang;
  const kNext = Math.ceil((t - PH) / BEAT); ghostPivot.rotation.z = 0.45 * Math.cos(Math.PI * kNext); ghostPivot.visible = t >= T_SIT && t < T_SING;
  // lights
  lamp.intensity = 9 * s.light * s.flicker; shadeMat.emissiveIntensity = 0.9 * s.light * s.flicker;
  hemi.intensity = 0.75 * (0.45 + 0.55 * s.light); key.intensity = 0.55 * s.light; fillC.intensity = 2.2 * (0.4 + 0.6 * s.light);
  // feathers
  const fu = t - T_DROP1;
  feathers.visible = fu >= 0 && fu < 2.2;
  if (feathers.visible) { const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    FE.forEach((f, i) => { const r = f.v * fu, y = BED.top + 0.4 + f.up * fu - 1.4 * fu * fu * 0.6; e.set(f.s + fu * 3, f.s * 2 + fu * 2, fu * 4); q.setFromEuler(e);
      M.compose(new THREE.Vector3(-2.9 + Math.cos(f.a) * r, Math.max(1.0, y), -3.6 + Math.sin(f.a) * r * 0.8), q, new THREE.Vector3(1, 1, 1)); feathers.setMatrixAt(i, M); });
    feathers.instanceMatrix.needsUpdate = true; }
  bloom.strength = s.light < 0.5 ? 0.75 : 0.5;
  composer.render();
  overlay(t, g);
  subs(t);
  await new Promise((r) => requestAnimationFrame(() => r()));
};
film.ready = true;
