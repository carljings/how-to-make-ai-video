// world3d.js — the 3D stage (three.js, WebGL on SwiftShader or Metal). World frame is the v9 fit's: +X from the approach
// toward the ramp, +Y across, +Z up, metres. The car/ramp meshes and the car poses are the v9 round-3 exports (an
// image-informed CG reconstruction of Tesla's 2026-10-16 "The Ramp" video — not factory CAD, not measured dynamics).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { rng, clamp, smooth } from './lib.js';

async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.json(); }
async function getBin(u) { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.arrayBuffer(); }

export async function loadModel(base) {
  const [carMeta, carBuf, sceneMeta, sceneBuf, poses] = await Promise.all([
    getJSON(base + 'car.json'), getBin(base + 'car.bin'), getJSON(base + 'scene.json'), getBin(base + 'scene.bin'), getJSON(base + 'poses.json')]);
  return { carMeta, carBuf, sceneMeta, sceneBuf, poses };
}

// one exported part → a BufferGeometry whose index is sorted by the per-vertex material, one group per material
function partGeometry(meta, buf, name) {
  const e = meta.parts[name];
  const pos = new Float32Array(buf, e.pos, e.vertices * 3), nor = new Float32Array(buf, e.nor, e.vertices * 3);
  const mat = new Uint8Array(buf, e.mat, e.vertices), idx = new Uint32Array(buf, e.idx, e.indices);
  const buckets = new Map();
  for (let k = 0; k < idx.length; k += 3) {
    const m = mat[idx[k]];
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(idx[k], idx[k + 1], idx[k + 2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor.slice(), 3));
  const all = []; let start = 0;
  for (const [m, list] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    all.push(...list); g.addGroup(start, list.length, m); start += list.length;
  }
  g.setIndex(all);
  return g;
}

function carMaterials(names) {
  const P = (o) => new THREE.MeshPhysicalMaterial(o), S = (o) => new THREE.MeshStandardMaterial(o);
  const lamp = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const lib = {
    paint: P({ color: 0xa9aeb5, roughness: 0.42, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.35 }),   // v2: a pearl silver-white; volume from reflections and rim, not from flat light
    glass: P({ color: 0x07090c, roughness: 0.04, metalness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.02, envMapIntensity: 1.3 }),
    satin_black: S({ color: 0x111215, roughness: 0.45, metalness: 0.2 }),
    underbody: S({ color: 0x24272d, roughness: 0.62, metalness: 0.25 }),
    panel_gap: S({ color: 0x040405, roughness: 0.9 }),
    liner: S({ color: 0x0c0d0f, roughness: 0.9 }),
    lamp_white: lamp(0xe8f0ff, 1.15), lamp_red: lamp(0xff1e2a, 4.0), lamp_amber: lamp(0xffa020, 3.0),
    under_frame: S({ color: 0x4a4f58, roughness: 0.5, metalness: 0.45 }),
    nozzle: S({ color: 0x6a707b, roughness: 0.3, metalness: 0.9 }),
    tyre: S({ color: 0x0a0a0b, roughness: 0.82 }),
    rim: S({ color: 0xc6c9cf, roughness: 0.22, metalness: 1.0 }),
    rim_dark: S({ color: 0x2a2c31, roughness: 0.3, metalness: 0.9 }),
    brake: S({ color: 0x70737a, roughness: 0.4, metalness: 0.9 }),
    caliper: S({ color: 0xb3141a, roughness: 0.35, metalness: 0.3 }),
    fan: S({ color: 0x1d1f23, roughness: 0.6 }),
  };
  return names.map((n) => lib[n] || S({ color: 0x777777 }));
}

function sceneMaterials(names) {
  const S = (o) => new THREE.MeshStandardMaterial(o);
  const glow = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  const lib = {
    concrete: S({ color: 0x9a9da3, roughness: 0.86, metalness: 0.0 }),
    slab_back: S({ color: 0x2c2f35, roughness: 0.8 }), slab_side: S({ color: 0x3a3e45, roughness: 0.75 }),
    neon_red: glow(0xff1a26, 1.7), neon_white: glow(0xdfeaff, 1.5),
    lattice: S({ color: 0x23262c, roughness: 0.45, metalness: 0.7 }),
    floor_red: glow(0xff2020, 1.8), paint_line: S({ color: 0xe8eaee, roughness: 0.7 }),
    lamp_disc: glow(0xffffff, 4.0), centre_line: S({ color: 0xe6e8ec, roughness: 0.7 }),
  };
  return names.map((n) => lib[n] || S({ color: 0x777777 }));
}

// car-local 3x4 (column-major X, Y, Z, O) → Matrix4, re-orthonormalised after interpolation
function m4From3x4(c, out) {
  const X = new THREE.Vector3(c[0], c[1], c[2]).normalize();
  const Z = new THREE.Vector3(c[6], c[7], c[8]);
  Z.addScaledVector(X, -Z.dot(X)).normalize();
  const Y = new THREE.Vector3().crossVectors(Z, X);
  return out.set(X.x, Y.x, Z.x, c[9], X.y, Y.y, Z.y, c[10], X.z, Y.z, Z.z, c[11], 0, 0, 0, 1);
}

export class Poses {
  constructor(p) { this.p = p; }
  _i(ev) { const f = (ev - this.p.ev0) / this.p.dt; const i = Math.max(0, Math.min(this.p.count - 2, Math.floor(f))); return [i, clamp(f - i, 0, 1)]; }
  matrix(ev, out = new THREE.Matrix4()) {
    const [i, u] = this._i(ev), a = this.p.matrices[i], b = this.p.matrices[i + 1];
    return m4From3x4(a.map((x, k) => x + (b[k] - x) * u), out);
  }
  wheelAngle(ev) { const [i, u] = this._i(ev); return this.p.wheel_angle[i] + (this.p.wheel_angle[i + 1] - this.p.wheel_angle[i]) * u; }
  jets(ev) {
    const [i, u] = this._i(ev), a = this.p.jets[i], b = this.p.jets[i + 1], o = {};
    this.p.jet_names.forEach((n, k) => { o[n] = a[k] + (b[k] - a[k]) * u; });
    return o;
  }
}

// soft round sprite texture for clouds
function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const POINT_VS = /* glsl */`
  attribute vec3 seed; attribute float rnd;
  uniform float uTime, uSize, uScale, uMaxPx; uniform vec3 uMin, uBox, uDrift;
  varying float vA;
  void main() {
    vec3 p = seed * uBox + uDrift * uTime * (0.6 + 0.8 * rnd);
    p += 0.35 * vec3(sin(uTime * 1.7 + rnd * 40.0), sin(uTime * 1.3 + rnd * 70.0), sin(uTime * 2.1 + rnd * 90.0));
    p = uMin + mod(p, uBox);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uMaxPx, uSize * (0.6 + 0.8 * rnd) * uScale / -mv.z);
    vA = 0.55 + 0.45 * rnd;
  }`;
const POINT_FS = /* glsl */`
  uniform vec3 uColor; uniform float uAlpha; varying float vA;
  void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard;
    gl_FragColor = vec4(uColor, uAlpha * vA * (1.0 - r) * (1.0 - r)); }`;

const JET_VS = /* glsl */`
  attribute float nz; attribute float rnd; attribute vec2 off;
  uniform vec3 uP[5]; uniform vec3 uD[5]; uniform float uL[5]; uniform float uTime, uLen, uSpread, uSize, uScale;
  varying float vA;
  void main() {
    int k = int(nz);
    float age = fract(uTime * (1.6 + 0.8 * rnd) + rnd * 13.0);
    vec3 d = normalize(uD[k]);
    vec3 a = normalize(abs(d.z) < 0.9 ? cross(d, vec3(0.0, 0.0, 1.0)) : cross(d, vec3(1.0, 0.0, 0.0)));
    vec3 b = cross(d, a);
    vec3 p = uP[k] + d * age * uLen * (0.75 + 0.5 * rnd) + (a * off.x + b * off.y) * (0.04 + uSpread * age);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(22.0, uSize * (0.4 + 1.6 * age) * uScale / -mv.z);
    vA = uL[k] * (1.0 - age) * smoothstep(0.0, 0.08, age);
  }`;
const JET_FS = /* glsl */`
  uniform vec3 uColor; varying float vA;
  void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0 || vA < 0.002) discard;
    gl_FragColor = vec4(uColor, vA * (1.0 - r)); }`;

export class World {
  constructor(W, H, model) {
    this.W = W; this.H = H; this.model = model;
    this.poses = new Poses(model.poses);
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(W, H, false);
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;   // hue-preserving: the red edge neon stays red
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = canvas;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060a);
    scene.fog = new THREE.FogExp2(0x05070c, 0.012);
    const pm = new THREE.PMREMGenerator(r);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = this.env; scene.environmentIntensity = 0.22;
    const cam = this.camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 600);
    cam.up.set(0, 0, 1);

    // ---- ramp, neon, truss
    const sm = sceneMaterials(model.sceneMeta.materials);
    for (const part of ['ramp', 'neon', 'lattice', 'venue']) {
      if (!model.sceneMeta.parts[part]) continue;
      const mesh = new THREE.Mesh(partGeometry(model.sceneMeta, model.sceneBuf, part), sm);
      mesh.castShadow = part !== 'neon'; mesh.receiveShadow = part === 'ramp';
      scene.add(mesh);
    }
    // ---- floor: dark satin with light pools
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x0c0e13, roughness: 0.5, metalness: 0.0 }));
    floor.receiveShadow = true; scene.add(floor); this.floor = floor;

    // ---- car (body + wheels as children; poses drive the group matrix)
    const cm = carMaterials(model.carMeta.materials);
    const car = this.car = new THREE.Group(); car.matrixAutoUpdate = false;
    const body = new THREE.Mesh(partGeometry(model.carMeta, model.carBuf, 'body'), cm);
    body.castShadow = true; body.receiveShadow = true; car.add(body);
    this.wheels = model.carMeta.wheel_placements.map((wp) => {
      const geo = partGeometry(model.carMeta, model.carBuf, wp.name[0] === 'F' ? 'wheelF' : 'wheelR');
      const stat = partGeometry(model.carMeta, model.carBuf, wp.name[0] === 'F' ? 'wheelStaticF' : 'wheelStaticR');
      const spin = new THREE.Mesh(geo, cm), fixed = new THREE.Mesh(stat, cm);
      for (const m of [spin, fixed]) { m.matrixAutoUpdate = false; m.castShadow = true; car.add(m); }
      return { wp, spin, fixed };
    });
    scene.add(car);

    // ---- lights: three floor floods aimed up at the deck (staging, as in the source venue), a soft hemi fill
    const flood = (pos, aim, color, cd, angle, shadow) => {
      const l = new THREE.SpotLight(color, cd, 120, angle * Math.PI / 180, 0.55, 2);
      l.position.set(...pos); l.target.position.set(...aim); scene.add(l, l.target);
      if (shadow) { l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02; l.shadow.camera.near = 2; l.shadow.camera.far = 80; }
      return l;
    };
    this.lights = {
      key: flood([-10.5, -13.0, 0.6], [-2.6, 0, 15.0], 0xd8e4ff, 1800, 24, true),
      rim: flood([-5.0, 12.5, 0.6], [-2.2, 0, 15.1], 0xffe9d6, 1900, 18, false),
      curl: flood([9.0, -14.5, 0.6], [5.0, 0, 9.5], 0xdfe8ff, 1300, 30, false),
      extra: flood([-15.5, -7.5, 0.6], [-9, 0, 12], 0xdde8ff, 0, 14, false),
    };
    this.hemi = new THREE.HemisphereLight(0x9fb4d8, 0x0a0b10, 0.25); scene.add(this.hemi);
    // fake light shafts: additive cones along the three floods (haze in the venue air; staging, not data)
    this.beams = ['key', 'rim', 'curl'].map((k) => {
      const l = this.lights[k], len = 26, rad = Math.tan(l.angle) * len;
      const geo = new THREE.ConeGeometry(rad, len, 48, 1, true); geo.translate(0, -len / 2, 0); geo.rotateX(-Math.PI / 2);   // apex at origin, opening along +Z
      const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(l.color) }, uK: { value: 0.05 }, uLen: { value: len } },
        vertexShader: `varying vec3 vN; varying vec3 vV; varying float vZ; uniform float uLen;
          void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vZ = position.z / uLen; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `varying vec3 vN; varying vec3 vV; varying float vZ; uniform vec3 uColor; uniform float uK;
          void main() { float f = pow(abs(dot(vN, vV)), 1.6); float a = uK * f * (1.0 - smoothstep(0.15, 1.0, vZ)) * smoothstep(0.0, 0.06, vZ); gl_FragColor = vec4(uColor * a, a); }` });
      const m = new THREE.Mesh(geo, mat); m.position.copy(l.position); m.lookAt(l.target.position); scene.add(m);
      return { m, l };
    });
    this.curlHome = { pos: [9.0, -14.5, 0.6], aim: [5.0, 0, 9.5], angle: 30 };
    // the deck's free end: a thin glowing edge that lights up in the chase
    const lip = model.sceneMeta.ramp.LIP;
    this.lipBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, model.sceneMeta.ramp.W, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    this.lipBar.position.set(lip[0] + 0.035, 0, lip[2] - 0.03); this.lipBar.visible = false; scene.add(this.lipBar);

    // ---- air particles (air vision): a box of slow drifting motes; positions are a pure function of uTime
    {
      const N = 60000, R = rng(7), seed = new Float32Array(N * 3), rnd = new Float32Array(N);
      for (let i = 0; i < N; i++) { seed[i * 3] = R(); seed[i * 3 + 1] = R(); seed[i * 3 + 2] = R(); rnd[i] = R(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      g.setAttribute('seed', new THREE.BufferAttribute(seed, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1));
      this.airMat = new THREE.ShaderMaterial({ vertexShader: POINT_VS, fragmentShader: POINT_FS, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uSize: { value: 0.07 }, uScale: { value: H * 0.9 }, uMaxPx: { value: 4.5 },
          uMin: { value: new THREE.Vector3(-26, -18, -1) }, uBox: { value: new THREE.Vector3(40, 36, 30) }, uDrift: { value: new THREE.Vector3(0.6, 0.25, 0.15) },
          uColor: { value: new THREE.Color(0x9fd2ff) }, uAlpha: { value: 0 } } });
      this.air = new THREE.Points(g, this.airMat); this.air.frustumCulled = false; scene.add(this.air);
    }
    // ---- jets (comoving schematic plumes from the nozzle ports; schematic length, no performance implied)
    {
      const per = 2600, NZ = 5, N = per * NZ, R = rng(11);
      const nz = new Float32Array(N), rnd = new Float32Array(N), off = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) { nz[i] = Math.floor(i / per); rnd[i] = R(); const a = R() * Math.PI * 2, rr = Math.sqrt(R()); off[i * 2] = Math.cos(a) * rr; off[i * 2 + 1] = Math.sin(a) * rr; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      g.setAttribute('nz', new THREE.BufferAttribute(nz, 1)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1)); g.setAttribute('off', new THREE.BufferAttribute(off, 2));
      this.jetMat = new THREE.ShaderMaterial({ vertexShader: JET_VS, fragmentShader: JET_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uP: { value: Array.from({ length: 5 }, () => new THREE.Vector3()) }, uD: { value: Array.from({ length: 5 }, () => new THREE.Vector3(0, 0, -1)) },
          uL: { value: [0, 0, 0, 0, 0] }, uTime: { value: 0 }, uLen: { value: 3.2 }, uSpread: { value: 0.22 }, uSize: { value: 0.16 }, uScale: { value: H * 0.9 },
          uColor: { value: new THREE.Color(0xbdeefa).multiplyScalar(0.5) } } });
      this.jets = new THREE.Points(g, this.jetMat); this.jets.frustumCulled = false; scene.add(this.jets);
    }
    // ---- the source's ground cloud: soft billboards from the v9 puff list
    {
      const tex = puffTexture();
      this.puffs = model.poses.cloud_puffs.map((p, i) => {
        const sprites = [0, 1, 2].map((j) => {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x9aa6b6, transparent: true, depthWrite: false, opacity: 0, fog: true }));
          scene.add(s); return s;
        });
        return { p, sprites, i };
      });
    }
    // ---- force arrows (glowing, unlit)
    this.arrows = [];
    this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType }));
    this.composer.addPass(new RenderPass(scene, cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.42, 1.55);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  arrow(i) {
    if (!this.arrows[i]) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false, depthWrite: false, depthTest: false }));
      const head = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24), shaft.material);
      shaft.renderOrder = head.renderOrder = 10; const g = new THREE.Group(); g.add(shaft, head); this.scene.add(g);
      this.arrows[i] = { g, shaft, head };
    }
    return this.arrows[i];
  }

  // state: { ev, cam: {pos, target, fov}, exposure, bloom, air: {alpha, time}, jets: {on, time}, cloud, arrows: [{a, b, width, color, k, alpha}],
  //          lights: {key, rim, curl, extra: {pos, aim, cd}}, fog }
  set(st) {
    const P = this.poses, ev = st.ev;
    P.matrix(ev, this.car.matrix); this.car.matrixWorldNeedsUpdate = true;
    const ang = P.wheelAngle(ev);
    for (const w of this.wheels) {
      const T = new THREE.Matrix4().makeTranslation(...w.wp.centre);
      const S = new THREE.Matrix4().makeScale(1, w.wp.side < 0 ? -1 : 1, 1);
      w.fixed.matrix.multiplyMatrices(T, S);
      w.spin.matrix.multiplyMatrices(T, S).multiply(new THREE.Matrix4().makeRotationY(ang));
    }
    const c = this.camera;
    c.position.set(...st.cam.pos); c.fov = st.cam.fov; c.updateProjectionMatrix(); c.lookAt(...st.cam.target);
    if (st.cam.roll) c.rotateZ(st.cam.roll);
    this.renderer.toneMappingExposure = st.exposure ?? 1.0;
    this.bloom.strength = st.bloom ?? 0.55;
    const L = st.lights || {};
    this.lights.key.intensity = 1800 * (L.key ?? 1); this.lights.rim.intensity = 1900 * (L.rim ?? 1); this.lights.curl.intensity = 1300 * (L.curl ?? 1);
    const ex = this.lights.extra;
    if (L.extra) { ex.position.set(...L.extra.pos); ex.target.position.set(...L.extra.aim); ex.intensity = L.extra.cd; ex.angle = (L.extra.angle ?? 14) * Math.PI / 180; ex.target.updateMatrixWorld(); }
    else ex.intensity = 0;
    this.hemi.intensity = L.hemi ?? 0.25;
    // the curl flood moves over the landing area when asked (L.land 0..1)
    const cu = this.lights.curl, land = L.land ?? 0, spec = land > 0 ? { pos: [-4.0, -17.0, 0.6], aim: [-15.5, 0, 2.5], angle: 24 } : this.curlHome;
    cu.position.set(...spec.pos); cu.target.position.set(...spec.aim); cu.angle = spec.angle * Math.PI / 180; cu.target.updateMatrixWorld();
    if (land > 0) cu.intensity = 1600 * land;
    this.beams.forEach(({ m, l }) => { m.position.copy(l.position); m.lookAt(l.target.position); m.material.uniforms.uK.value = 0.09 * (st.beams ?? 1) * Math.min(1.5, l.intensity / 1800); m.visible = l.intensity > 1; });
    this.lipBar.visible = (st.lip ?? 0) > 0.001;
    if (this.lipBar.visible) this.lipBar.material.color.setRGB(1, 1, 1).multiplyScalar(4 * st.lip);
    this.scene.fog.density = st.fog ?? 0.012;
    // air
    const air = st.air || {};
    this.airMat.uniforms.uAlpha.value = air.alpha ?? 0; this.air.visible = (air.alpha ?? 0) > 0.001;
    this.airMat.uniforms.uTime.value = air.time ?? 0;
    if (air.color) this.airMat.uniforms.uColor.value.set(air.color);
    // jets
    const J = st.jets;
    this.jets.visible = !!J;
    if (J) {
      const lv = P.jets(ev), u = this.jetMat.uniforms, M = this.car.matrix, R3 = new THREE.Matrix3().setFromMatrix4(M);
      ['NOSE', 'FL', 'FR', 'RL', 'RR'].forEach((n, k) => {
        const nzz = this.model.carMeta.nozzles[n];
        u.uP.value[k].set(...nzz.pos).applyMatrix4(M);
        u.uD.value[k].set(...(this.model.poses.flight_dirs[n] || nzz.dir)).applyMatrix3(R3).normalize();
        u.uL.value[k] = Math.sqrt(Math.max(0, lv[n] || 0)) * (J.gain ?? 1) * (n === 'NOSE' ? (J.nose ?? 0.6) : 1);
      });
      u.uTime.value = J.time; u.uLen.value = J.len ?? 3.2;
    }
    // cloud
    for (const { p, sprites, i } of this.puffs) {
      const age = ev - p.birth, on = st.cloud && age > 0;
      sprites.forEach((s, j) => {
        s.visible = on; if (!on) return;
        const g = 1 - Math.exp(-age / 0.55), r = (0.6 + (p.r1 - 0.6) * g) * (1.2 + 0.25 * j);
        s.position.set(p.x + p.drift * g + (j - 1) * 0.5 * r, p.y + (j - 1) * 0.3 * r, 0.35 * r + p.rise * g + 0.2 * j * r);
        s.scale.set(2.2 * r, 2.2 * r, 1);
        s.material.opacity = (st.cloud ?? 0) * 0.17 * smooth(age / 0.35) / (1 + 0.4 * j);
      });
    }
    // arrows
    const A = st.arrows || [];
    this.arrows.forEach((a) => { a.g.visible = false; });
    A.forEach((spec, i) => {
      const a = this.arrow(i), from = new THREE.Vector3(...spec.a), to = new THREE.Vector3(...spec.b);
      const dir = to.clone().sub(from), L0 = dir.length() * (spec.k ?? 1); if (L0 < 1e-3) return;
      dir.normalize();
      const headL = Math.min(L0 * 0.45, spec.width * 3.2), shaftL = Math.max(0.001, L0 - headL);
      a.g.visible = true; a.g.position.copy(from);
      a.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      a.shaft.scale.set(spec.width * 0.5, shaftL, spec.width * 0.5); a.shaft.position.set(0, shaftL / 2, 0);
      a.head.scale.set(spec.width * 1.25, headL, spec.width * 1.25); a.head.position.set(0, shaftL + headL / 2, 0);
      a.shaft.material.color.set(spec.color).multiplyScalar(spec.glow ?? 2.2); a.shaft.material.opacity = spec.alpha ?? 1;
    });
  }

  render() { this.composer.render(); return this.canvas; }

  // helpers for shots
  carM(ev) { return this.poses.matrix(ev); }
  local(ev, p) { return new THREE.Vector3(...p).applyMatrix4(this.carM(ev)).toArray(); }
  com(ev) { return this.local(ev, this.model.carMeta.com); }
}
