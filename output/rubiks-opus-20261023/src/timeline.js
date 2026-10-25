// timeline.js — the single source of truth for timing. 120 BPM: beat = 0.5 s, bar = 2 s. Scenes and score.js
// read every cue from here.
export const BPM = 120, BEAT = 0.5, BAR = 2;
export const DURATION = 158;

export const CUE = {
  // 0 · cold open
  solveEnd: 2.5, board: 5.0, why: 8.0, tiles: 9.0,
  // 1 · origin
  origin: 10, y1975: 14, y1980: 18, wall: 20,
  // 2 · 4325 亿亿
  count: 22, explode: 26, f8: 30, f3: 33, f12: 36, f2: 39, par: 42, total: 44, years: 47,
  // 3 · 20
  twenty: 50, shells: 54, outer: 60, bounds: 62, superflip: 66.5, gap: 69.5, proof: 72, cover: 75.5, sweep: 77, slam: 80, dist: 84,
  // 4 · 2.51
  human: 88, ao5: 92, trim: 94, merge: 95.5, inspect: 98,
  // 5 · methods
  methods: 100, lbl: 104, cfop: 111, roux: 119, tri: 126, triHit: 127.5,
  // 6 · the race
  race: 128, r2: 132, rule: 135, r2avg: 136.5, final: 139, finalTrim: 141, finalAvg: 142.5, recent: 145,
  // 7 · ending
  ending: 149, chord: 152, reset: 154, fade: 156.5, end: 158,
};

// act light colours
export const ACT = {
  open: '#3a6cff', origin: '#3d8bff', count: '#ffc61a', twenty: '#8f6bff', human: '#ff3b3b', methods: '#19d46e', race: '#ff8a1f', ending: '#f4f2ee',
};
