import { SEG, build } from '../src/track.js';
const idx = (n) => SEG.findIndex((s) => s[0] === n);
// free: [segName, field, lo, hi]
const F = [['groove1a',3,20,90],['groove1b',3,20,90],['groove1c',3,10,80],['groove1d',3,-20,40],['pull1',3,-20,40],['straight',2,36,62],['land',3,30,110],['land',2,26,46],['return',2,16,40],['fogA',3,-45,-20],['fogB',3,20,45],['pull2',3,-30,30]];
let x = F.map(([n,f]) => SEG[idx(n)][f]);
const apply = (x) => { const S = SEG.map((s) => s.slice()); F.forEach(([n,f],i) => { S[idx(n)][f] = x[i]; }); return S; };
const cost = (x) => { const S = apply(x); const B = build(S); const e = B.err; let c = e[0]**2 + e[2]**2 + 0.2*e[1]**2;
  let miny = 1e9; for (const q of B.S) miny = Math.min(miny, q.p[1]); if (miny < 3) c += 200*(3-miny)**2; return c; };
let best = cost(x), step = F.map(([, , lo, hi]) => (hi - lo) / 4);
for (let it = 0; it < 60; it++) { let imp = false;
  for (let i = 0; i < F.length; i++) for (const d of [1, -1]) { const y = x.slice(); y[i] = Math.min(F[i][3], Math.max(F[i][2], y[i] + d * step[i])); const c = cost(y); if (c < best) { best = c; x = y; imp = true; } }
  if (!imp) step = step.map((v) => v / 2); }
console.log('cost', best.toFixed(3)); F.forEach(([n,f],i) => console.log(n, f, x[i].toFixed(2)));
const B = build(apply(x)); console.log('err', B.err.map((v) => v.toFixed(2)));
