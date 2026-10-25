// math.js — small deterministic vector/matrix helpers (column-major mat4 as Float32Array(16)). World is Z-up.

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const smoother = (x) => { const t = clamp(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const ramp = (x, a, b) => (b > a ? smooth((x - a) / (b - a)) : x >= a ? 1 : 0);
export const lin = (x, a, b) => (b > a ? clamp((x - a) / (b - a)) : x >= a ? 1 : 0);
export const win = (x, a, b, c, d) => Math.min(ramp(x, a, b), 1 - ramp(x, c, d));
export const easeOut = (x, p = 3) => 1 - Math.pow(1 - clamp(x), p);
export const easeIn = (x, p = 3) => Math.pow(clamp(x), p);
export const easeInOut = (x, p = 3) => { const t = clamp(x); return t < 0.5 ? 0.5 * Math.pow(2 * t, p) : 1 - 0.5 * Math.pow(2 - 2 * t, p); };
export const deg = Math.PI / 180;

export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a); return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1]; };
export const lerp3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
export const madd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

// Catmull-Rom through keys [[t, value(s)...]] with clamped ends; values may be numbers or arrays.
export function keyed(keys, t, ease = null) {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  let u = (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
  if (ease) u = ease(u);
  const p0 = keys[Math.max(0, i - 1)][1], p1 = keys[i][1], p2 = keys[i + 1][1], p3 = keys[Math.min(n - 1, i + 2)][1];
  const cr = (a, b, c, d) => {
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  };
  if (Array.isArray(p1)) return p1.map((_, k) => cr(p0[k], p1[k], p2[k], p3[k]));
  return cr(p0, p1, p2, p3);
}

// Monotone piecewise-linear-with-smoothstep keys (no overshoot): [[t, v], ...]
export function keyedSmooth(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const u = smooth((t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
  const a = keys[i][1], b = keys[i + 1][1];
  return Array.isArray(a) ? a.map((x, k) => mix(x, b[k], u)) : mix(a, b, u);
}

// deterministic hash in [0,1)
export function hash1(i, k = 0) {
  const x = Math.sin(i * 12.9898 + k * 78.233 + 0.4321) * 43758.5453;
  return x - Math.floor(x);
}

// seeded PRNG (mulberry32)
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

// ---------------------------------------------------------------------------------------------- mat4 (column-major)
export const m4 = {
  ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  },
  perspective(fovyRad, aspect, near, far, jx = 0, jy = 0) {
    const f = 1 / Math.tan(fovyRad / 2), nf = 1 / (near - far);
    const m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf;
    m[8] = jx; m[9] = jy;   // sub-pixel jitter in NDC
    return m;
  },
  // view matrix from eye/target/up (right-handed, camera looks down -Z)
  lookAt(eye, target, up) {
    const zf = norm(sub(eye, target));
    let xr = cross(up, zf);
    if (len(xr) < 1e-6) xr = cross([0, 1, 0], zf);
    xr = norm(xr);
    const yu = cross(zf, xr);
    const m = new Float32Array(16);
    m[0] = xr[0]; m[4] = xr[1]; m[8] = xr[2];
    m[1] = yu[0]; m[5] = yu[1]; m[9] = yu[2];
    m[2] = zf[0]; m[6] = zf[1]; m[10] = zf[2];
    m[12] = -dot(xr, eye); m[13] = -dot(yu, eye); m[14] = -dot(zf, eye); m[15] = 1;
    return m;
  },
  invert(a) {
    const o = new Float32Array(16);
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = a;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return m4.ident();
    det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  },
  // from car 3x4 column-major [X(3), Y(3), Z(3), O(3)]
  from3x4(c) {
    const m = new Float32Array(16);
    m[0] = c[0]; m[1] = c[1]; m[2] = c[2];
    m[4] = c[3]; m[5] = c[4]; m[6] = c[5];
    m[8] = c[6]; m[9] = c[7]; m[10] = c[8];
    m[12] = c[9]; m[13] = c[10]; m[14] = c[11]; m[15] = 1;
    return m;
  },
  translate(t) { const m = m4.ident(); m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; return m; },
  scale(s) { const m = m4.ident(); m[0] = s[0]; m[5] = s[1]; m[10] = s[2]; return m; },
  rotY(a) { const m = m4.ident(); const c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  rotX(a) { const m = m4.ident(); const c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  rotZ(a) { const m = m4.ident(); const c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  xfPoint(m, p) {
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
      m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  },
  xfDir(m, d) {
    return [m[0] * d[0] + m[4] * d[1] + m[8] * d[2], m[1] * d[0] + m[5] * d[1] + m[9] * d[2], m[2] * d[0] + m[6] * d[1] + m[10] * d[2]];
  },
  normalMat3(m) {   // inverse-transpose upper 3x3 (rigid transforms: same as the 3x3)
    const inv = m4.invert(m);
    return new Float32Array([inv[0], inv[4], inv[8], inv[1], inv[5], inv[9], inv[2], inv[6], inv[10]]);
  },
  project(vp, p) {
    const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12];
    const y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13];
    const w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
    return [x / w, y / w, w];
  },
};

// orthonormalise a 3x4 car matrix (columns X, Y, Z) after linear interpolation
export function orthoCar(c) {
  let X = norm([c[0], c[1], c[2]]);
  let Z = [c[6], c[7], c[8]];
  Z = norm(sub(Z, scale(X, dot(Z, X))));
  const Y = cross(Z, X);
  return [X[0], X[1], X[2], Y[0], Y[1], Y[2], Z[0], Z[1], Z[2], c[9], c[10], c[11]];
}

export function halton(i, b) {
  let f = 1, r = 0;
  while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); }
  return r;
}
