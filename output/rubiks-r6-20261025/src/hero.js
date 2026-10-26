// hero.js — r6: the impact layer for every big moment, keyed to timeline cues (screen positions match the scenes).
// heroBack() draws behind content (called after each scene's backdrop); heroFront() draws over the scene;
// HITS drive camera shake and the bloom pulse in film.js.
import { seg, clamp, easeOut, easeInOut, easeOut5, lerp } from './lib/core.js';
import { shockwave, burst, sparks, rays, speedLines, shine, STICKERS } from './lib/fx.js';
import { S } from './seqs.js';
import { CUE } from './timeline.js';

const RED = '#ff3b3b', VIO = '#9b7bff', GOLD = '#ffc61a', GREEN = '#2ee58a', CYAN = '#36d6ff', WHITE = '#ffffff';
const C = CUE;
const win = (t, a, b, fin = 0.2, fout = 0.4) => Math.min(seg(t, a, a + fin), 1 - seg(t, b - fout, b));

export const HITS = [
  { t: C.solveEnd, amp: 26, zoom: 0.055 },
  { t: C.flip + 0.5, amp: 12, zoom: 0.03 },
  { t: C.explode, amp: 18 },
  { t: C.par + 0.6, amp: 7 },
  { t: C.total, amp: 22, zoom: 0.045 },
  { t: C.searchMeet, amp: 8 },
  { t: C.proof, amp: 6 },
  { t: C.superflip - 1, amp: 6 },
  { t: C.slam, amp: 36, zoom: 0.075, decay: 6 },
  { t: C.human + 0.85, amp: 10 },
  { t: C.human + 1.5, amp: 18, zoom: 0.035 },
  { t: C.triHit, amp: 14 },
  { t: C.merge + 0.45, amp: 9 },
  { t: C.r2, amp: 9 },
  { t: C.finalAvg, amp: 16, zoom: 0.035 },
  { t: C.ending, amp: 6 },
  { t: C.chord, amp: 7 },
];

// bloom: a constant glow plus a pulse on every hit
export function bloomAt(t) {
  let p = 0;
  for (const h of HITS) { const k = t - h.t; if (k >= 0 && k < 1.5) p = Math.max(p, Math.exp(-k * 3.5) * Math.min(1, h.amp / 26)); }
  return 0.16 + 0.2 * p;
}

export function heroBack(ctx, t) {
  const E = C.solveEnd;
  // the record: red-white rays behind 2.51 until the flip
  rays(ctx, 540, 705, t, { color: '#ff6a5a', alpha: 0.24 * win(t, E, C.flip + 0.2, 0.08, 0.5), speed: 0.35, n: 18, seed: 3 });
  // 20 lands: violet rays until the hand-off
  const nx = C.origin ?? C.count;
  rays(ctx, 540, 710, t, { color: '#b49bff', alpha: 0.26 * win(t, C.flip + 0.5, nx - 0.3, 0.08, 0.45), speed: -0.3, n: 16, seed: 4 });
  // 4325 亿亿: gold rays
  rays(ctx, 540, 1060, t, { color: GOLD, alpha: 0.22 * win(t, C.total + 0.3, C.years, 0.15, 0.3), speed: 0.25, n: 20, seed: 6 });
  // the twenty slam: the strongest rays of the film
  rays(ctx, 540, 800, t, { color: '#cbbcff', alpha: 0.34 * win(t, C.slam, C.human, 0.05, 0.5), speed: 0.22, n: 22, seed: 7, width: 0.08 });
  // ending: slow spotlight beams behind the solved cube
  rays(ctx, 540, 900, t, { color: '#fff1d0', alpha: 0.13 * win(t, C.ending + 0.3, C.end, 1.2, 1.4), speed: 0.05, n: 12, seed: 8, width: 0.05 });
}

export function heroFront(ctx, t) {
  const E = C.solveEnd;
  // ── opening: whip-in speed lines, then the record slam
  speedLines(ctx, 540, 980, t, 0.9 * (1 - easeOut(seg(t, 0, 0.8))) + 0.22 * win(t, 0.6, E, 0.3, 0.2), { seed: 11 });
  shockwave(ctx, 540, 705, t, E, { color: '#ff5a4a', r1: 1000, width: 44 });
  shockwave(ctx, 540, 705, t, E + 0.08, { color: WHITE, r1: 760, width: 18, alpha: 0.6 });
  burst(ctx, 540, 1150, t, E, { n: 54, seed: 21, speed: 1500, dur: 1.3, gravity: 1300 }); // from the cube as it drops back
  sparks(ctx, 540, 705, t, E, { n: 70, seed: 22, color: '#ffd9c9' });
  // the flip lands on 20
  shockwave(ctx, 540, 710, t, C.flip + 0.5, { color: VIO, r1: 900, width: 30 });
  sparks(ctx, 540, 710, t, C.flip + 0.5, { n: 50, seed: 23, color: '#d8ccff', speed: 1200 });
  // the cube rises into the count act
  const nx = C.origin ?? C.count;
  speedLines(ctx, 540, 960, t, 0.7 * win(t, nx - 0.6, nx + 0.15, 0.25, 0.3), { seed: 12 });
  // ── 4325 亿亿
  speedLines(ctx, 540, 960, t, 0.3 * win(t, C.count + 0.1, C.explode - 0.1, 0.2, 0.2), { seed: 13 });
  shockwave(ctx, 540, 960, t, C.explode, { color: GOLD, r1: 1100, width: 40 });
  sparks(ctx, 540, 960, t, C.explode, { n: 60, seed: 24, color: '#ffe9a8', speed: 1600 });
  sparks(ctx, 640, 900, t, C.par + 0.6, { n: 26, seed: 25, color: '#ff8a8a', speed: 700, dur: 0.6 });
  shockwave(ctx, 540, 1050, t, C.total, { color: GOLD, r1: 1200, width: 50 });
  burst(ctx, 540, 1060, t, C.total, { n: 50, seed: 26, speed: 1900, colors: [GOLD, '#fff1b8', '#ffb000', WHITE], dur: 0.95, gravity: 250, drag: 3.2 }); // out to the edges, clear of 4325
  sparks(ctx, 540, 1500, t, C.years + 2.2, { n: 30, seed: 27, color: '#ffe9a8', speed: 700, dur: 0.7 });
  // ── 20: the two searches meet; the proof completes; the superflip; the slam
  shockwave(ctx, 540, 1000, t, C.searchMeet, { color: GREEN, r1: 700, width: 22 });
  sparks(ctx, 540, 1000, t, C.searchMeet, { n: 40, seed: 28, color: '#c9ffe0', speed: 900, dur: 0.8 });
  shockwave(ctx, 540, 980, t, C.superflip - 1, { color: WHITE, r1: 800, width: 26, alpha: 0.7 });
  sparks(ctx, 540, 980, t, C.superflip - 1, { n: 50, seed: 29, color: '#e8fff2', speed: 1300 });
  const sfEnd = S.superflip.times[19][1];
  speedLines(ctx, 540, 930, t, 0.35 * win(t, C.superflip + 0.9, sfEnd, 0.2, 0.2), { seed: 14 });
  burst(ctx, 540, 930, t, sfEnd, { n: 40, seed: 30, speed: 1100, dur: 1.1, colors: [CYAN, '#bff3ff', WHITE] });
  shockwave(ctx, 540, 800, t, C.slam, { color: '#b9a3ff', r1: 1300, width: 64, dur: 0.9 });
  shockwave(ctx, 540, 800, t, C.slam + 0.1, { color: WHITE, r1: 1000, width: 24, alpha: 0.7 });
  burst(ctx, 540, 800, t, C.slam, { n: 80, seed: 31, speed: 2100, dur: 1.7 });
  sparks(ctx, 540, 800, t, C.slam, { n: 90, seed: 32, color: '#efe8ff', speed: 1900, dur: 1.1 });
  // ── the new hook: 2.51 lands, then the stamp
  shockwave(ctx, 540, 877, t, C.human + 0.85, { color: RED, r1: 800, width: 26 });
  burst(ctx, 540, 1380, t, C.human + 1.5, { n: 40, seed: 33, speed: 900, dur: 1.0, colors: [RED, '#ff8a8a', '#ffd0d0'], size: [8, 18], gravity: 700 });
  shockwave(ctx, 540, 1380, t, C.human + 1.5, { color: RED, r1: 560, width: 20, dur: 0.55 });
  // ── methods: every stage completes with a ring; every solved cube gets a shine; three checks on the hit
  const stages = [[S.lblStageEnds, '#19d46e'], [S.cfopStageEnds, GOLD], [S.rouxStageEnds, CYAN]];
  for (const [ends, col] of stages) {
    ends.forEach((e, i) => shockwave(ctx, 540, 860, t, e, { color: col, r1: i === ends.length - 1 ? 760 : 520, width: i === ends.length - 1 ? 26 : 12, dur: 0.6, alpha: 0.6 }));
    const last = ends[ends.length - 1];
    shine(ctx, 280, 560, 520, 620, seg(t, last + 0.05, last + 0.6));
    if (ends.length) sparks(ctx, 540, 860, t, last, { n: 36, seed: 40 + ends.length, color: '#ffffff', speed: 900, dur: 0.7 });
  }
  [180, 540, 900].forEach((x, i) => { burst(ctx, x, 980, t, C.triHit, { n: 22, seed: 50 + i, speed: 800, dur: 1.0, size: [8, 18] }); });
  // ── the average of five, the race
  sparks(ctx, 540, 972, t, C.merge + 0.45, { n: 50, seed: 60, color: '#ffe39a', speed: 1300, dur: 0.8 });
  shockwave(ctx, 540, 972, t, C.merge + 0.45, { color: GOLD, r1: 700, width: 24 });
  shockwave(ctx, 540, 860, t, C.r2, { color: RED, r1: 760, width: 24 });
  sparks(ctx, 360, 817, t, C.finalAvg, { n: 56, seed: 61, color: '#ffe39a', speed: 1400, dur: 0.85 });
  shockwave(ctx, 360, 817, t, C.finalAvg, { color: GOLD, r1: 620, width: 20 });
  sparks(ctx, 360, 1197, t, C.finalAvg + 0.08, { n: 30, seed: 62, color: '#ff9a9a', speed: 900, dur: 0.7 });
  // ── ending: one soft ring on the chord
  shockwave(ctx, 540, 900, t, C.chord, { color: '#fff1d0', r1: 900, width: 14, dur: 1.2, alpha: 0.5 });
}
