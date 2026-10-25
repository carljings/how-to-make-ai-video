// timeline.js — the single source of truth for timing. 120 BPM: beat = 0.5 s, bar = 2 s. Scenes and score.js
// read every cue from here.
export const BPM = 120, BEAT = 0.5, BAR = 2;
export const DURATION = 158;

export const CUE = {
  // 0 · cold open
  solveEnd: 2.5, board: 5.0, why: 8.0, tiles: 9.0,
  // 1 · origin
  origin: 10, y1975: 13.5, y1980: 16.5, wall: 18,
  // 2 · 4325 亿亿
  count: 20, explode: 24, f8: 28, f3: 31, f12: 35, f2: 38, par: 42, total: 44, years: 47,
  // 3 · 20
  twenty: 50, shells: 54, outer: 58, bounds: 60, superflip: 64.5, gap: 67.5, proof: 70, cover: 73.5, sweep: 75, slam: 78, dist: 82,
  // 4 · 2.51
  human: 86, ao5: 90, trim: 92, merge: 93.5, inspect: 96,
  // 5 · methods
  methods: 98, lbl: 100, cfop: 109, roux: 119, tri: 126, triHit: 127.5,
  // 6 · the race
  race: 128, r2: 130, rule: 133, r2avg: 134.5, final: 137, finalTrim: 139, finalAvg: 140.5, recent: 143,
  // 7 · ending
  ending: 149, chord: 152, reset: 154, fade: 156.5, end: 158,
};

// Shared with the score: every expanding shell has one corresponding note.
export const SHELL_TIMES = Array.from({ length: 15 }, (_, i) => CUE.shells + 0.4 + i * 0.24);

// act light colours
export const ACT = {
  open: '#3a6cff', origin: '#3d8bff', count: '#ffc61a', twenty: '#8f6bff', human: '#ff3b3b', methods: '#19d46e', race: '#ff8a1f', ending: '#f4f2ee',
};
