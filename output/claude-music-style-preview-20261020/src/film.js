// film.js — the style preview: three.js scene + Canvas 2D captions, every frame a pure function of its number.
// window.film = { ready, error, frameCount, render(f), grab(type, q) } for tools/render.mjs.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CUES } from './cues.js';
import { TEXT } from './text.js';
import { makeClawd, giantCells, CLAY } from './clawd.js';
import { E, DROP, FINAL, LAUNCH, BEAT, S, U, ZL, G, ZG, STONES, GHOSTS, BUILD, FLIGHT, clamp, lerp, smooth, hash, stoneZ, clawd, camera, hitEnv } from './motion.js';

const W = 1080, H = 1920, FPS = CUES.fps, FRAMES = CUES.frames;
const film = (window.film = { ready: false, error: null, frameCount: FRAMES });
window.addEventListener('error', (e) => { film.error = String(e.error && e.error.stack || e.message); });

// ───────── renderer, scene, light ─────────
const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const VOID = new THREE.Color('#0A0807');
scene.background = VOID; scene.fog = new THREE.FogExp2(VOID, 0.018);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22;
const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 300);

const hemi = new THREE.HemisphereLight('#FFE9D6', '#140C08', 0.25); scene.add(hemi);
const key = new THREE.DirectionalLight('#FFF1E2', 2.2);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 });
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#BFD3FF', 1.6); scene.add(rim, rim.target);       // cool edge from behind
const under = new THREE.PointLight('#FF7A3D', 0, 9, 1.6); scene.add(under);              // the stone's light on Clawd
const hero = new THREE.PointLight('#FF8A4C', 0, 40, 1.2); scene.add(hero);               // the drop's heat

// ───────── Clawd ─────────
const cl = makeClawd(U); scene.add(cl);
const P = cl.userData.parts, M = cl.userData.mats;

// ───────── stones (the beat path) and ghost frames (the predicted beats) ─────────
const SW = 2.7, SD = 1.9, ST = 0.42;
const stoneGeo = new RoundedBoxGeometry(SW, ST, SD, 3, 0.07); stoneGeo.translate(0, -ST / 2, 0);
const lampGeo = new RoundedBoxGeometry(SW - 0.5, 0.04, SD - 0.5, 2, 0.02);
const stones = STONES.map(({ k, t }) => {
  const m = new THREE.Mesh(stoneGeo, new THREE.MeshPhysicalMaterial({ color: '#1C1714', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  m.receiveShadow = true; m.castShadow = true;
  const lampM = new THREE.MeshBasicMaterial({ color: '#000000', toneMapped: false });
  const lamp = new THREE.Mesh(lampGeo, lampM); lamp.position.y = 0.005; m.add(lamp);
  m.position.set(0, 0, stoneZ(k)); scene.add(m);
  return { m, lampM, k, t };
});
// ghost frame = dashed rectangle of small bars (instanced), additive ivory
const DASH = 5, ghostGeo = new THREE.BoxGeometry(1, 0.05, 1);
const ghostMesh = new THREE.InstancedMesh(ghostGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), GHOSTS.length * DASH * 4);
ghostMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ghostMesh.count * 3), 3); ghostMesh.frustumCulled = false; scene.add(ghostMesh);
const IVORY = new THREE.Color('#F4EBDD');

// ───────── the world floor (rises at the drop) and the giant built from it ─────────
const PITCH = 0.64, TILE = 0.6;
const tiles = [];
for (let x = -15; x <= 15 + 1e-6; x += PITCH) for (let z = -11; z <= 31 + 1e-6; z += PITCH) {
  const onStone = STONES.some(({ k }) => Math.abs(x) < SW / 2 + 0.2 && Math.abs(z - stoneZ(k)) < SD / 2 + 0.2);
  if (!onStone) tiles.push({ x, z, r: Math.hypot(x, z - ZL), h: hash(tiles.length * 1.7 + 3), giant: null });
}
const cells = giantCells(4);
// each giant voxel is lifted out of the floor tile nearest to the spot under it (the hole is where the giant rose from)
const free = new Set(tiles.keys());
for (const c of cells) {
  const gx = c.x * G, gz = ZG + c.z * G; let best = -1, bd = 1e9;
  for (const i of free) { const d = (tiles[i].x - gx) ** 2 + (tiles[i].z - gz) ** 2; if (d < bd) { bd = d; best = i; } }
  free.delete(best); const row = BUILD.findIndex((b) => b.rows.includes(c.r));
  tiles[best].giant = { ...c, tx: gx, ty: c.y * G, tz: gz, t1: BUILD[row].t, row, spin: hash(best * 3.1) };
}
const tileGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.06);
tileGeo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(new Float32Array(tiles.length * 3), 3));
const tileMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.35 });
tileMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aGlow; varying vec3 vGlow; varying float vTop;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow; vTop = normal.y;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGlow; varying float vTop;')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow * (0.18 + 0.82 * smoothstep(0.5, 0.95, vTop));');
};
const tileMesh = new THREE.InstancedMesh(tileGeo, tileMat, tiles.length);
tileMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(tiles.length * 3), 3);
tileMesh.castShadow = true; tileMesh.receiveShadow = true; tileMesh.frustumCulled = false; scene.add(tileMesh);
const glowAttr = tileGeo.getAttribute('aGlow');

// the abyss: a far warm glow under the void (gives depth before the floor exists) and a horizon haze behind the giant
const abyss = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.ShaderMaterial({
  uniforms: { uHeat: { value: 0 } }, depthWrite: false, fog: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform float uHeat; varying vec2 vUv; void main(){ float d = length(vUv - vec2(.5, .56)); vec3 c = vec3(.55,.2,.07) * (.05 + .2 * uHeat) * exp(-d * 9.); gl_FragColor = vec4(c, 1.); }' }));
abyss.rotation.x = -Math.PI / 2; abyss.position.y = -26; scene.add(abyss);
const haze = new THREE.Mesh(new THREE.PlaneGeometry(220, 90), new THREE.ShaderMaterial({
  uniforms: { uHeat: { value: 0 } }, depthWrite: false, fog: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform float uHeat; varying vec2 vUv; void main(){ float y = vUv.y; float x = abs(vUv.x - .5); float g = exp(-pow((y - .36) * 7., 2.)) * exp(-x * x * 9.); vec3 c = mix(vec3(.75,.22,.06), vec3(1.,.55,.28), g * g) * g * uHeat; gl_FragColor = vec4(c, 1.); }' }));
haze.position.set(0, 10, -70); scene.add(haze);

// ───────── post: bloom, then a grade pass (impact shock ring, chromatic split, vignette, grain) ─────────
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.55, 0.82); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uShock: { value: 0 }, uShockR: { value: 0 }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uCA: { value: 0 }, uSeed: { value: 0 }, uFade: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uShock, uShockR, uCA, uSeed, uFade; uniform vec2 uC; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
    void main(){
      vec2 asp = vec2(1., 1920./1080.); vec2 d = (vUv - uC) * asp; float r = length(d);
      float ring = uShock * exp(-pow((r - uShockR) * 14., 2.));
      vec2 uv = vUv - normalize(d + 1e-5) / asp * ring * .035;
      vec2 ca = (vUv - .5) * uCA;
      vec3 c = vec3(texture2D(tDiffuse, uv + ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - ca).b);
      float v = smoothstep(1.25, .35, length((vUv - .5) * vec2(1., 1.25)));
      c *= mix(.55, 1., v);
      c += (h(vUv * 1080.) - .5) * .028;
      gl_FragColor = vec4(c * (1. - uFade), 1.);
    }` });
composer.addPass(grade);

// ───────── 2D caption layer ─────────
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const g2 = out.getContext('2d');
const FONT = (w, px) => `${w} ${px}px "NSC${w}"`;
let boxes = [];   // text boxes drawn this frame (for tools/render.mjs --textcheck)
function caption(lines, alpha, rise, x0 = W / 2) {
  if (alpha <= 0) return;
  g2.save(); g2.globalAlpha = alpha; g2.textAlign = 'center'; g2.textBaseline = 'alphabetic';
  for (const l of lines) {
    g2.font = FONT(l.w, l.px); const y = l.y + rise;
    // soft dark halo for legibility over light, no box
    g2.shadowColor = 'rgba(0,0,0,.55)'; g2.shadowBlur = 24; g2.fillStyle = '#F4EBDD';
    if (l.accent) {
      const i = l.s.indexOf(l.accent), a = l.s.slice(0, i), b = l.accent, c2 = l.s.slice(i + b.length);
      const wa = g2.measureText(a).width, wb = g2.measureText(b).width, wc = g2.measureText(c2).width; let x = x0 - (wa + wb + wc) / 2;
      boxes.push({ s: l.s, x0: x, x1: x + wa + wb + wc, y0: y - l.px * 0.9, y1: y + l.px * 0.15, a: alpha });
      g2.textAlign = 'left'; g2.fillText(a, x, y); x += wa; g2.fillStyle = '#E8875F'; g2.fillText(b, x, y); x += wb; g2.fillStyle = '#F4EBDD'; g2.fillText(c2, x, y); g2.textAlign = 'center';
    } else { const w2 = g2.measureText(l.s).width; boxes.push({ s: l.s, x0: x0 - w2 / 2, x1: x0 + w2 / 2, y0: y - l.px * 0.9, y1: y + l.px * 0.15, a: alpha }); g2.fillText(l.s, x0, y); }
  }
  g2.restore();
}

// ───────── per frame ─────────
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color();
const DARK = new THREE.Color('#141110'), EYE = new THREE.Color('#0B0908'), HOT = new THREE.Color('#FF7A3D');
const kicksDrop = CUES.kicks.filter((k) => k.t >= DROP - 1e-6).map((k) => k.t);
const WAVE_C = 80, PUMP_C = 24;

function frame(f) {
  const t = f / FPS; boxes = [];
  // Clawd
  const s = clawd(t);
  cl.position.set(s.x, s.y, s.z); cl.scale.set(s.sxz, s.sy, s.sxz); cl.rotation.set(s.lean, 0, 0);
  const u = U;
  P.armL.position.copy(P.armL.userData.rest).add(v3.set(-0.15 * u * Math.max(0, s.arm), s.arm * u, 0));
  P.armR.position.copy(P.armR.userData.rest).add(v3.set(0.15 * u * Math.max(0, s.arm), s.arm * u, 0));
  for (const l of P.legs) { l.scale.y = 1 - 0.45 * s.tuck; l.position.y = l.userData.rest.y + 0.45 * s.tuck * u; }
  for (const e of P.eyes) { e.scale.y = s.blink; e.position.set(e.userData.rest.x + s.eyeX * u, e.userData.rest.y + s.eyeY * u, e.userData.rest.z); }
  M.body.userData.uniforms.uSeam.value = s.seam; M.body.emissiveIntensity = 0;

  // stones: rise just before their beat, lock and light ON the beat; the drop stone is slammed into being at the drop
  let lightUnder = 0;
  for (const st of stones) {
    const dt = t - st.t;
    if (st.k === Math.round(DROP / BEAT)) { st.m.visible = t >= DROP; st.m.position.y = 0; }
    else { const r = clamp((t - (st.t - 0.42)) / 0.38); st.m.visible = r > 0 || st.t === 0; st.m.position.y = st.t === 0 ? 0 : -2.2 * (1 - smooth(r)) ** 2; }
    const lit = dt >= 0 ? 0.35 + 3.2 * Math.exp(-dt * 5) : 0;
    st.lampM.color.copy(HOT).multiplyScalar(lit * (t >= DROP + 0.4 && st.k !== Math.round(DROP / BEAT) ? 0.6 : 1));
    if (dt >= 0 && dt < 0.6) lightUnder = Math.max(lightUnder, Math.exp(-dt * 6));
  }
  under.position.set(0, 0.3, s.z + 0.4); under.intensity = 5 * lightUnder + 3 * Math.max(0, s.seam - 1);

  // ghost frames: the next two beats are always outlined ahead; withheld beats flicker on their beat; the drop's ghost
  // burns brightest in the gap and disappears when the real stone lands
  let gi = 0;
  for (const gh of GHOSTS) {
    const ahead = gh.t - t, z = stoneZ(gh.k);
    let a = smooth((1.05 - ahead) / 0.3) * (ahead > -0.02 ? 1 : 0);
    if (gh.withheld && t >= gh.t) a = Math.max(0, 0.9 * Math.exp(-(t - gh.t) * 3)) * (0.6 + 0.4 * Math.cos((t - gh.t) * 60));
    if (gh.t === DROP) a = t < DROP ? (t > LAUNCH ? 1.6 + 0.4 * Math.sin(t * 40) : a) : 0;
    if (!gh.withheld && gh.t !== DROP && t >= gh.t) a = 0;
    a *= gh.t === DROP ? 1 : 0.75;
    for (let side = 0; side < 4; side++) for (let d = 0; d < DASH; d++) {
      const along = (d + 0.5) / DASH - 0.5, horiz = side < 2, len = (horiz ? SW : SD) / DASH * 0.55;
      const px = horiz ? along * SW : (side === 2 ? -1 : 1) * SW / 2, pz = z + (horiz ? (side === 0 ? -1 : 1) * SD / 2 : along * SD);
      m4.compose(v3.set(px, 0.03, pz), q.identity(), s3.set(horiz ? len : 0.06, 1, horiz ? 0.06 : len));
      ghostMesh.setMatrixAt(gi, m4); ghostMesh.setColorAt(gi, col.copy(IVORY).multiplyScalar(a)); gi++;
    }
  }
  ghostMesh.instanceMatrix.needsUpdate = true; ghostMesh.instanceColor.needsUpdate = true;

  // the floor: erupts outward from the landing at the drop, then every kick sends a ring through it
  for (let i = 0; i < tiles.length; i++) {
    const T = tiles[i]; let x = T.x, z = T.z, y0 = -1, top = -30, sx = TILE, sz = TILE, glow = 0, rot = 0;
    const ta = DROP + T.r / WAVE_C + 0.04 * T.h;
    col.copy(DARK);
    if (t >= ta - 0.14) {
      const da = t - ta;
      top = da < 0 ? lerp(-4, 0, smooth((da + 0.14) / 0.14)) : (1.6 * Math.exp(-T.r / 9) + 0.35) * Math.exp(-da * 5.5) * Math.cos(da * 14) * (1 - 0.6 * T.h);
      glow = da < 0 ? 0 : 2.4 * Math.exp(-da * 4) * Math.exp(-T.r / 14);
      for (const tk of kicksDrop) if (t >= tk && tk > DROP) {
        const dk = t - tk, ring = Math.exp(-(((T.r - PUMP_C * dk) / 1.5) ** 2)) * Math.exp(-dk * 1.4) * Math.exp(-T.r / 30) * (tk === FINAL ? 1.6 : 1);
        top += 0.9 * ring; glow += 1.6 * ring;
      }
      glow += 0.01 + 0.012 * T.h;
    }
    if (T.giant && t >= T.giant.t1 - FLIGHT) {           // lifted into the giant: arc, spin, heat up, lock on its note
      const gq = T.giant, p = clamp((t - (gq.t1 - FLIGHT)) / FLIGHT), e = 1 - (1 - p) ** 3, land = t - gq.t1;
      const ax = lerp(x, gq.tx, e), az = lerp(z, gq.tz, e), ay = lerp(0, gq.ty, e) + 4.5 * Math.sin(Math.PI * p) * (1 - p * 0.3);
      const sc = lerp(TILE, G * 0.965, smooth(p * 1.3));
      const bounce = land >= 0 ? 0.08 * Math.exp(-land * 10) * Math.cos(land * 30) : 0;
      rot = (1 - e) ** 2 * Math.PI * 2 * (gq.spin > 0.5 ? 1 : -1);
      e3.set(rot * 0.7, rot, rot * 0.3 * gq.spin); q.setFromEuler(e3);
      m4.compose(v3.set(ax, ay, az), q, s3.set(sc * (1 + bounce), sc * (1 - bounce), sc * (1 + bounce)));
      tileMesh.setMatrixAt(i, m4);
      col.copy(DARK).lerp(gq.kind === 'eye' ? EYE : CLAY, smooth(p * 1.2));
      const heat = 2.2 * Math.sin(Math.PI * p) + (land >= 0 ? 1.4 * Math.exp(-land * 7) : 0) + (t >= FINAL ? 1.8 * Math.exp(-(t - FINAL) * 3) * (gq.kind === 'eye' ? 0 : 1) : 0);
      tileMesh.setColorAt(i, col); glowAttr.setXYZ(i, HOT.r * heat, HOT.g * heat, HOT.b * heat);
      continue;
    }
    const h = Math.max(0.02, top - y0);
    if (top < -20) m4.makeScale(0, 0, 0);               // not risen yet: the void
    else m4.compose(v3.set(x, y0 + h / 2, z), q.identity(), s3.set(sx, h, sz));
    tileMesh.setMatrixAt(i, m4); tileMesh.setColorAt(i, col);
    glowAttr.setXYZ(i, HOT.r * glow, HOT.g * glow * 0.9, HOT.b * glow * 0.8);
  }
  tileMesh.instanceMatrix.needsUpdate = true; tileMesh.instanceColor.needsUpdate = true; glowAttr.needsUpdate = true;

  // light & atmosphere
  const heat = t >= DROP ? smooth((t - DROP) / 0.6) : 0, hit = hitEnv(t, 0.18);
  key.position.set(s.z * 0 - 7, 13, s.z + 9); key.target.position.set(0, 0, t < DROP ? s.z : 8); key.intensity = 1.6 + 0.5 * heat;
  key.shadow.camera.left = t < DROP ? -8 : -18; key.shadow.camera.right = -key.shadow.camera.left; key.shadow.camera.top = -key.shadow.camera.left; key.shadow.camera.bottom = key.shadow.camera.left; key.shadow.camera.updateProjectionMatrix();
  rim.position.set(3, 9, (t < DROP ? s.z : ZG) - 12); rim.target.position.set(0, 1, t < DROP ? s.z : ZG); rim.intensity = 1.4 - 0.4 * heat;
  hero.position.set(0, 1.5, ZL); hero.intensity = t >= DROP ? 25 * Math.exp(-(t - DROP) * 3) + 10 * hitEnv(t, 0.12) * (t >= DROP + 0.1 ? 1 : 0) : 0;
  abyss.material.uniforms.uHeat.value = t < DROP ? 0.6 + 1.2 * smooth((t - 2.5) / 1.5) : 1.8;
  haze.material.uniforms.uHeat.value = 0.05 + 0.32 * heat + 0.2 * (t >= FINAL ? Math.exp(-(t - FINAL) * 1.5) : 0);
  scene.fog.density = t < DROP ? 0.03 : lerp(0.03, 0.013, heat);
  bloom.strength = 0.5 + 0.35 * Math.min(1.5, hit);

  // camera
  const c = camera(t);
  cam.position.set(...c.pos); cam.fov = c.fov; cam.up.set(Math.sin(c.roll), Math.cos(c.roll), 0); cam.lookAt(...c.look); cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  // the drop's shock ring starts where Clawd lands on screen
  const sp = v3.set(0, 0.2, ZL).project(cam);
  grade.uniforms.uC.value.set((sp.x + 1) / 2, (sp.y + 1) / 2);
  const ds = t - DROP; grade.uniforms.uShock.value = ds >= 0 && ds < 0.7 ? Math.exp(-ds * 4) : 0; grade.uniforms.uShockR.value = Math.max(0, ds) * 1.9;
  grade.uniforms.uCA.value = 0.006 * Math.min(1.2, hitEnv(t, 0.12) * (t >= DROP ? 1 : 0.2));
  grade.uniforms.uSeed.value = f * 0.618; grade.uniforms.uFade.value = smooth((t - 7.55) / 0.4);

  composer.render();
  g2.drawImage(gl, 0, 0);
  // captions
  const fade = 1 - smooth((t - 7.55) / 0.4);
  const T = TEXT.title; caption(T.lines, (t < T.to - 0.3 ? 1 : 1 - smooth((t - (T.to - 0.3)) / 0.3)), -24 * smooth((t - (T.to - 0.3)) / 0.3));
  if (t >= TEXT.ask.from && t < TEXT.ask.to) {
    const a = smooth((t - TEXT.ask.from) / 0.08);       // in the dark between the hanging Clawd and the burning ghost stone
    caption(TEXT.ask.lines, a, 0);
  }
  const L = TEXT.land; if (t >= L.from) caption(L.lines, smooth((t - L.from) / 0.25) * fade, 18 * (1 - smooth((t - L.from) / 0.3)));
}

film.render = async (f) => { frame(f); };
film.grab = (type = 'image/png', q = 0.95) => out.toDataURL(type, q);
film.textBoxes = (f) => { frame(f); return boxes.map((b) => ({ f, ...b })); };

// fonts, then a warm-up frame so shaders compile before the first grab
(async () => {
  try {
    for (const w of [500, 900]) { const ff = new FontFace(`NSC${w}`, `url(assets/fonts/NotoSansSC-${w}.woff2)`, { weight: String(w) }); await ff.load(); document.fonts.add(ff); }
    frame(0); film.ready = true;
  } catch (e) { film.error = String(e && e.stack || e); }
})();
