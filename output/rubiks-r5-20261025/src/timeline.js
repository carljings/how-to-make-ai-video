// timeline.js — the single source of truth for timing. 120 BPM: beat = 0.5 s, bar = 2 s. Scenes and score.js
// read every cue from here.
//
// r5 renders three cuts from one codebase; the page query picks one (index.html?v=full | mid | light):
//   full  (126.5 s) — one question chain: 2.51 → 20 promise, count, proof, a new hook after 20, methods,
//                     the average of five, the race, the ending. Tightest pacing.
//   mid   (151.5 s) — the same order, a 3-second history beat, the methods at their r4 length.
//   light (159.5 s) — r4's order (2.51 / average → methods → race), with the new opening and hook.
export const BPM = 120, BEAT = 0.5, BAR = 2;

const query = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('v') : null;
export const VARIANT = ['full', 'mid', 'light'].includes(query) ? query : 'full';

// cues shared by every cut: the record solve, its slam and the flip to 20
const OPEN = { solveEnd: 2.5, flip: 4.0 };

const CUES = {
  full: {
    ...OPEN,
    // 1 · 4325 亿亿
    count: 6, explode: 8, f8: 10.5, f3: 13, f12: 16, f2: 19, par: 22, total: 24, years: 27,
    // 2 · 20
    twenty: 30, shells: 33, searchBoth: 37, searchMeet: 41, searchJoin: 44,
    challenge: 48, proof: 50.5, cover: 53.5, sweep: 57, recheck: 59.5, superflip: 62.5, gap: 65.5, slam: 66.5,
    // 3 · the new hook: a record, and sixth place
    human: 69.5, rehookEnd: 73.5,
    // 4 · methods
    methods: 73.5, lbl: 75.5, cfop: 83.5, roux: 89.5, tri: 94.5, triHit: 96, methodsEnd: 96.5,
    // 5 · the average of five
    ao5: 96.5, trim: 98.5, merge: 100, ao5End: 102.5,
    // 6 · the race
    race: 102.5, r2: 102.5, rule: 104.5, final: 106.5, finalTrim: 108.5, finalAvg: 110.5, recent: 112.5,
    // 7 · ending
    ending: 114.5, chord: 117.5, nextQ: 117.5, reset: 120, cta: 121.5, fade: 125.1, end: 126.5,
  },
  mid: {
    ...OPEN,
    // 1 · structure, a three-second beat
    origin: 6, y1975: 7, y1980: 8, wall: 8.6,
    // 2 · 4325 亿亿
    count: 9, explode: 11, f8: 14, f3: 17, f12: 20, f2: 23, par: 26, total: 28, years: 31,
    // 3 · 20
    twenty: 34, shells: 38, searchBoth: 43, searchMeet: 49, searchJoin: 53,
    challenge: 58, proof: 61.5, cover: 65.5, sweep: 69.5, recheck: 72.5, superflip: 75.5, gap: 79, slam: 80,
    // 4 · the new hook
    human: 83.5, rehookEnd: 87.5,
    // 5 · methods (r4 length)
    methods: 87.5, lbl: 91.5, cfop: 99.5, roux: 108.5, tri: 115.5, triHit: 117, methodsEnd: 117.5,
    // 6 · the average of five
    ao5: 117.5, trim: 119.5, merge: 121, ao5End: 123.5,
    // 7 · the race
    race: 123.5, r2: 123.5, rule: 125.5, final: 127.5, finalTrim: 129.5, finalAvg: 131.5, recent: 133.5,
    // ending
    ending: 137.5, chord: 141.5, nextQ: 142.5, reset: 144.5, cta: 146.5, fade: 150.1, end: 151.5,
  },
  light: {
    ...OPEN,
    // 1 · 4325 亿亿
    count: 6, explode: 8, f8: 12, f3: 15, f12: 18, f2: 21, par: 24, total: 26, years: 29,
    // 2 · 20
    twenty: 32, shells: 36, searchBoth: 41, searchMeet: 47, searchJoin: 52,
    challenge: 57, proof: 60.5, cover: 64.5, sweep: 68.5, recheck: 72.5, superflip: 75.5, gap: 79.5, slam: 80.5,
    // 3 · 2.51: the new hook, the average of five, inspection
    human: 84.5, rehookEnd: 88.5, ao5: 88.5, trim: 90.5, merge: 92, ao5End: 94.5, inspect: 94.5,
    // 4 · methods
    methods: 96.5, lbl: 100.5, cfop: 108.5, roux: 117.5, tri: 124.5, triHit: 126, methodsEnd: 126.5,
    // 5 · the race, opening on the two record holders
    race: 126.5, r2: 130.5, rule: 132.5, final: 134.5, finalTrim: 136.5, finalAvg: 138.5, recent: 140.5,
    // ending
    ending: 143.5, chord: 147.5, nextQ: 148.5, reset: 150.5, cta: 152.5, fade: 158.1, end: 159.5,
  },
};

export const CUE = CUES[VARIANT];
export const DURATION = CUE.end;

// what each cut contains, and the order of the acts after the proof
export const PLAN = {
  full: { origin: false, inspect: false, owners: false, order: 'r5', methodsPace: 'tight' },
  mid: { origin: true, inspect: false, owners: false, order: 'r5', methodsPace: 'r4' },
  light: { origin: false, inspect: true, owners: true, order: 'r4', methodsPace: 'r4' },
}[VARIANT];

// the counting-rule demo (90° and 180° turns) scales with its beat: r4 had 5 s, full has 3, mid and light 4
export const RULE = Math.min(1, (CUE.shells - CUE.twenty) / 5);

// search pacing (seconds between the ten moves of each half): full is quicker; mid and light keep r4's
// (mid and light: 0.5 s apart from the cue, on the 120 BPM grid; the left half ends at shells + 4.9, the right at searchBoth + 4.93)
export const SEARCH = VARIANT === 'full' ? { left: [0.25, 0.3, 0.075], right: [0.25, 0.3, 0.075] } : { left: [0, 0.4, 0.1], right: [0, 0.43, 0.07] };

// act kickers, numbered in the order each cut plays them
export const KICK = {
  full: { count: '01 · 4325 亿亿', twenty: '02 · 20 步怎样证明', human: '03 · 2.51', methods: '04 · 方法', ao5: '05 · 赛制', race: '06 · 回到那场比赛' },
  mid: { origin: '01 · 结构', count: '02 · 4325 亿亿', twenty: '03 · 20 步怎样证明', human: '04 · 2.51', methods: '05 · 方法', ao5: '06 · 赛制', race: '07 · 回到那场比赛' },
  light: { count: '01 · 4325 亿亿', twenty: '02 · 20 步怎样证明', human: '03 · 2.51', ao5: '03 · 2.51', methods: '04 · 方法', race: '05 · 回到那场比赛' },
}[VARIANT];

// act light colours
export const ACT = {
  open: '#3a6cff', origin: '#3d8bff', count: '#ffc61a', twenty: '#8f6bff', human: '#ff3b3b', methods: '#19d46e', race: '#ff8a1f', ending: '#f4f2ee',
};
