// timeline.js — THE single source of time for picture and type (tools import it too). Pure data, no DOM.
// 《两次起飞》 v5: film time = music time up to bar 21, then the song's own opening two bars and its own stop (the ending) (the user's chosen music, played from 0 s, unedited, until its own ending).
// Every cut and reveal is asked for as a musical position (bar, beat, eighth) and resolved to the onset DETECTED there by
// tools/music_analyze.py (src/music.js). If no onset was detected within ±70 ms of that grid position, this module
// throws — a cut can never silently fall back to the fitted grid.
import { MUSIC } from './music.js';
export const W = 1080, H = 1920, FPS = 30;
export const BEAT = MUSIC.grid.beat_s, BAR = MUSIC.grid.bar_s;
const ONS = MUSIC.onsets.map((o) => o[0]);

// detected onset nearest to bar `bar`, beat `beat` (+ `eighth` × half a beat); returns { t, grid, err }
export function onsetAt(bar, beat = 0, eighth = 0) {
  const b = MUSIC.beats[bar * 4 + beat];
  if (!b) throw new Error(`no beat ${bar}.${beat} in the analysis`);
  const grid = b[0] + eighth * BEAT / 2;
  let best = null; for (const t of ONS) if (best === null || Math.abs(t - grid) < Math.abs(best - grid)) best = t;
  if (best === null || Math.abs(best - grid) > 0.07) throw new Error(`no detected onset within 70 ms of bar ${bar} beat ${beat}+${eighth}/2 (grid ${grid.toFixed(3)} s)`);
  return { t: best, grid, pos: `${bar}.${beat}${eighth ? '+' + eighth + '/8' : ''}` };
}
const Q = (bar, beat = 0, eighth = 0) => onsetAt(bar, beat, eighth).t;
// the music's own measured events (not onsets): the stop (silence) and the end
export const STOP = MUSIC.structure.stop[0], STOP_END = MUSIC.structure.stop[1], HARD_CUT = MUSIC.structure.hard_cut_s;
// THE ENDING (v5). The source has no ending (a mid-bar hard cut at 36.01 s). At the downbeat of bar 21 the film splices into
// the song's own first two bars — its first hit (the strongest onset of the file) lands on that downbeat — and those two
// bars end in the song's own stop. OFF_END maps the opening onto film time: detected bar-21 onset − detected first onset.
export const OFF_END = onsetAt(21, 0).t - MUSIC.onsets[0][0];          // ≈ 35.5144 s
export const SPLICE = onsetAt(21, 0).t - 0.024;                         // body fades out over [SPLICE, SPLICE+15 ms]; the opening is silent there
export const XFADE = 0.015;
const Qe = (bar, beat = 0, eighth = 0) => onsetAt(bar, beat, eighth).t + OFF_END;   // an onset of the opening, in ending film time
export const STOP_F = STOP + OFF_END;                                   // the song's own stop, in film time (≈ 38.97 s)

// cue points (s). Comment = musical position · what happens
export const T = {
  hook: 0,
  q: Q(0, 2),              // 0.2 · the question lands
  inv: Q(1, 0),            // bar 1 · cut: over the top, inverted
  run: Q(1, 2),            // 1.2 · cut: racing to the end of the deck
  stop: STOP,              // the song stops (measured) · cut: the car leaves the deck — slow motion in the silence
  slam: Q(3, 0),           // bar 3 · the beat returns · jets catch the car
  rew: Q(3, 3),            // 3.3 · rewind
  cut: Q(4, 1),            // 4.1 · back on the deck, the laser cuts the car open
  gap: Q(5, 0),            // bar 5 · the gap turns blue (fan + seals)
  press: Q(5, 2),          // 5.2 · cut: outside air presses — the push arrow
  weight: Q(6, 0),         // bar 6 · gravity arrow
  lip: Q(7, 0),            // bar 7 (phrase) · cut: the floor runs off the lip, the gap floods
  jets: Q(8, 1),           // 8.1 · cut: jets: exhaust down, thrust up, still falling
  gas: Q(9, 0),            // bar 9 · the reserve gauge drops
  map: Q(10, 0),           // bar 10 (riser bar) · cut: the jet map — where the jets are (schematic)
  mapL: Q(10, 1),          // 10.1 · the LEFT group fires
  mapR: Q(10, 2),          // 10.2 · the RIGHT group fires
  mapN: Q(10, 3),          // 10.3 · nose + floor fire
  lift: Q(11, 0),          // bar 11 (phrase) · cut: lift-off
  roll: Q(12, 0),          // bar 12 · cut: close, the roll
  btIn: Q(12, 1),          // 12.1 · bullet time: the roll nearly freezes, the camera orbits
  btOut: Q(12, 3),         // 12.3 (strong) · snap back to speed
  wide: Q(13, 0),          // bar 13 · cut: wide, the roll completes
  lab: Q(14, 0),           // bar 14 · cut: the torque lab
  fireA: Q(14, 1),         // 14.1 · car A fires left AND right: through its centre of mass
  fireB: Q(15, 0),         // bar 15 (phrase) · car B fires its LEFT side only → it rolls
  brake: Q(16, 0),         // bar 16 (strong) · car B fires its RIGHT side → the roll stops, level again
  replay: Q(17, 0),        // bar 17 · cut: the real roll with the overlay
  lines: Q(18, 0),         // bar 18 (bass drop-out) · cut: the visible lines
  sum1: Q(19, 0),          // bar 19 (phrase) · cut: summary 1
  sum2: Q(19, 2),          // 19.2 · cut: summary 2
  sum3: Q(19, 3, 1),       // 19.3+½ (strong, all bands) · cut: summary 3
  outro: Q(20, 2),         // 20.2 · cut: the lot car comes down
  land: Qe(0, 0),          // ending bar A (= the song's first hit, on the bar-21 downbeat) · the car touches down
  title: Qe(1, 0),         // ending bar B · cut: both flights, split screen, the title
  end: STOP_F,             // the song's own stop · picture fades to black
};
export const FADE_A0 = STOP_F, FADE_A1 = STOP_F + 0.25;  // after the song's own stop, its faint room tail goes to digital zero
export const FADE_V0 = STOP_F + 0.02, FADE_V1 = STOP_F + 0.5;   // picture to black on the stop
export const END = 39.8;                                 // ≥ 0.3 s of digital silence and black after both fades
export const FRAMES = Math.round(END * FPS);             // 1194
// audio map for tools: film [0, SPLICE+XFADE) ← source same time; film [SPLICE, FADE_A1] ← source (film − OFF_END)
export const MUSIC_MAP = [{ film: [0, SPLICE + XFADE], src0: 0 }, { film: [SPLICE, FADE_A1], src0: SPLICE - OFF_END }];
// a cut is drawn on the frame nearest its time (≤ 1/60 s away)
export const frameOf = (t) => Math.round(t * FPS);

// shots: kind '3d' (fn in film.js); every boundary is a cue above
export const SHOTS = [
  { id: 'A1', t0: T.hook, t1: T.inv, fn: 'climb', what: 'Demo ① cold open: the car climbs the curve of The Ramp' },
  { id: 'A2', t0: T.inv, t1: T.run, fn: 'over', what: 'over the top: inverted' },
  { id: 'A3', t0: T.run, t1: T.stop, fn: 'run', what: 'inverted, racing to the free end of the deck' },
  { id: 'A4', t0: T.stop, t1: T.slam, fn: 'leave', what: 'in the song’s own silence: off the end, the half roll, slow motion' },
  { id: 'A5', t0: T.slam, t1: T.rew, fn: 'catch', what: 'the beat returns: jets fire, the car is caught and drops into its cloud' },
  { id: 'A6', t0: T.rew, t1: T.cut, fn: 'rewind', what: 'rewind to the inverted car' },
  { id: 'P1', t0: T.cut, t1: T.press, fn: 'section', what: 'the laser cuts the car open: fan + seals, the gap at low pressure' },
  { id: 'P2', t0: T.press, t1: T.lip, fn: 'pressure', what: 'outside air presses harder: the push toward the deck, larger than the weight' },
  { id: 'P3', t0: T.lip, t1: T.jets, fn: 'release', what: 'the floor runs off the lip: the gap floods, the push vanishes, the car drops' },
  { id: 'P4', t0: T.jets, t1: T.map, fn: 'thrust', what: 'jets: exhaust down, reaction up, still falling; the reserve drops' },
  { id: 'M1', t0: T.map, t1: T.lift, fn: 'jetmap', what: 'the jet map: left group, right group, nose + floor fire on the beats (schematic positions)' },
  { id: 'B2', t0: T.lift, t1: T.roll, fn: 'lift', what: 'Demo ② (Musk’s parking lot, another place and time): four jets down, lift-off' },
  { id: 'B3', t0: T.roll, t1: T.wide, fn: 'flip', what: 'close: the roll, bullet-time orbit, snap back' },
  { id: 'B4', t0: T.wide, t1: T.lab, fn: 'flipWide', what: 'wide: the roll completes, the car levels' },
  { id: 'L1', t0: T.lab, t1: T.replay, fn: 'lab', what: 'the torque lab: A fires both sides (no turn); B fires left (rolls), then right (stops)' },
  { id: 'B5', t0: T.replay, t1: T.lines, fn: 'replay', what: 'the real roll again from behind: left/right nozzles, centre of mass, roll' },
  { id: 'B6', t0: T.lines, t1: T.sum1, fn: 'lines', what: 'the visible lines of the source video — role unknown' },
  { id: 'S1', t0: T.sum1, t1: T.sum2, fn: 'sum1', what: 'summary: stick = pressure difference' },
  { id: 'S2', t0: T.sum2, t1: T.sum3, fn: 'sum2', what: 'summary: hold = thrust' },
  { id: 'S3', t0: T.sum3, t1: T.outro, fn: 'sum3', what: 'summary: flip = torque' },
  { id: 'S4', t0: T.outro, t1: T.title, fn: 'outro', what: 'the lot car comes down and touches down on the song’s first hit; the summary stays' },
  { id: 'E1', t0: T.title, t1: END, fn: 'finale', what: 'split screen: both flights, the title; black on the song’s own stop' },
];
export const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];

// colours (semantic): orange = outside air pressing; blue = the low-pressure gap; mint = own gas / thrust;
// yellow = torque geometry (centre of mass, lever arm); white = gravity, velocity, neutral text
export const C = { white: '#F4F6FA', dim: '#AEB8C6', orange: '#FF8A3D', blue: '#59B8FF', mint: '#5CF2CB', yellow: '#FFD84D', red: '#FF4D4D',
  L: '#45D4FF', R: '#FF6FCF' };   // L/R = the car's left / right jets (seen from behind: left on the left)

// type. roles: hero (900, 112 px) · big (900, 220 px) · support (500, 56 px) · note (500, 38 px)
// a card: y (centre of the block), out (exit start), lines [{text, role, at, spans}], exit 'fade' | 'fall' | 'cut' (gone with the picture cut)
export const CARDS = [
  { id: 'q', y: 1480, out: T.stop, exit: 'fall', lines: [
    { text: '演示① 特斯拉 · 倒挂爬坡', role: 'support', at: 0.1 },
    { text: '凭什么不掉？', role: 'hero', at: T.q, spans: [{ k: '不掉', c: 'orange' }] }] },
  { id: 'catch', y: 1480, out: T.rew, exit: 'cut', lines: [
    { text: '喷气接住', role: 'hero', at: T.slam + 0.01, spans: [{ k: '喷气', c: 'mint' }] }] },
  { id: 'gap', y: 1500, out: T.press, exit: 'cut', lines: [
    { text: '车底气压变低', role: 'hero', at: T.cut + 0.1, spans: [{ k: '变低', c: 'blue' }] },
    { text: '风扇抽气 + 密封', role: 'support', at: T.cut + 0.38, spans: [{ k: '风扇抽气', c: 'blue' }, { k: '密封', c: 'blue' }] }] },
  { id: 'press', y: 1500, out: T.lip, exit: 'cut', lines: [
    { text: '外面气压更高', role: 'hero', at: T.press + 0.05, spans: [{ k: '更高', c: 'orange' }] },
    { text: '压差把车按向坡面', role: 'support', at: T.press + 0.35, spans: [{ k: '按向坡面', c: 'orange' }] }] },
  { id: 'release', y: 1500, out: T.jets, exit: 'cut', lines: [
    { text: '坡到头 → 压差没了', role: 'hero', at: T.lip + 0.02 },
    { text: '开始往下掉', role: 'support', at: T.lip + 0.3 }] },
  { id: 'thrust', y: 1500, out: T.map, exit: 'cut', lines: [
    { text: '向下喷气 → 反推向上', role: 'hero', at: T.jets + 0.02, spans: [{ k: '反推向上', c: 'mint' }] },
    { text: '储气有限，用完要补', role: 'support', at: T.jets + 0.6, spans: [{ k: '用完要补', c: 'mint' }] }] },
  { id: 'map', y: 1560, out: T.lift, exit: 'cut', lines: [
    { text: '左右都有喷口', role: 'hero', at: T.map + 0.02, spans: [{ k: '左', c: 'L' }, { k: '右', c: 'R' }] }] },
  { id: 'demo2', y: 330, out: T.roll + 0.6, lines: [
    { text: '演示②', role: 'big', at: T.lift + 0.02 },
    { text: '马斯克发布 · 停车场', role: 'support', at: T.lift + 0.22 }] },
  { id: 'lift', y: 1500, out: T.roll, exit: 'cut', lines: [
    { text: '向下喷气 → 升空', role: 'hero', at: T.lift + 0.02, spans: [{ k: '升空', c: 'mint' }] }] },
  { id: 'flip', y: 1500, out: T.wide, exit: 'cut', lines: [
    { text: '空中翻一整圈', role: 'hero', at: T.roll + 0.03 }] },
  { id: 'how', y: 1500, out: T.lab, exit: 'cut', lines: [
    { text: '怎么翻过来的？', role: 'hero', at: T.wide + 0.03, spans: [{ k: '翻', c: 'yellow' }] }] },
  { id: 'labA', y: 1560, out: T.fireB, exit: 'cut', lines: [
    { text: '左右一起喷', role: 'hero', at: T.lab, spans: [{ k: '左', c: 'L' }, { k: '右', c: 'R' }] },
    { text: '只升不转', role: 'support', at: T.fireA + 0.05 }] },
  { id: 'labB', y: 1560, out: T.brake, exit: 'cut', lines: [
    { text: '只喷左边', role: 'hero', at: T.fireB, spans: [{ k: '左边', c: 'L' }] },
    { text: '绕重心翻转', role: 'support', at: T.fireB + 0.3, spans: [{ k: '翻转', c: 'yellow' }] }] },
  { id: 'labC', y: 1560, out: T.replay, exit: 'cut', lines: [
    { text: '右边反喷', role: 'hero', at: T.brake, spans: [{ k: '右边', c: 'R' }] },
    { text: '转动停住', role: 'support', at: T.brake + 0.3 }] },
  { id: 'replay', y: 1500, out: T.lines, exit: 'cut', lines: [
    { text: '左右推力差 → 力矩', role: 'hero', at: T.replay, spans: [{ k: '左', c: 'L' }, { k: '右', c: 'R' }, { k: '力矩', c: 'yellow' }] }] },
  { id: 'lines', y: 1500, out: T.sum1 + 0.12, lines: [
    { text: '原片可见细线', role: 'hero', at: T.lines + 0.03 },
    { text: '作用未知', role: 'support', at: T.lines + 0.3, spans: [{ k: '未知', c: 'yellow' }] }] },
  { id: 'sum', y: 1400, out: T.title, exit: 'cut', lines: [
    { text: '贴住坡：压差', role: 'hero', at: T.sum1 + 0.38, spans: [{ k: '压差', c: 'orange' }] },
    { text: '托住车：反推', role: 'hero', at: T.sum2 + 0.02, spans: [{ k: '反推', c: 'mint' }] },
    { text: '翻过来：力矩', role: 'hero', at: T.sum3 + 0.02, spans: [{ k: '力矩', c: 'yellow' }] }] },
  { id: 'title', y: 960, out: FADE_V1, lines: [
    { text: '两次起飞', role: 'big', at: T.title + 0.02 }] },
];

// small provenance tag, top left (windows in s)
export const TAGS = [
  { from: 0, to: T.stop, text: '演示① · 据特斯拉 2026.10.16 发布视频 · CG重建 · 变速' },
  { from: T.stop, to: T.slam, text: 'CG重建 · 慢放 · 子弹时间' },
  { from: T.slam, to: T.cut, text: 'CG重建 · 变速' },
  { from: T.cut, to: T.jets, text: '原理示意 · 剖面 · 非实车布局' },
  { from: T.jets, to: T.map, text: 'CG重建 · 叠加示意' },
  { from: T.map, to: T.lift, text: '喷口位置为示意 · 据两段原片可见喷流 · 非原厂图纸' },
  { from: T.lift, to: T.lab, text: '演示② 另一场演示 · 据马斯克发布视频 · CG重建 · 变速 · 原片有细线' },
  { from: T.lab, to: T.replay, text: '原理示意 · 慢放 · 只画推力 · 非真实控制方式' },
  { from: T.replay, to: T.lines, text: '叠加示意 · 各喷口何时喷、推力多大：未公开' },
  { from: T.lines, to: T.sum1, text: 'CG重建 · 细线位置据原片' },
  { from: T.sum1, to: T.outro, text: 'CG重建 · 示意' },
  { from: T.outro, to: T.title, text: 'CG重建 · 落下停住为示意' },   // the fit runs below ground after s 11.72: touchdown + stop are staged
  { from: T.title, to: FADE_V1, text: '上：据特斯拉发布视频 · 下：据马斯克发布视频 · CG重建' },
];

// a few 2D labels anchored to 3D points are drawn by film.js; their strings are listed here for the font subset
export const LABELS = ['低压', '密封', '抽气', '外面空气', '压差合力', '重力', '推力', '仍在下落', '速度', '储气', '重心', '力臂', '推力作用线',
  '力矩', '细线', '倒带', 'A', 'B', '翻转', '坡面', '左侧', '右侧', '车头', '左', '右', '左侧喷口', '右侧喷口', '左底喷口', '右底喷口', '左底', '右底', '演示① 坡道倒挂', '演示② 停车场翻转'];

// reading rule (v2, ~8 CJK chars/s): after a line lands it stays ≥ max(0.8, 0.3 + 0.13 × CJK chars) s; whole card ≥ 0.3 + 0.11 × all
export const cjk = (s) => [...s].filter((c) => /[㐀-鿿]/.test(c)).length;
export const allText = () => CARDS.flatMap((c) => c.lines.map((l) => l.text)).concat(TAGS.map((g) => g.text), LABELS);
