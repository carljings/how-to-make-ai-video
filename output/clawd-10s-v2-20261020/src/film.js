// film.js — 《这首开智小曲，为什么上头？》 10 s style preview: three.js + Canvas 2D captions; every frame is a pure function
// of its number. window.film = { ready, error, frameCount, render(f), grab(type, q), textBoxes(f) } for tools/render.mjs.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CUES } from './cues.js';
import { TEXT } from './text.js';
import { makeClawd, poseClawd } from './clawd.js';
import { E, DROP, DW, DH, DT, IMPACT, MONO, dominos, fallAngle, landTime, sub, clamp, smooth, hash } from './world.js';
import { clawd, camera } from './motion.js';

const W = 1080, H = 1920, FPS = CUES.fps, FRAMES = CUES.frames;
const film = (window.film = { ready: false, error: null, frameCount: FRAMES });
window.addEventListener('error', (e) => { film.error = String((e.error && e.error.stack) || e.message); });

// ───────── renderer ─────────
const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 900);

// ───────── sky: dusk gradient, a low sun just off frame right ─────────
const SUN = new THREE.Vector3(0.97, 0.075, -0.2).normalize();      // low, just right of frame: rim light + a warm horizon
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN }, uHeat: { value: 0 }, uNight: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform vec3 uSun; uniform float uHeat; uniform float uNight; varying vec3 vD;
    void main(){
      float h = vD.y; float s = max(dot(normalize(vD), uSun), 0.);
      vec3 zen = mix(vec3(.035,.05,.12), vec3(.006,.009,.03), uNight), mid = mix(vec3(.16,.13,.25), vec3(.02,.025,.07), uNight), hor = mix(vec3(.95,.48,.26), vec3(.30,.11,.09), uNight), warm = vec3(1.25,.62,.30) * (1. - .8 * uNight);
      vec3 c = mix(hor, mid, smoothstep(0.0, .22, h)); c = mix(c, zen, smoothstep(.2, .75, h));
      c += warm * pow(s, 9.) * (.55 + .35 * uHeat) * smoothstep(-.05, .25, .3 - h);
      c += vec3(1.6, 1.15, .75) * smoothstep(.9985, .9995, s) * 1.2 * (1. - uNight);   // the sun disc (it sets on the drop)
      c = mix(c, vec3(.05,.045,.06), smoothstep(0., -.08, h));                         // below the horizon
      gl_FragColor = vec4(c, 1.);
    }` });
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), skyMat); scene.add(sky);
{ // reflections: the environment is the same sky
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), skyMat));
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(envScene, 0.02).texture; scene.environmentIntensity = 0.55;
}
const FOG_DUSK = new THREE.Color('#3B2D36'), FOG_NIGHT = new THREE.Color('#0B0A12');
scene.fog = new THREE.FogExp2(FOG_DUSK.clone(), 0.0105);

// ───────── ground: dark polished stone reflecting the dusk ─────────
const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 96), new THREE.MeshPhysicalMaterial({ color: '#0C0D12', roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.12 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

// ───────── light ─────────
const sun = new THREE.DirectionalLight('#FFC392', 2.8);
sun.position.copy(SUN).multiplyScalar(90).add(new THREE.Vector3(18, 0, -12)); sun.target.position.set(18, 0, -12);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 220 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight('#6A78B0', '#1A1210', 0.55); scene.add(hemi);
const charKey = new THREE.SpotLight('#FFE7D2', 9, 14, 0.28, 0.85, 1.4); scene.add(charKey, charKey.target);   // a soft key on Clawd's face
const slamLight = new THREE.PointLight('#FF8A4C', 0, 70, 1.3); scene.add(slamLight);

// ───────── dominos: one instanced mesh, pips on the back face (they face up once fallen) ─────────
const N = dominos.length;
const dGeo = new RoundedBoxGeometry(DW, DH, DT, 2, 0.022); dGeo.translate(0, DH / 2, 0);
const aSeed = new Float32Array(N), aGlow = new Float32Array(N), aIvory = new Float32Array(N);
dominos.forEach((d, i) => { aSeed[i] = hash(i * 3.17 + 0.5); aIvory[i] = d.kind === 'chain' ? 1 : d.kind === 'esc' ? clamp(1.25 - 0.32 * d.s, 0, 1) : 0; });   // ivory rule → darkening escalation → black monolith and plain
dGeo.setAttribute('aIvory', new THREE.InstancedBufferAttribute(aIvory, 1));
dGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
dGeo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(aGlow, 1));
const dMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.14 });
dMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSeed; attribute float aGlow; attribute float aIvory; varying vec3 vLoc; varying vec3 vLN; varying float vSeed; varying float vGlow; varying float vIvory;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position; vLN = normal; vSeed = aSeed; vGlow = aGlow; vIvory = aIvory;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    varying vec3 vLoc; varying vec3 vLN; varying float vSeed; varying float vGlow; varying float vIvory; float gPip;
    float pip(vec2 p, vec2 c){ return 1. - smoothstep(.036, .048, length(p - c)); }
    float face(vec2 p, float n){                     // standard domino layouts, n = 0..6
      float o = .118, m = 0.;
      if (n == 1. || n == 3. || n == 5.) m += pip(p, vec2(0.));
      if (n >= 2.) { m += pip(p, vec2(-o, o)); m += pip(p, vec2(o, -o)); }
      if (n >= 4.) { m += pip(p, vec2(o, o)); m += pip(p, vec2(-o, -o)); }
      if (n == 6.) { m += pip(p, vec2(-o, 0.)); m += pip(p, vec2(o, 0.)); }
      return clamp(m, 0., 1.);
    }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
      gPip = 0.;
      vec3 baseC = mix(vec3(.075,.078,.095), vec3(.86,.82,.75), vIvory), pipC = mix(vec3(.93,.89,.82), vec3(.05,.045,.05), vIvory);
      diffuseColor.rgb = baseC;
      if (vLN.z < -.5) {
        float nTop = floor(vSeed * 7.), nBot = floor(fract(vSeed * 13.37) * 7.);
        gPip = vLoc.y > .5 ? face(vec2(vLoc.x, vLoc.y - .75), nTop) : face(vec2(vLoc.x, vLoc.y - .25), nBot);
        float line = (1. - smoothstep(.006, .012, abs(vLoc.y - .5))) * step(abs(vLoc.x), .2);
        diffuseColor.rgb = mix(diffuseColor.rgb, pipC, max(gPip, line * .6));
      }`)
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1., .5, .16) * (2.8 * gPip + (vLN.z < -.5 ? .045 : .015)) * vGlow * (1. - vIvory);');
};
const dMesh = new THREE.InstancedMesh(dGeo, dMat, N);
dMesh.castShadow = true; dMesh.receiveShadow = true; dMesh.frustumCulled = false; scene.add(dMesh);
const PSI = dominos.map((d) => Math.atan2(Math.cos(d.ang), -Math.sin(d.ang)));   // yaw so that local +z = fall heading

// ───────── Clawd ─────────
const cl = makeClawd(); scene.add(cl);

// ───────── post ─────────
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.45, 0.92); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uShock: { value: 0 }, uShockR: { value: 0 }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uCA: { value: 0 }, uSeed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uShock, uShockR, uCA, uSeed; uniform vec2 uC; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
    void main(){
      vec2 asp = vec2(1., 1920. / 1080.); vec2 d = (vUv - uC) * asp; float r = length(d);
      float ring = uShock * exp(-pow((r - uShockR) * 12., 2.));
      vec2 uv = vUv - normalize(d + 1e-5) / asp * ring * .03;
      vec2 ca = (vUv - .5) * uCA;
      vec3 c = vec3(texture2D(tDiffuse, uv + ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - ca).b);
      c *= mix(.62, 1., smoothstep(1.2, .35, length((vUv - .5) * vec2(1., 1.2))));
      c += (h(vUv * 1080.) - .5) * .012;
      gl_FragColor = vec4(c, 1.);
    }` });
composer.addPass(grade);

// ───────── captions (Canvas 2D over the 3D frame) ─────────
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const g2 = out.getContext('2d');
let boxes = [];
function caption(lines, alpha, rise = 0) {
  if (alpha <= 0) return;
  g2.save(); g2.globalAlpha = alpha; g2.textBaseline = 'alphabetic';
  for (const l of lines) {
    g2.font = `${l.w} ${l.px}px "NSC${l.w}"`; const y = l.y + rise;
    const parts = l.accent ? [l.s.slice(0, l.s.indexOf(l.accent)), l.accent, l.s.slice(l.s.indexOf(l.accent) + l.accent.length)] : [l.s];
    const ws = parts.map((p) => g2.measureText(p).width), tw = ws.reduce((a, b) => a + b, 0); let x = W / 2 - tw / 2;
    boxes.push({ s: l.s, x0: x, x1: x + tw, y0: y - l.px * 0.9, y1: y + l.px * 0.15, a: alpha });
    g2.shadowColor = 'rgba(10,6,12,.6)'; g2.shadowBlur = 26; g2.textAlign = 'left';
    parts.forEach((p, i) => { g2.fillStyle = l.accent && i === 1 ? '#F08A5D' : '#F6EFE4'; g2.fillText(p, x, y); x += ws[i]; });
  }
  g2.restore();
}

// ───────── per frame ─────────
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qx = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
const LAND = dominos.map(landTime), BEATS_D = E.drop_beats;
function frame(f) {
  const t = f / FPS; boxes = [];
  const sb = sub(t), heat = t >= DROP ? smooth((t - DROP) / 0.8) : 0;
  // dominos
  for (let i = 0; i < N; i++) {
    const d = dominos[i], th = fallAngle(d, t), s = d.s, dd = (DT * s) / 2, psi = PSI[i];
    let lift = 0;
    if (d.kind === 'plain' && t >= d.tShock && t < d.tShock + 0.2 && t < d.tHit) lift = 0.35 * Math.exp(-d.r / 22) * Math.sin(Math.PI * (t - d.tShock) / 0.2);
    const oz = dd * (1 - Math.cos(th)), oy = dd * Math.sin(th);
    v3.set(d.x + Math.sin(psi) * oz, oy + lift, d.z + Math.cos(psi) * oz);
    q.setFromAxisAngle(AY, psi); qx.setFromAxisAngle(AX, th); q.multiply(qx);
    m4.compose(v3, q, s3.set(s, s, s)); dMesh.setMatrixAt(i, m4);
    const tl = LAND[i];
    let gl2 = 0;
    if (t >= tl) {
      gl2 = (d.arm ? 4 : 2.6) * Math.exp(-(t - tl) * 2.4) + (0.5 + 1.2 * sb * sb) * (d.arm ? 1.4 : 1);
      // every beat of the drop sends a ring of light out from the impact through the fallen field (the rhythm, visible)
      if (d.kind === 'plain') for (const b of BEATS_D) if (t >= b) gl2 += 2.2 * Math.exp(-(((d.r - 34 * (t - b)) / 2.2) ** 2)) * Math.exp(-(t - b) * 0.9);
    }
    else if (t >= d.tHit) gl2 = 0.4 * (t - d.tHit) / Math.max(0.05, tl - d.tHit);
    aGlow[i] = gl2;
  }
  dMesh.instanceMatrix.needsUpdate = true; dGeo.getAttribute('aGlow').needsUpdate = true;

  // camera
  const c = camera(t);
  cam.position.set(...c.pos); cam.fov = c.fov; cam.lookAt(...c.look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();

  // Clawd: faces the lens (plus its gesture offsets)
  const p = clawd(t);
  p.yaw += Math.atan2(c.pos[0] - p.x, c.pos[2] - p.z);
  poseClawd(cl, p);
  charKey.position.set(c.pos[0] * 0.6 + p.x * 0.4, p.y + 2.6, c.pos[2] * 0.6 + p.z * 0.4); charKey.target.position.set(p.x, p.y + 0.4, p.z);

  // light & atmosphere: the drop warms the world; the bass breathes in the pips (see aGlow) and the slam light
  // the drop turns dusk into night: the sun goes, the fallen plain's pips become the light of the world
  const night = t >= DROP ? smooth((t - DROP) / 1.1) : 0;
  sun.intensity = 2.6 * (1 - 0.8 * night); hemi.intensity = 0.55 * (1 - 0.6 * night); scene.environmentIntensity = 0.55 * (1 - 0.6 * night);
  skyMat.uniforms.uNight.value = night; skyMat.uniforms.uHeat.value = 0.4 * sb * heat; scene.fog.color.copy(FOG_DUSK).lerp(FOG_NIGHT, night);
  slamLight.position.set(IMPACT.x, 6, IMPACT.z); slamLight.intensity = t >= DROP ? 45 * Math.exp(-(t - DROP) * 3) : 0;
  bloom.strength = 0.42 + 0.2 * heat * sb;
  const sp = v3.set(IMPACT.x, 0, IMPACT.z).project(cam), ds = t - DROP;
  grade.uniforms.uC.value.set((sp.x + 1) / 2, (sp.y + 1) / 2);
  grade.uniforms.uShock.value = ds >= 0 && ds < 0.8 ? Math.exp(-ds * 3.5) : 0; grade.uniforms.uShockR.value = Math.max(0, ds) * 1.6;
  grade.uniforms.uCA.value = ds >= 0 ? 0.005 * Math.exp(-ds * 6) : 0; grade.uniforms.uSeed.value = f * 0.618;

  composer.render();
  g2.drawImage(gl, 0, 0);
  for (const k of Object.keys(TEXT)) {
    const b = TEXT[k]; if (t < b.from - 0.001 || t >= b.to) continue;
    const a = Math.min(b.from <= 0 ? 1 : smooth((t - b.from) / 0.18), b.fadeOut ? 1 - smooth((t - (b.to - b.fadeOut)) / b.fadeOut) : 1);
    caption(b.lines, a, b.rise ? b.rise * (1 - smooth((t - b.from) / 0.3)) : 0);
  }
}

film.render = async (f) => { frame(f); };
film.grab = (type = 'image/png', q2 = 0.95) => out.toDataURL(type, q2);
film.textBoxes = (f) => { frame(f); return boxes.map((b) => ({ f, ...b })); };
(async () => {
  try {
    for (const w of [500, 900]) { const ff = new FontFace(`NSC${w}`, `url(assets/fonts/NotoSansSC-${w}.woff2)`, { weight: String(w) }); await ff.load(); document.fonts.add(ff); }
    frame(0); film.ready = true;
  } catch (e) { film.error = String((e && e.stack) || e); }
})();
