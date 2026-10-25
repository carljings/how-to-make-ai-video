// P1 · 一万个Clawd，能同时点头吗？ — night stadium, 10,000+ instanced Clawds.
// Film time = source time of the original BGM. Every pose is a pure function of t (beat grid from src/music-map.json).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clawdGeometry, makeClawd } from '../common/clawd.js';
import { loadCues, makeSubs } from '../common/subs.js';

const film = window.film = { ready: false };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });

const W = 1080, H = 1920, U = 0.1;                    // one Clawd pixel unit = 10 cm (a Clawd is 1.2 m × 0.8 m)
const BEAT = 0.53178, PH = 0.3976;                      // measured grid
const T_BASS = 3.056, T_LOOP2 = 11.565, T_DRAG1 = 15.819, T_DRAG1B = 17.946, T_DROP1 = 20.073,
  T_DRAG2 = 28.582, T_DRAG2B = 30.709, T_DROP2 = 32.836, T_LAST = 37.09;
const LOOP = 16 * BEAT;                                 // 4 bars ≈ 8.51 s

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(20261021);
const frac = (x) => x - Math.floor(x);
const phase = (t) => frac((t - PH) / BEAT);
const nextBeat = (t) => PH + Math.ceil((t - PH) / BEAT + 1e-4) * BEAT;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const inDrag = (t) => (t >= T_DRAG1 && t < T_DROP1) || (t >= T_DRAG2 && t < T_DROP2);
const inDrop = (t) => (t >= T_DROP1 && t < T_DRAG2) || t >= T_DROP2;
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------------------------------------------------------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping;   // keeps the brand orange from washing out to salmon
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#04061a');
scene.fog = new THREE.FogExp2('#0b1030', 0.0068);
const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 900);

// sky dome + stars
{
  const g = new THREE.SphereGeometry(600, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#02030d') }, mid: { value: new THREE.Color('#141a4a') }, low: { value: new THREE.Color('#3a1846') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top, mid, low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.7, h)) : mix(low, mid, smoothstep(-0.05, 0.12, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(g, m));
  const sp = [];
  for (let i = 0; i < 900; i++) {
    const th = rng() * Math.PI * 2, ph = 0.12 + rng() * 1.2;
    sp.push(Math.cos(th) * Math.cos(ph) * 560, Math.sin(ph) * 560, Math.sin(th) * Math.cos(ph) * 560);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#c9d4ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
}

// ground, stage, barrier
const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: '#0e1018', roughness: 0.92 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const stageBox = new THREE.Mesh(new THREE.BoxGeometry(44, 1.6, 10), new THREE.MeshStandardMaterial({ color: '#0b0c12', roughness: 0.6, metalness: 0.3 }));
stageBox.position.set(0, 0.8, 5); scene.add(stageBox);
const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3d9a').multiplyScalar(2.2) });
const led = new THREE.Mesh(new THREE.BoxGeometry(44, 0.12, 0.12), ledMat); led.position.set(0, 1.62, 0.02); scene.add(led);
const barrier = new THREE.Mesh(new THREE.BoxGeometry(70, 1.1, 0.18), new THREE.MeshStandardMaterial({ color: '#444a58', roughness: 0.4, metalness: 0.8 }));
barrier.position.set(0, 0.55, -8.1); // no barrier: an open pit keeps the front row visible

// ---------------------------------------------------------------------------------------------------------------
// crowd layout: floor 40×50, main stand 60×75, two side stands 42×42  → 10,028 Clawds
const crowd = [];
const STAGE_C = new THREE.Vector3(0, 0, 4);
function addC(x, y, z, grp, extra = {}) {
  const yaw = Math.atan2(STAGE_C.x - x, STAGE_C.z - z) * (grp === 'floor' ? 0.35 : 0.85) + (rng() - 0.5) * 0.3;
  crowd.push({ x, y, z, grp, yaw, f: 1.4 + rng() * 1.1, r1: rng(), r2: rng(), r3: rng(), jit: (rng() - 0.5) * 0.03,
    d: Math.hypot(x, z - 2), tone: 0.84 + rng() * 0.24, phone: rng() < 0.035, ...extra });
}
for (let iz = 0; iz < 40; iz++) for (let ix = 0; ix < 50; ix++)
  addC(-33.1 + ix * 1.35 + (iz % 2 ? 0.67 : 0) + (rng() - 0.5) * 0.28, 0, -9.4 - iz * 1.33 + (rng() - 0.5) * 0.26, 'floor', { row: iz, col: ix });
const MAIN_ROWS = 60, MAIN_COLS = 75, MAIN_Z0 = -66, ROW_D = 1.15, ROW_H = 0.8;
for (let r = 0; r < MAIN_ROWS; r++) for (let c = 0; c < MAIN_COLS; c++)
  addC(-51.8 + c * 1.4 + (rng() - 0.5) * 0.36, 0.6 + r * ROW_H, MAIN_Z0 - r * ROW_D + (rng() - 0.5) * 0.2, 'main', { row: r, col: c, s: 0.33 + (c / (MAIN_COLS - 1)) * 0.34 });
for (const side of [-1, 1]) for (let r = 0; r < 42; r++) for (let c = 0; c < 42; c++)
  addC(side * (37 + r * ROW_D) + (rng() - 0.5) * 0.2, 0.6 + r * ROW_H, -4 - c * 1.35 + (rng() - 0.5) * 0.36, 'side', { row: r, col: c, s: side < 0 ? (c / 41) * 0.33 : 0.67 + (1 - c / 41) * 0.33 });
const N = crowd.length;
film.crowdCount = N;

// stands (risers)
{
  const mat = new THREE.MeshStandardMaterial({ color: '#191b26', roughness: 0.85 });
  for (let r = 0; r < MAIN_ROWS; r++) {
    const h = 0.6 + r * ROW_H;
    const b = new THREE.Mesh(new THREE.BoxGeometry(110, h, ROW_D), mat); b.position.set(0, h / 2, MAIN_Z0 - r * ROW_D); scene.add(b);
  }
  for (const side of [-1, 1]) for (let r = 0; r < 42; r++) {
    const h = 0.6 + r * ROW_H;
    const b = new THREE.Mesh(new THREE.BoxGeometry(ROW_D, h, 60), mat); b.position.set(side * (37 + r * ROW_D), h / 2, -32); scene.add(b);
  }
  // roof edge + lamp heads
  const roofMat = new THREE.MeshStandardMaterial({ color: '#0d0e16', roughness: 0.7, metalness: 0.5 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(150, 3, 6), roofMat); roof.position.set(0, 58, MAIN_Z0 - MAIN_ROWS * ROW_D - 2); scene.add(roof);
  for (const side of [-1, 1]) { const r2 = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 140), roofMat); r2.position.set(side * (37 + 44 * ROW_D), 46, -60); scene.add(r2); }
}
const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2d8').multiplyScalar(3) });
const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.7, 12, 8), lampMat, 40);
{
  const m = new THREE.Matrix4();
  for (let i = 0; i < 24; i++) { m.makeTranslation(-66 + i * 5.7, 56.2, MAIN_Z0 - MAIN_ROWS * ROW_D + 1); lamps.setMatrixAt(i, m); }
  for (let i = 0; i < 16; i++) { const side = i < 8 ? -1 : 1; m.makeTranslation(side * 86, 44.2, -12 - (i % 8) * 15); lamps.setMatrixAt(24 + i, m); }
  scene.add(lamps);
}

// instanced Clawds (box style for the crowd)
const crowdMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.0 });
const bodyGeo = clawdGeometry(THREE, { unit: U, depth: 4, parts: ['body', 'leg', 'eye'] });
const armGeo = clawdGeometry(THREE, { unit: U, depth: 4, parts: ['arm'] });
const bodies = new THREE.InstancedMesh(bodyGeo, crowdMat, N);
const arms = new THREE.InstancedMesh(armGeo, crowdMat, N);
bodies.frustumCulled = arms.frustumCulled = false;
{
  const col = new THREE.Color();
  crowd.forEach((c, i) => { col.setRGB(c.tone, c.tone, c.tone); bodies.setColorAt(i, col); arms.setColorAt(i, col); });
}
scene.add(bodies, arms);
const phoneIdx = crowd.map((c, i) => (c.phone ? i : -1)).filter((i) => i >= 0);
const phoneMat = new THREE.MeshBasicMaterial({ color: '#dfe8ff' });
const phones = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.24, 0.03), phoneMat, phoneIdx.length);
phones.frustumCulled = false; scene.add(phones);
const phoneOf = new Map(phoneIdx.map((ci, k) => [ci, k]));

// card stunt (main stand) — vertical banner “上 / 头” in the central 31 columns
const MOS_C0 = 22, MOS_C1 = 53, MOS_R0 = 3, MOS_R1 = 58;
function mosaicBitmap(lines, cols, rows) {
  const S = 10, c = document.createElement('canvas'); c.width = cols * S; c.height = rows * S;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#fff';
  const fs = Math.min(c.width * 0.98, c.height / lines.length * 0.95);
  g.font = `700 ${fs}px "Noto Sans CJK SC"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((s, k) => g.fillText(s, c.width / 2, c.height * (k + 0.5) / lines.length + fs * 0.03));
  const d = g.getImageData(0, 0, c.width, c.height).data, out = [];
  for (let r = 0; r < rows; r++) { const row = []; for (let k = 0; k < cols; k++) { let s = 0; for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) s += d[((r * S + yy) * c.width + k * S + xx) * 4]; row.push(s / (S * S * 255)); } out.push(row); }
  return out;
}
const cardIdx = crowd.map((c, i) => (c.grp === 'main' ? i : -1)).filter((i) => i >= 0);
const cardMat = new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.0 });
const cards = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.36, 1.3), cardMat, cardIdx.length);
cards.frustumCulled = false; cards.visible = false; scene.add(cards);
let mosaicReady = false;
function buildMosaic() {
  const bmp = mosaicBitmap(['上', '头'], MOS_C1 - MOS_C0, MOS_R1 - MOS_R0);
  const ink = new THREE.Color('#f3e7d2'), bg = new THREE.Color('#d97757'), bg2 = new THREE.Color('#c4613f');
  cardIdx.forEach((ci, k) => {
    const c = crowd[ci];
    let v = 0;
    if (c.col >= MOS_C0 && c.col < MOS_C1 && c.row >= MOS_R0 && c.row < MOS_R1) v = bmp[(MOS_R1 - 1) - c.row][c.col - MOS_C0];
    cards.setColorAt(k, v > 0.45 ? ink : ((c.row + c.col) % 7 === 0 ? bg2 : bg));
  });
  cards.instanceColor.needsUpdate = true; mosaicReady = true;
}

// hero Clawds (front row, rounded) + prediction ghosts
const heroIdx = [];
for (const x of [-1.35, 0, 1.35]) {
  let best = -1, bd = 1e9;
  crowd.forEach((c, i) => { if (c.grp === 'floor' && c.row === 0) { const d = Math.abs(c.x - x); if (d < bd) { bd = d; best = i; } } });
  heroIdx.push(best);
}
heroIdx.forEach((i, k) => { const c = crowd[i]; c.x = [-1.4, 0, 1.4][k]; c.z = -9.4; c.yaw = [0.06, 0, -0.06][k]; c.jit = 0; });
const heroes = heroIdx.map(() => {
  const g = makeClawd(THREE, { unit: U, depth: 4, rounded: RoundedBoxGeometry, radius: 0.16, roughness: 0.5 });
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(g); return g;
});
const ghostMat = new THREE.MeshBasicMaterial({ color: '#36e6ff', transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending });
const ghostEyeMat = new THREE.MeshBasicMaterial({ visible: false });
const ghostLine = new THREE.LineBasicMaterial({ color: '#8ff7ff', transparent: true, opacity: 0.95 });
const ghosts = heroIdx.map(() => {
  const g = makeClawd(THREE, { unit: U, depth: 4, material: ghostMat });
  g.traverse((o) => { if (o.isMesh) { const eye = !o.userData.part; o.material = eye ? ghostEyeMat : ghostMat; o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), ghostLine)); } });
  g.visible = false; scene.add(g); return g;
});
for (const g of [...heroes, ...ghosts]) g.children.forEach((m) => { m.userData.y0 = m.position.y; });

// confetti
const CONF = 3200;
const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.26), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.25 }), CONF);
confetti.frustumCulled = false;
const confData = [];
{
  const pal = ['#ffd84d', '#ff4fa3', '#41dcff', '#ffffff', '#ffb347'].map((c) => new THREE.Color(c));
  for (let i = 0; i < CONF; i++) {
    confData.push({ x: (rng() - 0.5) * 70, y0: 4 + rng() * 26, z: -7 - rng() * 70, rx: rng() * 6, ry: rng() * 6, sp: 0.6 + rng() * 1.2, w: rng() * 6 });
    confetti.setColorAt(i, pal[i % pal.length]);
  }
  scene.add(confetti);
}

// volumetric beams (fake: additive cones with view-angle falloff)
const beamGeo = new THREE.CylinderGeometry(0.18, 3.6, 1, 32, 1, true); beamGeo.translate(0, -0.5, 0);
const beamVS = 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = uv.y; gl_Position = projectionMatrix * mv; }';
const beamFS = 'uniform vec3 color; uniform float k; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float a = pow(vY, 1.7); gl_FragColor = vec4(color * k * f * a, 1.0); }';
const beams = [];
function addBeam(from, to, color, len = 140) {
  const m = new THREE.ShaderMaterial({ uniforms: { color: { value: new THREE.Color(color) }, k: { value: 1 } }, vertexShader: beamVS, fragmentShader: beamFS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const b = new THREE.Mesh(beamGeo, m);
  b.position.copy(from); b.scale.set(1, len, 1);
  b.userData = { from: from.clone(), to: to.clone(), color };
  aimBeam(b, to);
  scene.add(b); beams.push(b); return b;
}
function aimBeam(b, to) {
  const dir = to.clone().sub(b.position).normalize();
  b.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
}
const BEAM_COLORS = ['#ff3d9a', '#33d6ff', '#ffffff', '#b04dff'];
for (let i = 0; i < 8; i++) addBeam(new THREE.Vector3(-21 + i * 6, 20, 6), new THREE.Vector3(-30 + i * 8.5, 0, -70), BEAM_COLORS[i % 4]);
for (let i = 0; i < 6; i++) addBeam(new THREE.Vector3(-40 + i * 16, 55, MAIN_Z0 - 70), new THREE.Vector3(-20 + i * 8, 0, -20), BEAM_COLORS[(i + 1) % 4], 160);
const spotBeam = addBeam(new THREE.Vector3(0, 34, 2), new THREE.Vector3(0, 0, -26), '#fff6e0', 60);

// lights
const hemi = new THREE.HemisphereLight('#4a5aa8', '#0a0a10', 0.5); scene.add(hemi);
const wash = new THREE.SpotLight('#ffe9d2', 0, 0, 0.62, 0.75, 0); wash.position.set(0, 36, 22); wash.target.position.set(0, 0, -52); scene.add(wash, wash.target);
const washStand = new THREE.SpotLight('#ffe2c4', 0, 0, 0.42, 0.6, 0); washStand.position.set(0, 30, 10); washStand.target.position.set(0, 26, -100); scene.add(washStand, washStand.target);
const rimL = new THREE.DirectionalLight('#ff3d9a', 0); rimL.position.set(-70, 40, -170); scene.add(rimL);
const rimR = new THREE.DirectionalLight('#33d6ff', 0); rimR.position.set(70, 40, -170); scene.add(rimR);
const key = new THREE.SpotLight('#ffd8b0', 0, 0, 0.5, 0.6, 0); key.position.set(3, 6, -2.5); key.target.position.set(0, 0.4, -9.4);
key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 20; scene.add(key, key.target);

// post
const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 3.5, aperture: 0.004, maxblur: 0.012 });
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.8, 0.55, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------------------------------------------
function crowdPose(c, t) {
  const p = { dy: 0, pitch: 0, roll: 0, sq: 0, arms: 0, yawJ: 0, card: 0 };
  const tSync = T_BASS + c.d * 0.0042;
  if (t < tSync) {                                           // before the bass: everyone on their own clock
    const ph = t * c.f + c.r1;
    p.pitch = 0.1 + 0.2 * Math.sin(2 * Math.PI * ph);
    p.dy = 0.04 * Math.max(0, Math.sin(2 * Math.PI * (ph + 0.2)));
    p.yawJ = 0.34 * Math.sin(2 * Math.PI * (t * 0.27 + c.r2));
    p.roll = 0.12 * Math.sin(2 * Math.PI * (t * c.f * 0.5 + c.r3));
    p.sq = 0.04 * Math.sin(2 * Math.PI * (ph + 0.5));
    return p;
  }
  const tt = t + c.jit, ph = phase(tt);
  const down = 0.5 + 0.5 * Math.cos(2 * Math.PI * ph);    // 1 on the beat
  if (inDrag(t)) {                                           // bass thinned: crouch and hold
    const k = smooth(t < T_DROP1 ? T_DRAG1 : T_DRAG2, (t < T_DROP1 ? T_DRAG1 : T_DRAG2) + 0.3, t);
    p.sq = 0.2 * k; p.dy = -0.05 * k; p.pitch = lerp(0.1, -0.16, k);
    if ((t >= T_DRAG1B && t < T_DROP1) || (t >= T_DRAG2B && t < T_DROP2)) p.dy += 0.014 * Math.sin(2 * Math.PI * t / 0.133);
    return p;
  }
  if (inDrop(t)) {                                           // jump on every beat, arms up
    const h = 4 * ph * (1 - ph);
    p.dy = (c.grp === 'floor' ? 0.7 : 0.38) * h; p.arms = 2; p.pitch = -0.08 + 0.1 * (1 - h);
    p.sq = -0.06 * h + 0.16 * Math.max(0, 1 - ph * 7);
    if (c.grp === 'main' && t >= T_DROP2 + 0.18) { p.card = 1; p.dy = 0.05; p.pitch = -0.05; p.sq = 0; }
    return p;
  }
  p.pitch = 0.03 + 0.27 * down; p.dy = -0.035 * down; p.sq = 0.06 * down;
  if (c.grp !== 'floor') {                                   // the stadium wave: one lap per 4-bar loop
    const w = frac((t - T_BASS) / LOOP);
    let ds = w - c.s; ds -= Math.round(ds);
    const lead = t >= T_LOOP2 ? 0.06 : 0.016;               // 2nd lap: up before the wave arrives
    const a = ds > -lead && ds < 0.04 ? Math.sin(Math.PI * clamp((ds + lead) / (lead + 0.04), 0, 1)) : 0;
    if (a > 0) { p.dy += 0.42 * a; p.arms = 2 * a; p.pitch -= 0.25 * a; p.sq -= 0.08 * a; }
  }
  return p;
}

const M = new THREE.Matrix4(), MP = new THREE.Matrix4(), MA = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), V = new THREE.Vector3(), T = new THREE.Matrix4();
function poseMatrix(c, p, out) {
  E.set(p.pitch, c.yaw + p.yawJ, p.roll, 'YXZ'); Q.setFromEuler(E);
  V.set(c.x, c.y + p.dy, c.z); S.set(1 + p.sq * 0.5, 1 - p.sq, 1 + p.sq * 0.5);
  return out.compose(V, Q, S);
}
function applyHero(g, c, p) {
  poseMatrix(c, p, M); g.matrixAutoUpdate = false; g.matrix.copy(M);
  g.children.forEach((m) => { if (m.userData.part === 'arm') m.position.y = m.userData.y0 + p.arms * U; });
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function updateCrowd(t) {
  let k = 0;
  const heroSet = new Set(heroIdx);
  for (let i = 0; i < N; i++) {
    const c = crowd[i];
    if (heroSet.has(i)) { bodies.setMatrixAt(i, ZERO); arms.setMatrixAt(i, ZERO); if (c.grp === 'main') cards.setMatrixAt(k++, ZERO); continue; }
    if (Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < 1.1) { bodies.setMatrixAt(i, ZERO); arms.setMatrixAt(i, ZERO); if (c.grp === 'main') cards.setMatrixAt(k++, ZERO); continue; }
    const p = crowdPose(c, t);
    poseMatrix(c, p, M);
    bodies.setMatrixAt(i, M);
    T.makeTranslation(0, p.arms * U, 0); MA.multiplyMatrices(M, T); arms.setMatrixAt(i, MA);
    if (phoneOf.has(i)) { T.makeTranslation(0.78, 0.98 + p.arms * U, 0.32); phones.setMatrixAt(phoneOf.get(i), MP.multiplyMatrices(M, T)); }
    if (c.grp === 'main') {
      if (p.card) {
        E.set(0.42, c.yaw, 0, 'YXZ'); Q.setFromEuler(E); V.set(c.x, c.y + 1.45, c.z + 0.1); S.set(1, 1, 1);
        cards.setMatrixAt(k++, T.compose(V, Q, S));
      } else cards.setMatrixAt(k++, ZERO);
    }
  }
  bodies.instanceMatrix.needsUpdate = arms.instanceMatrix.needsUpdate = cards.instanceMatrix.needsUpdate = phones.instanceMatrix.needsUpdate = true;
  phoneMat.color.set('#dfe8ff').multiplyScalar(t < T_BASS ? 2.6 : inDrag(t) ? 3.2 : inDrop(t) ? 0.9 : 1.3);
  cards.visible = t >= T_DROP2 + 0.18;
  heroIdx.forEach((i, h) => applyHero(heroes[h], crowd[i], crowdPose(crowd[i], t)));
}

function updateConfetti(t) {
  const t0 = t >= T_DROP2 ? T_DROP2 : t >= T_DROP1 ? T_DROP1 : null;
  confetti.visible = t0 !== null && t - t0 < (t0 === T_DROP2 ? 4.2 : 8);
  if (!confetti.visible) return;
  const dt = t - t0;
  for (let i = 0; i < CONF; i++) {
    const d = confData[i];
    const burst = Math.min(1, dt * 3);
    const y = d.y0 * burst + 6 - dt * d.sp * (t0 === T_DROP2 ? 4.2 : 1.6);
    E.set(d.rx + dt * 3 * d.sp, d.ry + dt * 2, d.w);
    Q.setFromEuler(E); V.set(d.x + Math.sin(dt * 2 + d.w) * 0.6, Math.max(0.2, y), d.z); S.set(1, 1, 1);
    confetti.setMatrixAt(i, M.compose(V, Q, S));
  }
  confetti.instanceMatrix.needsUpdate = true;
}

let closeShot = false;
function lights(t) {
  let s;
  if (t < T_BASS) s = { wash: 0.5, stand: 0.25, rim: 0.7, beams: 0.22, hemi: 0.4, exp: 0.9 };
  else if (inDrag(t)) s = { wash: 0.55, stand: 0.25, rim: 0.9, beams: 0.0, hemi: 0.3, spot: 1.0, exp: 0.95 };
  else if (t >= T_DROP2 + 0.18) s = { wash: 1.6, stand: 0.62, rim: 1.6, beams: 0.25, hemi: 0.45, exp: 0.95 };
  else if (inDrop(t)) s = { wash: 2.4, stand: 1.8, rim: 3.2, beams: 1.5, hemi: 0.7, exp: 1.05 };
  else s = { wash: 1.9, stand: 1.3, rim: 2.4, beams: 1.05, hemi: 0.55, exp: 1.0 };
  const hit = t >= T_BASS ? Math.max(0, 1 - (t - T_BASS) / 0.5) : 0;
  wash.intensity = s.wash * 1.6 * (1 + hit * 0.8);
  washStand.intensity = s.stand * 1.5;
  rimL.intensity = s.rim * (closeShot ? 0.35 : 1); rimR.intensity = s.rim * (closeShot ? 0.6 : 1);
  hemi.intensity = s.hemi;
  renderer.toneMappingExposure = s.exp;
  for (const b of beams) {
    if (b === spotBeam) { b.material.uniforms.k.value = s.spot ? 0.55 : 0; continue; }
    const sweep = Math.sin(t * 0.9 + b.userData.from.x * 0.13) * 10;
    const to = b.userData.to.clone(); to.x += sweep;
    aimBeam(b, to);
    b.material.uniforms.k.value = s.beams * (t < T_BASS ? (b.userData.color === '#33d6ff' ? 1 : 0.15) : 1) * 0.2;
  }
  ledMat.color.set(t < T_BASS ? '#3355ff' : inDrag(t) ? '#ffffff' : '#ff3d9a').multiplyScalar(t < T_BASS ? 1.2 : 2.4);
}

// camera shots
const SHOTS = [
  { t: 0, pos: [0, 7.4, -3.2], tgt: [0, 2.6, -40], fov: 54 },                    // over the barrier, the whole crowd
  { t: 5.184, pos: [0.5, 1.02, -6.15], tgt: [0.02, 0.2, -9.4], fov: 46, dof: [3.3, 0.004, 0.012], key: 0.7 }, // front row
  { t: 11.565, pos: [-26, 40, 16], tgt: [0, 8, -62], fov: 50 },                 // high wide (the wave)
  { t: 15.819, pos: [0, 2.0, -5.4], tgt: [0, 3.2, -40], fov: 62 },               // in the pit, crouched crowd
  { t: 20.073, pos: [0.2, 0.22, -6.6], tgt: [-0.2, 3.4, -16], fov: 64, key: 0.5 },   // drop: low angle from the pit
  { t: 24.328, pos: [0.42, 1.12, -6.75], tgt: [0.05, 0.5, -9.4], fov: 44, dof: [2.7, 0.0042, 0.012], key: 1 },
  { t: 28.582, pos: [0, 7.4, -3.2], tgt: [0, 2.6, -40], fov: 54 },
  { t: 32.836, pos: [0, 10.5, 4.5], tgt: [0, 19, -100], fov: 54 },              // card stunt
];
function shotAt(t) { let s = SHOTS[0]; for (const x of SHOTS) if (t >= x.t) s = x; return s; }

// labels (3D-anchored) for the prediction ghost
const labels = document.createElement('div'); labels.className = 'labels'; stage.appendChild(labels);
function project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
function drawLabels(t, shot) {
  labels.innerHTML = '';
  if (!(t >= 5.184 && t < 11.565)) return;
  const hero = crowd[heroIdx[1]];
  const tip = new THREE.Vector3(hero.x + 0.45, 0.62, hero.z + 0.45);
  const [x, y] = project(tip);
  const lx = 560, ly = 560;
  labels.innerHTML = `<svg class="lines" width="${W}" height="${H}"><path d="M${lx - 12},${ly + 26} L${x},${y}" stroke="#8ff4ff" stroke-width="3" fill="none"/><circle cx="${x}" cy="${y}" r="7" fill="#8ff4ff"/></svg>
    <div class="lab" style="left:${lx}px;top:${ly}px">下一拍，它会在这<small>（预判 · 示意）</small></div>`;
  // beat strip: past beats solid, next beat dashed; playhead = now
  const nb = nextBeat(t), pxPerS = 280, x0 = 430;
  let html = '<div class="strip"><div class="bar"></div>';
  for (let k = -3; k <= 1; k++) {
    const bt = nb + k * BEAT; const xx = x0 + (bt - t) * pxPerS;
    html += `<div class="dot${k === 0 ? ' next' : ''}" style="left:${xx}px;${k > 0 ? 'opacity:.35' : ''}"></div>`;
  }
  html += `<div class="head" style="left:${x0}px"></div><div class="t" style="left:${x0}px">现在</div><div class="t" style="left:${x0 + (nb - t) * pxPerS}px;color:#8ff4ff">下一拍</div></div>`;
  labels.insertAdjacentHTML('beforeend', html);
}

// ---------------------------------------------------------------------------------------------------------------
const cues = (await loadCues('./cues.json')).cues;
const subs = makeSubs(stage, cues);

film.render = async (t) => {
  if (!mosaicReady) { await document.fonts.load('700 100px "Noto Sans CJK SC"'); buildMosaic(); }
  const shot = shotAt(t);
  camera.position.set(...shot.pos); camera.fov = shot.fov; camera.updateProjectionMatrix(); camera.lookAt(...shot.tgt);
  camera.updateMatrixWorld();
  bokeh.enabled = !!shot.dof;
  if (shot.dof) { bokeh.uniforms.focus.value = shot.dof[0]; bokeh.uniforms.aperture.value = shot.dof[1]; bokeh.uniforms.maxblur.value = shot.dof[2]; }
  key.intensity = (shot.key || 0) * 3.2;
  closeShot = !!shot.key;
  lights(t);
  updateCrowd(t);
  updateConfetti(t);
  const showGhost = t >= 5.184 && t < 11.565;
  heroIdx.forEach((i, h) => {
    ghosts[h].visible = showGhost;
    if (showGhost) applyHero(ghosts[h], crowd[i], crowdPose(crowd[i], nextBeat(t)));
  });
  bloom.strength = t >= T_DROP2 + 0.18 ? 0.45 : closeShot ? 0.5 : inDrop(t) ? 1.0 : t < T_BASS ? 0.7 : 0.85;
  bloom.threshold = t >= T_DROP2 + 0.18 ? 0.9 : 0.72;
  composer.render();
  drawLabels(t, shot);
  subs(t);
  await new Promise((r) => requestAnimationFrame(() => r()));
};
await document.fonts.load('700 80px "Noto Sans CJK SC"');
film.ready = true;
