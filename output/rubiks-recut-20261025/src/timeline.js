// timeline.js — the single source of truth for timing. 120 BPM: beat = 0.5 s, bar = 2 s. Scenes and score.js
// read every cue from here.
export const BPM = 120, BEAT = 0.5, BAR = 2;
export const DURATION = 180;

export const CUE = {
  // 0 · cold open
  solveEnd: 2.5, board: 5.0, why: 6.0, tiles: 9.0,
  // 1 · origin
  origin: 10, y1975: 14, y1980: 18, wall: 20,
  // 2 · 4325 亿亿
  count: 22, explode: 26, f8: 30, f3: 33, f12: 36, f2: 39, par: 42, total: 44, years: 47,
  // 3 · 20
  twenty: 50, shells: 55, searchBoth: 60, searchMeet: 66, searchJoin: 71,
  outer: 76, bounds: 76, challenge: 76, proof: 80, cover: 84, sweep: 88, recheck: 92,
  superflip: 95, gap: 99, slam: 100, dist: 102,
  // 4 · 2.51
  human: 104, ao5: 108, trim: 110, merge: 111.5, inspect: 114,
  // 5 · methods
  methods: 116, lbl: 120, cfop: 128, roux: 137, tri: 144, triHit: 145.5,
  // 6 · the race
  race: 146, r2: 150, rule: 152, r2avg: 153, final: 154, finalTrim: 156, finalAvg: 158, recent: 160,
  // 7 · ending
  ending: 164, chord: 168, reset: 171, cta: 173, fade: 178.5, end: 180,
};

// act light colours
export const ACT = {
  open: '#3a6cff', origin: '#3d8bff', count: '#ffc61a', twenty: '#8f6bff', human: '#ff3b3b', methods: '#19d46e', race: '#ff8a1f', ending: '#f4f2ee',
};
