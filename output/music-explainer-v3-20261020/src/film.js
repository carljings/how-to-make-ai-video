// film.js — 《这首开智小曲，为什么上头？》 10 s explainer preview, v3 r2 「声音长廊」.
// A bold horizontal strip of the original BGM's MEASURED loudness (bars; bass = their orange base) scrolls past a
// "现在" playhead. Left = heard (实测). Right = only expected (示意): hollow rings on the beat grid fitted to the first six
// measured attacks. A ring fills, with a beam from the bar below, when a real attack meets it; one stays hollow (the
// missing attack). On the drop the flat diagram swings into a 3D corridor; at the end the whole record zooms out for the
// takeaway. Every frame is a pure function of its number. window.film = { ready, error, frameCount, render, grab, textBoxes }.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CUES } from './cues.js';
import { HEAD, CALL, RECAP_LABELS } from './text.js';
import { makeClawd, poseClawd } from './clawd.js';
import { E, DROP, END, GRID, LEARN, MISS, DROP_RING, ONSETS, Y_BASE, Y_RING, BAR_DT, RECAP, S0, scaleAt, xOf, rms, sub, clawd, camera, clamp, smooth } from './plan.js';

const W = 1080, H = 1920, FPS = CUES.fps, FRAMES = CUES.frames;
const film = (window.film = { ready: false, error: null, frameCount: FRAMES });
window.addEventListener('error', (e) => { film.error = String((e.error && e.error.stack) || e.message); });

const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#07080C');
const cam = new THREE.PerspectiveCamera(32, W / H, 0.05, 300);
const BARC = new THREE.Color('#D9DEE8'), IVORY = new THREE.Color('#F4EDE2'), GOLD = new THREE.Color('#FFC25C'), ORANGE = new THREE.Color('#FF7B33'), CYAN = new THREE.Color('#5EE6FF');

// ───────── backdrop: a dark stage with a soft pool of light behind "now" that warms on the drop ─────────
const backMat = new THREE.ShaderMaterial({ depthWrite: false, uniforms: { uHeat: { value: 0 }, uPulse: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform float uHeat, uPulse; varying vec2 vUv;
    void main(){ vec2 p = (vUv - vec2(.5, .45)) * vec2(3.2, 1.6); float r = length(p);
      vec3 c = mix(vec3(.075,.08,.105), vec3(.028,.03,.042), smoothstep(.0, 1.2, r));
      c += vec3(.55,.24,.08) * (uHeat * .55 + uPulse * .25) * exp(-r * r * 3.);
      gl_FragColor = vec4(c, 1.); }` });
const back = new THREE.Mesh(new THREE.PlaneGeometry(120, 50), backMat); back.position.set(-4, 6, -6); scene.add(back);
// floor: polished dark stone
const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 60), new THREE.MeshStandardMaterial({ color: '#07080B', roughness: 0.92 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
// the rail the strip stands on (the timeline itself)
const rail = new THREE.Mesh(new RoundedBoxGeometry(160, 0.08, 0.7, 2, 0.03), new THREE.MeshPhysicalMaterial({ color: '#16171E', roughness: 0.25, clearcoat: 1 }));
rail.position.set(-50, Y_BASE - 0.04, 0); scene.add(rail);
const railEdge = new THREE.Mesh(new THREE.BoxGeometry(160, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: IVORY.clone().multiplyScalar(0.5), toneMapped: false }));
railEdge.position.set(-50, Y_BASE + 0.002, 0.36); scene.add(railEdge);

// ───────── loudness bars (measured) with their bass base (measured) ─────────
const NB = Math.ceil(END / BAR_DT) + 1, barGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.04); barGeo.translate(0, 0.5, 0);
const barMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.32, clearcoat: 0.6, emissive: '#ffffff', emissiveIntensity: 0.22 });
const baseMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, clearcoat: 0.6, emissive: '#ffffff', emissiveIntensity: 0.45 });
const mkInst = (mat) => { const m = new THREE.InstancedMesh(barGeo, mat, NB); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NB * 3), 3); m.frustumCulled = false; m.castShadow = true; scene.add(m); return m; };
// instanceColor tints the diffuse; it is multiplied into the emissive too, so one per-bar colour drives both
for (const mat of [barMat, baseMat]) mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance *= vColor;\n#endif'); };
const barsI = mkInst(barMat), basesI = mkInst(baseMat);
const onsetNear = (te) => ONSETS.some((o) => o.t >= te - BAR_DT * 0.5 && o.t < te + BAR_DT * 0.5);

// ───────── expectation rings (示意), their fills, and the beam that connects a real attack to its ring ─────────
const ringR = (g) => (g === DROP_RING ? 0.42 : g.bar ? 0.27 : 0.17);
const rings = GRID.map((g) => {
  const r = ringR(g), grp = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(r, g === DROP_RING ? 0.035 : 0.022, 12, 80), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true }));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, depthWrite: false }));
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  grp.add(torus, fill); scene.add(grp, beam);
  return { g, r, grp, torus, fill, beam };
});
// ───────── the playhead ("现在"), its light, and the drop's shock ring ─────────
const PH_TOP = Y_RING + 0.75;
const playhead = new THREE.Mesh(new THREE.BoxGeometry(0.03, PH_TOP - Y_BASE + 0.1, 0.03), new THREE.MeshBasicMaterial({ color: IVORY, toneMapped: false }));
playhead.position.set(0, (PH_TOP + Y_BASE) / 2 - 0.05, 0.3); scene.add(playhead);
const capGeo = new THREE.ConeGeometry(0.11, 0.16, 3); capGeo.rotateZ(Math.PI);
const cap = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ color: IVORY, toneMapped: false })); cap.position.set(0, PH_TOP + 0.08, 0.3); scene.add(cap);
const phLight = new THREE.PointLight('#FFE6CC', 0, 6, 1.6); phLight.position.set(-0.4, Y_BASE + 1.2, 1.2); scene.add(phLight);
const shock = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: GOLD, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
shock.position.set(0, Y_RING, 0.05); scene.add(shock);

// ───────── Clawd & light ─────────
const cl = makeClawd(); cl.scale.setScalar(1.05); scene.add(cl);
scene.add(new THREE.HemisphereLight('#6A7290', '#0A0806', 0.5));
const key = new THREE.DirectionalLight('#FFF1E2', 1.5); key.position.set(3, 7, 7); key.target.position.set(0, 0, 1);
key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 }); scene.add(key, key.target);
const rimL = new THREE.DirectionalLight('#FFE2C8', 0.5); rimL.position.set(-4, 5, -5); scene.add(rimL);

// ───────── post ─────────
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H); composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.45, 0.82); composer.addPass(bloom); composer.addPass(new OutputPass());
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uShock: { value: 0 }, uShockR: { value: 0 }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uCA: { value: 0 }, uSeed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uShock, uShockR, uCA, uSeed; uniform vec2 uC; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
    void main(){ vec2 asp = vec2(1., 1920. / 1080.); vec2 d = (vUv - uC) * asp; float r = length(d);
      float ring = uShock * exp(-pow((r - uShockR) * 10., 2.)); vec2 uv = vUv - normalize(d + 1e-5) / asp * ring * .035; vec2 ca = (vUv - .5) * uCA;
      vec3 c = vec3(texture2D(tDiffuse, uv + ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - ca).b);
      c *= mix(.62, 1., smoothstep(1.25, .35, length((vUv - .5) * vec2(1., 1.1)))); c += (h(vUv * 1080.) - .5) * .005;
      gl_FragColor = vec4(c, 1.); }` });
composer.addPass(grade);

// ───────── 2D layer: headlines over a scrim, pinned callouts, recap brackets ─────────
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const g2 = out.getContext('2d');
let boxes = [];
const FONT = (w, px) => `${w} ${px}px "NSC${w}"`;
function headline(h, t) {
  const tin = t - h.from, a = Math.min(h.from <= 0 ? 1 : smooth(tin / 0.16), smooth((h.to - t) / 0.14));
  if (a <= 0) return;
  const big = h.key === 'drop', punch = big ? 1 + 0.22 * Math.exp(-tin * 9) : 1;
  let y = big ? 300 : 230; g2.save(); g2.globalAlpha = a; g2.textBaseline = 'alphabetic';
  if (!(h.from <= 0)) g2.filter = `blur(${(7 * (1 - smooth(tin / 0.16))).toFixed(2)}px)`;
  for (const l of h.lines) {
    const px = l.px * punch; y += px * 1.04; g2.font = FONT(l.w, px);
    const parts = l.accent && l.s.includes(l.accent) ? [l.s.slice(0, l.s.indexOf(l.accent)), l.accent, l.s.slice(l.s.indexOf(l.accent) + l.accent.length)] : [l.s];
    const ws = parts.map((p) => g2.measureText(p).width), tw = ws.reduce((x, z) => x + z, 0); let x = W / 2 - tw / 2;
    boxes.push({ s: l.s, x0: x, x1: x + tw, y0: y - px * 0.9, y1: y + px * 0.15, a });
    g2.shadowColor = 'rgba(0,0,0,.65)'; g2.shadowBlur = 20;
    parts.forEach((p, i) => { g2.fillStyle = l.accent && i === 1 ? '#FF9A4D' : '#F6F0E6'; g2.fillText(p, x, y); x += ws[i]; });
    y += 10;
  }
  g2.restore();
}
const v3 = new THREE.Vector3();
const proj = (x, y, z) => { const p = v3.set(x, y, z).project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; };
function callout(c, t, anchor, side, dy, color = '#F6F0E6') {
  const a = Math.min(smooth((t - c.from) / 0.14), smooth((c.to - t) / 0.12)); if (a <= 0 || !anchor || anchor[2] > 1) return;
  const [ax, ay] = anchor; g2.save(); g2.globalAlpha = a; g2.font = FONT(900, 44);
  const tw = g2.measureText(c.s).width, padX = 20, bh = 70, bw = tw + padX * 2;
  const bx = clamp(side < 0 ? ax - 70 - bw : ax + 70, 64, 936 - bw), by = clamp(ay + dy - bh / 2, 600, 1480);
  const lx = side < 0 ? bx + bw : bx, ly = by + bh / 2;
  g2.strokeStyle = color; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(ax, ay); g2.lineTo(lx, ly); g2.stroke();
  g2.fillStyle = color; g2.beginPath(); g2.arc(ax, ay, 7, 0, Math.PI * 2); g2.fill();
  g2.fillStyle = 'rgba(9,10,15,.82)'; g2.lineWidth = 2.5; g2.beginPath(); g2.roundRect(bx, by, bw, bh, 14); g2.fill(); g2.stroke();
  g2.fillStyle = color; g2.textBaseline = 'middle'; g2.fillText(c.s, bx + padX, by + bh / 2 + 3);
  boxes.push({ s: c.s, x0: bx, x1: bx + bw, y0: by, y1: by + bh, a }); g2.restore();
}
function bracket(s, x0, x1, y, a, color, below = false) {     // below = the bracket opens upward under the row
  if (a <= 0) return; g2.save(); g2.globalAlpha = a; g2.strokeStyle = color; g2.lineWidth = 3; const d = below ? -16 : 16;
  g2.beginPath(); g2.moveTo(x0, y + d); g2.lineTo(x0, y); g2.lineTo(x1, y); g2.lineTo(x1, y + d); g2.stroke();
  g2.font = FONT(900, 46); g2.fillStyle = color; g2.textAlign = 'center'; g2.textBaseline = below ? 'top' : 'alphabetic';
  const tw = g2.measureText(s).width, cx = clamp((x0 + x1) / 2, 64 + tw / 2, 936 - tw / 2), ty = below ? y + 14 : y - 16; g2.fillText(s, cx, ty);
  boxes.push({ s, x0: cx - tw / 2, x1: cx + tw / 2, y0: below ? ty : ty - 46, y1: below ? ty + 50 : ty + 4, a }); g2.restore();
}

// ───────── per frame ─────────
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), col = new THREE.Color();
const learn = (t) => 0.25 + 0.75 * smooth((t - LEARN) / 0.35);
function frame(f) {
  const t = f / FPS; boxes = [];
  const S = scaleAt(t), k = S / S0, heat = t >= DROP ? smooth((t - DROP) / 0.4) : 0;
  const recent = ONSETS.filter((o) => o.t <= t).slice(-1)[0];
  const pulse = recent ? Math.exp(-(t - recent.t) * 9) * (Math.abs(recent.t - DROP) < 1e-3 ? 2.5 : 1) : 0;

  // bars: only what has sounded
  for (let i = 0; i < NB; i++) {
    const te = i * BAR_DT, x = xOf(te, t), seen = te <= t + 1e-6;
    const h = seen ? 0.1 + 2.15 * rms(te) : 0, hb = seen ? Math.min(h, 0.05 + 1.75 * sub(te) ** 1.3) : 0;
    const w = BAR_DT * S * 0.72, d = 0.42;
    const grow = seen ? smooth((t - te) / 0.06) : 0;
    m4.compose(v3.set(x, Y_BASE, 0), q.identity(), s3.set(w, Math.max(0.001, h * grow), d)); barsI.setMatrixAt(i, m4);
    m4.compose(v3.set(x, Y_BASE, 0.004), q.identity(), s3.set(w * 1.02, Math.max(0.001, hb * grow), d * 1.02)); basesI.setMatrixAt(i, m4);
    const age = t - te, fresh = Math.exp(-age * 4), att = onsetNear(te) ? 1 : 0;
    col.copy(BARC).multiplyScalar(0.36 + 0.1 * att + 0.45 * fresh); barsI.setColorAt(i, col);
    col.copy(ORANGE).multiplyScalar(0.95 + 0.5 * fresh + 0.3 * heat); basesI.setColorAt(i, col);
  }
  for (const m of [barsI, basesI]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }

  // rings: future = expected (hollow ivory); met = gold filled + a beam from the bar; missed = cyan hollow, trembling
  for (const R of rings) {
    const g = R.g, x = xOf(g.t, t), vis = x > -40 && x < 4.6;
    R.grp.visible = vis; R.beam.visible = false; if (!vis) continue;
    let sc = k;
    if (g === DROP_RING && t < DROP) sc *= 1 + 0.5 * smooth((t - E.build_downbeat) / (DROP - E.build_downbeat));    // the expected big beat swells
    const hitT = g.onset ?? g.t, met = g.hit && t >= hitT, filled = met ? smooth((t - hitT) / 0.05) : 0, missed = !g.hit && t >= g.t;
    if (met) sc *= 1 + 0.35 * Math.exp(-(t - hitT) * 9);
    // the drop's confirmation wave runs back along every met ring
    const wave = met && t >= DROP ? Math.exp(-(((x + (t - DROP) * 12) / 0.6) ** 2)) : 0; sc *= 1 + 0.6 * wave;
    sc = Math.max(sc, 0.5 * (1 + 0.6 * wave));
    if (missed) sc *= 1 + 0.15 * Math.sin((t - g.t) * 20) * Math.exp(-(t - g.t) * 2.5);
    R.grp.position.set(x, Y_RING, 0); R.grp.scale.setScalar(sc);
    const a = learn(t) * clamp(1 - (x - 3.6) / 1.0);
    col.copy(missed ? CYAN : met ? GOLD : IVORY).multiplyScalar((missed ? 1.3 : met ? 1.25 : (g === DROP_RING ? 1.4 : 0.9) * (t >= DROP ? 1.15 : 1)) * (1 + 1.5 * wave));
    if (!met && !missed && t >= DROP) col.lerp(GOLD, 0.45);
    R.torus.material.color.copy(col); R.torus.material.opacity = a;
    R.fill.material.color.copy(GOLD).multiplyScalar(1.15); R.fill.material.opacity = 0.9 * filled * a; R.fill.scale.setScalar(Math.max(0.001, filled));
    if (met && t - hitT < 0.22) {                                                  // the attack reaches up and meets its ring
      const top = Y_BASE + 0.1 + 2.15 * rms(hitT), len = Y_RING - R.r * sc - top;
      R.beam.visible = len > 0.02; R.beam.position.set(x, top + len / 2, 0.02); R.beam.scale.set(g === DROP_RING ? 4 : 1.6, Math.max(0.01, len), 1);
      R.beam.material.color.copy(GOLD).multiplyScalar(2 * (1 - (t - hitT) / 0.22));
    }
  }
  // playhead, light, shock
  const ds = t - DROP, phA = 1 - smooth((t - RECAP[0]) / 0.5);
  playhead.material.color.copy(IVORY).lerp(GOLD, heat).multiplyScalar((1 + 1.4 * pulse) * phA); cap.material.color.copy(playhead.material.color);
  phLight.intensity = 1.5 + 5 * pulse;
  shock.visible = ds >= 0 && ds < 1.0; if (shock.visible) { shock.scale.setScalar(0.5 + ds * 9); shock.material.opacity = Math.exp(-ds * 3); }
  backMat.uniforms.uHeat.value = heat * (0.55 + 0.6 * sub(t)); backMat.uniforms.uPulse.value = pulse;
  railEdge.material.color.copy(IVORY).multiplyScalar(0.45).lerp(GOLD, heat * 0.7);
  bloom.strength = 0.5 + 0.3 * heat * sub(t);

  // camera & Clawd
  const c = camera(t);
  cam.position.set(...c.pos); cam.fov = c.fov; cam.lookAt(...c.look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const p = clawd(t); p.yaw += Math.atan2(c.pos[0] - p.x, c.pos[2] - p.z); poseClawd(cl, p);
  const sp = proj(0, Y_RING, 0); grade.uniforms.uC.value.set(sp[0] / W, 1 - sp[1] / H);
  grade.uniforms.uShock.value = ds >= 0 && ds < 0.7 ? Math.exp(-ds * 4) : 0; grade.uniforms.uShockR.value = Math.max(0, ds) * 1.4;
  grade.uniforms.uCA.value = ds >= 0 ? 0.004 * Math.exp(-ds * 6) : 0; grade.uniforms.uSeed.value = f * 0.618;

  composer.render(); g2.drawImage(gl, 0, 0);
  { const gr = g2.createLinearGradient(0, 0, 0, 700); gr.addColorStop(0, 'rgba(5,6,10,.9)'); gr.addColorStop(0.6, 'rgba(5,6,10,.5)'); gr.addColorStop(1, 'rgba(5,6,10,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, W, 700); }
  for (const h of HEAD) if (t >= h.from - 1e-6 && t < h.to) headline(h, t);
  // callouts
  const newest = Math.floor(t / BAR_DT) * BAR_DT;
  callout(CALL.heard, t, proj(xOf(newest - 0.25, t), Y_BASE + 0.1 + 2.15 * rms(Math.max(0, newest - 0.25)), 0.2), -1, 150);
  const next = rings.find((R) => R.g.t > t + 0.2 && R.grp.visible);
  if (next) callout(CALL.expect, t, proj(next.grp.position.x, Y_RING + next.r, 0), 1, -150);
  const mR = rings.find((R) => R.g === MISS); callout(CALL.miss, t, proj(mR.grp.position.x, Y_RING + mR.r * mR.grp.scale.x, 0), -1, -150, '#5EE6FF');
  const dR = rings.find((R) => R.g === DROP_RING); callout(CALL.big, t, proj(dR.grp.position.x, Y_RING + dR.r * dR.grp.scale.x, 0), -1, -150, '#FFC25C');
  callout(CALL.bass, t, proj(xOf(t - 0.4, t), Y_BASE + 0.3, 0.25), -1, 170, '#FF9A4D');
  { const a = Math.min(1, smooth((CALL.now.to - t) / 0.3)); if (a > 0) { const [nx, ny] = proj(0.35, Y_BASE - 0.05, 0.4); g2.save(); g2.globalAlpha = a; g2.font = FONT(900, 40); g2.fillStyle = '#F6F0E6'; g2.textAlign = 'left'; g2.textBaseline = 'top';
    const tw = g2.measureText(CALL.now.s).width, nx2 = clamp(nx, 64, 936 - tw); g2.fillText(CALL.now.s, nx2, ny + 6); boxes.push({ s: CALL.now.s, x0: nx2, x1: nx2 + tw, y0: ny + 6, y1: ny + 48, a }); g2.restore(); } }
  // recap: brackets over the whole record
  const ra = smooth((t - (RECAP[1] - 0.1)) / 0.3);
  if (ra > 0) {
    const yb = proj(0, Y_RING + 0.4, 0)[1], yu = proj(0, Y_RING - 0.4, 0)[1];
    const gx = (te) => proj(xOf(te, t), Y_RING, 0)[0];
    bracket(RECAP_LABELS[0].s, gx(GRID[0].t) - 12, gx(GRID[5].t) + 12, yb, ra, '#F6F0E6');
    bracket(RECAP_LABELS[1].s, gx(MISS.t) - 16, gx(MISS.t) + 16, yu, ra, '#5EE6FF', true);
    bracket(RECAP_LABELS[2].s, gx(DROP_RING.t) - 20, gx(DROP_RING.t) + 20, yb, ra, '#FFC25C');
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
