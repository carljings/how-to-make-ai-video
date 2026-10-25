// dsp.mjs — a small deterministic audio toolkit (no dependencies): stereo float buses, oscillators, RBJ biquads,
// Freeverb, saturation, WAV I/O. Everything is a pure function of its arguments and a seeded PRNG.
import fs from 'node:fs';

export const SR = 48000;
export const TAU = Math.PI * 2;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Bus {
  constructor(seconds) {
    this.n = Math.ceil(seconds * SR);
    this.L = new Float32Array(this.n);
    this.R = new Float32Array(this.n);
  }
  add(i, l, r) { if (i >= 0 && i < this.n) { this.L[i] += l; this.R[i] += r; } }
  mix(other, gain = 1, gainEnv = null) {
    for (let i = 0; i < this.n && i < other.n; i++) {
      const g = gainEnv ? gain * gainEnv[i] : gain;
      this.L[i] += other.L[i] * g;
      this.R[i] += other.R[i] * g;
    }
  }
}

export const panLR = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];   // -1 left .. +1 right
export const db = (x) => Math.pow(10, x / 20);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

// envelopes (t in seconds since note start)
export const envAD = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));
export const envASR = (t, a, s, r) => (t < 0 ? 0 : t < a ? t / a : t < a + s ? 1 : Math.max(0, 1 - (t - a - s) / r));
export const bell = (t, dur) => (t < 0 || t > dur ? 0 : Math.sin(Math.PI * t / dur) ** 2);

// polyBLEP saw
export function sawBlep(phase, dphase) {
  let v = 2 * phase - 1;
  const t = phase, dt = dphase;
  if (t < dt) { const x = t / dt; v -= x + x - x * x - 1; }
  else if (t > 1 - dt) { const x = (t - 1) / dt; v -= x * x + x + x + 1; }
  return v;
}

// RBJ biquad with on-the-fly coefficient updates
export class Biquad {
  constructor(type = 'lp', f = 1000, q = 0.707) { this.type = type; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(f, q); }
  set(f, q = this.q) {
    this.f = f; this.q = q;
    const w = TAU * clamp(f, 10, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
    let b0, b1, b2;
    if (this.type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (this.type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; }   // bp (constant 0 dB peak)
    const a0 = 1 + a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = -2 * c / a0; this.a2 = (1 - a) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

// Freeverb (stereo), processes a send bus into a wet bus
export function freeverb(send, { room = 0.84, damp = 0.3, wet = 1, width = 1, predelay = 0.0 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * SR / 44100));
  const alls = [556, 441, 341, 225].map((x) => Math.round(x * SR / 44100));
  const out = new Bus(send.n / SR);
  const pd = Math.round(predelay * SR);
  for (const [chan, src, dst, spread] of [[0, send.L, out.L, 0], [1, send.R, out.R, 23]]) {
    const cb = combs.map((n) => ({ buf: new Float32Array(n + spread), i: 0, f: 0 }));
    const ab = alls.map((n) => ({ buf: new Float32Array(n + spread), i: 0 }));
    for (let k = 0; k < send.n; k++) {
      const x = (k - pd >= 0 ? src[k - pd] : 0) * 0.015;
      let y = 0;
      for (const c of cb) {
        const o = c.buf[c.i];
        c.f = o * (1 - damp) + c.f * damp;
        c.buf[c.i] = x + c.f * room;
        c.i = (c.i + 1) % c.buf.length;
        y += o;
      }
      for (const a of ab) {
        const o = a.buf[a.i];
        a.buf[a.i] = y + o * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        y = o - y;
      }
      dst[k] = y * wet;
    }
  }
  if (width < 1) for (let k = 0; k < out.n; k++) { const m = (out.L[k] + out.R[k]) / 2; out.L[k] = m + (out.L[k] - m) * width; out.R[k] = m + (out.R[k] - m) * width; }
  return out;
}

export function softclip(bus, drive = 1) {
  for (let i = 0; i < bus.n; i++) { bus.L[i] = Math.tanh(bus.L[i] * drive) / drive; bus.R[i] = Math.tanh(bus.R[i] * drive) / drive; }
}

export function writeWav(path, bus, bits = 24) {
  const n = bus.n, ch = 2, bps = bits / 8;
  const buf = Buffer.alloc(44 + n * ch * bps);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * ch * bps, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * ch * bps, 28); buf.writeUInt16LE(ch * bps, 32); buf.writeUInt16LE(bits, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * ch * bps, 40);
  let o = 44;
  const max = bits === 24 ? 8388607 : 32767;
  for (let i = 0; i < n; i++) for (const c of [bus.L, bus.R]) {
    const v = Math.round(clamp(c[i], -1, 1) * max);
    if (bits === 24) { buf.writeIntLE(v, o, 3); o += 3; } else { buf.writeInt16LE(v, o); o += 2; }
  }
  fs.writeFileSync(path, buf);
}

// minimal WAV reader (PCM 16/24/32f, mono/stereo) → mono Float32Array at the file's rate
export function readWavMono(path) {
  const b = fs.readFileSync(path);
  let p = 12, fmt = null, data = null;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { format: b.readUInt16LE(p + 8), ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') data = { off: p + 8, size: sz };
    p += 8 + sz + (sz & 1);
  }
  if (!fmt || !data) throw new Error('bad wav ' + path);
  const bps = fmt.bits / 8, frames = Math.floor(data.size / (bps * fmt.ch));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < fmt.ch; c++) {
      const o = data.off + (i * fmt.ch + c) * bps;
      let v;
      if (fmt.format === 3) v = b.readFloatLE(o);
      else if (fmt.bits === 16) v = b.readInt16LE(o) / 32768;
      else if (fmt.bits === 24) v = b.readIntLE(o, 3) / 8388608;
      else v = b.readInt32LE(o) / 2147483648;
      s += v;
    }
    out[i] = s / fmt.ch;
  }
  return { sr: fmt.sr, data: out };
}

// ------------------------------------------------------------------------------------------------ mastering
// ITU-R BS.1770 integrated loudness (K-weighting at 48 kHz, 400 ms blocks / 75 % overlap, -70 LUFS absolute and
// -10 LU relative gates) of a stereo pair.
export function lufs(L, R) {
  const kw = (x) => {
    const y = new Float64Array(x.length);
    const st = [[1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
      [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621]];
    let src = x;
    for (const [b0, b1, b2, a1, a2] of st) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < src.length; i++) {
        const v = b0 * src[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = src[i]; y2 = y1; y1 = v; y[i] = v;
      }
      src = Float64Array.from(y);
    }
    return src;
  };
  const a = kw(L), b = kw(R);
  const blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR);
  const z = [];
  for (let s = 0; s + blk <= a.length; s += hop) {
    let e = 0;
    for (let i = s; i < s + blk; i++) e += a[i] * a[i] + b[i] * b[i];
    z.push(e / blk);
  }
  const loud = (e) => -0.691 + 10 * Math.log10(e + 1e-20);
  const abs = z.filter((e) => loud(e) > -70);
  if (!abs.length) return -Infinity;
  const rel = loud(abs.reduce((p, e) => p + e, 0) / abs.length) - 10;
  const g = abs.filter((e) => loud(e) > rel);
  return loud(g.reduce((p, e) => p + e, 0) / g.length);
}

// 4x-oversampled peak estimate per sample (windowed-sinc interpolation between i and i+1), max over channels
export function truePeakTrack(chans) {
  const M = 8, taps = [];
  for (const f of [0.25, 0.5, 0.75]) {
    const h = [];
    for (let m = -M + 1; m <= M; m++) {
      const u = f - m;
      const s = Math.abs(u) < 1e-9 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u);
      h.push(s * (0.42 + 0.5 * Math.cos(Math.PI * u / M) + 0.08 * Math.cos(2 * Math.PI * u / M)));
    }
    const sum = h.reduce((p, v) => p + v, 0);
    taps.push(h.map((v) => v / sum));
  }
  const n = chans[0].length, tp = new Float32Array(n);
  for (const x of chans) {
    for (let i = 0; i < n; i++) {
      let pk = Math.abs(x[i]);
      for (const h of taps) {
        let v = 0;
        for (let k = 0; k < h.length; k++) { const j = i - M + 1 + k; if (j >= 0 && j < n) v += x[j] * h[k]; }
        if (Math.abs(v) > pk) pk = Math.abs(v);
      }
      if (pk > tp[i]) tp[i] = pk;
    }
  }
  return tp;
}

// offline look-ahead limiter: gain never lets the (oversampled) peak exceed `ceiling` (linear). Sliding minimum over
// the look-ahead window, then a box average of the same length (reaches the minimum exactly at the peak), then a
// one-pole release. Returns the gain-reduction track for reporting.
export function limit(bus, ceiling, { lookahead = 0.0015, release = 0.09 } = {}) {
  const n = bus.n, W = Math.max(1, Math.round(lookahead * SR));
  const tp = truePeakTrack([bus.L, bus.R]);
  const req = new Float32Array(n);
  for (let i = 0; i < n; i++) req[i] = tp[i] > ceiling ? ceiling / tp[i] : 1;
  const mn = new Float32Array(n);
  const dq = [];
  for (let i = n - 1; i >= 0; i--) {             // min over [i, i+W]
    while (dq.length && req[dq[dq.length - 1]] >= req[i]) dq.pop();
    dq.push(i);
    while (dq[0] > i + W) dq.shift();
    mn[i] = req[dq[0]];
  }
  const g = new Float32Array(n);
  let acc = 0;
  const rel = 1 - Math.exp(-1 / (release * SR));
  let prev = 1;
  for (let i = 0; i < n; i++) {                  // average over [i-W, i]
    acc += mn[i];
    if (i - W - 1 >= 0) acc -= mn[i - W - 1];
    const target = acc / Math.min(i + 1, W + 1);
    prev = target < prev ? target : prev + (target - prev) * rel;
    g[i] = prev;
    bus.L[i] *= prev; bus.R[i] *= prev;
  }
  return g;
}

// feed-forward soft-knee compressor on a mono track (dB domain, smoothed gain)
export function compress(x, { thresh = -18, ratio = 2.5, knee = 8, attack = 0.003, release = 0.12 } = {}) {
  const aA = Math.exp(-1 / (attack * SR)), aR = Math.exp(-1 / (release * SR));
  let gr = 0;
  for (let i = 0; i < x.length; i++) {
    const lv = 20 * Math.log10(Math.abs(x[i]) + 1e-9), over = lv - thresh;
    let want = 0;
    if (2 * over > knee) want = (1 / ratio - 1) * over;
    else if (2 * over > -knee) want = (1 / ratio - 1) * (over + knee / 2) ** 2 / (2 * knee);
    gr = want < gr ? aA * gr + (1 - aA) * want : aR * gr + (1 - aR) * want;
    x[i] *= Math.pow(10, gr / 20);
  }
  return x;
}
