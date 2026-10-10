// timeline.ts: the single source of truth for timing. Scenes, lyrics, hits and the music cuts all read it.
// Everything below is in *song time* (seconds): song time 0 is 0.479 s into the music screen recording
// `ScreenRecording_10-11-2026 01-14-58_1.MOV`, just before the first downbeat. The remix runs at 75 BPM; its pulse
// (0.39998 s, fitted over 53 s) is the beat everything lands on, and every sung syllable sits on the half-pulse grid
// (Demucs vocal + MMS forced alignment, checked against vocal onsets; see storyboard.md).
// A film is a playlist of song bars: the full cut plays bars 0–15, the 40-second cut plays 0–7 then 12–15.
export const W = 1080, H = 1920, FPS = 30;
export const T0 = 0.0574;            // the first downbeat
export const PULSE = 0.39998;        // one pulse
export const HALF = PULSE / 2;       // the syllable grid
export const BAR = PULSE * 8;        // one sung line
export const BARS = 16;

// grid(bar, n): n half-pulses into a bar (bars count from 0)
export const grid = (bar: number, n: number) => T0 + bar * BAR + n * HALF;
export const BARLINE = Array.from({length: BARS + 1}, (_, b) => grid(b, 0));

export type SceneId = 'night' | 'dawn' | 'world' | 'planet' | 'spring' | 'heart' | 'tear' | 'wind' | 'wings' | 'birds' | 'news' | 'buzz' | 'mountain' | 'fire' | 'notes' | 'bless';
// One scene per bar, in song order
export const SCENES: {id: SceneId; name: string; status: string}[] = [
  {id: 'night', name: '01 轻轻敲醒沉睡的心灵 · night', status: 'sleeping'},
  {id: 'dawn', name: '02 慢慢张开你的眼睛 · dawn', status: 'waking up'},
  {id: 'world', name: '03 看看忙碌的世界 是否依然 · the busy world', status: 'online'},
  {id: 'planet', name: '04 孤独的转个不停 · the lonely planet', status: 'thinking'},
  {id: 'spring', name: '05 春风不解风情 · spring breeze', status: 'spring mode'},
  {id: 'heart', name: '06 吹动少年的心 · the heart', status: 'heart'},
  {id: 'tear', name: '07 让昨日脸上的泪痕 · a tear in the rain', status: 'raining'},
  {id: 'wind', name: '08 随记忆风干了 · the wind dries it', status: 'drying'},
  {id: 'wings', name: '09 抬头寻找天空的翅膀 · wings (drop)', status: 'flying'},
  {id: 'birds', name: '10 候鸟出现它的影迹 · the flock', status: 'flock'},
  {id: 'news', name: '11 带来远处的饥荒 无情的战火 · news from afar', status: 'incoming news'},
  {id: 'buzz', name: '12 依然存在的消息 · messages', status: 'messages'},
  {id: 'mountain', name: '13 玉山白雪飘零 · the snowy mountain', status: 'summit'},
  {id: 'fire', name: '14 燃烧少年的心 · the heart on fire', status: 'overheating'},
  {id: 'notes', name: '15 使真情溶化成音符 · notes', status: 'composing'},
  {id: 'bless', name: '16 倾诉遥远的祝福 · blessings (finale)', status: 'blessing sent'},
];

// ---- the two cuts ----
export type Cut = 'full' | 'short';
export interface Entry {bar: number; filmA: number; filmB: number; offset: number} // song time = film time + offset
const playlist = (bars: number[], dur: number): Entry[] => {
  let f = 0;
  return bars.map((bar, i) => {
    const songA = i === 0 ? 0 : BARLINE[bar], filmA = f, len = i === bars.length - 1 ? dur - f : BARLINE[bar + 1] - songA;
    f += len;
    return {bar, filmA, filmB: filmA + len, offset: songA - filmA};
  });
};
export const CUTS: Record<Cut, {dur: number; frames: number; music: string; entries: Entry[]}> = {
  full: {dur: 51.2, frames: 1536, music: 'music-full.wav', entries: playlist([...Array(16).keys()], 51.2)},
  short: {dur: 38.4, frames: 1152, music: 'music-short.wav', entries: playlist([0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15], 38.4)},
};
// The playlist entry at film time f (clamped to the ends, so negative time is the opening and overtime the finale)
export const entryAt = (cut: Cut, f: number) => {
  const E = CUTS[cut].entries;
  for (let i = E.length - 1; i >= 0; i--) if (f >= E[i].filmA) return E[i];
  return E[0];
};
export const songTime = (cut: Cut, f: number) => f + entryAt(cut, f).offset;
export const hasBar = (cut: Cut, bar: number) => CUTS[cut].entries.some((e) => e.bar === bar);
// Film time of a song moment in a given bar (only meaningful when the cut plays that bar)
export const filmOf = (cut: Cut, bar: number, song: number) => song - (CUTS[cut].entries.find((e) => e.bar === bar)?.offset ?? 0);

// Transitions between neighbouring entries, chosen by the pair of scenes. The 40-second cut's splice (wind → mountain)
// is a drop, like the full cut's wind → wings.
export type CutKind = 'pushIn' | 'eyeIris' | 'cut' | 'windWipe' | 'flip' | 'drip' | 'drop' | 'whip' | 'zoomTo';
export const TRANSITION: Record<string, {kind: CutKind; pre: number; post: number}> = {
  'night>dawn': {kind: 'pushIn', pre: 0.2, post: 0.12},
  'dawn>world': {kind: 'eyeIris', pre: 0.2, post: 0.25},
  'world>planet': {kind: 'cut', pre: 0, post: 0},
  'planet>spring': {kind: 'windWipe', pre: 0.3, post: 0.06},
  'spring>heart': {kind: 'flip', pre: 0.2, post: 0.16},
  'heart>tear': {kind: 'drip', pre: 0.25, post: 0.1},
  'tear>wind': {kind: 'cut', pre: 0, post: 0},
  'wind>wings': {kind: 'drop', pre: 0.02, post: 0.3},
  'wings>birds': {kind: 'whip', pre: 0.12, post: 0.14},
  'birds>news': {kind: 'zoomTo', pre: 0.22, post: 0.14},
  'news>buzz': {kind: 'cut', pre: 0, post: 0},
  'buzz>mountain': {kind: 'drop', pre: 0.02, post: 0.3},
  'wind>mountain': {kind: 'drop', pre: 0.02, post: 0.3},
  'mountain>fire': {kind: 'zoomTo', pre: 0.2, post: 0.12},
  'fire>notes': {kind: 'cut', pre: 0, post: 0},
  'notes>bless': {kind: 'whip', pre: 0.12, post: 0.14},
};

// ---- the sung syllables: one group per bar, [character, half-pulse position]. Positions ≥ 16 run into the next bar.
// 年 in bar 5 sits between grid lines (sung slightly early), so it carries its aligned time.
const SUNG: [string, number][][] = [
  [['轻', 0], ['轻', 1], ['敲', 2], ['醒', 4], ['沉', 6], ['睡', 7], ['的', 9], ['心', 10], ['灵', 12]],
  [['慢', 0], ['慢', 1], ['张', 2], ['开', 4], ['你', 6], ['的', 7], ['眼', 8], ['睛', 10]],
  [['看', 0], ['看', 1], ['忙', 2], ['碌', 3], ['的', 5], ['世', 6], ['界', 8], ['是', 10], ['否', 12], ['依', 13], ['然', 15]],
  [['孤', 2], ['独', 3], ['的', 5], ['转', 6], ['个', 7], ['不', 8], ['停', 10]],
  [['春', 2], ['风', 5], ['不', 8], ['解', 9], ['风', 10], ['情', 13]],
  [['吹', 2], ['动', 4], ['少', 6], ['年', -1], ['的', 9], ['心', 10]],
  [['让', 1], ['昨', 2], ['日', 4], ['脸', 6], ['上', 7], ['的', 9], ['泪', 10], ['痕', 12]],
  [['随', 0], ['记', 2], ['忆', 4], ['风', 6], ['干', 8], ['了', 10]],
  [['抬', 0], ['头', 1], ['寻', 2], ['找', 4], ['天', 6], ['空', 7], ['的', 9], ['翅', 10], ['膀', 12]],
  [['候', 0], ['鸟', 1], ['出', 2], ['现', 4], ['它', 6], ['的', 7], ['影', 8], ['迹', 10]],
  [['带', 0], ['来', 1], ['远', 2], ['处', 3], ['的', 5], ['饥', 6], ['荒', 8], ['无', 10], ['情', 12], ['的', 13], ['战', 14], ['火', 16]],
  [['依', 2], ['然', 3], ['存', 4], ['在', 5], ['的', 7], ['消', 8], ['息', 11]],
  [['玉', 2], ['山', 5], ['白', 8], ['雪', 9], ['飘', 10], ['零', 13]],
  [['燃', 2], ['烧', 4], ['少', 6], ['年', 7], ['的', 9], ['心', 10]],
  [['使', 1], ['真', 2], ['情', 4], ['溶', 6], ['化', 7], ['成', 9], ['音', 10], ['符', 12]],
  [['倾', 0], ['诉', 2], ['遥', 5], ['远', 6], ['的', 7], ['祝', 8], ['福', 10]],
];
const NIAN = 17.51; // aligned time of 年 in bar 5
export const LINES: {bar: number; text: string; syl: {ch: string; t: number}[]}[] = SUNG.map((line, bar) => ({
  bar,
  text: line.map(([c]) => c).join(''),
  syl: line.map(([ch, n]) => ({ch, t: n < 0 ? NIAN : grid(bar, n)})),
}));
export const syl = (bar: number, i: number) => LINES[bar].syl[i].t;
// When a bar's words leave: just before the next bar, or after its last word if that runs past the bar line
export const lineExit = (bar: number) => Math.max(BARLINE[bar + 1] - 0.14, LINES[bar].syl.at(-1)!.t + 0.22);

// Hits: syllables that shake and punch the frame (strength 0..1). The drops add a white flash.
export const HITS: [number, number, number][] = [ // [bar, syllable index, strength]
  [0, 2, 0.8], [0, 3, 0.6], [2, 5, 0.7], [2, 6, 0.7], [3, 6, 0.9], [5, 5, 1],
  [6, 6, 0.5], [7, 4, 0.4], [8, 0, 1], [8, 7, 0.5], [8, 8, 0.6], [9, 1, 0.4], [10, 10, 0.9], [10, 11, 0.6],
  [11, 5, 0.4], [11, 6, 0.5], [12, 0, 0.8], [13, 0, 0.5], [13, 5, 1], [14, 7, 0.5], [15, 6, 1],
];
export const DROP_BARS = [8, 12]; // bars that start with a drop flash when they follow a different bar than in the song

// ---- story cues (derived from the syllables, so moving a syllable moves its action) ----
export const NIGHT = {tap1: syl(0, 0), tap2: syl(0, 1), knock: syl(0, 2), jolt: syl(0, 3), heart: syl(0, 7), glow: syl(0, 8)};
export const DAWN = {open1: syl(1, 2), open2: syl(1, 3), open3: syl(1, 6), blink: syl(1, 7), blink2: BARLINE[2] - 0.45};
export const WORLD = {look1: syl(2, 0), look2: syl(2, 1), stamp1: syl(2, 5), stamp2: syl(2, 6), slow: syl(2, 7), ask: syl(2, 8), tilt: syl(2, 9), globe: syl(2, 10)};
export const PLANET = {orbit: [syl(3, 3), syl(3, 4), syl(3, 5), syl(3, 6)], brake: syl(3, 6)};
export const SPRING = {gust: syl(4, 0), cap: syl(4, 2), letter: syl(4, 4), drift: syl(4, 5)};
export const HEART = {open: BARLINE[5] + 0.24, blow: syl(5, 0), wobble: syl(5, 1), spark: syl(5, 2), land: syl(5, 5),
  beats: [syl(5, 5), syl(5, 5) + PULSE, syl(5, 5) + 2 * PULSE]};
export const TEAR = {rain: syl(6, 0), memory: syl(6, 1), face: syl(6, 3), drop: syl(6, 6), streak: syl(6, 7)};
export const WIND = {gust: syl(7, 0), fly: [syl(7, 1), syl(7, 2), syl(7, 3)], dry: syl(7, 4), sun: syl(7, 5), hush: BARLINE[8] - 0.62};
export const WINGS = {up: syl(8, 0), look: [syl(8, 2), syl(8, 3)], tilt: syl(8, 4), wing1: syl(8, 7), wing2: syl(8, 8), launch: syl(8, 8) + 0.2};
export const BIRDS = {arrive: LINES[9].syl.map((s) => s.t), shadow: syl(9, 6)};
export const NEWS = {drop: syl(10, 0), open: syl(10, 2), bowl: syl(10, 5), cloud: syl(10, 7), bolt: syl(10, 10)};
export const BUZZ = {fire: syl(10, 11), flood: syl(11, 0), badge1: syl(11, 5), badge2: syl(11, 6)};
export const MOUNTAIN = {rise: syl(12, 0), summit: syl(12, 1), snow: syl(12, 2), gust: syl(12, 4), flake: syl(12, 5)};
export const FIRE = {spark: syl(13, 0), grow: syl(13, 1), aura: syl(13, 2), boom: syl(13, 5)};
export const NOTES = {glow: syl(14, 0), spill: syl(14, 1), melt: syl(14, 3), staff: syl(14, 6), last: syl(14, 7)};
export const BLESS = {send: syl(15, 0), arrive: syl(15, 3), clear: syl(15, 5), boom: syl(15, 6),
  beats: [syl(15, 6), syl(15, 6) + PULSE, syl(15, 6) + 2 * PULSE], window: syl(15, 6) + 2 * PULSE};

// The pulse index at song time t (−1 before the first downbeat), and seconds since that pulse
export const pulseAt = (t: number) => Math.floor((t - T0) / PULSE + 1e-6);
export const sincePulse = (t: number) => {
  const k = pulseAt(t);
  return k < 0 ? 1e3 : t - (T0 + k * PULSE);
};
