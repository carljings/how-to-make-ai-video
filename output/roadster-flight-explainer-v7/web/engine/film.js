// film.js — the v7 renderer: frame number → pixels. Pure function of the frame (no state carried between frames).
// Time comes only from cues.js (via timeline.js); there is no narration and no voice timing. v7: the floor rotors and
// their x-ray overlay are gone (the shader discards the 'fan' faces); the 'void' world is the empty air-vision space
// behind the diagram plates (text.js / diagram.js draw the plates in the type layer).
import { createGL, program, use, mesh, draw, target, depthTarget, bindTarget, FULLSCREEN_VS, fullscreen } from './gl.js';
import { m4, rng, halton, norm, sub, cross, deg } from './math.js';
import { loadAssets, Poses, Ramp, FlightPoses } from './assets.js';
import { SURFACE_VS, SURFACE_FS, SKY_FS, DEPTH_VS, DEPTH_FS } from './shaders/surface.js';
import { STREAK_FS, DUST_VS, AIR_VS, GAP_VS, LEAK_VS, GLINT_VS, CONVERGE_VS, WAKE_VS, INRUSH_VS, SHARDS_VS, STORE_VS, JET_VS,
  PUFF_VS, CABLE_VS, PATH_VS } from './shaders/particles.js';
import { RIBBON_VS, RIBBON_FS, SHELL_VS, SHELL_FS, GAPVOL_VS, GAPVOL_FS, VOLUME_FS, ARC_VS } from './shaders/fx.js';
import { COPY_FS, PREFILTER_FS, DOWN_FS, UP_FS, STREAKBLUR_FS, COMPOSITE_FS } from './shaders/post.js';
import { Timeline, FLOODS } from './timeline.js';
import { TextLayer } from './text.js';

const CAR_MATS = {
  paint: { base: [0.78, 0.79, 0.81], rough: 0.24, metal: 0.0, cc: 1.0, kind: 1, edge: 0.5 },
  glass: { base: [0.012, 0.013, 0.016], rough: 0.04, metal: 0.0, cc: 0.0, kind: 2, edge: 0.9 },
  satin_black: { base: [0.02, 0.02, 0.022], rough: 0.5, kind: 0, edge: 0.3 },
  underbody: { base: [0.035, 0.036, 0.04], rough: 0.65, kind: 0, edge: 0.2 },
  panel_gap: { base: [0.004, 0.004, 0.004], rough: 0.8, kind: 0, edge: 0.0 },
  liner: { base: [0.012, 0.012, 0.012], rough: 0.85, kind: 0, edge: 0.1 },
  lamp_white: { base: [0.9, 0.9, 0.9], rough: 0.1, kind: 3, emis: [0.92, 0.96, 1.0], es: 14.0, edge: 0.5 },
  lamp_red: { base: [0.5, 0.02, 0.02], rough: 0.1, kind: 3, emis: [1.0, 0.05, 0.04], es: 9.0, edge: 0.5 },
  lamp_amber: { base: [0.6, 0.3, 0.02], rough: 0.1, kind: 3, emis: [1.0, 0.45, 0.05], es: 4.0, edge: 0.2 },
  under_frame: { base: [0.03, 0.03, 0.033], rough: 0.5, metal: 0.6, kind: 0, edge: 0.3 },
  nozzle: { base: [0.12, 0.12, 0.13], rough: 0.3, metal: 1.0, kind: 0, edge: 0.6 },
  tyre: { base: [0.022, 0.022, 0.024], rough: 0.78, kind: 5, edge: 0.2 },
  rim: { base: [0.05, 0.05, 0.055], rough: 0.28, metal: 1.0, kind: 0, edge: 0.5 },
  rim_dark: { base: [0.01, 0.01, 0.012], rough: 0.5, metal: 0.5, kind: 0, edge: 0.1 },
  brake: { base: [0.32, 0.32, 0.33], rough: 0.35, metal: 1.0, kind: 0, edge: 0.3 },
  caliper: { base: [0.07, 0.07, 0.075], rough: 0.4, metal: 0.3, kind: 0, edge: 0.2 },
  fan: { base: [0.03, 0.03, 0.035], rough: 0.4, metal: 0.5, kind: 6, edge: 1.0 },   // discarded by the shader (v7)
};
const SCENE_MATS = {
  concrete: { base: [0.34, 0.34, 0.335], rough: 0.78, kind: 4, edge: 0.2 },
  slab_back: { base: [0.2, 0.2, 0.2], rough: 0.85, kind: 4, edge: 0.2 },
  slab_side: { base: [0.3, 0.3, 0.3], rough: 0.8, kind: 4, edge: 0.4 },
  neon_red: { base: [0.3, 0.0, 0.0], rough: 0.3, kind: 3, emis: [1.0, 0.03, 0.045], es: 2.6, edge: 0.4 },
  neon_white: { base: [0.6, 0.6, 0.6], rough: 0.3, kind: 3, emis: [0.9, 0.95, 1.0], es: 3.0, edge: 0.4 },
  lattice: { base: [0.08, 0.08, 0.085], rough: 0.45, metal: 0.7, kind: 0, edge: 0.6 },
  floor_red: { base: [0.3, 0.0, 0.0], rough: 0.3, kind: 3, emis: [1.0, 0.04, 0.05], es: 3.0, edge: 0.3 },
  paint_line: { base: [0.55, 0.55, 0.55], rough: 0.6, kind: 0, edge: 0.1 },
  lamp_disc: { base: [0.9, 0.9, 0.9], rough: 0.2, kind: 3, emis: [0.92, 0.96, 1.0], es: 12.0, edge: 0.2 },   // a far lamp, not the hero
  centre_line: { base: [0.75, 0.75, 0.74], rough: 0.55, kind: 0, edge: 0.2 },
};

// the kickflip lot (v4 staging stand-ins): night-lot paint, glass, rubber, poles
const LOT_MATS = {
  lineup_white: { base: [0.74, 0.75, 0.76], rough: 0.3, metal: 0.1, cc: 1.0, kind: 0, edge: 0.5 },
  lineup_red: { base: [0.32, 0.012, 0.016], rough: 0.3, metal: 0.3, cc: 1.0, kind: 0, edge: 0.5 },
  truck_white: { base: [0.78, 0.79, 0.8], rough: 0.35, cc: 0.6, kind: 0, edge: 0.5 },
  steel: { base: [0.4, 0.41, 0.42], rough: 0.38, metal: 1.0, kind: 0, edge: 0.5 },
  bronze: { base: [0.55, 0.4, 0.2], rough: 0.28, metal: 1.0, kind: 0, edge: 0.5 },
  lineup_glass: { base: [0.005, 0.005, 0.006], rough: 0.05, kind: 0, edge: 0.8 },
  lineup_under: { base: [0.02, 0.02, 0.02], rough: 0.8, kind: 0, edge: 0.2 },
  lineup_rim: { base: [0.25, 0.25, 0.26], rough: 0.3, metal: 0.9, kind: 0, edge: 0.3 },
  tyre: { base: [0.02, 0.02, 0.022], rough: 0.8, kind: 0, edge: 0.2 },
  trim_dark: { base: [0.02, 0.02, 0.022], rough: 0.6, kind: 0, edge: 0.2 },
  lamp_white_dim: { base: [0.8, 0.8, 0.8], rough: 0.3, kind: 3, emis: [1.0, 1.0, 1.0], es: 3.0, edge: 0.3 },
  zinc: { base: [0.3, 0.3, 0.31], rough: 0.45, metal: 1.0, kind: 0, edge: 0.3 },
  jack_steel: { base: [0.025, 0.026, 0.028], rough: 0.5, metal: 0.5, kind: 0, edge: 0.3 },
  wood_pole: { base: [0.09, 0.07, 0.05], rough: 0.85, kind: 0, edge: 0.3 },
  pale_structure: { base: [0.55, 0.56, 0.57], rough: 0.55, kind: 0, edge: 0.3 },
  tent_grey: { base: [0.22, 0.22, 0.23], rough: 0.8, kind: 0, edge: 0.2 },
  equipment_orange: { base: [0.6, 0.18, 0.02], rough: 0.5, kind: 0, edge: 0.2 },
  cable: { base: [0.01, 0.01, 0.01], rough: 0.5, kind: 0, edge: 0.2 },
};

function matArrays(names, table) {
  const A = new Float32Array(24 * 4), B = new Float32Array(24 * 4), E = new Float32Array(24 * 4);
  names.forEach((n, i) => {
    const m = table[n] || { base: [0.5, 0.5, 0.5], rough: 0.5, kind: 0 };
    A.set([...m.base, m.rough ?? 0.5], i * 4);
    B.set([m.metal ?? 0, m.cc ?? 0, m.es ?? 0, m.kind ?? 0], i * 4);
    E.set([...(m.emis || [0, 0, 0]), m.edge ?? 0.3], i * 4);
  });
  return { uMatA: A, uMatB: B, uMatE: E };
}

export class Film {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = Object.assign({ base: './assets/', scale: 1, subframes: 1, volScale: 0.5, volSteps: 40, particleScale: 1,
      shadowSize: 2048, fps: 30 }, opts);
  }

  async init() {
    const o = this.opts;
    const W = Math.round(1080 * o.scale), H = Math.round(1920 * o.scale);
    this.W = W; this.H = H;
    this.canvas.width = W; this.canvas.height = H;
    const gl = this.gl = createGL(this.canvas);
    this.assets = await loadAssets(o.base);
    this.poses = new Poses(this.assets.poses, this.assets.carMeta);
    this.flight = new FlightPoses(this.assets.kickflip);
    this.ramp = new Ramp(this.assets.sceneMeta);
    this.timeline = new Timeline(this);
    this.text = new TextLayer(W, H, o.scale);
    await this.text.loadFonts(o.base + 'fonts/');
    this._buildMeshes();
    this._buildPrograms();
    this._buildTargets();
    this.fs = fullscreen(gl);
    this.ready = true;
    return this;
  }

  _surfaceMesh(part) {
    const gl = this.gl;
    const attribs = {
      pos: { data: part.pos, size: 3, loc: 0 },
      nor: { data: part.nor, size: 3, loc: 1 },
      mat: { data: part.mat, size: 1, loc: 2, type: gl.UNSIGNED_BYTE },
    };
    if (part.ext && part.extN === 2) attribs.ext = { data: part.ext, size: 2, loc: 3 };
    const m = mesh(gl, attribs, part.idx);
    if (!attribs.ext) { gl.bindVertexArray(m.vao); gl.disableVertexAttribArray(3); gl.vertexAttrib2f(3, 0, 0); gl.bindVertexArray(null); }
    return m;
  }

  _buildMeshes() {
    const gl = this.gl, A = this.assets;
    this.meshes = {};
    for (const k of ['ramp', 'neon', 'lattice', 'venue']) this.meshes[k] = this._surfaceMesh(A.scene[k]);
    this.meshes.fixtures = this._surfaceMesh(this._fixtures());
    for (const k of ['body', 'wheelF', 'wheelR', 'wheelStaticF', 'wheelStaticR']) this.meshes[k] = this._surfaceMesh(A.car[k]);
    this.meshes.lotLineup = this._surfaceMesh(A.lot.lineup);
    this.meshes.lotProps = this._surfaceMesh(A.lot.props);
    this._buildCables();
    this.meshes.arc = { vao: gl.createVertexArray(), count: 130, itype: null, mode: gl.TRIANGLE_STRIP };
    // venue floor: one big quad 6 mm below the run-in (no coplanar faces)
    const S = 260, z = A.sceneMeta.floor_z;
    this.meshes.floor = this._surfaceMesh({
      pos: new Float32Array([-S, -S, z, S, -S, z, S, S, z, -S, S, z]),
      nor: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
      mat: new Uint8Array([0, 0, 0, 0]), ext: null, extN: 0, idx: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    // unit sphere for the Ping wavefront
    const sp = [], si = [];
    const nu = 96, nv = 48;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const th = (j / nv) * Math.PI, ph = (i / nu) * 2 * Math.PI;
      sp.push(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th));
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + nu + 1;
      si.push(a, b, a + 1, a + 1, b, b + 1);
    }
    this.meshes.sphere = mesh(gl, { pos: { data: new Float32Array(sp), size: 3, loc: 0 } }, new Uint32Array(si));
    // unit cube (slit volume)
    const cp = [], ci = [];
    for (let k = 0; k < 8; k++) cp.push((k & 1) - 0.5, ((k >> 1) & 1) - 0.5, ((k >> 2) & 1) - 0.5);
    [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]].forEach((f) => ci.push(f[0], f[1], f[2], f[0], f[2], f[3]));
    this.meshes.cube = mesh(gl, { pos: { data: new Float32Array(cp), size: 3, loc: 0 } }, new Uint32Array(ci));
    // empty VAO for procedural streak instances
    this.meshes.empty = { vao: gl.createVertexArray(), count: 4, itype: null, mode: gl.TRIANGLE_STRIP };
    this._buildGlintSites();
  }

  // flood housings on the floor: dark can + glowing lens facing the aim point (staging, not a source fact)
  _fixtures() {
    const names = this.assets.sceneMeta.materials;
    const LENS = names.indexOf('lamp_disc'), BODY = names.indexOf('lattice');
    const pos = [], nor = [], mat = [], idx = [];
    const seg = 24, R = 0.32, Lh = 0.42;
    for (const f of Object.values(FLOODS)) {
      const d = norm(sub(f.aim, f.pos));
      const a = Math.abs(d[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
      const u = norm(cross(d, a)), v = cross(u, d);
      const base = f.pos.map((x, k) => x - d[k] * Lh);
      const ring = (c, r) => Array.from({ length: seg }, (_, i) => {
        const t = (i / seg) * Math.PI * 2;
        return [c[0] + (u[0] * Math.cos(t) + v[0] * Math.sin(t)) * r, c[1] + (u[1] * Math.cos(t) + v[1] * Math.sin(t)) * r, c[2] + (u[2] * Math.cos(t) + v[2] * Math.sin(t)) * r];
      });
      const r0 = ring(base, R * 0.85), r1 = ring(f.pos, R);
      // side
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        const o = pos.length / 3;
        for (const p of [r0[i], r1[i], r1[j], r0[j]]) {
          pos.push(...p);
          const nn = norm(sub(p, base));
          nor.push(...nn);
          mat.push(BODY);
        }
        idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
      }
      // lens (emissive disc)
      const c0 = pos.length / 3;
      pos.push(...f.pos.map((x, k) => x + d[k] * 0.01)); nor.push(...d); mat.push(LENS);
      for (let i = 0; i < seg; i++) { pos.push(...r1[i].map((x, k) => x + d[k] * 0.01)); nor.push(...d); mat.push(LENS); }
      for (let i = 0; i < seg; i++) idx.push(c0, c0 + 1 + i, c0 + 1 + ((i + 1) % seg));
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), mat: new Uint8Array(mat), ext: null, extN: 0, idx: new Uint32Array(idx) };
  }

  // the lot's overhead lines as instanced segments (aA = start + radius, aB = end)
  _buildCables() {
    const gl = this.gl;
    const segA = [], segB = [];
    for (const L of this.assets.kickflip.overhead_lines) {
      for (let k = 0; k + 1 < L.points.length; k++) { segA.push(...L.points[k], L.radius); segB.push(...L.points[k + 1]); }
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const b1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(segA), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(4, 1);
    const b2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(segB), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(5, 1);
    gl.bindVertexArray(null);
    this.meshes.cables = { vao, count: 4, itype: null, mode: gl.TRIANGLE_STRIP };
    this.cableSegments = segA.length / 4;
  }

  // area-weighted samples on the car's surface (car-local) for pressure glints; class 1 = floor facing the slit
  _buildGlintSites() {
    const gl = this.gl;
    const b = this.assets.car.body;
    const names = this.assets.carMeta.materials;
    const ok = new Set(['paint', 'glass', 'satin_black', 'underbody', 'under_frame'].map((n) => names.indexOf(n)));
    const tris = [];
    let total = 0;
    for (let t = 0; t < b.idx.length; t += 3) {
      const i0 = b.idx[t], i1 = b.idx[t + 1], i2 = b.idx[t + 2];
      if (!ok.has(b.mat[i0])) continue;
      const p0 = [b.pos[i0 * 3], b.pos[i0 * 3 + 1], b.pos[i0 * 3 + 2]];
      const p1 = [b.pos[i1 * 3], b.pos[i1 * 3 + 1], b.pos[i1 * 3 + 2]];
      const p2 = [b.pos[i2 * 3], b.pos[i2 * 3 + 1], b.pos[i2 * 3 + 2]];
      const c = cross(sub(p1, p0), sub(p2, p0));
      const area = 0.5 * Math.hypot(c[0], c[1], c[2]);
      if (area <= 0) continue;
      total += area;
      tris.push({ p0, p1, p2, n: norm(c), acc: total });
    }
    const N = Math.round(26000 * this.opts.particleScale);
    const R = rng(20261018);
    const S = new Float32Array(N * 4), Nn = new Float32Array(N * 3);
    let floorCount = 0;
    for (let k = 0; k < N; k++) {
      const x = R() * total;
      let lo = 0, hi = tris.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (tris[mid].acc < x) lo = mid + 1; else hi = mid; }
      const tr = tris[lo];
      let u = R(), v = R();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const p = [0, 1, 2].map((j) => tr.p0[j] + (tr.p1[j] - tr.p0[j]) * u + (tr.p2[j] - tr.p0[j]) * v);
      const floor = p[2] < 0.24 && tr.n[2] < -0.55 && Math.abs(p[0]) < 1.7 ? 1 : 0;
      floorCount += floor;
      S.set([p[0], p[1], p[2], floor], k * 4);
      Nn.set(tr.n, k * 3);
    }
    this.glintCount = N;
    this.glintFloor = floorCount;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const b1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b1);
    gl.bufferData(gl.ARRAY_BUFFER, S, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(4, 1);
    const b2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b2);
    gl.bufferData(gl.ARRAY_BUFFER, Nn, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(5, 1);
    gl.bindVertexArray(null);
    this.meshes.glints = { vao, count: 4, itype: null, mode: gl.TRIANGLE_STRIP };
  }

  _buildPrograms() {
    const gl = this.gl;
    this.P = {
      surface: program(gl, SURFACE_VS, SURFACE_FS, 'surface'),
      sky: program(gl, FULLSCREEN_VS, SKY_FS, 'sky'),
      depth: program(gl, DEPTH_VS, DEPTH_FS, 'depth'),
      dust: program(gl, DUST_VS, STREAK_FS, 'dust'),
      air: program(gl, AIR_VS, STREAK_FS, 'air'),
      gap: program(gl, GAP_VS, STREAK_FS, 'gap'),
      leak: program(gl, LEAK_VS, STREAK_FS, 'leak'),
      glint: program(gl, GLINT_VS, STREAK_FS, 'glint'),
      conv: program(gl, CONVERGE_VS, STREAK_FS, 'converge'),
      wake: program(gl, WAKE_VS, STREAK_FS, 'wake'),
      inrush: program(gl, INRUSH_VS, STREAK_FS, 'inrush'),
      shards: program(gl, SHARDS_VS, STREAK_FS, 'shards'),
      store: program(gl, STORE_VS, STREAK_FS, 'store'),
      jet: program(gl, JET_VS, STREAK_FS, 'jet'),
      puff: program(gl, PUFF_VS, STREAK_FS, 'puff'),
      cable: program(gl, CABLE_VS, STREAK_FS, 'cable'),
      path: program(gl, PATH_VS, STREAK_FS, 'path'),
      arc: program(gl, ARC_VS, RIBBON_FS, 'arc'),
      ribbon: program(gl, RIBBON_VS, RIBBON_FS, 'ribbon'),
      shell: program(gl, SHELL_VS, SHELL_FS, 'shell'),
      gapvol: program(gl, GAPVOL_VS, GAPVOL_FS, 'gapvol'),
      volume: program(gl, FULLSCREEN_VS, VOLUME_FS, 'volume'),
      copy: program(gl, FULLSCREEN_VS, COPY_FS, 'copy'),
      prefilter: program(gl, FULLSCREEN_VS, PREFILTER_FS, 'prefilter'),
      down: program(gl, FULLSCREEN_VS, DOWN_FS, 'down'),
      up: program(gl, FULLSCREEN_VS, UP_FS, 'up'),
      streak: program(gl, FULLSCREEN_VS, STREAKBLUR_FS, 'streakblur'),
      composite: program(gl, FULLSCREEN_VS, COMPOSITE_FS, 'composite'),
    };
    this.carMats = matArrays(this.assets.carMeta.materials, CAR_MATS);
    this.sceneMats = matArrays(this.assets.sceneMeta.materials, SCENE_MATS);
    this.floorMats = matArrays(['floor'], { floor: { base: [0.03, 0.032, 0.036], rough: 0.32, kind: 0, edge: 0.0 } });
    this.lotMats = matArrays(this.assets.lotMeta.materials, LOT_MATS);
    this.lotFloorMats = matArrays(['lot'], { lot: { base: [0.09, 0.09, 0.088], rough: 0.85, kind: 0, edge: 0.0 } });
  }

  _buildTargets() {
    const gl = this.gl, W = this.W, H = this.H;
    this.T = {};
    this.T.scene = target(gl, W, H, { depthTex: true });
    // second framebuffer on the same colour texture, no depth: used while sampling the depth texture
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.T.scene.color, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.T.sceneNoDepth = { fb, color: this.T.scene.color, w: W, h: H };
    const vs = this.opts.volScale;
    this.T.vol = target(gl, Math.round(W * vs), Math.round(H * vs));
    this.T.accum = target(gl, W, H);
    this.T.refl = target(gl, W >> 1, H >> 1, { depth: true });
    gl.bindTexture(gl.TEXTURE_2D, this.T.refl.color);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.dummy = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.dummy);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    this.T.shadow = depthTarget(gl, this.opts.shadowSize);
    this.T.bloom = [];
    let w = W >> 1, h = H >> 1;
    for (let i = 0; i < 7; i++) {
      this.T.bloom.push(target(gl, Math.max(1, w), Math.max(1, h)));
      w >>= 1; h >>= 1;
    }
    this.T.streakA = target(gl, W >> 2, H >> 4);
    this.T.streakB = target(gl, W >> 2, H >> 4);
    this.textTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  get frameCount() { return this.timeline.frameCount; }

  // ----------------------------------------------------------------------------------------------- per frame
  async renderFrame(frame) {
    const gl = this.gl, o = this.opts;
    const N = Math.max(1, o.subframes | 0);
    const fps = o.fps;
    const shutter = 0.5;                    // 180° shutter
    bindTarget(gl, this.T.accum);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    let mid = null;
    for (let k = 0; k < N; k++) {
      const off = N === 1 ? 0 : ((k + 0.5) / N - 0.5) * shutter;
      const t = (frame + off) / fps;
      const st = this.timeline.at(t);
      if (k === Math.floor(N / 2)) mid = st;
      const jx = N === 1 ? 0 : (halton(k + 1, 2) - 0.5) * 2 / this.W;
      const jy = N === 1 ? 0 : (halton(k + 1, 3) - 0.5) * 2 / this.H;
      this._renderScene(st, jx, jy, frame * 16 + k);
      // accumulate
      bindTarget(gl, this.T.accum);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.disable(gl.DEPTH_TEST);
      use(this.P.copy, { uTex: this.T.scene.color, uGain: 1 / N });
      this.fs();
      gl.disable(gl.BLEND);
    }
    const stC = mid || this.timeline.at(frame / fps);
    this._post(stC, frame);
    return true;
  }

  _frameUniforms(st, jx, jy, seed) {
    const W = this.W, H = this.H;
    const c = st.cam;
    const view = m4.lookAt(c.pos, c.target, c.up || [0, 0, 1]);
    const sh = c.shift || [0, 0];             // lens shift (NDC): frames the subject without tilting the camera
    const proj = m4.perspective(c.fov * deg, W / H, c.near || 0.05, c.far || 600, jx - sh[0], jy - sh[1]);
    const vp = m4.mul(proj, view);
    const U = {
      uView: view, uProj: proj, uViewProj: vp, uInvViewProj: m4.invert(vp), uCamPos: c.pos, uRes: [W, H],
      uTime: st.t, uSim: st.sim, uSeed: seed % 997,
      uPing: [...st.air.center, st.air.radius], uPingP: [st.air.band, st.air.ring, st.air.floor, st.air.sky],
      uAirBg: st.air.bg, uAirRim: [...st.air.rim, st.air.contour],
      uSkyTop: st.sky.top, uSkyHorizon: st.sky.horizon, uGround: st.sky.ground, uFog: [...st.fog.color, st.fog.density],
      uCarM: st.carM, uCarInv: st.carInv,
      uGap: [st.gap.evac, st.gap.residual, st.gap.flow, st.gap.glow],
      uPress: [st.press.outer, st.press.glints, st.press.contact, st.press.beam],
      uOpen: st.open || [0, 0.3, 0, 0],
    };
    const sp = st.spots.slice(0, 4);
    const f = (n) => new Float32Array(n * 4);
    const P = f(4), D = f(4), C = f(4), X = f(4);
    sp.forEach((s, i) => {
      const d = norm(s.dir);
      P.set([...s.pos, s.intensity], i * 4);
      D.set([...d, Math.cos(s.outer * deg)], i * 4);
      C.set([...s.color, Math.cos(s.inner * deg)], i * 4);
      X.set([s.range ?? 80, s.shadow ? 1 : 0, s.beam ?? 0, s.surface ?? 1], i * 4);
    });
    Object.assign(U, { uSpotPos: P, uSpotDir: D, uSpotCol: C, uSpotX: X, uNumSpots: sp.length });
    const cards = (st.cards || []).slice(0, 6);
    const CC = f(6), CS = f(6), CL = f(6);
    cards.forEach((k, i) => {
      CC.set([...norm(k.dir), 0], i * 4);
      CS.set([k.hw, k.hh, (k.roll || 0) * deg, k.soft ?? 0.02], i * 4);
      CL.set([...k.color, k.diffuse ?? 0.5], i * 4);
    });
    Object.assign(U, { uCardC: CC, uCardS: CS, uCardCol: CL, uNumCards: cards.length });
    // shadow
    const ks = sp.findIndex((s) => s.shadow);
    if (ks >= 0) {
      const s = sp[ks];
      const d = norm(s.dir);
      const up = Math.abs(d[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1];
      const lv = m4.lookAt(s.pos, [s.pos[0] + d[0], s.pos[1] + d[1], s.pos[2] + d[2]], up);
      const lp = m4.perspective(Math.min(170, 2 * s.outer + 6) * deg, 1, 0.5, s.range ?? 80);
      U.uShadowVP = m4.mul(lp, lv);
      U.uShadowP = [s.shadowBias ?? 0.0015, 1 / this.opts.shadowSize, s.shadowSoft ?? 2.5, 1];
    } else {
      U.uShadowVP = m4.ident();
      U.uShadowP = [0, 0, 0, 0];
    }
    U.uShadow = this.T.shadow.depth;
    return U;
  }

  _drawSurfaces(st, U, depthOnly = false, reflPass = false, which = 'all') {
    const gl = this.gl;
    const P = depthOnly ? this.P.depth : this.P.surface;
    const carM = st.carM;
    const items = [];
    const I = m4.ident();
    const nI = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const world = which !== 'car', carPass = which !== 'world';
    const W = st.world || 'ramp';
    if (world && W === 'ramp') {
      if (!depthOnly && !reflPass) items.push({ m: this.meshes.floor, model: I, nm: nI, obj: 6, mats: this.floorMats, air: st.objAir.floor });
      items.push({ m: this.meshes.ramp, model: I, nm: nI, obj: 2, mats: this.sceneMats, air: st.objAir.ramp });
      if (!depthOnly) items.push({ m: this.meshes.neon, model: I, nm: nI, obj: 3, mats: this.sceneMats, air: st.objAir.neon });
      items.push({ m: this.meshes.lattice, model: I, nm: nI, obj: 4, mats: this.sceneMats, air: st.objAir.lattice });
      if (!depthOnly) items.push({ m: this.meshes.venue, model: I, nm: nI, obj: 5, mats: this.sceneMats, air: st.objAir.venue });
      if (!depthOnly) items.push({ m: this.meshes.fixtures, model: I, nm: nI, obj: 5, mats: this.sceneMats, air: st.objAir.venue });
    } else if (world && W === 'lot') {
      if (!depthOnly && !reflPass) items.push({ m: this.meshes.floor, model: I, nm: nI, obj: 6, mats: this.lotFloorMats, air: st.objAir.floor });
      items.push({ m: this.meshes.lotLineup, model: I, nm: nI, obj: 5, mats: this.lotMats, air: st.objAir.venue });
      items.push({ m: this.meshes.lotProps, model: I, nm: nI, obj: 5, mats: this.lotMats, air: st.objAir.venue });
    }
    if (carPass && st.carVisible !== false && W !== 'black' && W !== 'void') {
      // the car, plus any multiple-exposure ghosts (each with its own x-ray opacity)
      const cars = [{ M: carM, wheels: st.wheels, aa: null }, ...(st.ghosts || [])];
      for (const c of cars) {
        items.push({ m: this.meshes.body, model: c.M, nm: m4.normalMat3(c.M), obj: 0, mats: this.carMats, air: st.objAir.car, aa: c.aa });
        for (const w of c.wheels) {
          const rot = w.rear ? this.meshes.wheelR : this.meshes.wheelF;
          const stc = w.rear ? this.meshes.wheelStaticR : this.meshes.wheelStaticF;
          items.push({ m: rot, model: w.model, nm: m4.normalMat3(w.model), obj: 1, mats: this.carMats, air: st.objAir.car, mir: w.mirrored, aa: c.aa });
          items.push({ m: stc, model: w.staticModel, nm: m4.normalMat3(w.staticModel), obj: 1, mats: this.carMats, air: st.objAir.car, mir: w.mirrored, aa: c.aa });
        }
      }
    }
    gl.disable(gl.CULL_FACE);
    if (depthOnly) {
      use(P, { uLightVP: U.uShadowVP });
      for (const it of items) { use(P, { uModel: it.model }); draw(gl, it.m); }
      return;
    }
    const refl = st.refl && st.refl.on && !reflPass;
    const pools = new Float32Array(16);
    (st.pools || []).slice(0, 4).forEach((p, i) => pools.set(p, i * 4));
    use(P, { ...U, uRefl: refl ? this.T.refl.color : this.dummy, uAirAlpha: st.carAirAlpha ?? 1, uPools: pools,
      uReflP: refl ? [1, st.refl.strength ?? 1, st.refl.lod ?? 0.5, st.refl.wobble ?? 0.004] : [0, 0, 0, 0],
      uRampGold: st.rampGold || [0, 0, 0, 0], uFloorLook: [W === 'lot' ? 1 : 0, 0, 0, 0] });
    for (const it of items) {
      use(P, { uModel: it.model, uNormalMat: it.nm, uObj: it.obj, ...it.mats, uMirror: it.mir ? -1 : 1,
        uLamps: st.lamps, uObjAir: it.air || [1, 1, 1, 1], uAirAlpha: it.aa ?? (st.carAirAlpha ?? 1) });
      draw(gl, it.m);
    }
  }

  _renderScene(st, jx, jy, seed) {
    const gl = this.gl;
    const U = this._frameUniforms(st, jx, jy, seed);
    // shadow map
    if (U.uShadowP[3] > 0) {
      bindTarget(gl, this.T.shadow);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(2.0, 4.0);
      this._drawSurfaces(st, U, true);
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }
    // planar floor reflection (mirrored camera, half res, mip-mapped for roughness)
    if (st.refl && st.refl.on) {
      const zf = this.assets.sceneMeta.floor_z;
      const Rm = m4.ident(); Rm[10] = -1; Rm[14] = 2 * zf;
      const view = m4.mul(U.uView, Rm);
      const vp = m4.mul(U.uProj, view);
      const UR = { ...U, uView: view, uViewProj: vp, uInvViewProj: m4.invert(vp), uCamPos: [U.uCamPos[0], U.uCamPos[1], 2 * zf - U.uCamPos[2]] };
      bindTarget(gl, this.T.refl);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      use(this.P.sky, UR);
      this.fs();
      gl.depthMask(true);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      this._drawSurfaces(st, UR, false, true);
      gl.bindTexture(gl.TEXTURE_2D, this.T.refl.color);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    // scene
    bindTarget(gl, this.T.scene);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    use(this.P.sky, U);
    this.fs();
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    const xray = (st.carAirAlpha ?? 1) < 1;
    this._drawSurfaces(st, U, false, false, xray ? 'world' : 'all');
    // volumetric light (reads depth → separate colour-only framebuffer, half res), then add
    if (st.vol && st.vol.density > 0 && st.spots.some((s) => (s.beam || 0) > 0)) {
      bindTarget(gl, this.T.vol);
      gl.disable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      use(this.P.volume, { ...U, uDepth: this.T.scene.depth,
        uVol: [st.vol.maxDist, st.vol.density, st.vol.scale, Math.min(96, st.vol.steps ?? this.opts.volSteps)],
        uVolWind: st.vol.wind || [0.05, 0.02, 0.01] });
      this.fs();
      bindTarget(gl, this.T.sceneNoDepth);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      use(this.P.copy, { uTex: this.T.vol.color, uGain: st.vol.gain ?? 1 });
      this.fs();
      gl.disable(gl.BLEND);
      bindTarget(gl, this.T.scene);
      gl.enable(gl.DEPTH_TEST);
    }
    // additive transparent passes (depth-tested, no depth write)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    const ps = this.opts.particleScale;
    const strU = (extra) => ({ ...U, uDof: st.dof, uShutter: st.particleShutter ?? 0.02, ...extra });
    if (st.gapVol && st.gapVol.gain > 0) {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      use(this.P.gapvol, { ...U, uGapBox: st.gapBox, uFanA: st.fanA, uFanB: st.fanB, uGapColor: st.gapVol.color, uGapGain: st.gapVol.gain });
      draw(gl, this.meshes.cube);
      gl.disable(gl.CULL_FACE);
    }
    const inst = (prog, count, uniforms, m = this.meshes.empty) => {
      const n = Math.round(count * ps);
      if (n <= 0) return;
      use(prog, uniforms);
      draw(gl, m, n);
    };
    const rushU = () => strU({ uGapBox: st.gapBox, uRush: [st.inrush.level, st.inrush.period, st.inrush.run, 0], uGain: 1 });
    if (xray) {
      // the slit's own air first, then the car as smoked glass over it (x-ray), then everything else
      if (st.gapMotes && st.gapMotes.gain > 0) inst(this.P.gap, st.gapMotes.count, strU({ uGapBox: st.gapBox, uFanA: st.fanA, uFanB: st.fanB, uEvac: st.gapMotes.evac, uLeak: [0, 1, 0, 0], uGain: st.gapMotes.gain }));
      if (st.leak && st.leak.level > 0) inst(this.P.leak, st.leak.count, strU({ uGapBox: st.gapBox, uFanA: st.fanA, uFanB: st.fanB, uLeak: [st.leak.level, st.leak.period, 0, 0], uGain: 1 }));
      if (st.inrush && st.inrush.level > 0) inst(this.P.inrush, st.inrush.count, rushU());
      // v7: no stored-gas vessels and no fan overlay inside the car (audit A02, A12): internals are only ever shown on
      // the separate diagram plates
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(true);
      this._drawSurfaces(st, U, false, false, 'car');
      gl.depthMask(false);
      gl.blendFunc(gl.ONE, gl.ONE);
    }
    if (st.dust && st.dust.gain > 0) inst(this.P.dust, st.dust.count, strU({ uBoxMin: st.dust.min, uBoxSize: st.dust.size, uFall: st.dust.fall, uDustT: st.dustT, uAmbientLit: st.dust.ambient, uGain: st.dust.gain, uShutter: st.dust.shutter ?? 0.03 }));
    if (st.airMotes && st.airMotes.gain > 0) inst(this.P.air, st.airMotes.count, strU({ uBoxMin: st.airMotes.min, uBoxSize: st.airMotes.size, uJitter: st.airMotes.jitter, uFade: st.airMotes.fade ?? 10, uGain: st.airMotes.gain }));
    if (!xray && st.gapMotes && st.gapMotes.gain > 0) inst(this.P.gap, st.gapMotes.count, strU({ uGapBox: st.gapBox, uFanA: st.fanA, uFanB: st.fanB, uEvac: st.gapMotes.evac, uLeak: [0, 1, 0, 0], uGain: st.gapMotes.gain }));
    if (!xray && st.leak && st.leak.level > 0) inst(this.P.leak, st.leak.count, strU({ uGapBox: st.gapBox, uFanA: st.fanA, uFanB: st.fanB, uLeak: [st.leak.level, st.leak.period, 0, 0], uGain: 1 }));
    if (!xray && st.inrush && st.inrush.level > 0) inst(this.P.inrush, st.inrush.count, rushU());
    if (st.jets) {
      const J = st.jets;
      inst(this.P.jet, J.count, strU({ uNozP: J.P, uNozD: J.D, uCarVel: J.vel, uJet: J.jet, uJetLook: J.look, uGain: 1, uShutter: J.shutter ?? 0.03 }));
    }
    if (st.puffs && st.puffs.n > 0) {
      const C = st.puffs;
      inst(this.P.puff, C.n * C.per, strU({ uPuff: C.P, uPuffD: C.D, uPuffN: [C.n, C.per, C.clock, C.size], uPuffLook: C.look,
        uGain: C.gain, uSoft: 1, uDof: [st.dof[0], st.dof[1], 1.0, 700] }));
    }
    if (st.path && st.path.drawn > st.path.drained) {
      const Pp = st.path;
      inst(this.P.path, Pp.count, strU({ uPathP: Pp.P, uPath: [Pp.drawn, Pp.drained, Pp.radius, Pp.flow], uGain: Pp.gain }));
    }
    if (st.cables && st.cables.gain > 0) {
      use(this.P.cable, strU({ uGain: st.cables.gain }));
      draw(gl, this.meshes.cables, this.cableSegments);
    }
    if (st.shards && st.shards.level > 0) {
      const Sh = st.shards;
      inst(this.P.shards, Sh.count, strU({ uShardA: Sh.a, uShardB: Sh.b, uShard: [Sh.t0, Sh.dur, Sh.speed, Sh.level], uGain: 1 }));
    }
    if (st.wake && st.wake.level > 0) inst(this.P.wake, st.wake.count, strU({ uWake: [st.wake.level, st.wake.period, st.wake.speed, st.wake.spread], uGain: 1 }));
    if (st.press.glints > 0) {
      use(this.P.glint, strU({ uRate: st.glintRate ?? 9, uGain: st.glintGain ?? 1, uInbound: st.glintIn ?? 0 }));
      draw(gl, this.meshes.glints, Math.round(this.glintCount));
    }
    if (st.conv && st.conv.level > 0) {
      use(this.P.conv, strU({ uConv: [st.conv.launch, st.conv.dur, st.conv.level, st.conv.loop || 0], uAxis: [st.conv.entryZ, 0, 0, st.conv.headZ], uGain: 1 }));
      draw(gl, this.meshes.glints, Math.round(this.glintCount));
    }
    if (st.shell > 0 && st.air.radius > 0) {
      use(this.P.shell, { ...U, uShellGain: st.shell });
      draw(gl, this.meshes.sphere);
    }
    // force beams: x-ray (no depth test)
    if (st.beams && st.beams.length) {
      gl.disable(gl.DEPTH_TEST);
      for (const b of st.beams) {
        if (!(b.progress > 0) || !(b.alpha > 0)) continue;
        const L = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]);
        use(this.P.ribbon, { ...U, uA: b.a, uB: b.b, uWidth: b.width, uColor: b.color, uShape: [b.shaft, b.head, b.progress, b.flow], uLenM: L, uAlpha: b.alpha });
        draw(gl, this.meshes.empty);
      }
      gl.enable(gl.DEPTH_TEST);
    }
    // curved arrows (a twist about the centre of mass): x-ray like the beams
    if (st.arcs && st.arcs.length) {
      gl.disable(gl.DEPTH_TEST);
      for (const a of st.arcs) {
        if (!(a.progress > 0) || !(a.alpha > 0)) continue;
        use(this.P.arc, { ...U, uArcC: a.c, uArcU: a.u, uArcV: a.v, uArc: [a.r, a.a0, a.a1, a.width], uColor: a.color,
          uShape: [a.shaft, a.head, a.progress, a.flow], uLenM: a.r * Math.abs(a.a1 - a.a0), uAlpha: a.alpha });
        draw(gl, this.meshes.arc);
      }
      gl.enable(gl.DEPTH_TEST);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  _post(st, frame) {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const P = this.P, B = this.T.bloom;
    const po = st.post;
    // bloom
    bindTarget(gl, B[0]);
    use(P.prefilter, { uTex: this.T.accum.color, uTexel: [1 / this.W, 1 / this.H], uThresh: [po.threshold ?? 1.0, po.knee ?? 0.6, 60, 0] });
    this.fs();
    for (let i = 1; i < B.length; i++) {
      bindTarget(gl, B[i]);
      use(P.down, { uTex: B[i - 1].color, uTexel: [1 / B[i - 1].w, 1 / B[i - 1].h] });
      this.fs();
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = B.length - 1; i > 0; i--) {
      bindTarget(gl, B[i - 1]);
      use(P.up, { uTex: B[i].color, uTexel: [1 / B[i].w, 1 / B[i].h], uRadius: 1.0 });
      this.fs();
    }
    gl.disable(gl.BLEND);
    // anamorphic streak: squash the prefiltered brights vertically, blur horizontally with growing steps
    bindTarget(gl, this.T.streakA);
    use(P.copy, { uTex: B[1].color, uGain: 1 });
    this.fs();
    let a = this.T.streakA, b = this.T.streakB;
    for (const step of [1, 3, 9, 27]) {
      bindTarget(gl, b);
      use(P.streak, { uTex: a.color, uTexel: [1 / a.w, 1 / a.h], uStep: step });
      this.fs();
      [a, b] = [b, a];
    }
    // text
    const canvas = this.text.draw(st, frame);
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    // composite to the canvas
    bindTarget(gl, null);
    use(P.composite, {
      uScene: this.T.accum.color, uBloom: B[0].color, uStreak: a.color, uText: this.textTex, uRes: [this.W, this.H], uSeed: frame % 251,
      uPost1: [po.exposure, po.bloom, po.streak, po.vignette], uPost2: [po.ca, po.grain, po.sat, po.contrast],
      uLift: po.lift, uGamma: po.gamma, uGain: po.gain, uFlash: po.flash, uStreakTint: po.streakTint || [0.55, 0.75, 1.0],
      uTextFx: st.textFx ?? 0,
    });
    this.fs();
  }
}
