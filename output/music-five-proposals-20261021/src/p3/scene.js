// P3 · 把这首歌卷成一盘，里面藏着3个机关 — measured data of the original BGM coiled into a paper spiral.
// One turn = one measured 4-bar loop (16 beats = 8.508 s), so repeats line up on the same spokes.
// Ribbon height = sub-bass (20–100 Hz) level (exaggerated); red pins = the fitted beat grid; the red wire in unit ②/③
// is loop 1's bass shape carried one turn outward — “what you expect” — so the thinned bass shows as a gap under it.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeClawd } from '../common/clawd.js';
import { loadCues, makeSubs } from '../common/subs.js';

const film = window.film = { ready: false };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });
await document.fonts.load('700 80px "Noto Serif CJK SC"');
await document.fonts.load('700 40px "Noto Sans CJK SC"');
await document.fonts.load('400 40px "Noto Sans CJK SC"');

const MAP = await (await fetch('../music-map.json')).json();
const W = 1080, H = 1920, HOP = MAP.spectrogram.hop_s;
const BEAT = MAP.tempo.beat_s, BEATS = MAP.beats;
const T_BASS = 3.056, T_LOOP2 = 11.565, T_DRAG1 = 15.819, T_DROP1 = 20.073, T_DRAG2 = 28.582, T_DROP2 = 32.836;
const LOOP = 16 * BEAT, T0 = T_BASS;
const R0 = 1.5, PITCH = 0.95, RW = 0.36;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(31);

// ---- data -------------------------------------------------------------------------------------------------------
const NF = MAP.spectrogram.frames.length, SONG = NF * HOP;
const movavg = (arr, k) => arr.map((_, i) => { let s = 0, n = 0; for (let j = i - k; j <= i + k; j++) if (j >= 0 && j < arr.length) { s += arr[j]; n++; } return s / n; });
const subS = movavg(MAP.sub_db_50ms.slice(0, NF), 2);
const bassH = subS.map((db) => 0.1 + 1.15 * Math.pow(clamp((db + 12) / 9, 0, 1), 1.5));
const hAt = (t) => { const f = clamp(t / HOP, 0, NF - 1), i = Math.floor(f), k = f - i; return bassH[i] * (1 - k) + bassH[Math.min(NF - 1, i + 1)] * k; };
const th = (t) => 2 * Math.PI * (t - T0) / LOOP;
const rad = (t) => R0 + PITCH * (t - T0) / LOOP;
const P = (t, dr = 0, y = 0) => { const a = th(t), r = rad(t) + dr; return new THREE.Vector3(r * Math.sin(a), y, -r * Math.cos(a)); };
const N = (t) => { const a = th(t); return new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)); };         // outward
const D = (t) => { const a = th(t); return new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); };          // direction of travel

// ---- renderer -----------------------------------------------------------------------------------------------------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#3a2618');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
const camera = new THREE.PerspectiveCamera(40, W / H, 0.02, 300);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
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

// printed base disc: 16 beat spokes, 4 bar lines, ring names, title
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
  g.font = '400 34px "Noto Sans CJK SC"'; g.fillStyle = '#6a5845';
  ['0秒', '2.1秒', '4.3秒', '6.4秒'].forEach((txt, k) => { const a = k / 4 * Math.PI * 2 + 0.07; g.fillText(txt, cx + Math.sin(a) * 6.1 * s, cy - Math.cos(a) * 6.1 * s); });
  g.font = '700 30px "Noto Sans CJK SC"'; g.fillStyle = '#9a3a2c';
  for (let k = 0; k < 4; k++) { const r = R0 + PITCH * k + 0.38; g.fillText(`第${k + 1}圈`, cx - 0.42 * s, cy - r * s); }
  g.font = '400 30px "Noto Sans CJK SC"'; g.fillStyle = '#6a5845';
  g.fillText('开智小曲 · 实测纸模型 · 一圈 = 4小节 = 8.5秒', cx, cy + 0.55 * s);
});
const disc = new THREE.Mesh(new THREE.CircleGeometry(DISC, 160), new THREE.MeshStandardMaterial({ map: discTex, roughness: 0.92 }));
disc.rotation.x = -Math.PI / 2; disc.position.y = 0.012; disc.receiveShadow = true; scene.add(disc);
const discEdge = new THREE.Mesh(new THREE.CylinderGeometry(DISC, DISC, 0.012, 160, 1, true), new THREE.MeshStandardMaterial({ color: '#d8ccb4' }));
discEdge.position.y = 0.006; scene.add(discEdge);

// the ribbon (paper wall along the spiral)
function ribbon(t0, t1, step = 0.02) {
  const top = [], inner = [], outer = [], uvT = [], uvS = [];
  let arc = 0, prev = null;
  for (let t = t0; t <= t1 + 1e-6; t += step) {
    const c = P(t), n = N(t), h = hAt(t);
    if (prev) arc += c.distanceTo(prev); prev = c;
    const iT = c.clone().addScaledVector(n, -RW / 2).setY(h), oT = c.clone().addScaledVector(n, RW / 2).setY(h);
    const iB = iT.clone().setY(0.012), oB = oT.clone().setY(0.012);
    top.push(iT, oT); inner.push(iB, iT); outer.push(oT, oB); uvT.push([arc / 2, 0], [arc / 2, 0.2]); uvS.push([arc / 2, 0], [arc / 2, h / 2]);
  }
  const ladder = (pts, uv) => {
    const pos = [], uvs = [], idx = [];
    pts.forEach((p, i) => { pos.push(p.x, p.y, p.z); uvs.push(...uv[i]); });
    for (let i = 0; i < pts.length / 2 - 1; i++) { const a = 2 * i, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  return { top: ladder(top, uvT), inner: ladder(inner, uvS), outer: ladder(outer, uvS) };
}
const rib = ribbon(0, SONG - 0.05);
const topMat = new THREE.MeshStandardMaterial({ color: '#c9643d', roughness: 0.85, map: paperTex, side: THREE.DoubleSide });
const sideMat = new THREE.MeshStandardMaterial({ color: '#efe3cc', roughness: 0.9, map: paperTex, side: THREE.DoubleSide });
for (const [g, m] of [[rib.top, topMat], [rib.inner, sideMat], [rib.outer, sideMat]]) { const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); }

// beat pins on the outer edge of the ribbon top
const NB = BEATS.length;
const needleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6); needleGeo.translate(0, 0.11, 0);
const headGeo = new THREE.SphereGeometry(1, 14, 10);
const needles = new THREE.InstancedMesh(needleGeo, new THREE.MeshStandardMaterial({ color: '#bfc3c8', metalness: 0.9, roughness: 0.3 }), NB);
const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: '#d7392b', roughness: 0.35 }), NB);
needles.castShadow = heads.castShadow = true; scene.add(needles, heads);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0), MM = new THREE.Matrix4();
function setPins(pred) {
  BEATS.forEach((b, i) => {
    const on = pred(b) && b < SONG - 0.1, p = P(b, RW * 0.32), y = hAt(b);
    needles.setMatrixAt(i, on ? MM.makeTranslation(p.x, y, p.z) : ZERO);
    const big = Math.abs(((b - 0.929) / BEAT) % 4) < 0.01 || Math.abs(((b - 0.929) / BEAT) % 4 - 4) < 0.01;
    const r = big ? 0.06 : 0.042;
    heads.setMatrixAt(i, on ? MM.makeScale(r, r, r).setPosition(p.x, y + 0.23, p.z) : ZERO);
  });
  needles.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
}

// numbered flags ①②③ at the inner edge
const BIG = [{ t: T_BASS, n: '①' }, { t: T_LOOP2, n: '②' }, { t: T_DRAG1, n: '③' }].map((f) => {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.15, 8), new THREE.MeshStandardMaterial({ color: '#2b1f16' })); pole.position.y = 0.575;
  const tex = canvasTex(256, 180, (c, w, h) => { c.fillStyle = '#d7392b'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 130px "Noto Sans CJK SC"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.n, w / 2, h / 2 + 6); });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, side: THREE.DoubleSide })); fl.position.set(0.22, 1.0, 0);
  g.add(pole, fl); const p = P(f.t, -RW / 2 - 0.12); g.position.copy(p); g.lookAt(0, 0, 0); g.rotateY(Math.PI / 2);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
  return { ...f, g };
});

// red wire: loop 1's bass shape carried one turn outward (expectation)
const wirePts = [];
for (let t = T_BASS; t <= T_BASS + LOOP; t += 0.02) { const q = P(t + LOOP); q.y = hAt(t) + 0.03; wirePts.push(q); }
const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wirePts), 900, 0.016, 6, false), new THREE.MeshStandardMaterial({ color: '#e0261c', roughness: 0.4, emissive: '#7a0d06', emissiveIntensity: 0.6 }));
wire.castShadow = true; scene.add(wire);
// tape measure between two beats (unit ①)
const tapeTex = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e1a12'; for (let i = 0; i <= 20; i++) g.fillRect(i / 20 * w, 0, 3, i % 4 === 0 ? 36 : 16); });
const tape = new THREE.Mesh(new THREE.BoxGeometry(1, 0.008, 0.07), new THREE.MeshStandardMaterial({ map: tapeTex, roughness: 0.4 }));
tape.castShadow = true; scene.add(tape);

// Clawd
const U = 0.032;
const clawd = makeClawd(THREE, { unit: U, depth: 4, rounded: RoundedBoxGeometry, radius: 0.16, roughness: 0.5 });
clawd.children.forEach((m) => { m.userData.y0 = m.position.y; m.castShadow = true; });
scene.add(clawd);
function clawdPose(t) {
  let y = hAt(t), arms = 0, sq = 0;
  for (const td of [T_DROP1, T_DROP2]) {
    const u = t - (td - 0.16);
    if (u >= 0 && u < 0.6) { const k = u / 0.6; y = Math.max(hAt(t), (1 - k) * hAt(td - 0.2) + k * hAt(td + 0.4) + 0.5 * 4 * k * (1 - k)); arms = 2; }
    if (t >= td - 1.1 && t < td - 0.16) sq = 0.18;
  }
  return { y, arms, sq };
}

// lights
const sun = new THREE.DirectionalLight('#ffe0b8', 2.8); sun.position.set(-9, 13, 7); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); { const c = sun.shadow.camera; c.left = -8; c.right = 8; c.top = 8; c.bottom = -8; c.near = 1; c.far = 40; } sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
scene.add(sun);
const hemi = new THREE.HemisphereLight('#e2ecff', '#6a4a30', 0.95); scene.add(hemi);
const fill = new THREE.DirectionalLight('#ffd9b0', 0.9); fill.position.set(10, 6, -6); scene.add(fill);

const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.003, maxblur: 0.01 }); composer.addPass(bokeh);
composer.addPass(new OutputPass());

// camera: either fixed or relative to the playhead
function shot(t) {
  if (t < 3.0) return { pos: new THREE.Vector3(0.0, 20, 14.5), tgt: new THREE.Vector3(0, 0, -0.5), fov: 50, focus: 24, ap: 0.0010 };
  if (t >= 32.836) return { pos: new THREE.Vector3(0.0, 21, 12.5), tgt: new THREE.Vector3(0, 0, -0.9), fov: 50, focus: 24, ap: 0.0010 };
  const c = P(t), n = N(t), d = D(t);
  if (t < 11.565) { const pos = c.clone().addScaledVector(d, 1.1).addScaledVector(n, 1.6).add(new THREE.Vector3(0, 1.35, 0)); return { pos, tgt: c.clone().addScaledVector(d, 0.12).add(new THREE.Vector3(0, hAt(t) * 0.75, 0)), fov: 46, focus: 2.2, ap: 0.008 }; }
  if (t < 15.819) { const pos = c.clone().addScaledVector(n, 2.5).addScaledVector(d, -1.2).add(new THREE.Vector3(0, 2.3, 0)); return { pos, tgt: c.clone().addScaledVector(n, -0.55).add(new THREE.Vector3(0, 0.25, 0)), fov: 46, focus: 3.3, ap: 0.006 }; }
  if (t < 20.073) { const c2 = P(18.35), n2 = N(18.35), d2 = D(18.35); const pos = c2.clone().addScaledVector(n2, 2.4).addScaledVector(d2, -0.2).add(new THREE.Vector3(0, 1.5, 0)); return { pos, tgt: c2.clone().addScaledVector(n2, -0.2).add(new THREE.Vector3(0, 0.25, 0)), fov: 48, focus: 2.9, ap: 0.006 }; }
  if (t < 24.328) { const c2 = P(20.2), n2 = N(20.2), d2 = D(20.2); const pos = c2.clone().addScaledVector(n2, 1.75).addScaledVector(d2, 0.75).add(new THREE.Vector3(0, 0.95, 0)); return { pos, tgt: c2.clone().addScaledVector(n2, -0.2).add(new THREE.Vector3(0, 1.05, 0)), fov: 50, focus: 1.95, ap: 0.008 }; }
  return { pos: new THREE.Vector3(0, 11, 9), tgt: new THREE.Vector3(0, 0, -0.5), fov: 44, focus: 14, ap: 0.002 };
}

const labels = document.createElement('div'); labels.className = 'labels'; stage.appendChild(labels);
const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
function tagAt(v, lx, ly, html, cls = '') {
  const [x, y] = project(v);
  return { svg: `<path d="M${lx},${ly} L${x},${y}" stroke="#2a2119" stroke-width="3" fill="none"/><circle cx="${x}" cy="${y}" r="7" fill="#c23b2e" stroke="#fff" stroke-width="2"/>`,
    div: `<div class="tag ${cls}" style="left:${lx}px;top:${ly - 24}px">${html}</div>` };
}
function overlay(t) {
  let svg = '', div = ''; const add = (o) => { svg += o.svg; div += o.div; };
  const fy = (f) => f.g.position.clone().add(new THREE.Vector3(0, 1.0, 0));
  if (t < 3.0) {
    add(tagAt(fy(BIG[0]), 640, 1200, '① 3.1秒<small> 低音进来</small>'));
    add(tagAt(fy(BIG[1]), 700, 600, '② 11.6秒<small> 第2圈</small>'));
    add(tagAt(fy(BIG[2]), 60, 1290, '③ 15.8秒<small> 低音变薄</small>'));
    add(tagAt(clawd.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 70, 640, 'Clawd<small> 正在播放的这一刻</small>', 'ink'));
  } else if (t >= 3.056 && t < 5.184) {
    add(tagAt(tape.position.clone(), 600, 1180, '0.53 秒<small> 一拍</small>'));
  } else if (t >= 11.565 && t < 15.819) {
    add(tagAt(P(t + 0.9).setY(hAt(t + 0.9 - LOOP) + 0.05), 520, 1210, '红线 = 第1圈的形状', 'ink'));
  } else if (t >= 17.0 && t < 20.073) {
    add(tagAt(P(18.6).setY(hAt(18.6 - LOOP) + 0.05), 560, 700, '你以为低音在这', 'ink'));
    add(tagAt(P(18.6).setY(hAt(18.6)), 560, 1200, '它实际在这'));
  } else if (t >= 32.836) {
    [['①', '拍子准', 0, 1220], ['②', '一段反复', 1, 610], ['③', '关键处拖一下', 2, 1300]].forEach(([n, s, k, ly]) => add(tagAt(fy(BIG[k]), k === 2 ? 60 : 600, ly, `${n} ${s}`)));
  }
  labels.innerHTML = `<svg class="lines" width="${W}" height="${H}">${svg}</svg>${div}`;
}

const cues = (await loadCues('./cues.json')).cues;
const subs = makeSubs(stage, cues);

film.render = async (t) => {
  const s = shot(t);
  camera.position.copy(s.pos); camera.fov = s.fov; camera.updateProjectionMatrix(); camera.lookAt(s.tgt); camera.updateMatrixWorld();
  bokeh.uniforms.focus.value = s.focus; bokeh.uniforms.aperture.value = s.ap; bokeh.uniforms.maxblur.value = 0.011;
  // pins: unit ① shows beats up to a little ahead; overview shows all
  if (t < 3.0 || t >= 32.836) setPins((b) => b >= 0.39);
  else if (t < 11.565) setPins((b) => b >= 0.39 && b <= t + 2.2);
  else setPins((b) => b >= 0.39 && b <= t + 1.0);
  wire.visible = t >= 11.565 && t < 24.328;
  const prevB = BEATS.filter((b) => b <= t).slice(-1)[0], ahead = [prevB, BEATS.find((b) => b > t)];
  tape.visible = t >= 3.056 && t < 5.184;
  if (tape.visible) {
    const a = P(ahead[0], RW * 0.32), b = P(ahead[1], RW * 0.32), y = Math.max(hAt(ahead[0]), hAt(ahead[1])) + 0.012;
    tape.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2); tape.scale.set(a.distanceTo(b), 1, 1); tape.rotation.set(0, -Math.atan2(b.z - a.z, b.x - a.x), 0);
  }
  const st = clawdPose(t), c = P(t), d = D(t);
  clawd.position.set(c.x, st.y, c.z);
  const face = (t < 3.0 || t >= 32.836) ? d.clone().negate().add(N(t)) : (t >= 11.565 && t < 15.819) ? N(t) : (t >= 20.073 && t < 24.328) ? d : d;
  clawd.rotation.set(0, Math.atan2(face.x, face.z), 0);
  clawd.scale.set(1 + st.sq * 0.5, 1 - st.sq, 1 + st.sq * 0.5);
  clawd.children.forEach((m) => { if (m.userData.part === 'arm') m.position.y = m.userData.y0 + st.arms * U; });
  composer.render();
  overlay(t);
  subs(t);
  await new Promise((r) => requestAnimationFrame(() => r()));
};
film.ready = true;
