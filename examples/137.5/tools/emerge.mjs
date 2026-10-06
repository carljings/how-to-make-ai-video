// tools/emerge.mjs: precompute the bud-placement simulation for Act V → assets/emerge.json
// Model after Douady & Couder (1992, 1996): buds are born on the rim of the growing tip, drift outward as the tip grows,
// and each new bud appears where the repulsion from the existing ones is weakest. No angle is given to it.
import { writeFileSync, mkdirSync } from 'node:fs';
const n = 90, g0 = 0.9, g1 = 0.08, s = 3, SAMPLES = 7200;
const P = [], G = [], L = [0]; // L[k] = cumulative log-growth up to step k
for (let k = 0; k < n; k++) {
  G.push(g0 * Math.pow(g1 / g0, k / (n - 1)));
  if (k > 0) L.push(L[k - 1] + G[k - 1]);
  let best = 0, bestE = Infinity;
  if (k > 0) for (let i = 0; i < SAMPLES; i++) {
    const th = (i / SAMPLES) * 2 * Math.PI, cx = Math.cos(th), cy = Math.sin(th);
    let E = 0;
    for (const p of P) { const r = Math.exp(L[k] - L[p.k]), dx = cx - r * Math.cos(p.th), dy = cy - r * Math.sin(p.th); E += Math.pow(dx * dx + dy * dy, -s / 2); }
    if (E < bestE) { bestE = E; best = th; }
  }
  P.push({ k, th: best });
}
const div = P.slice(1).map((p, i) => { const d = (((p.th - P[i].th) * 180) / Math.PI + 720) % 360; return +(d > 180 ? 360 - d : d).toFixed(3); });
mkdirSync('assets', { recursive: true });
writeFileSync('assets/emerge.json', JSON.stringify({ model: 'Douady & Couder repulsion model, s=3, growth parameter falling from 0.9 to 0.08', theta: P.map(p => +p.th.toFixed(6)), logGrowth: L.map(x => +x.toFixed(6)), divergence: div }));
console.log('buds', n, 'last 10 divergences:', div.slice(-10).join(' '));
