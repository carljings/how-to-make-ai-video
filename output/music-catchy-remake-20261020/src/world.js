// world.js — the 3D stage (three.js). Y up, units ≈ metres. Everything is built once; set(state) poses it per frame.
//   · the path: one rounded stone per beat on a snake of rows (src/timeline.js STONES); thickness = measured sub-bass
//   · ghosts: glowing outlines of where the next stone will be (the listener's prediction — a schematic)
//   · the listener: a small headphone creature, procedurally modelled (body, eyes, cheeks, headphones, antenna, feet)
//   · the world: gradient sky dome, an equaliser skyline driven by the music's real per-frame spectrum, drifting dust,
//     a far grid floor; twin-bar arcs for ③; shock rings; bloom.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { W, H, STONES, GROUP, GROUP_COLORS, ROW } from './timeline.js';
import { rng } from './lib.js';

const SKY_VS = `varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = `varying vec3 vP; uniform vec3 uTop, uMid, uBot, uGlow; uniform float uGlowK;
  void main() { float y = vP.y; vec3 c = y > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.7, y)) : mix(uMid, uBot, smoothstep(0.0, -0.5, y));
    c += uGlow * uGlowK * exp(-abs(y - 0.02) * 9.0); gl_FragColor = vec4(c, 1.0); }`;
const GRID_FS = `varying vec3 vW; uniform float uK; uniform vec3 uC;
  void main() { vec2 g = abs(fract(vW.xz / 3.0 - 0.5) - 0.5) / fwidth(vW.xz / 3.0); float l = 1.0 - min(min(g.x, g.y), 1.0);
    float fade = exp(-length(vW.xz - vec2(0.0, -18.0)) * 0.025); gl_FragColor = vec4(uC * l * fade * uK, l * fade * uK); }`;

export class World {
  constructor() {}
  async init(canvas) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(W, H, false);
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0d22, 0.012);
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22;
    const cam = this.camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 400);

    // ---- sky dome
    this.skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTop: { value: new THREE.Color(0x070a1e) }, uMid: { value: new THREE.Color(0x1a1b46) }, uBot: { value: new THREE.Color(0x05060f) },
        uGlow: { value: new THREE.Color(0x6a3cff) }, uGlowK: { value: 0.35 } } });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), this.skyMat); sky.renderOrder = -10; scene.add(sky); this.sky = sky;

    // ---- far grid floor
    this.gridMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
      uniforms: { uK: { value: 0.5 }, uC: { value: new THREE.Color(0x4b5cff) } },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: GRID_FS });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), this.gridMat); grid.rotation.x = -Math.PI / 2; grid.position.y = -9; scene.add(grid);

    // ---- equaliser skyline: 96 columns on a far ring, heights = the music's real spectrum (32 bands, mirrored)
    const NCOL = 160, colGeo = new THREE.BoxGeometry(1, 1, 1); colGeo.translate(0, 0.5, 0);
    this.colMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9, fog: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.cols = new THREE.InstancedMesh(colGeo, this.colMat, NCOL); this.cols.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const cA = new THREE.Color(0x3b2bd6), cB = new THREE.Color(0x19d1ff), cC = new THREE.Color(0xff5fa2);
    for (let i = 0; i < NCOL; i++) { const u = i / NCOL, c = u < 0.5 ? cA.clone().lerp(cB, u * 2) : cB.clone().lerp(cC, (u - 0.5) * 2); this.cols.setColorAt(i, c); }
    this.NCOL = NCOL; this.colCenter = new THREE.Vector3(0, -9, -20); scene.add(this.cols);

    // ---- dust
    const R = rng(7), N = 900, pos = new Float32Array(N * 3); this.dustBase = [];
    for (let i = 0; i < N; i++) { const p = [(R() - 0.5) * 60, (R() - 0.3) * 26, 12 - R() * 70]; this.dustBase.push([...p, R() * 6.28, 0.2 + R() * 0.6]); pos.set(p, i * 3); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x9fb4ff, size: 0.09, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, map: dotTex(), toneMapped: false }));
    scene.add(this.dust);

    // ---- lights
    this.hemi = new THREE.HemisphereLight(0x8ea0ff, 0x120a1c, 0.7); scene.add(this.hemi);
    const key = this.key = new THREE.DirectionalLight(0xfff1e2, 2.4); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 60 });
    scene.add(key, key.target);
    this.rim = new THREE.DirectionalLight(0x6fd8ff, 1.6); scene.add(this.rim, this.rim.target);
    this.charLight = new THREE.PointLight(0xff8a66, 0, 9, 2); scene.add(this.charLight);

    // ---- stones (one mesh + edges each; a stone's thickness comes from the measured bass at its beat)
    const sGeo = new RoundedBoxGeometry(1, 1, 1, 4, 0.14); sGeo.translate(0, -0.5, 0);   // top face at y = 0
    const eGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)); eGeo.translate(0, -0.5, 0);
    this.stones = STONES.map((s) => {
      const mat = new THREE.MeshPhysicalMaterial({ color: 0xb9b3c9, roughness: 0.38, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.25, transparent: true, emissive: 0xff7a59, emissiveIntensity: 0 });
      const m = new THREE.Mesh(sGeo, mat); m.castShadow = true; m.receiveShadow = true; m.visible = false; scene.add(m);
      const em = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false });
      const e = new THREE.LineSegments(eGeo, em); e.visible = false; scene.add(e);
      return { s, m, mat, e, em };
    });
    // ghosts: an outline box + faint fill
    const gFill = new THREE.MeshBasicMaterial({ color: 0x5ee6ff, transparent: true, opacity: 0.08, depthWrite: false, toneMapped: false });
    this.ghosts = STONES.map(() => {
      const fm = gFill.clone(), lm = new THREE.LineBasicMaterial({ color: 0x5ee6ff, transparent: true, opacity: 0, toneMapped: false });
      const f = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0), fm), l = new THREE.LineSegments(eGeo, lm);
      f.visible = l.visible = false; f.renderOrder = l.renderOrder = 4; scene.add(f, l); return { f, l, fm, lm };
    });

    // ---- the listener
    this.char = buildListener(); scene.add(this.char.root);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: 0x5ee6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    scene.add(this.halo);
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false, map: dotTex() }));
    this.blob.rotation.x = -Math.PI / 2; scene.add(this.blob);

    // ---- shock rings (pool) and twin arcs (③)
    this.rings = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m; });
    this.arcs = [];
    const byGroup = {}; GROUP.forEach((g, r) => (byGroup[g] = byGroup[g] || []).push(r));
    for (const [g, rows] of Object.entries(byGroup)) {
      if (rows.length < 2) continue;
      for (let k = 1; k < rows.length; k++) {
        const r0 = rows[k - 1], r1 = rows[k], z0 = -r0 * ROW, z1 = -r1 * ROW, bulge = 2.2 + 0.32 * (r1 - r0);
        const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(4.2, 0.2, z0), new THREE.Vector3(4.2 + bulge, 0.2, z0), new THREE.Vector3(4.2 + bulge, 0.2, z1), new THREE.Vector3(4.2, 0.2, z1));
        const mat = new THREE.MeshBasicMaterial({ color: GROUP_COLORS[g] ?? 0xffffff, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.09, 8, false), mat); mesh.visible = false; scene.add(mesh);
        const geo = mesh.geometry, total = geo.index ? geo.index.count : geo.attributes.position.count;
        this.arcs.push({ g: +g, r0, r1, mesh, mat, total });
      }
    }
    // row markers for ③ (a thin bar at the left of each row, in its group colour)
    this.rowMarks = GROUP.map((g, r) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 1.7), new THREE.MeshBasicMaterial({ color: GROUP_COLORS[g] ?? 0x445066, transparent: true, opacity: 0, toneMapped: false }));
      m.position.set(-4.4, 0.02, -r * ROW); m.visible = false; scene.add(m); return m; });

    // ---- post
    this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType }));
    this.composer.addPass(new RenderPass(scene, cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.6, 0.55, 0.93);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.canvas = canvas;
  }

  // the state is plain data produced by film.js
  set(st) {
    const c = this.camera;
    c.fov = st.cam.fov; c.position.set(...st.cam.pos); c.up.set(0, 1, 0); c.lookAt(...st.cam.target);
    if (st.cam.roll) c.rotateZ(st.cam.roll);
    c.updateProjectionMatrix(); c.updateMatrixWorld();
    this.renderer.toneMappingExposure = st.exposure ?? 1.0;
    this.bloom.strength = st.bloom ?? 0.6;
    this.scene.fog.density = st.fog ?? 0.012;
    this.skyMat.uniforms.uGlowK.value = st.skyGlow ?? 0.35;
    this.gridMat.uniforms.uK.value = st.grid ?? 0.5;
    this.hemi.intensity = st.hemi ?? 0.7;
    // key light follows the listener (shadow frustum stays tight)
    const cp = st.char.pos;
    this.key.position.set(cp[0] - 5, cp[1] + 12, cp[2] + 7); this.key.target.position.set(cp[0], cp[1] - 1, cp[2] - 1); this.key.target.updateMatrixWorld();
    this.key.intensity = st.keyK ?? 2.4;
    this.rim.position.set(cp[0] + 6, cp[1] + 3, cp[2] - 8); this.rim.target.position.set(...cp); this.rim.target.updateMatrixWorld(); this.rim.intensity = st.rimK ?? 1.6;
    this.charLight.position.set(cp[0], cp[1] + 1.4, cp[2] + 1.2); this.charLight.intensity = st.charLight ?? 0;
    // skyline
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), bands = st.bands, nb = bands.length;
    for (let i = 0; i < this.NCOL; i++) {
      const a = (i / this.NCOL) * Math.PI * 2, b = i % (2 * nb), v = bands[b < nb ? b : 2 * nb - 1 - b] ?? 0;
      const h = 1.0 + 30 * Math.pow(v, 1.8) * (st.eqK ?? 1);
      p.set(this.colCenter.x + Math.sin(a) * 90, this.colCenter.y, this.colCenter.z + Math.cos(a) * 90); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a); sc.set(1.5, h, 1.5);
      m4.compose(p, q, sc); this.cols.setMatrixAt(i, m4);
    }
    this.cols.instanceMatrix.needsUpdate = true; this.colMat.opacity = st.eqAlpha ?? 0.85;
    // dust
    const pa = this.dust.geometry.attributes.position, t = st.t;
    for (let i = 0; i < this.dustBase.length; i++) { const d = this.dustBase[i]; pa.setXYZ(i, d[0] + Math.sin(t * 0.3 * d[4] + d[3]) * 0.8, d[1] + ((t * 0.25 * d[4] + d[3]) % 4) - 2, d[2]); }
    pa.needsUpdate = true; this.dust.material.opacity = st.dustK ?? 0.55;
    // stones
    for (const S of this.stones) {
      const ss = st.stones[S.s.i];
      if (!ss || !ss.vis) { S.m.visible = false; S.e.visible = false; continue; }
      S.m.visible = true; S.m.position.set(ss.x, ss.y, ss.z); S.m.scale.set(ss.w, ss.h, ss.d);
      S.mat.color.set(ss.color ?? 0xb9b3c9); S.mat.opacity = ss.alpha ?? 1; S.mat.depthWrite = (ss.alpha ?? 1) > 0.6;
      S.mat.emissive.set(ss.glowColor ?? 0xff7a59); S.mat.emissiveIntensity = ss.glow ?? 0;
      S.mat.transmission = 0; S.mat.roughness = ss.thin ? 0.12 : ss.matte ? 0.6 : 0.32; S.mat.clearcoat = ss.matte ? 0.1 : 0.7;   // big stones: matte top, no hot specular under the face
      S.e.visible = (ss.edge ?? 0) > 0.01; S.e.position.copy(S.m.position); S.e.scale.copy(S.m.scale); S.em.opacity = ss.edge ?? 0; S.em.color.set(ss.edgeColor ?? 0xffffff);
    }
    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i], gs = st.ghosts[i];
      if (!gs || gs.a <= 0.01) { g.f.visible = g.l.visible = false; continue; }
      g.f.visible = g.l.visible = true;
      for (const o of [g.f, g.l]) { o.position.set(gs.x, gs.y, gs.z); o.scale.set(gs.w, gs.h, gs.d); }
      g.fm.opacity = 0.1 * gs.a; g.lm.opacity = gs.a; g.lm.color.set(gs.color ?? 0x5ee6ff); g.fm.color.set(gs.color ?? 0x5ee6ff);
    }
    // listener
    poseListener(this.char, st.char);
    const hs = st.char.halo ?? 0; this.halo.visible = hs > 0.01;
    this.halo.position.set(cp[0], cp[1] + 0.55, cp[2]); this.halo.scale.setScalar(1.6 + 2.6 * hs); this.halo.material.opacity = 0.55 * hs; this.halo.material.color.set(st.char.haloColor ?? 0x5ee6ff);
    this.blob.position.set(cp[0], (st.char.groundY ?? 0) + 0.012, cp[2]); this.blob.visible = st.char.groundY !== null && st.char.groundY !== undefined;
    const hgt = Math.max(0, cp[1] - (st.char.groundY ?? 0)); this.blob.scale.setScalar(1 / (1 + hgt * 0.5)); this.blob.material.opacity = 0.42 / (1 + hgt);
    // rings
    this.rings.forEach((m, i) => { const R = st.rings[i]; if (!R) { m.visible = false; return; }
      m.visible = true; m.position.set(...R.c); m.scale.setScalar(R.r); m.material.opacity = R.a; m.material.color.set(R.color ?? 0xffffff); });
    // ③ arcs and row marks
    for (const A of this.arcs) { const k = st.arcs?.[`${A.r0}-${A.r1}`] ?? 0; A.mesh.visible = k > 0.01; A.mat.opacity = Math.min(1, k * 1.5);
      A.mesh.geometry.setDrawRange(0, Math.floor(A.total * Math.min(1, k)) - (Math.floor(A.total * Math.min(1, k)) % 3)); }
    this.rowMarks.forEach((m, r) => { const a = st.rowMarks?.[r] ?? 0; m.visible = a > 0.01; m.material.opacity = a; });
  }
  render() { this.composer.render(); return this.canvas; }
  project(p) {   // world → canvas px (and whether it is in front of the camera)
    const v = new THREE.Vector3(...p).project(this.camera);
    return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H, v.z < 1 && v.z > -1];
  }
}

// a soft round sprite texture
let _dot = null;
function dotTex() {
  if (_dot) return _dot;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _dot = new THREE.CanvasTexture(c); _dot.colorSpace = THREE.SRGBColorSpace; return _dot;
}

// ---- the listener: a round headphone creature. Local frame: +z = its face, y up, feet at y = 0.
function buildListener() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xf5efe6, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.4, sheen: 0.6, sheenColor: new THREE.Color(0xffd9c8) });
  const ink = new THREE.MeshPhysicalMaterial({ color: 0x14141c, roughness: 0.15, clearcoat: 1 });
  const coral = new THREE.MeshPhysicalMaterial({ color: 0xff7a59, roughness: 0.3, metalness: 0.15, clearcoat: 0.9, emissive: 0xff5a3c, emissiveIntensity: 0 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const blush = new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.55, depthWrite: false });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), skin); head.scale.set(1.0, 0.94, 0.92); head.position.y = 0.62; head.castShadow = true; body.add(head);
  const eyes = [], shines = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), ink); e.scale.set(1, 1.3, 0.55); e.position.set(0.16 * sx, 0.7, 0.44); body.add(e); eyes.push(e);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), white); s.position.set(0.16 * sx + 0.022, 0.735, 0.485); body.add(s); shines.push(s);
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), blush); b.position.set(0.29 * sx, 0.57, 0.405); b.rotation.y = 0.55 * sx; body.add(b);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24, Math.PI), ink); mouth.position.set(0, 0.6, 0.462); mouth.rotation.z = Math.PI; body.add(mouth);
  // the headband: a half torus in the x–y plane, ear to ear over the top of the head
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.045, 12, 48, Math.PI), coral); band.position.set(0, 0.64, -0.04); band.rotation.x = -0.12; band.castShadow = true; body.add(band);
  const cups = [];
  for (const sx of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.15, 32), coral); cup.rotation.z = Math.PI / 2; cup.position.set(0.52 * sx, 0.64, 0); cup.castShadow = true; body.add(cup); cups.push(cup);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.155, 24), new THREE.MeshPhysicalMaterial({ color: 0xfff2e8, emissive: 0xffd15c, emissiveIntensity: 0, roughness: 0.4 }));
    pad.rotation.z = Math.PI / 2; pad.position.set(0.535 * sx, 0.64, 0); body.add(pad); cups.push(pad);
  }
  // antenna with a little note-head bead (it springs on every landing)
  const ant = new THREE.Group(); ant.position.set(0.05, 1.08, -0.02); body.add(ant);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.3, 8), ink); stem.position.y = 0.15; ant.add(stem);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xffd15c, emissive: 0xffb02e, emissiveIntensity: 0.6, roughness: 0.25 }));
  bead.position.y = 0.32; ant.add(bead);
  const feet = [];
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.1, 6, 12), coral); f.rotation.x = Math.PI / 2; f.position.set(0.17 * sx, 0.09, 0.06); f.castShadow = true; root.add(f); feet.push(f); }
  return { root, body, head, eyes, shines, cups, ant, bead, feet, coral, mouth };
}
// st: { pos, yaw, squash (−1..1: <0 squash, >0 stretch), nod (rad), lean (rad), antenna (rad), cupGlow, eyeClose, tuck (0..1 feet tuck) }
function poseListener(L, st) {
  L.root.position.set(...st.pos); L.root.rotation.set(0, st.yaw ?? 0, 0);
  const s = st.squash ?? 0, sy = 1 + 0.35 * s, sxz = 1 / Math.sqrt(Math.max(0.3, sy));
  L.body.scale.set(sxz, sy, sxz); L.body.rotation.set((st.nod ?? 0) + (st.lean ?? 0), 0, st.tilt ?? 0);
  L.body.position.y = st.bodyY ?? 0;
  L.ant.rotation.set(st.antenna ?? 0, 0, (st.antenna ?? 0) * 0.6);
  L.coral.emissiveIntensity = st.cupGlow ?? 0;
  for (const e of L.eyes) e.scale.y = 1.3 * (1 - 0.85 * (st.eyeClose ?? 0));
  for (const sh of L.shines) sh.visible = (st.eyeClose ?? 0) < 0.5;
  L.feet.forEach((f, i) => { f.position.y = 0.09 + 0.12 * (st.tuck ?? 0); f.position.z = 0.06 + 0.06 * (st.tuck ?? 0) * (i ? 1 : -1); });
}
