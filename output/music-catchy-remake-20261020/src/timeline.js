// timeline.js — THE single source of time and of the story's data. Pure data, no DOM (tools import it too).
// 《这首开智小曲，为啥这么上头？》 Film time = the reused v1 master's time (assets/music/v1-master.wav: the user's song, its
// own material, the 3rd build bar played twice, a final hit with a filtered decay). Cues snap to onsets DETECTED on it.
//
// The idea (Opus 5.5): the song is a path of stepping stones and a small listener hops along it, one stone per beat.
//   ① 跟得上  the stones come evenly (measured beat ≈ 0.53 s); ghost outlines show where the next one will be; it nods.
//   ② 有意外  the stones go thin where the song's bass thins (thickness = measured sub-bass), the ghosts keep coming; at the
//             drop the stone lands exactly on time — and far bigger than its ghost.
//   ③ 听熟了  crane up: the whole song as rows of bars; rows that measure alike share a colour (bar similarity, measured).
//   then the last wait, the last drop, the answer.
import { MUSIC } from './music.js';
import { NARR } from './narration.js';
export const W = 1080, H = 1920, FPS = 30;
const ONS = MUSIC.onsets.map((o) => o[0]);
export function snap(t, why = '') {
  let best = null; for (const o of ONS) if (best === null || Math.abs(o - t) < Math.abs(best - t)) best = o;
  if (best === null || Math.abs(best - t) > 0.07) throw new Error(`no detected onset within 70 ms of ${t.toFixed(3)} s ${why}`);
  return best;
}
const E = MUSIC.events;
export const BARS = MUSIC.bars;                    // film bar lines (19: bar 0 = intro … bar 18 = the final hit)
const bar = (i) => snap(BARS[i], `(bar ${i})`);
export const BEAT = 0.532;                         // fitted beat of the original (≈ 112.8 BPM); a label, cues use onsets

export const T = {
  d1: snap(E.drop1, 'drop 1'),       // the groove arrives — the first answer is the music itself
  p1: bar(2),                        // ① 跟得上: the row seen from the front, the ruler
  ghosts: bar(4),                    // ghost outlines: where the next stone will be
  nod: bar(5),                       // nodding along
  thin2: bar(7),                     // ② the bass thins (measured)
  build2: bar(8),                    // the build: ghosts keep coming, the listener crouches
  d2: snap(E.drop2, 'drop 2'),       // on time, far bigger
  cmp: bar(10),                      // the comparison: guessed vs real
  p3: bar(13),                       // ③ crane up: the whole song as rows
  build3: bar(14),
  extra: snap(E.build3_repeat, 'repeated build bar'),
  d3: snap(E.drop3, 'drop 3'),
  coda: bar(17),
  hit: snap(E.final_hit, 'final hit'),
};
export const MUSIC_ONLY = [[T.d1, T.d1 + 1.95], [T.build2, T.d2 + 2.0], [T.extra, T.d3 + 0.88]];   // narration-free (and duck-free) windows: the builds + drops

// the voice decides the end: the last line must finish and stay readable
const lastLine = NARR[NARR.length - 1];
export const FADE_V0 = Math.max(T.hit + 2.0, lastLine.at + lastLine.dur + 0.75), FADE_V1 = FADE_V0 + 0.7;
export const END = Math.max(MUSIC.end, FADE_V1 + 0.4);
export const FRAMES = Math.round(END * FPS);
export const frameOf = (t) => Math.round(t * FPS);

// ---- the path. One stone per beat: bar r, beat j (0..3), on a snake of rows (row r runs left→right if r is even).
// The final hit (bar 18) is a single podium.
export const SP = 1.8, ROW = 2.3;
export const STONES = [];
for (let r = 0; r < BARS.length; r++) {
  const b0 = BARS[r], b1 = r + 1 < BARS.length ? BARS[r + 1] : b0 + 4 * BEAT, n = r === BARS.length - 1 ? 1 : 4;
  for (let j = 0; j < n; j++) {
    const grid = b0 + j * (b1 - b0) / 4;
    let t = grid, onset = true; try { t = snap(grid); } catch { onset = false; }   // no detected onset → grid time, marked
    const xj = n === 1 ? 0 : (r % 2 === 0 ? j : 3 - j) * SP - 1.5 * SP;
    STONES.push({ i: STONES.length, r, j, t: +t.toFixed(4), onset, x: xj, z: -r * ROW });
  }
}
// measured sub-bass (0..1) around each stone: mean of the master's per-frame sub energy over the beat
const unpack = (b64) => { const s = atob(b64), a = new Float32Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) / 255; return a; };
export const SUB = unpack(MUSIC.sub), RMS = unpack(MUSIC.rms), KICK = unpack(MUSIC.kick), SPEC = unpack(MUSIC.spec);
for (const s of STONES) {
  const f0 = Math.round(s.t * FPS), f1 = Math.max(f0 + 1, Math.round((s.t + BEAT) * FPS));
  let v = 0; for (let f = f0; f < f1; f++) v += SUB[Math.min(SUB.length - 1, f)] ?? 0; s.sub = v / (f1 - f0);
  s.big = [T.d1, T.d2, T.d3].some((d) => Math.abs(d - s.t) < 0.06);
  s.final = Math.abs(s.t - T.hit) < 0.06;
}
// repetition groups of the FILM's bars, from assets/music/repetition.json (source bars 0..17, r ≥ 0.80, measured spectra).
// Film bars 0..14 = source 0..14; film 15 = source 14 again (the repeated build); 16 = 15; 17 = 16; 18 = the final hit,
// taken from the song's first drop (source bar 1). tools/textcheck.mjs re-derives this from the json and fails on a mismatch.
const SRC_GROUP = [0, 1, 2, 3, 4, 5, 2, 6, 7, 5, 2, 3, 4, 6, 7, 8, 9, 10];
export const FILM_SRC_BAR = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 14, 15, 16, 1];
export const GROUP = FILM_SRC_BAR.map((s) => SRC_GROUP[s]);
export const GROUP_COLORS = { 1: '#FF7A59', 2: '#5EE6FF', 3: '#B48CFF', 4: '#7CF5C8', 5: '#FFD15C', 6: '#8FA3C0', 7: '#FF5FA2' };   // groups with ≥ 2 film bars

export const SCENES = [
  { id: 'A', t0: 0, t1: T.d1, fn: 'hook', what: 'the question; the listener on the first stone in the dark; the intro build' },
  { id: 'B', t0: T.d1, t1: T.p1, fn: 'groove', what: 'drop 1: the world lights, stones slam in on the beat, the listener hops' },
  { id: 'C', t0: T.p1, t1: T.thin2, fn: 'steady', what: '① even stones, the ruler, ghost outlines of the next stone, nodding' },
  { id: 'D', t0: T.thin2, t1: T.d2, fn: 'thin', what: '② stones go thin (measured bass), ghosts keep coming, the listener crouches; the drop lands on time, huge' },
  { id: 'E', t0: T.d2, t1: T.p3, fn: 'compare', what: 'guessed vs real: timing guessed, size not' },
  { id: 'F', t0: T.p3, t1: T.d3, fn: 'repeat', what: '③ crane up: the song as rows, twin bars share a colour; then the last (doubled) wait' },
  { id: 'G', t0: T.d3, t1: END, fn: 'finale', what: 'drop 3, everything at once; the answer; landing on the podium' },
];
export const sceneAt = (t) => SCENES.find((s) => t >= s.t0 && t < s.t1) || SCENES[SCENES.length - 1];

export const C = { white: '#F6F7FB', dim: '#AEB7C8', beat: '#FF7A59', ghost: '#5EE6FF', gold: '#FFD15C', mint: '#7CF5C8', pink: '#FF5FA2' };

// big cards; subtitles come from NARR (word-timed)
export const CARDS = [
  { id: 'title', y: 300, out: T.d1, exit: 'cut', lines: [
    { text: '这首开智小曲', role: 'hero', at: 0 },
    { text: '为啥这么上头？', role: 'hero', at: 0, spans: [{ k: '上头', c: 'beat' }] }] },
  { id: 'p1', y: 250, out: T.thin2, exit: 'cut', lines: [{ text: '① 跟得上', role: 'section', at: T.p1 + 0.02, spans: [{ k: '跟得上', c: 'beat' }] }] },
  { id: 'p2', y: 250, out: T.p3, exit: 'cut', lines: [{ text: '② 有意外', role: 'section', at: T.thin2 + 0.02, spans: [{ k: '有意外', c: 'ghost' }] }] },
  { id: 'p3', y: 250, out: T.extra, exit: 'cut', lines: [{ text: '③ 听熟了', role: 'section', at: T.p3 + 0.02, spans: [{ k: '听熟了', c: 'gold' }] }] },
];
// the answer chips appear on the words of L10 (see film.js); their strings:
export const ANSWER = [{ k: '跟得上', c: 'beat', word: '能跟上' }, { k: '有意外', c: 'ghost', word: '有意外' }, { k: '听熟了', c: 'gold', word: '又熟悉' }];
export const FINAL_LINE = '所以，容易上头';

// small source / honesty tags, top-left (windows in s; the voice timing decides some of them in film.js)
export const TAGS = [
  { from: T.p1, to: T.thin2, text: '石块 = 节拍示意 · 小人是比喻' },
  { from: T.thin2, to: T.d2, text: '石块厚度 = 原曲实测低音能量' },
  { from: T.d2, to: 'L07', text: '石块大小为示意' },
  { from: 'L07', to: T.p3, text: '研究：Cheung 等 2019 · 和弦期待实验，非本曲' },
  { from: T.p3, to: 'L09', text: '颜色 = 原曲小节频谱相似度（计算，非逐音比对）' },
  { from: 'L09', to: T.extra, text: '研究：Madison & Schiölde 2017 · 反复聆听' },
  { from: T.extra, to: T.d3, text: '演示：这一小节多放了一遍' },
  { from: T.coda, to: 'END', text: '小川科普' },
];
// strings drawn inside graphics (font subset)
export const LABELS = ['≈0.53 秒', '猜的', '真的', '时间：猜中了', '力度：没想到', '低音', '第1遍', '第2遍', '第3遍', '喜欢', '研究示意',
  '第', '小节', '相似', '同色 = 相似的小节'];
export const cjk = (s) => [...s].filter((c) => /[㐀-鿿]/.test(c)).length;
export const allText = () => CARDS.flatMap((c) => c.lines.map((l) => l.text)).concat(TAGS.map((g) => g.text), NARR.map((n) => n.text), LABELS,
  ANSWER.map((a) => a.k), [FINAL_LINE]);
