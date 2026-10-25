// film.js — 《这首开智小曲，为什么上头？》 free-design full film (Opus 5.5). three.js 3D + a 2D type layer.
// The song is a ride: Clawd rides a coaster whose gates are the ORIGINAL BGM's measured onsets, whose climbs are its
// thin/build bars and whose plunges are its drops; a loop arrives on the "surprise" bar, fog on "hard to guess", and the
// second lap replays the opening's same source audio ("familiarity"). Every frame is a pure function of its number.
// window.film = { ready, error, frameCount, render(f), grab(type, q), textBoxes(f) }.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CUES } from './cues.js';
import { E, LAP2, L, STEP, SAMPLES, SEG_START, at, sOf, speedOf, GATES, clamp, smooth, lerp } from './track.js';
import { HEAD, ANS_T0, ANSWER_TITLE, ANSWER, ANSWER_NOTE, CALL, FOOT } from './text.js';

const W = 1080, H = 1920, FPS = CUES.fps, FRAMES = CUES.frames, END = CUES.end_s;
const film = (window.film = { ready: false, error: null, frameCount: FRAMES });
window.addEventListener('error', (e) => { film.error = String((e.error && e.error.stack) || e.message); });
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const easeOut = (x) => 1 - (1 - clamp(x)) ** 3, easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
const env = (arr, t) => { const x = clamp(t * FPS, 0, arr.length - 1), i = Math.floor(x), k = x - i; return lerp(arr[i], arr[Math.min(arr.length - 1, i + 1)], k); };
const rms = (t) => env(CUES.rms, t), sub = (t) => env(CUES.sub, t);
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const ONSETS = CUES.onsets.map((o) => o.t);
const lastOnset = (t) => { let b = -9; for (const o of ONSETS) { if (o <= t) b = o; else break; } return b; };
const DROPS = [E.drop, E.drop3, E.dropB];
const heatAt = (t) => Math.max(...DROPS.map((d) => (t >= d ? Math.exp(-(t - d) * 1.6) : 0)));

// ───────── renderer, scene, post ─────────
const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const FOG = new THREE.Color('#140d26'), FOG2 = new THREE.Color('#33385a');
scene.fog = new THREE.FogExp2(FOG.clone(), 0.0065);
const cam = new THREE.PerspectiveCamera(45, W / H, 0.05, 1200);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.45, 0.45, 0.93); composer.addPass(bloom);
composer.addPass(new OutputPass());

// sky: dusk gradient with a warm horizon band, and stars
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uHeat: { value: 0 }, uFog: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform float uHeat, uFog; varying vec3 vD;
    void main(){ float h = vD.y;
      vec3 zen = vec3(.018,.02,.065), mid = vec3(.09,.05,.17), hor = mix(vec3(.42,.13,.27), vec3(.95,.42,.25), uHeat);
      vec3 c = mix(mid, zen, smoothstep(.05, .7, h)); c = mix(hor, c, smoothstep(-.02, .22, h));
      c = mix(c, vec3(.33,.35,.5), uFog * .85); gl_FragColor = vec4(c, 1.); }` });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat));
{ const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = hash(i) * Math.PI * 2, e = 0.08 + 0.9 * hash(i + 77) ** 0.7, R = 800; pos.set([R * Math.cos(e) * Math.cos(a), R * Math.sin(e), R * Math.cos(e) * Math.sin(a)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#cfd8ff', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })); scene.add(stars); }
// ground: dark plane with a fine glowing grid that fades with distance
const groundMat = new THREE.ShaderMaterial({ fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uPulse: { value: 0 } }]),
  vertexShader: `varying vec3 vW;
#include <fog_pars_vertex>
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
  fragmentShader: `uniform float uPulse; varying vec3 vW;
#include <fog_pars_fragment>
void main(){ vec2 g = abs(fract(vW.xz / 4.0) - .5); float l = 1. - smoothstep(.0, .03, .5 - max(g.x, g.y));
  vec3 c = vec3(.012,.012,.03) + vec3(.16,.22,.55) * l * (.22 + .5 * uPulse);
  gl_FragColor = vec4(c, 1.);
#include <fog_fragment>
}` });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), groundMat); ground.rotation.x = -Math.PI / 2; scene.add(ground);

// lights
scene.add(new THREE.HemisphereLight('#8ea2ff', '#2a1430', 0.9));
const moon = new THREE.DirectionalLight('#ffe2cc', 1.6); moon.position.set(-60, 90, 40); scene.add(moon);
const carLight = new THREE.PointLight('#ffb38a', 0, 7, 2); scene.add(carLight);

// a city of light towers around the circuit, pulsing with the music's measured loudness / bass
const CX = 29, CZ = 15;
const towerGeo = new THREE.BoxGeometry(1, 1, 1); towerGeo.translate(0, 0.5, 0);
const NT = 260, towers = new THREE.InstancedMesh(towerGeo, new THREE.MeshStandardMaterial({ color: '#141429', roughness: 0.8, metalness: 0.2 }), NT);
const caps = new THREE.InstancedMesh(towerGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), NT);
const TW = [];
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < NT; i++) {
    const a = hash(i * 3.1) * Math.PI * 2, r = 135 + 120 * hash(i * 7.7), x = CX + Math.cos(a) * r, z = CZ + Math.sin(a) * r * 1.3, w = 4 + 8 * hash(i * 1.3), h = 8 + 60 * hash(i * 2.9) ** 2;
    TW.push({ x, z, w, h, ph: hash(i * 5.3) });
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(w, h, w)); towers.setMatrixAt(i, m);
    caps.setColorAt(i, c.set(i % 3 === 0 ? '#ff7a59' : i % 3 === 1 ? '#7a8cff' : '#5ee6ff'));
  }
  towers.instanceMatrix.needsUpdate = true; scene.add(towers, caps); }

// ───────── the coaster ─────────
const LOOP0 = SEG_START.loop, LOOP1 = SEG_START.runout;
const inLoop = (s) => s >= LOOP0 - 1 && s <= LOOP1 + 1;
const railMat = new THREE.MeshStandardMaterial({ color: '#f1e6da', roughness: 0.3, metalness: 0.6, emissive: '#ffcfb0', emissiveIntensity: 0.12 });
const spineMat = new THREE.MeshBasicMaterial({ color: '#ff7a59', toneMapped: false });
const sleeperMat = new THREE.MeshStandardMaterial({ color: '#2b2c40', roughness: 0.7 });
const postMat = new THREE.MeshStandardMaterial({ color: '#3c3f5e', roughness: 0.6, metalness: 0.3 });
const mainG = new THREE.Group(), loopG = new THREE.Group(); scene.add(mainG, loopG);
function tube(pts, r, mat, group) { if (pts.length < 2) return; const curve = new THREE.CatmullRomCurve3(pts.map(V)); group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 2, r, 8, false), mat)); }
{ // rails + glowing spine, split into the loop part (it assembles on the surprise bar) and the rest
  const runs = { main: [[]], loop: [[]] };
  for (let i = 0; i <= SAMPLES.length; i += 2) {
    const s = (i % SAMPLES.length) * STEP, k = inLoop(s) ? 'loop' : 'main', other = k === 'loop' ? 'main' : 'loop';
    if (runs[other].at(-1).length) runs[other].push([]);
    runs[k].at(-1).push(s);
  }
  for (const [k, list] of Object.entries(runs)) for (const seq of list) {
    if (seq.length < 2) continue; const grp = k === 'loop' ? loopG : mainG;
    for (const side of [-1, 1]) tube(seq.map((s) => { const a = at(s); return [a.p[0] + a.r[0] * 0.58 * side, a.p[1] + a.r[1] * 0.58 * side, a.p[2] + a.r[2] * 0.58 * side]; }), 0.075, railMat, grp);
    tube(seq.map((s) => { const a = at(s); return [a.p[0] - a.u[0] * 0.22, a.p[1] - a.u[1] * 0.22, a.p[2] - a.u[2] * 0.22]; }), 0.09, spineMat, grp);
  }
  // sleepers every 1.0 and support posts every 5.0
  const sl = [], po = [];
  for (let s = 0; s < L; s += 1.0) sl.push(s);
  for (let s = 0; s < L; s += 5.0) { const a = at(s); if (a.p[1] > 2 && a.u[1] > 0.3) po.push(s); }
  const mk = (geo, mat, list, place) => { const all = list.filter((s) => !inLoop(s)), lp = list.filter((s) => inLoop(s)), m4 = new THREE.Matrix4();
    for (const [arr, grp] of [[all, mainG], [lp, loopG]]) { if (!arr.length) continue; const im = new THREE.InstancedMesh(geo, mat, arr.length); arr.forEach((s, i) => { place(m4, at(s)); im.setMatrixAt(i, m4); }); grp.add(im); } };
  mk(new THREE.BoxGeometry(1.5, 0.07, 0.2), sleeperMat, sl, (m4, a) => { m4.makeBasis(V(a.r), V(a.u), V(a.f)); m4.setPosition(a.p[0] - a.u[0] * 0.12, a.p[1] - a.u[1] * 0.12, a.p[2] - a.u[2] * 0.12); });
  const cyl = new THREE.CylinderGeometry(0.11, 0.16, 1, 8); cyl.translate(0, -0.5, 0);
  mk(cyl, postMat, po, (m4, a) => { const top = a.p[1] - 0.3; m4.makeScale(1, top, 1); m4.setPosition(a.p[0], top, a.p[2]); });
}
// loop: a tall support frame under it too
{ const a = at(LOOP0), c = [a.p[0] + a.u[0] * 6.6 + a.r[0] * 2, a.p[1] + 6.6, a.p[2] + a.r[2] * 2], cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, c[1], 8), postMat);
  cyl.position.set(c[0] - a.r[0] * 3.5, c[1] / 2, c[2] - a.r[2] * 3.5); loopG.add(cyl); }
const LOOPC = (() => { const a = at(LOOP0); return [a.p[0] + a.u[0] * 6.6 + a.r[0] * 2, a.p[1] + a.u[1] * 6.6, a.p[2] + a.r[2] * 2]; })();

// gates: rings (fast stretches) and rail lamps (climbs), each lights at its MEASURED onset time(s)
const ringGeo = new THREE.TorusGeometry(1.45, 0.07, 10, 64), lampGeo = new THREE.SphereGeometry(0.11, 12, 8);
const gates = GATES.map((g) => {
  const a = at(g.s), grp = new THREE.Group(), m4 = new THREE.Matrix4().makeBasis(V(a.r), V(a.u), V(a.f));
  grp.quaternion.setFromRotationMatrix(m4); grp.position.set(a.p[0] + a.u[0] * 1.05, a.p[1] + a.u[1] * 1.05, a.p[2] + a.u[2] * 1.05);
  let meshes;
  if (g.lamp) { grp.position.set(...a.p); meshes = [-1, 1].map((sd) => { const m = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })); m.position.set(0.58 * sd, 0.14, 0); grp.add(m); return m; }); }
  else { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true })); grp.add(m); meshes = [m]; }
  (inLoop(g.s) ? loopG : mainG).add(grp);
  return { ...g, grp, meshes };
});
// ghost gates (示意): the expected next beat, cyan, appear ahead of the car
const ghostMat = new THREE.MeshBasicMaterial({ color: '#5ee6ff', toneMapped: false, transparent: true, wireframe: false });
const ghosts = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.05, 8, 64), ghostMat.clone()); m.visible = false; scene.add(m); return m; });
const placeOnTrack = (obj, s, lift = 1.05) => { const a = at(s), m4 = new THREE.Matrix4().makeBasis(V(a.r), V(a.u), V(a.f)); obj.quaternion.setFromRotationMatrix(m4); obj.position.set(a.p[0] + a.u[0] * lift, a.p[1] + a.u[1] * lift, a.p[2] + a.u[2] * lift); };

// ───────── the car and Clawd ─────────
const CLAWD = new THREE.Color('#d97757');
const car = new THREE.Group(); scene.add(car);
const body = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.46, 1.7, 3, 0.12), new THREE.MeshStandardMaterial({ color: '#cfc8d8', roughness: 0.5, metalness: 0.25 }));
body.position.y = 0.38; car.add(body);
const seat = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.2, 1.1, 2, 0.06), new THREE.MeshStandardMaterial({ color: '#232235', roughness: 0.8 })); seat.position.set(0, 0.58, -0.08); car.add(seat);
for (const sx of [-0.62, 0.62]) for (const sz of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 14), new THREE.MeshStandardMaterial({ color: '#1b1b28' })); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.12, sz); car.add(w); }
for (const sx of [-0.4, 0.4]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: '#fff3d6', toneMapped: false })); hl.position.set(sx, 0.4, 0.87); car.add(hl); }
// Clawd (official silhouette: body 8×6, eyes 1×1 at row 1, arms 2×2 at rows 2–3; legs hidden in the car) — u = 0.1
const U = 0.125, clawdG = new THREE.Group(); clawdG.position.set(0, 0.6, -0.05); car.add(clawdG);
const clawdMat = new THREE.MeshStandardMaterial({ color: CLAWD, roughness: 0.55, metalness: 0.0, emissive: CLAWD, emissiveIntensity: 0.32 });   // keeps the official orange legible at night
const cBody = new THREE.Mesh(new RoundedBoxGeometry(8 * U, 6 * U, 4 * U, 2, 0.012), clawdMat); cBody.position.y = 3 * U; clawdG.add(cBody);
const eyeMat = new THREE.MeshBasicMaterial({ color: '#141413' });
const eyes = [-2.5, 2.5].map((x) => { const e = new THREE.Mesh(new THREE.BoxGeometry(U, U * 1.05, 0.02), eyeMat); e.position.set(x * U, 4.5 * U, 2 * U + 0.006); clawdG.add(e); return e; });
const arms = [-1, 1].map((sd) => { const piv = new THREE.Group(); piv.position.set(sd * 4 * U, 3 * U, 0); const a = new THREE.Mesh(new RoundedBoxGeometry(2 * U, 2 * U, 2 * U, 2, 0.01), clawdMat); a.position.set(sd * U, 0, 0); piv.add(a); clawdG.add(piv); return { piv, sd }; });

function clawdPose(t) {
  const p = { arms: 0, nod: 0, lean: 0, eyeY: 0, blink: 1, hop: 0, wave: 0 };
  const lo = lastOnset(t), dt = t - lo;
  p.nod = 0.22 * Math.exp(-dt * 9) * (t > E.drop + 0.8 ? 1 : 0.3);
  p.hop = 0.05 * Math.exp(-dt * 14);
  for (const d of [E.drop, E.drop3]) if (t >= d - 0.05 && t < d + 1.4) p.arms = Math.max(p.arms, smooth((t - d + 0.05) / 0.12) * (1 - smooth((t - d - 1.1) / 0.3)));
  if (t >= E.bar17 && t < E.join + 0.3) p.arms = Math.max(p.arms, smooth((t - E.bar17) / 0.15) * (1 - smooth((t - E.join) / 0.3)));      // the loop
  if (t >= E.buildB + 0.4 && t < E.dropB + 1.6) p.arms = Math.max(p.arms, smooth((t - E.buildB - 0.4) / 0.35) * (1 - smooth((t - E.dropB - 1.3) / 0.3)));   // lap 2: it knows
  if (t >= E.build2 && t < E.drop3) { const u = smooth((t - E.build2) / 0.6); p.eyeY = 0.6 * u; p.lean = -0.12 * u; }
  if (t >= E.build_downbeat && t < E.drop) { const u = smooth((t - E.build_downbeat) / 0.6); p.eyeY = 0.5 * u; }
  if (t >= ANS_T0) { p.arms = 0.75; p.wave = Math.sin((t - ANS_T0) * 9) * smooth((t - ANS_T0) / 0.4); }
  if ([1.1, 7.0, 11.8, 20.2, 26.5, 31.0, 38.9].some((b) => t >= b && t < b + 0.1)) p.blink = 0.12;
  return p;
}
function poseClawd(p) {
  clawdG.position.y = 0.55 + p.hop; clawdG.rotation.set(p.nod + p.lean, 0, 0);
  for (const A of arms) { const lift = p.arms * (1.25 + (A.sd > 0 ? 0.25 * p.wave : -0.25 * p.wave)); A.piv.rotation.set(0, 0, A.sd * lift); }
  for (const e of eyes) { e.position.y = (4.5 + p.eyeY) * U; e.scale.y = p.blink; }
}

// sparks at the drops (deterministic), fireworks at lap 2 and the end
const NSP = 90, spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NSP * 3), 3));
const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: '#ffcf8a', size: 0.06, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(sparks);
const FW = [[E.dropB, [CX - 25, 55, CZ + 60], '#ff9a6e'], [E.dropB + 0.532, [CX + 30, 62, CZ + 40], '#7fc8ff'], [E.dropB + 1.064, [CX - 5, 70, CZ + 90], '#ffe07a'],
  [ANS_T0, [CX + 20, 75, CZ - 20], '#ff9a6e'], [ANS_T0 + 1.064, [CX - 30, 68, CZ - 40], '#9ee6a8'], [ANS_T0 + 2.128, [CX + 5, 85, CZ - 5], '#7fc8ff']];
const NFW = 140, fws = FW.map(([t0, c, col]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NFW * 3), 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: 0.9, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); scene.add(pts); return { t0, c, pts }; });

// ───────── cameras: one shot per musical section; cuts on drops and bar lines ─────────
const Y = [0, 1, 0], ad = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const nrm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
const mixv = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const carAt = (t) => at(sOf(t));
const front = (t, d = 3.5, h = 1.35, fov = 42) => { const c = carAt(t); return { pos: ad(ad(ad(c.p, c.f, d), c.u, h), c.r, 0.35), look: ad(c.p, c.u, 1.25), up: nrm(mixv(c.u, Y, 0.5)), fov }; };
const chase = (t, back = 4.2, h = 2.0, ahead = 12, fov = 78) => { const c = carAt(t); return { pos: ad(ad(c.p, c.f, -back), c.u, h), look: ad(ad(c.p, c.f, ahead), c.u, -0.6), up: c.u, fov }; };
const side = (t, d = 13, h = 3.2, fov = 40) => { const c = carAt(t); return { pos: ad(ad(c.p, c.r, -d), Y, h), look: ad(ad(c.p, c.f, 2.5), Y, 0.8), up: Y, fov }; };
const hillSide = (sCrest, t, t0, t1) => { const a = at(sCrest), u = easeInOut((t - t0) / (t1 - t0));
  return { pos: ad(ad(ad(a.p, a.r, -lerp(30, 24, u)), a.f, -9), Y, -3), look: ad(ad(a.p, a.f, -6), Y, -2.5), up: Y, fov: 44 }; };
const AERIAL = { pos: [CX + 8, 78, CZ + 92], look: [CX, 2, CZ - 4], up: Y, fov: 56 };
const SHOTS = [
  [0, E.build_downbeat, (t) => front(t, 6.2, 1.6, 40)],
  [E.build_downbeat, E.drop, (t) => hillSide(SEG_START.plunge1, t, E.build_downbeat, E.drop)],
  [E.drop, 5.45, (t) => chase(t, 4.2, 2.0, 12, lerp(84, 66, smooth((t - E.drop) / 1.1)))],
  [5.45, 8.5, (t) => side(t, 9, 2.6, 42)],
  [8.5, 10.62, (t) => chase(t, 6.5, 3.6, 16, 56)],
  [10.62, E.thin2, (t) => front(t, 3.4, 1.3, 42)],
  [E.thin2, E.build2, (t) => hillSide(SEG_START.plunge2, t, E.thin2, E.build2)],
  [E.build2, E.drop3, (t) => front(t, 3.3, 0.5, 46)],
  [E.drop3, E.bar16, (t) => chase(t, 4.4, 2.1, 12, lerp(84, 64, smooth((t - E.drop3) / 1.1)))],
  [E.bar16, E.bar17, (t) => chase(t, 5.5, 1.6, 22, 50)],
  // the loop: a side camera perpendicular to the loop plane that TRACKS THE CAR (always in frame) while keeping the loop in
  // view — aim halfway between the car and the loop's middle (the loop plane's normal is the track's right at loop entry)
  [E.bar17, E.join, (t) => { const a = at(LOOP0), c = carAt(t), mid = mixv(c.p, ad(ad(a.p, Y, 6.6), a.r, 2), 0.55), u = (t - E.bar17) / (E.join - E.bar17);
    return { pos: ad(ad(ad(mid, a.r, -24), a.f, lerp(-3, 3, u)), Y, 1.0), look: mid, up: Y, fov: 46 }; }],
  [E.join, E.bar5b, (t) => chase(t, 5.0, 1.8, 14, 60)],
  [E.bar5b, E.bar6b, (t) => side(t, 10, 2.8, 42)],
  [E.bar6b, E.thinB, (t) => { const s = side(t, 15, 4, 42), u = easeInOut((t - E.bar6b) / (E.thinB - E.bar6b - 0.25)); return { pos: mixv(s.pos, AERIAL.pos, u), look: mixv(s.look, AERIAL.look, u), up: Y, fov: lerp(42, AERIAL.fov, u) }; }],
  [E.thinB, E.buildB, (t) => hillSide(SEG_START.plunge1, t - LAP2, E.build_downbeat - 1.0, E.drop)],
  [E.buildB, E.dropB, (t) => front(t, 3.6, 1.2, 44)],
  [E.dropB, 35.05, (t) => chase(t, 4.0, 2.0, 12, lerp(88, 66, smooth((t - E.dropB) / 1.0)))],
  [35.05, ANS_T0, (t) => side(t, 9, 2.6, 42)],
  // the ending: face Clawd (waving) from in front, framed low so the answer reads above it; the lit circuit streams behind
  // (r5: pulled back so all of Clawd + the car front sit in the bottom third, upright; look above Clawd leaves the top to the answer)
  [ANS_T0, END + 1, (t) => { const c = carAt(t), u = easeInOut((t - ANS_T0) / 2.5);
    return { pos: ad(ad(c.p, c.f, lerp(7.4, 6.4, u)), c.u, 1.5), look: ad(c.p, c.u, lerp(1.8, 2.2, u)), up: nrm(mixv(c.u, Y, 0.25)), fov: 40 }; }],
];

// ───────── 2D type ─────────
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const g2 = out.getContext('2d'); let boxes = [];
const FONT = (w, px) => `${px}px NSC${w}`, ACC = '#FF9F6E', CY = '#7FE3FF', INK = '#FAF6EF';
function line(s, x, y, px, w, color, a = 1, align = 'center', accent = null, acc = ACC) {
  if (a <= 0.003) return; g2.save(); g2.globalAlpha = a; g2.font = FONT(w, px); g2.textBaseline = 'alphabetic';
  const parts = accent && s.includes(accent) ? [s.slice(0, s.indexOf(accent)), accent, s.slice(s.indexOf(accent) + accent.length)] : [s];
  const ws = parts.map((p) => g2.measureText(p).width), tw = ws.reduce((p, q) => p + q, 0); let x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  boxes.push({ s, x0, x1: x0 + tw, y0: y - px * 0.9, y1: y + px * 0.15, a });
  g2.shadowColor = 'rgba(0,0,0,.65)'; g2.shadowBlur = px * 0.22; g2.lineJoin = 'round';
  let x1 = x0; parts.forEach((p, i) => { g2.fillStyle = accent && i === 1 ? acc : color; g2.fillText(p, x1, y); x1 += ws[i]; });
  g2.restore();
}
function headline(h, t) {
  const tin = t - h.from, tout = h.to - t, a = Math.min(h.from <= 0 ? 1 : smooth(tin / 0.14), smooth(tout / 0.12));
  if (a <= 0) return; const big = h.lines.length === 1 && h.lines[0].px > 200, pop = big ? 1 + 0.35 * Math.exp(-tin * 10) : 1 + 0.06 * Math.exp(-tin * 12);
  let y = big ? 560 : 250; g2.save(); if (!(h.from <= 0)) g2.filter = `blur(${(5 * (1 - smooth(tin / 0.12))).toFixed(2)}px)`;
  for (const l of h.lines) { const px = l.px * pop; y += px; line(l.s, W / 2, y, px, l.w, INK, a, 'center', l.accent); y += 14; }
  g2.restore();
}
function pill(s, x, y, px, color, a, border) {
  if (a <= 0.003) return; g2.save(); g2.globalAlpha = a; g2.font = FONT(900, px); const tw = g2.measureText(s).width, bw = tw + px * 1.0, bh = px * 1.6;
  const bx = clamp(x - bw / 2, 64, 936 - bw); g2.fillStyle = 'rgba(10,10,22,.78)'; g2.strokeStyle = border || color; g2.lineWidth = 3;
  g2.beginPath(); g2.roundRect(bx, y - bh / 2, bw, bh, bh / 2); g2.fill(); g2.stroke(); g2.restore();
  line(s, bx + bw / 2, y + px * 0.36, px, 900, color, a);
  return [bx, bx + bw];
}
function callout(c, t, p3, color) {
  const a = Math.min(smooth((t - c.from) / 0.15), smooth((c.to - t) / 0.12)); if (a <= 0 || !p3) return;
  const v = V(p3).project(cam); if (v.z > 1 || v.z < -1) return; const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
  const ly = clamp(y - 170, 640, 1380);
  g2.save(); g2.globalAlpha = a; g2.strokeStyle = color; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(clamp(x, 140, 860), ly + 30); g2.stroke();
  g2.fillStyle = color; g2.beginPath(); g2.arc(x, y, 8, 0, Math.PI * 2); g2.fill(); g2.restore();
  pill(c.s, clamp(x, 140, 860), ly, 42, color, a);
}
function tag(c, t, color) { const a = Math.min(smooth((t - c.from) / 0.2), smooth((c.to - t) / 0.15)); pill(c.s, W / 2, 610, 36, color, a); }
function brainPanel(t) {
  const a = Math.min(smooth((t - CALL.brain.from) / 0.3), smooth((CALL.brain.to - t) / 0.2)); if (a <= 0) return;
  const wait = t < E.drop3 ? smooth((t - E.build2 + 0.6) / 1.6) * (0.85 + 0.15 * Math.sin(t * 10)) : Math.exp(-(t - E.drop3) * 2.2);
  const peak = t >= E.drop3 ? Math.exp(-(t - E.drop3) * 0.7) : 0;
  const y = 640; g2.save(); g2.globalAlpha = a; g2.fillStyle = 'rgba(8,8,20,.72)'; g2.beginPath(); g2.roundRect(84, y - 40, 912, 176, 28); g2.fill(); g2.restore();
  line(CALL.brain.s, W / 2, y + 2, 30, 500, '#B9BED8', a);
  for (const [i, c, k, col] of [[0, CALL.wait, wait, '#6FB8FF'], [1, CALL.peak, peak, '#FF8A5C']]) {
    const cx = i === 0 ? 290 : 696, cy = y + 74;   // lamp at cx−140, label from cx−105 (each label ≤ 260 px at 36 px → ends ≤ 851)
    g2.save(); g2.globalAlpha = a; const R = 24 + 10 * k; const gr = g2.createRadialGradient(cx - 140, cy, 0, cx - 140, cy, R * 2.6); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g2.globalAlpha = a * (0.25 + 0.75 * k); g2.fillStyle = gr; g2.beginPath(); g2.arc(cx - 140, cy, R * 2.6, 0, Math.PI * 2); g2.fill();
    g2.globalAlpha = a; g2.fillStyle = k > 0.15 ? col : '#3a3d55'; g2.beginPath(); g2.arc(cx - 140, cy, 20, 0, Math.PI * 2); g2.fill(); g2.restore();
    line(c.s, cx - 105, cy + 14, 40, 900, k > 0.15 ? col : '#9aa0bd', a, 'left');
  }
}
function footnotes(t) {
  for (const f of FOOT) { const a = Math.min(smooth((t - f.from) / 0.3), smooth((f.to - t) / 0.2)); if (a <= 0) continue;
    const y0 = f.from >= ANS_T0 ? 1128 : 1478;   // the ending's note sits under the answer, leaving the bottom to Clawd
    g2.save(); g2.font = FONT(500, 30); const bw = Math.max(...f.lines.map((s) => g2.measureText(s).width)) + 56, bh = 44 * f.lines.length + 22;
    g2.globalAlpha = a; g2.fillStyle = 'rgba(8,8,20,.66)'; g2.beginPath(); g2.roundRect(W / 2 - bw / 2, y0 - 46, bw, bh, 22); g2.fill(); g2.restore();
    f.lines.forEach((s, i) => line(s, W / 2, y0 + i * 44, 30, 500, '#D6D9E8', a)); }
}
function answer(t) {
  const a = smooth((t - ANS_T0 + 0.1) / 0.4); if (a <= 0) return;
  const gr = g2.createLinearGradient(0, 0, 0, 1300); gr.addColorStop(0, `rgba(6,6,16,${0.82 * a})`); gr.addColorStop(0.75, `rgba(6,6,16,${0.6 * a})`); gr.addColorStop(1, 'rgba(6,6,16,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, W, 1300);
  line(ANSWER_TITLE.s, W / 2, 380, 116, 900, INK, a, 'center', ANSWER_TITLE.accent);
  ANSWER.forEach((r, i) => { const t0 = ANS_T0 + 0.25 + 0.532 * i, k = smooth((t - t0) / 0.2), y = 560 + i * 118; if (k <= 0) return;
    g2.save(); g2.globalAlpha = k; g2.fillStyle = r.c; g2.beginPath(); g2.arc(148 - 30 * (1 - k), y - 22, 30, 0, Math.PI * 2); g2.fill(); g2.restore();
    line(r.n, 148 - 30 * (1 - k), y - 6, 40, 900, '#16131f', k); line(r.s, 204 - 30 * (1 - k), y, 60, 900, INK, k, 'left'); });
  line(ANSWER_NOTE, W / 2, 1060, 40, 500, '#C9CCDD', smooth((t - (ANS_T0 + 2.6)) / 0.4));
}

// ───────── frame ─────────
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let skip3d = false;   // textBoxes(): the type layer needs the scene state and camera, not the WebGL render
function frame(f) {
  const t = Math.min(f / FPS, END - 1e-4); boxes = [];
  const s = sOf(t), c = at(s), spd = speedOf(t);
  // car
  m4.makeBasis(V(c.r).negate(), V(c.u), V(c.f)); car.quaternion.setFromRotationMatrix(m4); car.position.set(...c.p);
  poseClawd(clawdPose(t));
  // a soft key light just in front of Clawd's face (it was backlit and read brown), warmer on the bass and the drops
  carLight.position.set(c.p[0] + c.f[0] * 1.8 + c.u[0] * 1.5, c.p[1] + c.f[1] * 1.8 + c.u[1] * 1.5, c.p[2] + c.f[2] * 1.8 + c.u[2] * 1.5); carLight.intensity = 3.0 + 1.5 * sub(t) + 2 * heatAt(t);
  // the loop assembles on the surprise bar (rises from below), then stays
  const la = t < E.bar17 - 0.45 ? 0 : clamp((t - (E.bar17 - 0.45)) / 0.42); loopG.position.y = -40 * (1 - easeOut(la)) + (la > 0 && la < 1 ? 0 : 0); loopG.visible = la > 0.01;
  // gates (a ring that is about to pass the lens fades out, so it never fills the frame with white)
  const camP = (SHOTS.find((q) => t >= q[0] && t < q[1]) || SHOTS[SHOTS.length - 1])[2](t).pos;
  const [n0, nW] = t >= ANS_T0 ? [3.5, 9] : [2.2, 5];   // the ending camera flies ahead of the car through the rings: fade them earlier
  for (const G of gates) {
    let k = 0; for (const tt of G.times) { const d = t - tt; if (d >= -0.02 && d < 1.2) k = Math.max(k, Math.exp(-Math.max(0, d) * 5)); }
    const base = G.lamp ? 0.35 : 0.4, drop = DROPS.some((d) => G.times.some((tt) => Math.abs(tt - d) < 0.05));
    const gp = G.grp.position, near = Math.hypot(gp.x - camP[0], gp.y + loopG.position.y * (inLoop(G.s) ? 1 : 0) - camP[1], gp.z - camP[2]);
    for (const m of G.meshes) { col.set(drop ? '#FFB06A' : '#FFE2C4').multiplyScalar(base + (drop ? 1.9 : 1.15) * k); m.material.color.copy(col); if (!G.lamp) m.material.opacity = clamp((near - n0) / nW, t >= ANS_T0 ? 0 : 0.05, 1); }
    G.grp.scale.setScalar(G.lamp ? 1 + 0.8 * k : 1 + 0.25 * k);
  }
  // ghost gates (示意): the expected next beats ahead (prediction stretch) / flickering guesses (fog stretch)
  ghosts.forEach((m) => { m.visible = false; });
  if (t >= 8.5 && t < 10.62) {
    let n = 0; for (let b = E.drop; b < 11; b += CUES.beat_s) { const d = b - t; if (d < -0.05 || d > 0.8 || n >= ghosts.length) continue;
      const m = ghosts[n++]; m.visible = true; placeOnTrack(m, sOf(b)); m.material.opacity = smooth((0.8 - d) / 0.35) * (d < 0 ? 1 + d / 0.05 : 1); m.scale.setScalar(1.06 + 0.15 * Math.max(0, d)); }
  }
  if (t >= E.join && t < E.bar5b + 0.1) {
    for (let i = 0; i < 6; i++) { const m = ghosts[i], seed = Math.floor(t * 8) + i * 31, d = 0.4 + 1.6 * hash(seed); m.visible = hash(seed + 5) > 0.35;
      placeOnTrack(m, sOf(t + d), 1.05 + 1.4 * (hash(seed + 9) - 0.5)); m.position.x += 2.2 * (hash(seed + 3) - 0.5); m.material.opacity = 0.35 + 0.4 * hash(seed + 7); m.scale.setScalar(0.8 + 0.5 * hash(seed + 11)); }
  }
  // spine + world pulse with the measured bass; fog stretch; drop heat
  const heat = heatAt(t);
  // the "再听一遍" aerial: the whole circuit lights up so the far shot reads (it was near-black in r4)
  const aer = t >= E.bar6b && t < E.thinB ? smooth((t - E.bar6b - 0.4) / 0.8) * (1 - smooth((t - E.thinB + 0.25) / 0.25)) : 0;
  spineMat.color.set('#ff7a59').multiplyScalar(0.7 + 1.3 * sub(t) + 1.5 * heat + 3.2 * smooth((t - ANS_T0) / 2.2) + 3.0 * aer);
  const fin = smooth((t - ANS_T0) / 2.2);
  railMat.emissiveIntensity = 0.1 + 0.25 * heat + 1.1 * fin + 1.6 * aer;
  groundMat.uniforms.uPulse.value = 0.3 * sub(t) + heat;
  const fogK = t >= E.join - 0.2 && t < E.bar5b + 0.6 ? smooth((t - E.join + 0.2) / 0.4) * (1 - smooth((t - E.bar5b) / 0.6)) : 0;
  scene.fog.color.copy(FOG).lerp(FOG2, fogK); scene.fog.density = 0.0065 + 0.055 * fogK;
  skyMat.uniforms.uHeat.value = 0.25 * sub(t) + 0.6 * heat; skyMat.uniforms.uFog.value = fogK;
  { const q = new THREE.Quaternion(), mm = new THREE.Matrix4(); TW.forEach((w, i) => { const e = 0.6 + 4 * Math.max(0, sub(t - 0.05 * w.ph) - 0.15) + 3 * heat * w.ph; mm.compose(new THREE.Vector3(w.x, w.h, w.z), q, new THREE.Vector3(w.w * 0.9, e, w.w * 0.9)); caps.setMatrixAt(i, mm); }); caps.instanceMatrix.needsUpdate = true; }
  // sparks behind the car on each drop
  { const P = spGeo.attributes.position; let vis = false;
    for (const d of DROPS) { const age = t - d; if (age < 0 || age > 1.3) continue; vis = true; const o = at(sOf(d + 0.15));
      for (let i = 0; i < NSP; i++) { const v = [(hash(i) - 0.5) * 6, 2 + 5 * hash(i + 3), (hash(i + 7) - 0.5) * 6], k = age * (0.6 + 0.6 * hash(i + 9));
        P.setXYZ(i, o.p[0] + v[0] * k, o.p[1] + v[1] * k - 4.9 * k * k, o.p[2] + v[2] * k); }
      sparks.material.opacity = 1 - age / 1.3; }
    sparks.visible = vis; P.needsUpdate = true; }
  for (const F of fws) { const age = t - F.t0, P = F.pts.geometry.attributes.position; F.pts.visible = age >= 0 && age < 2.2; if (!F.pts.visible) continue;
    for (let i = 0; i < NFW; i++) { const th = hash(i * 1.7) * Math.PI * 2, ph = Math.acos(2 * hash(i * 2.3) - 1), sp = 14 + 6 * hash(i * 3.1), k = 1 - Math.exp(-age * 2.2);
      P.setXYZ(i, F.c[0] + sp * k * Math.sin(ph) * Math.cos(th), F.c[1] + sp * k * Math.cos(ph) - 3 * age * age, F.c[2] + sp * k * Math.sin(ph) * Math.sin(th)); }
    P.needsUpdate = true; F.pts.material.opacity = Math.min(1, 3 * age) * (1 - smooth((age - 1.2) / 1.0)); }
  // camera (cut on musical boundaries; a small kick on every onset; bigger on drops)
  const sh = SHOTS.find((q) => t >= q[0] && t < q[1]) || SHOTS[SHOTS.length - 1], cm = sh[2](t);
  const kick = Math.exp(-(t - lastOnset(t)) * 12) * 0.6 + heat * 3;
  cam.position.set(...cm.pos); cam.up.set(...cm.up); cam.lookAt(...cm.look);
  const jit = heat * 0.012 * (hash(f * 1.3) - 0.5); cam.rotateZ(jit);
  cam.fov = cm.fov * (1 - 0.012 * kick); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  bloom.strength = 0.32 + 0.45 * heat + 0.12 * sub(t); renderer.toneMappingExposure = 0.95 + 0.15 * heat;
  if (!skip3d) composer.render();

  // ── 2D: the picture, motion streaks on the plunges, vignette, type
  g2.globalAlpha = 1; g2.filter = 'none'; g2.drawImage(gl, 0, 0);
  const streak = clamp((spd - 18) / 14) * (sh[2] === SHOTS[2][2] || [2, 8, 16].includes(SHOTS.indexOf(sh)) ? 1 : 0);
  if (streak > 0.02) { g2.save(); g2.globalCompositeOperation = 'lighter'; g2.strokeStyle = `rgba(255,214,190,${0.22 * streak})`; g2.lineWidth = 3;
    for (let i = 0; i < 46; i++) { const a = hash(i * 9.1) * Math.PI * 2, r0 = 300 + 500 * ((hash(i * 3.3) + t * 2.6) % 1), r1 = r0 + 140 + 260 * streak;
      g2.beginPath(); g2.moveTo(W / 2 + Math.cos(a) * r0, H * 0.46 + Math.sin(a) * r0 * 1.2); g2.lineTo(W / 2 + Math.cos(a) * r1, H * 0.46 + Math.sin(a) * r1 * 1.2); g2.stroke(); }
    g2.restore(); }
  const vg = g2.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g2.fillStyle = vg; g2.fillRect(0, 0, W, H);
  if (t < ANS_T0 - 0.1) { const gr = g2.createLinearGradient(0, 0, 0, 760); gr.addColorStop(0, 'rgba(6,6,16,.7)'); gr.addColorStop(0.6, 'rgba(6,6,16,.35)'); gr.addColorStop(1, 'rgba(6,6,16,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, W, 760); }
  { const gr = g2.createLinearGradient(0, 1380, 0, H); gr.addColorStop(0, 'rgba(6,6,16,0)'); gr.addColorStop(1, 'rgba(6,6,16,.55)'); g2.fillStyle = gr; g2.fillRect(0, 1380, W, H - 1380); }
  for (const h of HEAD) if (t >= h.from - 1e-6 && t < h.to) headline(h, t);
  // pinned labels
  if (t >= CALL.beat.from && t < CALL.beat.to) { const G = gates.find((q) => !q.lamp && q.s > s + 5 && q.s < s + 40); if (G) callout(CALL.beat, t, G.grp.position.toArray(), '#FFE9D2'); }
  if (t >= CALL.guess.from && t < CALL.guess.to) { const m = ghosts.find((q) => q.visible); if (m) callout(CALL.guess, t, m.position.toArray(), CY); }
  tag(CALL.thin, t, '#9fd8ff'); tag(CALL.same, t, '#9EE6A8');
  brainPanel(t); footnotes(t); answer(t);
}

film.render = async (f) => { frame(f); };
film.grab = (type = 'image/png', q = 0.95) => out.toDataURL(type, q);
film.textBoxes = (f) => { skip3d = true; try { frame(f); } finally { skip3d = false; } return boxes.map((b) => ({ f, ...b })); };
(async () => {
  try {
    for (const w of [500, 900]) { const ff = new FontFace(`NSC${w}`, `url(assets/fonts/NotoSansSC-${w}.woff2)`, { weight: String(w) }); await ff.load(); document.fonts.add(ff); }
    frame(0); film.ready = true;
  } catch (e) { film.error = String((e && e.stack) || e); }
})();
