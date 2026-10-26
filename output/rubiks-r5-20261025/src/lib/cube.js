// cube.js — a physical 3×3×3 model: 26 cubies, each with an integer position and an integer rotation matrix.
// Moves rotate the cubies of a slab about an axis. Coordinates: x → R, y → U, z → F. Colour scheme as the demo
// solves are written (white cross on the bottom): U yellow, D white, F green, B blue, R orange, L red.

export const FACE_DIR = { R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1] };
export const FACES = ['U', 'D', 'F', 'B', 'R', 'L'];
export const COLOR = { U: '#ffd21a', D: '#f2f1ec', F: '#00a65a', B: '#1d63f2', R: '#ff7400', L: '#e3202d' };

// axis 0/1/2 = x/y/z; dir = sign of the rotation angle (right hand rule) for the un-primed move
const MOVES = {
  R: [0, [1], -1], L: [0, [-1], 1], M: [0, [0], 1],
  U: [1, [1], -1], D: [1, [-1], 1], E: [1, [0], 1],
  F: [2, [1], -1], B: [2, [-1], 1], S: [2, [0], -1],
  r: [0, [0, 1], -1], l: [0, [-1, 0], 1], u: [1, [0, 1], -1], d: [1, [-1, 0], 1], f: [2, [0, 1], -1], b: [2, [-1, 0], 1],
  x: [0, [-1, 0, 1], -1], y: [1, [-1, 0, 1], -1], z: [2, [-1, 0, 1], -1],
};

export function parseMove(s) {
  const m = /^([RLUDFBMESrludfbxyz])(w?)(2|'|2'|)$/.exec(s.trim());
  if (!m) throw new Error('bad move ' + s);
  let fam = m[1];
  if (m[2]) fam = fam.toLowerCase();
  const [axis, layers, dir] = MOVES[fam];
  const q = m[3] === '' ? 1 : m[3] === "'" ? -1 : 2;
  return { name: s.trim(), axis, layers, quarters: q, angle: dir * q * (Math.PI / 2) };
}
export const parseAlg = (s) => (Array.isArray(s) ? s : s.split(/\s+/)).filter(Boolean).map(parseMove);
export const invertAlg = (moves) => moves.slice().reverse().map((m) => parseMove(m.quarters === 2 ? m.name : m.name.endsWith("'") ? m.name.slice(0, -1) : m.name + "'"));

// integer rotation matrix (row-major 3×3) for a multiple of 90°
export function rotMat(axis, angle) {
  const c = Math.round(Math.cos(angle)), s = Math.round(Math.sin(angle));
  if (axis === 0) return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 1) return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
// float rotation matrix
export function rotF(axis, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  if (axis === 0) return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 1) return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
export const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8]];
export const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
export const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const isId = (m) => m.every((v, i) => v === ID[i]);

// position name ↔ home coordinates, e.g. 'DF' → [0,-1,1]; 'UFR' → [1,1,1]
export function posOf(name) {
  const p = [0, 0, 0];
  for (const ch of name) { const d = FACE_DIR[ch]; p[0] += d[0]; p[1] += d[1]; p[2] += d[2]; }
  return p;
}
export function nameOf(p) {
  let s = '';
  for (const f of ['U', 'D', 'F', 'B', 'R', 'L']) { const d = FACE_DIR[f]; if (d[0] && d[0] === p[0] || d[1] && d[1] === p[1] || d[2] && d[2] === p[2]) s += f; }
  return s;
}
// cubing.js indices used by example.json focus lists
export const EDGE_POS = ['UF', 'UR', 'UB', 'UL', 'DF', 'DR', 'DB', 'DL', 'FR', 'FL', 'BR', 'BL'];
export const CORNER_POS = ['UFR', 'URB', 'UBL', 'ULF', 'DRF', 'DFL', 'DLB', 'DBR'];

export function solved() {
  const cubies = [];
  let id = 0;
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const n = Math.abs(x) + Math.abs(y) + Math.abs(z);
    if (n === 0) continue;
    const stickers = [];
    for (const f of FACES) { const d = FACE_DIR[f]; if ((d[0] && d[0] === x) || (d[1] && d[1] === y) || (d[2] && d[2] === z)) stickers.push({ dir: d, face: f }); }
    cubies.push({ id: id++, home: [x, y, z], pos: [x, y, z], rot: ID, type: n === 3 ? 'corner' : n === 2 ? 'edge' : 'center', name: nameOf([x, y, z]), stickers });
  }
  return cubies;
}

export function apply(state, move) {
  const R = rotMat(move.axis, move.angle);
  return state.map((c) => (move.layers.includes(c.pos[move.axis])
    ? { ...c, pos: mv(R, c.pos).map(Math.round), rot: mul(R, c.rot) }
    : c));
}
export const applyAlg = (state, alg) => parseAlg(alg).reduce(apply, state);

// colour seen on the sticker of cubie c whose current outward normal is dir (or null)
export function stickerFacing(c, dir) {
  for (const s of c.stickers) { const n = mv(c.rot, s.dir); if (n[0] === dir[0] && n[1] === dir[1] && n[2] === dir[2]) return s.face; }
  return null;
}
// all faces uniform (solved up to a whole-cube rotation)
export function isSolved(state) {
  for (const f of FACES) {
    const d = FACE_DIR[f], ax = d[0] ? 0 : d[1] ? 1 : 2;
    const seen = new Set();
    for (const c of state) if (c.pos[ax] === d[ax]) seen.add(stickerFacing(c, d));
    if (seen.size !== 1) return false;
  }
  return true;
}
export const byHome = (state, name) => { const p = posOf(name); return state.find((c) => c.home[0] === p[0] && c.home[1] === p[1] && c.home[2] === p[2]); };
// a centre spinning in place is still home (its colour does not change); corners and edges must also be unrotated
export const atHome = (c) => c.pos[0] === c.home[0] && c.pos[1] === c.home[1] && c.pos[2] === c.home[2] && (c.type === 'center' || isId(c.rot));
export const allHome = (state, names) => names.every((n) => atHome(byHome(state, n)));
export const isIdentity = (state) => state.every(atHome);

// ── timed sequences ──────────────────────────────────────────────────────────────────────────────────
// moves: parsed moves; times: [[t0,t1],...] (seconds, absolute). Snapshots precomputed, so at(t) is O(log n).
export function sequence(start, alg, times, ease = (k) => k) {
  const moves = parseAlg(alg);
  if (times.length !== moves.length) throw new Error('times/moves mismatch');
  const snaps = [start];
  for (const m of moves) snaps.push(apply(snaps[snaps.length - 1], m));
  return {
    moves, times, snaps, end: snaps[snaps.length - 1],
    at(t) {
      let lo = 0, hi = moves.length; // number of moves fully done
      while (lo < hi) { const mid = (lo + hi) >> 1; if (times[mid][1] <= t) lo = mid + 1; else hi = mid; }
      const i = lo;
      if (i < moves.length && t > times[i][0]) {
        const k = ease((t - times[i][0]) / (times[i][1] - times[i][0]));
        return { state: snaps[i], turn: { move: moves[i], k }, done: i };
      }
      return { state: snaps[i], turn: null, done: i };
    },
  };
}
// evenly paced timing for n moves from t0 with per-move duration d and gap g
export function paced(n, t0, d, g = 0) { const out = []; for (let i = 0; i < n; i++) out.push([t0 + i * (d + g), t0 + i * (d + g) + d]); return out; }
// timing from per-move durations and gaps lists
export function timed(t0, list) { const out = []; let t = t0; for (const [d, g] of list) { out.push([t, t + d]); t += d + g; } return out; }

export const cubieOrient = (c) => c.rot;
