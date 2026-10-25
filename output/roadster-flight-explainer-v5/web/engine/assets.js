// assets.js — load the frozen v4-fit geometry/poses exported by geometry/export_v5.py, plus narration timing.
import { m4, orthoCar, clamp } from './math.js';

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return r.json();
}

async function getBin(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return r.arrayBuffer();
}

function unpack(meta, buf) {
  const out = {};
  for (const [name, e] of Object.entries(meta.parts)) {
    out[name] = {
      pos: new Float32Array(buf, e.pos, e.vertices * 3),
      nor: new Float32Array(buf, e.nor, e.vertices * 3),
      mat: new Uint8Array(buf, e.mat, e.vertices),
      ext: e.ext_components ? new Float32Array(buf, e.ext, e.vertices * e.ext_components) : null,
      extN: e.ext_components,
      idx: new Uint32Array(buf, e.idx, e.indices),
      vertices: e.vertices,
    };
  }
  return out;
}

export async function loadAssets(base) {
  const [carMeta, carBin, sceneMeta, sceneBin, poses, lotMeta, lotBin, kickflip] = await Promise.all([
    getJSON(base + 'car.json'), getBin(base + 'car.bin'), getJSON(base + 'scene.json'), getBin(base + 'scene.bin'),
    getJSON(base + 'poses.json'), getJSON(base + 'lot.json'), getBin(base + 'lot.bin'), getJSON(base + 'kickflip.json'),
  ]);
  return { carMeta, car: unpack(carMeta, carBin), sceneMeta, scene: unpack(sceneMeta, sceneBin), poses,
    lotMeta, lot: unpack(lotMeta, lotBin), kickflip };
}

export async function loadTiming(urls) {
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (r.ok) { const j = await r.json(); j._source = u; return j; }
    } catch (e) { /* try next */ }
  }
  throw new Error('no narration timing found');
}

// ------------------------------------------------------------------------------------------------ pose sampling
export class Poses {
  constructor(p, carMeta) {
    this.p = p;
    this.meta = carMeta;
  }
  _idx(ev) {
    const f = (ev - this.p.ev0) / this.p.dt;
    const i = Math.max(0, Math.min(this.p.count - 2, Math.floor(f)));
    return [i, clamp(f - i, 0, 1)];
  }
  // car-local → world 3x4 (column-major X,Y,Z,O) at source time ev
  car3x4(ev) {
    const [i, u] = this._idx(ev);
    const a = this.p.matrices[i], b = this.p.matrices[i + 1];
    const c = a.map((x, k) => x + (b[k] - x) * u);
    return orthoCar(c);
  }
  carMatrix(ev) { return m4.from3x4(this.car3x4(ev)); }
  wheelAngle(ev) {
    const [i, u] = this._idx(ev);
    return this.p.wheel_angle[i] + (this.p.wheel_angle[i + 1] - this.p.wheel_angle[i]) * u;
  }
  jets(ev) {
    const [i, u] = this._idx(ev);
    const a = this.p.jets[i], b = this.p.jets[i + 1];
    const o = {};
    this.p.jet_names.forEach((n, k) => { o[n] = a[k] + (b[k] - a[k]) * u; });
    return o;
  }
  onRamp(ev) { const [i] = this._idx(ev); return !!this.p.on_ramp[i]; }
  sRear(ev) {
    const [i, u] = this._idx(ev);
    return this.p.s_rear[i] + (this.p.s_rear[i + 1] - this.p.s_rear[i]) * u;
  }
  // wheel model matrices (car-local → world) for the 4 wheels
  wheelMatrices(carM, ev) { return this.wheelMatricesAt(carM, this.wheelAngle(ev)); }
  wheelMatricesAt(carM, ang) {
    return this.meta.wheel_placements.map((w) => {
      const T = m4.translate(w.centre);
      // wheel space: axle along +Y, outer face toward +Y; right wheels mirror across Y
      const S = w.side < 0 ? m4.scale([1, -1, 1]) : m4.ident();
      // rolling forward (car +X) turns the wheel about +Y by -angle... sign: point at the bottom moves backward
      const Rw = m4.rotY(ang);
      return { model: m4.mul(carM, m4.mul(T, m4.mul(S, Rw))), mirrored: w.side < 0, staticModel: m4.mul(carM, m4.mul(T, S)), rear: w.name[0] === 'R' };
    });
  }
}

// ------------------------------------------------------------------------------------------------ ramp profile
export class Ramp {
  constructor(sceneMeta) {
    this.m = sceneMeta.ramp;
    this.prof = this.m.profile;   // [s, x, z, phi]
  }
  frame(s) {
    const P = this.prof;
    const s0 = P[0][0], s1 = P[P.length - 1][0];
    const f = ((Math.max(s0, Math.min(s1, s)) - s0) / (s1 - s0)) * (P.length - 1);
    const i = Math.min(P.length - 2, Math.floor(f));
    const u = f - i;
    const a = P[i], b = P[i + 1];
    const x = a[1] + (b[1] - a[1]) * u, z = a[2] + (b[2] - a[2]) * u, phi = a[3] + (b[3] - a[3]) * u;
    return { p: [x, 0, z], t: [Math.cos(phi), 0, Math.sin(phi)], n: [-Math.sin(phi), 0, Math.cos(phi)], phi };
  }
}

// ------------------------------------------------------------------------------------------------ kickflip flight
// v4 motion.wide_pose sampled at 240 Hz of the kickflip source clock (geometry/export_kickflip.py).
export class FlightPoses {
  constructor(k) { this.k = k; }
  _idx(t) {
    const f = (t - this.k.t0) * this.k.hz;
    const i = Math.max(0, Math.min(this.k.count - 2, Math.floor(f)));
    return [i, clamp(f - i, 0, 1)];
  }
  car3x4(t) {
    const [i, u] = this._idx(t);
    const a = this.k.matrices[i], b = this.k.matrices[i + 1];
    return orthoCar(a.map((x, j) => x + (b[j] - x) * u));
  }
  carMatrix(t) { return m4.from3x4(this.car3x4(t)); }
  plumes(t) {
    const [i, u] = this._idx(t);
    const a = this.k.plumes[i], b = this.k.plumes[i + 1];
    const o = {};
    this.k.plume_names.forEach((n, j) => { o[n] = a[j] + (b[j] - a[j]) * u; });
    return o;
  }
  roll(t) { const [i, u] = this._idx(t); return this.k.roll_left_deg[i] + (this.k.roll_left_deg[i + 1] - this.k.roll_left_deg[i]) * u; }
  centre(t) { const [i, u] = this._idx(t); const a = this.k.centre[i], b = this.k.centre[i + 1]; return a.map((x, j) => x + (b[j] - x) * u); }
  // the source's cloud: v4 motion.cloud_state(t), in world space
  puffs(t) {
    const out = [];
    for (const p of this.k.cloud_puffs) {
      if (t < p.born) continue;
      const r = Math.min(p.rmax, p.r0 + p.grow * (t - p.born));
      out.push({ c: [p.x, p.y, Math.max(p.zc, 0.45 * r)], r, flatten: p.flatten, density: p.density * Math.min(1, 0.4 + (t - p.born)) });
    }
    return out;
  }
}
