// P2 · 鼓槌砸下来之前，谁会先跳？ — macro “high-speed photography” of a drum skin, rice grains and a felt mallet.
// Grains only react (they leave the skin after each hit); Clawd anticipates (leaves before the hit).
// Film time = source time of the original BGM; the picture freezes (music keeps playing) at 3.056 s and 20.073 s.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeClawd } from '../common/clawd.js';
import { loadCues, makeSubs } from '../common/subs.js';

const film = window.film = { ready: false };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });

const W = 1080, H = 1920;
const BEAT = 0.53178, PH = 0.3976;
const T_BASS = 3.056, T_LOOP2 = 11.565, T_DRAG1 = 15.819, T_DRAG1B = 17.946, T_DROP1 = 20.073, T_OUT = 24.328, T_END = 26.455;
const FREEZES = [[3.056, 3.46, 3.056], [20.38, 20.8, 20.38]];   // [from, to, picture time shown while frozen]
const vt = (t) => { for (const [a, b, v] of FREEZES) if (t >= a && t < b) return v; return t; };
const frozen = (t) => FREEZES.some(([a, b]) => t >= a && t < b);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(23);

// mallet hits = the beat grid while the bass is present (not during the thinned bars); the drop is drawn bigger
const HITS = [];
for (let k = 0; k < 80; k++) {
  const tb = PH + k * BEAT;
  if (tb < T_BASS - 0.01 || tb > T_END + 0.01) continue;
  if (tb > T_DRAG1 - 0.01 && tb < T_DROP1 - 0.01) continue;
  HITS.push({ t: tb, s: Math.abs(tb - T_DROP1) < 0.01 ? 2.6 : 1 });
}
const lastHits = (t, n = 3) => HITS.filter((h) => h.t <= t + 0.2).slice(-n);
const IMPACT = new THREE.Vector3(2.7, 0, -2.5);

// ---------------------------------------------------------------------------------------------------------------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#020203');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);

// skin: polar grid, displaced on the CPU every frame
const R = 26, RINGS = 210, SEGS = 256;
const skinGeo = new THREE.BufferGeometry();
const skinPos = new Float32Array((RINGS + 1) * SEGS * 3), skinUV = new Float32Array((RINGS + 1) * SEGS * 2), skinXZ = [];
for (let i = 0; i <= RINGS; i++) {
  const r = R * Math.pow(i / RINGS, 1.65);
  for (let j = 0; j < SEGS; j++) {
    const a = (j / SEGS) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, k = i * SEGS + j;
    skinPos[k * 3] = x; skinPos[k * 3 + 2] = z; skinUV[k * 2] = x / (2 * R) + 0.5; skinUV[k * 2 + 1] = z / (2 * R) + 0.5; skinXZ.push(x, z);
  }
}
const idx = [];
for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEGS; j++) {
  const a = i * SEGS + j, b = i * SEGS + (j + 1) % SEGS, c = (i + 1) * SEGS + j, d = (i + 1) * SEGS + (j + 1) % SEGS;
  idx.push(a, c, b, b, c, d);
}
skinGeo.setAttribute('position', new THREE.BufferAttribute(skinPos, 3));
skinGeo.setAttribute('uv', new THREE.BufferAttribute(skinUV, 2));
skinGeo.setIndex(idx);
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
const skin = new THREE.Mesh(skinGeo, new THREE.MeshStandardMaterial({ map: fib, bumpMap: fib, bumpScale: 0.6, color: '#efe5d3', roughness: 0.8, metalness: 0 }));
skin.receiveShadow = true; scene.add(skin);
// hoop + lugs (far away, they become bokeh highlights)
const chrome = new THREE.MeshStandardMaterial({ color: '#d8dde4', metalness: 1, roughness: 0.12 });
const hoop = new THREE.Mesh(new THREE.TorusGeometry(R + 0.4, 0.55, 20, 240), chrome); hoop.rotation.x = Math.PI / 2; hoop.position.y = 0.25; scene.add(hoop);
for (let i = 0; i < 18; i++) {
  const a = (i / 18) * Math.PI * 2, lug = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.2, 16), chrome);
  lug.position.set(Math.cos(a) * (R + 1.2), -0.6, Math.sin(a) * (R + 1.2)); scene.add(lug);
}
const shell = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.9, R + 0.9, 18, 160, 1, true), new THREE.MeshStandardMaterial({ color: '#5b1d14', roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide }));
shell.position.y = -9.1; scene.add(shell);

function skinH(x, z, tv) {
  let h = 0;
  for (const hit of lastHits(tv)) {
    const u = tv - hit.t;
    if (u < 0) continue;
    const r2 = (x - IMPACT.x) ** 2 + (z - IMPACT.z) ** 2, r = Math.sqrt(r2);
    const D = u < 0.035 ? u / 0.035 : Math.exp(-(u - 0.035) / 0.075);
    h += hit.s * (-0.3 * D * Math.exp(-r2 / 2.2) + 0.07 * Math.exp(-u / 0.22) * Math.exp(-((r - 10 * u) ** 2) / 0.6) * Math.min(1, r / 2));
  }
  return h;
}
function updateSkin(tv) {
  for (let k = 0; k < skinXZ.length / 2; k++) skinPos[k * 3 + 1] = skinH(skinXZ[k * 2], skinXZ[k * 2 + 1], tv);
  skinGeo.attributes.position.needsUpdate = true;
  skinGeo.computeVertexNormals();
}

// grains
const NG = 5600;
const grainGeo = new THREE.SphereGeometry(1, 12, 8); grainGeo.scale(0.105, 0.042, 0.045);
const grains = new THREE.InstancedMesh(grainGeo, new THREE.MeshPhysicalMaterial({ color: '#e9e1d2', roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.5 }), NG);
grains.castShadow = true; grains.receiveShadow = true; grains.frustumCulled = false; scene.add(grains);
const G = [];
for (let i = 0; i < NG; i++) {
  const r = 0.8 + 9.5 * Math.pow(rng(), 1.35), a = rng() * Math.PI * 2;
  G.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, yaw: rng() * Math.PI * 2, tilt: (rng() - 0.5) * 0.3, v: 0.6 + rng() * 0.8, spin: (rng() - 0.5) * 30, ph: rng(), lean: rng() });
}
const GRAV = 22;
function grainLift(g, tv) {
  let best = 0, rot = 0;
  const r = Math.hypot(g.x - IMPACT.x, g.z - IMPACT.z);
  for (const hit of lastHits(tv)) {
    const delay = 0.025 + r / 30, u = tv - hit.t - delay;
    if (u <= 0) continue;
    const v0 = hit.s * 3.6 * g.v * Math.exp(-r / (hit.s > 1 ? 8.5 : 3.2));
    const y = v0 * u - 0.5 * GRAV * u * u;
    if (y > best) { best = y; rot = u * g.spin * Math.min(1, v0 / 3); }
  }
  return [best, rot];
}
const MG = new THREE.Matrix4(), QG = new THREE.Quaternion(), EG = new THREE.Euler(), VG = new THREE.Vector3(), SG = new THREE.Vector3(1, 1, 1);
function updateGrains(tv) {
  for (let i = 0; i < NG; i++) {
    const g = G[i];
    let [lift, rot] = grainLift(g, tv);
    if (tv < T_BASS) lift += 0.014 * Math.abs(Math.sin(Math.PI * (tv / 0.2659 + g.ph)));          // intro: the thin pulse barely moves them
    if (tv >= T_DRAG1B && tv < T_DROP1) lift += 0.022 * Math.abs(Math.sin(Math.PI * (tv / 0.13295 + g.ph)) ** 3); // 16th-note shiver
    EG.set(g.tilt + rot * 0.6, g.yaw + rot, rot * 0.3);
    QG.setFromEuler(EG);
    VG.set(g.x, skinH(g.x, g.z, tv) + 0.041 + lift, g.z);
    grains.setMatrixAt(i, MG.compose(VG, QG, SG));
  }
  grains.instanceMatrix.needsUpdate = true;
}

// Clawd (rounded, ~1.2 × 0.8 units)
const U = 0.1;
function buildClawd(eyes) {
  const g = makeClawd(THREE, { unit: U, depth: 4, rounded: RoundedBoxGeometry, radius: 0.16, roughness: 0.48, pose: { eyes } });
  g.children.forEach((m) => { m.userData.y0 = m.position.y; m.castShadow = true; });
  return g;
}
const clawdOpen = buildClawd('open'), clawdClosed = buildClawd('closed'), clawdWide = buildClawd('wide');
const clawdRig = new THREE.Group(); clawdRig.add(clawdOpen, clawdClosed, clawdWide); scene.add(clawdRig);
const strobe = [];
for (let k = 0; k < 7; k++) {
  const g = makeClawd(THREE, { unit: U, depth: 4, rounded: RoundedBoxGeometry, radius: 0.16 });
  g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.depthWrite = false; } });
  g.children.forEach((m) => { m.userData.y0 = m.position.y; });
  g.visible = false; scene.add(g); strobe.push(g);
}
function clawdState(tv) {
  const st = { y: 0, sq: 0, arms: 0, pitch: -0.12 };
  if (tv < T_BASS) { st.pitch = -0.2; return st; }                                     // looking up at the mallet
  if (tv >= T_DRAG1 && tv < T_DROP1 - 0.2) { st.sq = 0.2 * smooth(T_DRAG1, T_DRAG1 + 0.3, tv); st.pitch = -0.28; st.y = -0.02; return st; }
  for (const hit of lastHits(tv + 0.3, 4)) {
    const big = hit.s > 1;
    const t0 = hit.t - (big ? 0.2 : 0.14), T = big ? 1.05 : 0.38, hmax = big ? 2.35 : 0.56;
    const u = tv - t0;
    if (u >= -0.08 && u < 0) { st.sq = 0.16 * (1 + u / 0.08 * -1 * -1); }               // crouch just before take-off
    if (u >= 0 && u < T) { const k = u / T; st.y = 4 * hmax * k * (1 - k); st.arms = big ? 2 : 1.4 * Math.sin(Math.PI * k); st.pitch = -0.1; st.sq = -0.05; }
    if (u >= T && u < T + 0.07) st.sq = 0.12 * (1 - (u - T) / 0.07);                  // landing squash
  }
  return st;
}
function poseClawd(g, st, tv, x = 0, z = 0) {
  g.position.set(x, skinH(x, z, tv) + st.y, z);
  g.rotation.set(st.pitch, -0.35, 0);
  g.scale.set(1 + st.sq * 0.5, 1 - st.sq, 1 + st.sq * 0.5);
  g.children.forEach((m) => { if (m.userData.part === 'arm') m.position.y = m.userData.y0 + st.arms * U; });
}

// mallet (felt head + wooden shaft)
const mallet = new THREE.Group();
const headR = 1.55;
const felt = new THREE.MeshPhysicalMaterial({ color: '#e9dfcf', roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: '#ffffff', bumpMap: fib, bumpScale: 1.5 });
const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 64, 40), felt); head.scale.set(1, 0.92, 1); head.castShadow = true;
const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.5, 32), chrome); ferrule.position.y = headR * 0.92 + 0.15;
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 30, 24), new THREE.MeshStandardMaterial({ color: '#8b5a33', roughness: 0.45 }));
shaft.position.y = headR * 0.92 + 15.4;
mallet.add(head, ferrule, shaft); mallet.rotation.z = -0.28; scene.add(mallet);
function malletY(tv) {                                                           // height of the head's bottom above the skin
  const REST = 2.6;
  if (tv < T_BASS) return REST + 0.25 + 0.12 * Math.sin(tv * 2.1);
  if (tv >= T_DRAG1 && tv < T_DROP1 - 0.22) return REST + 2.6 * smooth(T_DRAG1, T_DRAG1 + 0.5, tv);
  if (tv >= T_OUT) return REST + 9 * smooth(T_OUT, T_OUT + 0.8, tv);                // the end: the mallet leaves
  let y = REST;
  for (const hit of HITS) {
    const u = tv - hit.t, pre = hit.s > 1 ? 0.22 : 0.16, top = hit.s > 1 ? REST + 2.6 : REST;
    if (u >= -pre && u < 0) y = Math.min(y, top * Math.pow(-u / pre, 1.7));
    if (u >= 0 && u < 0.34) y = Math.min(y, Math.max(-0.28 * hit.s * Math.exp(-u / 0.05) * (u < 0.04 ? 1 : 0.3), REST * (1 - Math.exp(-u / 0.085))));
  }
  return y;
}
function poseMallet(tv) {
  const y = malletY(tv);
  mallet.position.set(IMPACT.x, y + headR * 0.92, IMPACT.z);
}

// lights
const key = new THREE.SpotLight('#ffc78e', 2.6, 0, 0.55, 0.85, 0); key.position.set(-10, 3.6, 3); key.target.position.set(0.3, 0, -0.6);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 2; key.shadow.camera.far = 40; key.shadow.bias = -0.0004; key.shadow.radius = 3;
scene.add(key, key.target);
const rim = new THREE.SpotLight('#86dcff', 3.0, 0, 0.6, 0.7, 0); rim.position.set(7, 5.5, -10); rim.target.position.set(0.2, 0.6, 0); scene.add(rim, rim.target);
const top = new THREE.SpotLight('#fff2df', 1.2, 0, 0.45, 0.9, 0); top.position.set(1, 14, 3); top.target.position.set(1, 0, -1); scene.add(top, top.target);
const hemi = new THREE.HemisphereLight('#3b4458', '#0b0806', 0.25); scene.add(hemi);

// post
const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.006, maxblur: 0.016 });
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.32, 0.5, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const SHOTS = [
  { t: 0, pos: [-0.95, 0.55, 4.3], tgt: [0.55, 1.45, -1.0], fov: 42, focus: 4.4, ap: 0.0075 },
  { t: 3.056, pos: [-2.6, 0.72, 5.0], tgt: [1.25, 0.95, -1.3], fov: 44, focus: 5.4, ap: 0.0045 },
  { t: 5.184, pos: [-0.25, 0.5, 4.9], tgt: [0.35, 0.98, -0.7], fov: 44, focus: 4.9, ap: 0.0055 },
  { t: 9.438, pos: [-2.6, 1.7, 6.0], tgt: [0.3, 0.45, -0.5], fov: 40, focus: 6.4, ap: 0.005 },
  { t: 15.819, pos: [-0.7, 0.36, 3.9], tgt: [0.9, 2.3, -1.4], fov: 46, focus: 4.0, ap: 0.006 },
  { t: 20.073, pos: [-1.7, 0.42, 5.4], tgt: [1.0, 1.85, -1.3], fov: 54, focus: 5.6, ap: 0.0036 },
  { t: 24.328, pos: [0.4, 7.4, 9.4], tgt: [1.1, 0.0, -1.4], fov: 40, focus: 11.5, ap: 0.003 },
];
const shotAt = (t) => { let s = SHOTS[0]; for (const x of SHOTS) if (t >= x.t) s = x; return s; };

const labels = document.createElement('div'); labels.className = 'labels'; stage.appendChild(labels);
const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
function callout(anchor, lx, ly, html, cls = '') {
  const [x, y] = project(anchor);
  return { svg: `<path d="M${lx},${ly} L${x},${y}" stroke="rgba(255,255,255,.85)" stroke-width="2.5" fill="none"/><circle cx="${x}" cy="${y}" r="6" fill="#fff"/>`,
    div: `<div class="lab ${cls}" style="left:${lx + 10}px;top:${ly - 26}px">${html}</div>` };
}
function drawOverlay(t, tv) {
  let svg = '', div = '';
  const add = (o) => { svg += o.svg; div += o.div; };
  const cy = clawdRig.position.y;
  if (t < 3.0) {
    add(callout(new THREE.Vector3(0.0, clawdOpen.position.y + 0.82, 0.2), 470, 1110, 'Clawd'));
    add(callout(new THREE.Vector3(-0.6, 0.05, 1.5), 90, 1480, '米粒', 'cool'));
    add(callout(new THREE.Vector3(IMPACT.x - headR * 0.35, mallet.position.y - headR * 0.85, IMPACT.z + headR * 0.4), 760, 820, '鼓槌', 'warm'));
  } else if (t >= 3.056 && t < 5.18) {
    add(callout(new THREE.Vector3(-0.3, clawdOpen.position.y + 0.5, 0.2), 90, 640, '已经在空中<small>Clawd · 提前起跳</small>', 'warm'));
    add(callout(new THREE.Vector3(0.9, 0.05, 1.2), 520, 1290, '还贴在鼓皮上<small>米粒 · 等着被震</small>', 'cool'));
    div += `<div class="stamp">高速定格</div>`;
  } else if (t >= 5.184 && t < 9.438) {
    // timing chart (schematic): beats, subdivisions, Clawd take-off before, grains after
    const x0 = 160, pxs = 360, now = t;
    let ch = '<div class="chart"><div class="row" style="top:18px">拍子 / 细分</div><div class="row" style="top:86px;color:#ffc46b">Clawd 起跳</div><div class="row" style="top:150px;color:#9fe6ff">米粒起跳</div>';
    const first = Math.floor((now - 0.9 - PH) / BEAT * 4) / 4;
    for (let q = 0; q < 40; q++) {
      const tb = PH + (first + q / 4) * BEAT, x = x0 + (tb - (now - 0.9)) * pxs;
      if (x < 150 || x > 900) continue;
      const big = Math.abs(((first + q / 4) % 1 + 1) % 1) < 1e-6;
      ch += big ? `<div class="tick" style="left:${x}px;top:14px;height:180px"></div>` : `<div class="small" style="left:${x}px;top:22px;height:30px"></div>`;
      if (big) {
        const xc = x - 0.14 * pxs, xg = x + 0.06 * pxs;
        if (xc > 150) ch += `<div class="mk" style="left:${xc}px;top:94px;background:#ffb648"></div>`;
        if (xg < 905) ch += `<div class="mk" style="left:${xg}px;top:158px;background:#7fd8ff"></div>`;
      }
    }
    ch += '<div class="row" style="top:186px;left:760px;font-size:21px;color:#bbb">示意</div></div>';
    div += ch;
  } else if (t >= 20.38 && t < 20.8) div += `<div class="stamp">高速定格</div>`;
  labels.innerHTML = `<svg class="lines" width="${W}" height="${H}">${svg}</svg>${div}`;
}

const cues = (await loadCues('./cues.json')).cues;
const subs = makeSubs(stage, cues);

film.render = async (t) => {
  const tv = vt(t);
  const shot = shotAt(t);
  camera.position.set(...shot.pos); camera.fov = shot.fov; camera.updateProjectionMatrix(); camera.lookAt(...shot.tgt); camera.updateMatrixWorld();
  bokeh.uniforms.focus.value = shot.focus; bokeh.uniforms.aperture.value = shot.ap; bokeh.uniforms.maxblur.value = 0.016;
  updateSkin(tv); updateGrains(tv); poseMallet(tv);
  const st = clawdState(tv);
  const eyes = tv >= T_LOOP2 && tv < T_DRAG1 ? 'closed' : (tv >= T_DRAG1 && tv < T_DROP1) ? 'wide' : 'open';
  clawdOpen.visible = eyes === 'open'; clawdClosed.visible = eyes === 'closed'; clawdWide.visible = eyes === 'wide';
  for (const g of [clawdOpen, clawdClosed, clawdWide]) poseClawd(g, st, tv);
  clawdRig.position.set(0, 0, 0);
  // strobe exposures across the current jump (only in the explanation unit)
  const showStrobe = t >= 5.184 && t < 9.438;
  const hit = HITS.filter((h) => h.t <= tv + 0.24).slice(-1)[0];
  strobe.forEach((g, k) => {
    g.visible = showStrobe && !!hit;
    if (!g.visible) return;
    const tk = hit.t - 0.14 + (k / (strobe.length - 1)) * 0.38;
    if (tk > tv) { g.visible = false; return; }
    poseClawd(g, clawdState(tk), tk, -0.55 + k * 0.0, 0);
    g.position.x = -0.0; g.position.z = 0;
    g.traverse((o) => { if (o.isMesh) o.material.opacity = 0.2 + 0.38 * (k / strobe.length); });
  });
  key.intensity = tv >= T_DRAG1 && tv < T_DROP1 ? 1.9 : 2.6;
  rim.intensity = frozen(t) ? 4.5 : 3.0;
  composer.render();
  drawOverlay(t, tv);
  subs(t);
  await new Promise((r) => requestAnimationFrame(() => r()));
};
await document.fonts.load('700 80px "Noto Sans CJK SC"');
film.ready = true;
