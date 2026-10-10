// timeline.ts: the single source of truth for timing. Scenes, lyrics, the mascot's acting and the music read it.
// Times are seconds of film time; film time 0 is 0.698 s into the music screen recording, where the Douyin clip
// restarts. The song runs at 75 BPM. Its pulse (an eighth note, 0.40012 s) is the beat everything lands on, and
// every sung syllable sits on the half-pulse grid (Demucs vocal + MMS forced alignment, see storyboard.md).
export const W = 1080, H = 1920, FPS = 30;
export const T0 = 0.0533;          // the first downbeat
export const PULSE = 0.40012;      // one pulse
export const HALF = PULSE / 2;     // the syllable grid
export const BAR = PULSE * 8;      // one sung line
export const DUR = 19.2, FRAMES = 576; // six bars; the end meets the first downbeat when the video loops

// grid(bar, n): n half-pulses into a bar (bars count from 0)
export const grid = (bar: number, n: number) => T0 + bar * BAR + n * HALF;
export const BARLINE = [0, 1, 2, 3, 4, 5].map((b) => grid(b, 0));

export type SceneId = 'night' | 'dawn' | 'world' | 'planet' | 'spring' | 'heart';
// a..b: when the scene owns the card. Each cut is on a downbeat; the transition kinds are in TRANSITIONS.
export const SCENES: {id: SceneId; a: number; b: number; name: string; status: string}[] = [
  {id: 'night', a: 0, b: BARLINE[1], name: '1 轻轻敲醒沉睡的心灵 · night', status: 'sleeping'},
  {id: 'dawn', a: BARLINE[1], b: BARLINE[2], name: '2 慢慢张开你的眼睛 · dawn', status: 'waking up'},
  {id: 'world', a: BARLINE[2], b: BARLINE[3], name: '3 看看忙碌的世界 是否依然 · the busy world', status: 'online'},
  {id: 'planet', a: BARLINE[3], b: BARLINE[4], name: '4 孤独的转个不停 · the lonely planet', status: 'thinking'},
  {id: 'spring', a: BARLINE[4], b: BARLINE[5], name: '5 春风不解风情 · spring breeze', status: 'spring mode'},
  {id: 'heart', a: BARLINE[5], b: DUR, name: '6 吹动少年的心 · the heart', status: 'heart'},
];
// Each transition runs from `pre` seconds before its downbeat to `post` after it
export type CutKind = 'pushIn' | 'eyeIris' | 'globe' | 'windWipe' | 'flip';
export const TRANSITIONS: {at: number; kind: CutKind; pre: number; post: number}[] = [
  {at: BARLINE[1], kind: 'pushIn', pre: 0.2, post: 0.12},
  {at: BARLINE[2], kind: 'eyeIris', pre: 0.2, post: 0.25},
  {at: BARLINE[3], kind: 'globe', pre: 0, post: 0}, // a straight cut: the planet scene starts as the world scene's globe
  {at: BARLINE[4], kind: 'windWipe', pre: 0.3, post: 0.06},
  {at: BARLINE[5], kind: 'flip', pre: 0.2, post: 0.16},
];

// The sung syllables: one line per bar, [character, half-pulse position in its bar]. 年 sits between the grid lines
// (it is sung slightly early), so it carries its aligned time instead.
const SUNG: [string, number][][] = [
  [['轻', 0], ['轻', 1], ['敲', 2], ['醒', 4], ['沉', 6], ['睡', 7], ['的', 9], ['心', 10], ['灵', 12]],
  [['慢', 0], ['慢', 1], ['张', 2], ['开', 4], ['你', 6], ['的', 7], ['眼', 8], ['睛', 10]],
  [['看', 0], ['看', 1], ['忙', 2], ['碌', 3], ['的', 5], ['世', 6], ['界', 8], ['是', 10], ['否', 12], ['依', 13], ['然', 15]],
  [['孤', 2], ['独', 3], ['的', 5], ['转', 6], ['个', 7], ['不', 8], ['停', 10]],
  [['春', 2], ['风', 5], ['不', 8], ['解', 9], ['风', 10], ['情', 13]],
  [['吹', 2], ['动', 4], ['少', 6], ['年', -1], ['的', 9], ['心', 10]],
];
const NIAN = 17.51; // aligned time of 年
export const LINES: {bar: number; text: string; syl: {ch: string; t: number}[]}[] = SUNG.map((line, bar) => ({
  bar,
  text: line.map(([c]) => c).join(''),
  syl: line.map(([ch, n]) => ({ch, t: n < 0 ? NIAN : grid(bar, n)})),
}));
// t of the i-th syllable of a line
export const syl = (line: number, i: number) => LINES[line].syl[i].t;

// Hits: syllables that shake the frame (strength 0..1)
export const HITS: [number, number][] = [
  [syl(0, 2), 0.8], [syl(0, 3), 0.6], [syl(2, 5), 0.7], [syl(2, 6), 0.7], [syl(3, 6), 0.9], [syl(5, 5), 1],
];

// ---- story cues (everything below is derived from the syllables, so moving a syllable moves its action) ----
export const NIGHT = {tap1: syl(0, 0), tap2: syl(0, 1), knock: syl(0, 2), jolt: syl(0, 3), heart: syl(0, 7), glow: syl(0, 8)};
export const DAWN = {open1: syl(1, 2), open2: syl(1, 3), open3: syl(1, 6), blink: syl(1, 7), blink2: BARLINE[2] - 0.45};
export const WORLD = {look1: syl(2, 0), look2: syl(2, 1), stamp1: syl(2, 5), stamp2: syl(2, 6), slow: syl(2, 7), ask: syl(2, 8), tilt: syl(2, 9), globe: syl(2, 10)};
export const PLANET = {orbit: [syl(3, 3), syl(3, 4), syl(3, 5), syl(3, 6)], brake: syl(3, 6)};
export const SPRING = {gust: syl(4, 0), cap: syl(4, 2), letter: syl(4, 4), drift: syl(4, 5)};
export const HEART = {open: BARLINE[5] + 0.24, blow: syl(5, 0), wobble: syl(5, 1), spark: syl(5, 2), land: syl(5, 5),
  beats: [syl(5, 5), syl(5, 5) + PULSE, syl(5, 5) + 2 * PULSE], wipe: syl(5, 5) + 2 * PULSE};

// The pulse index at time t (−1 before the first downbeat), and seconds since that pulse
export const pulseAt = (t: number) => Math.floor((t - T0) / PULSE + 1e-6);
export const sincePulse = (t: number) => {
  const k = pulseAt(t);
  return k < 0 ? 1e3 : t - (T0 + k * PULSE);
};
