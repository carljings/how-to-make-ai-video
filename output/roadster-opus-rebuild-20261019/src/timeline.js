// timeline.js — THE single source of time for picture, type and sound (tools/score.mjs imports it too).
// 《看不见的十吨》 v2: 42.3 s, 1080×1920, 30 fps, cut on a 120 BPM grid (one beat = 0.5 s = 15 frames). Pure data, no DOM.
export const W = 1080, H = 1920, FPS = 30;
export const BPM = 120, BEAT = 60 / BPM;
export const END = 42.3;
export const FRAMES = Math.round(END * FPS);   // 1269

// named instants (s); every cut and every reveal sits on a beat (multiples of 0.5 s) unless noted
export const T = {
  hook: 0.0, q: 0.5,
  air: 3.5, airWord: 4.5,
  ten: 6.0, colUp: 6.5, colDown: 8.0, tenHit: 9.0,
  dirs: 11.0, plate: 13.0,
  under: 15.0, fan: 15.25, push: 18.5, net: 19.0, five: 21.0,
  chase: 25.0,
  drop: 27.0, tipOff: 27.6, flankOn: 29.0, underOn: 29.8, level: 30.6, catch: 31.0, gasLine: 30.9, refill: 33.7,
  answer: 35.5, ansQ: 35.75, ansA: 36.5, ansB: 37.0,
  fadeStart: 40.6, fadeEnd: 41.9,
};

// shots: kind 3d | 2d; fn names in film.js
export const SHOTS = [
  { id: 'S1', t0: 0.0, t1: T.air, kind: '3d', fn: 'hook', what: 'pull back from the inverted car to the height of the ramp' },
  { id: 'S2', t0: T.air, t1: T.ten, kind: '3d', fn: 'airReveal', what: 'the same scene turns to air vision' },
  { id: 'S3', t0: T.ten, t1: T.dirs, kind: '2d', fn: 'tenTonnes', what: 'a 1 m² square, the air column above it, ≈10 t' },
  { id: 'S4', t0: T.dirs, t1: T.under, kind: '2d', fn: 'allDirections', what: 'pressure from every side; equal on both sides cancels' },
  { id: 'S5', t0: T.under, t1: T.chase, kind: '2d', fn: 'crossSection', what: 'fan + seal lower the gap pressure; outside pushes the car onto the ramp; ≈5 % example' },
  { id: 'S6', t0: T.chase, t1: T.drop, kind: '3d', fn: 'chase', what: 'the car races toward the end of the deck' },
  { id: 'S7', t0: T.drop, t1: T.answer, kind: '3d', fn: 'drop', what: 'one unbroken slow-motion take: leaves the deck, rolls, jets, into its own cloud' },
  { id: 'S8', t0: T.answer, t1: END, kind: '3d', fn: 'answer', what: 'back to the opening: outside air presses the car onto the ramp' },
];
export const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];

// colours (semantic): orange = outside air pressing; blue = the lower-pressure gap; mint = own gas / thrust;
// white = gravity and neutral text
export const C = { white: '#F4F6FA', dim: '#AEB8C6', orange: '#FF8A3D', blue: '#59B8FF', mint: '#5CF2CB', red: '#FF4D4D' };

// type. roles: hero (900, 124 px) · big (900, 210 px) · support (500, 58 px) · note (500, 38 px)
// a card: y (centre of the block), out (exit start), lines [{text, role, at, spans: [{k, c}] }], exit 'fade' | 'fall'
export const CARDS = [
  { id: 'q', y: 1430, out: 3.3, lines: [
    { text: '倒着开的车', role: 'support', at: 0.1 },
    { text: '凭什么不掉？', role: 'hero', at: T.q, spans: [{ k: '不掉', c: 'orange' }] }] },
  { id: 'air', y: 1430, out: 5.85, lines: [
    { text: '答案，在你看不见的地方', role: 'support', at: 3.6 },
    { text: '空气', role: 'big', at: T.airWord, spans: [{ k: '空气', c: 'blue' }] }] },
  { id: 'ten', y: 330, out: 10.8, lines: [
    { text: '你头上每 1 平方米的空气', role: 'support', at: 6.15 }] },
  { id: 'tenNote', y: 1620, out: 10.85, lines: [
    { text: '海平面附近 · 1 个标准大气压', role: 'note', at: 9.05 }] },
  { id: 'dirs', y: 1500, out: 12.85, lines: [
    { text: '四面八方都在压', role: 'hero', at: 11.1, spans: [{ k: '压', c: 'orange' }] }] },
  { id: 'cancel', y: 1500, out: 14.85, lines: [
    { text: '两边一样大', role: 'hero', at: 13.1 },
    { text: '就互相抵消', role: 'support', at: 13.35 }] },
  { id: 'fan', y: 1500, out: 18.15, lines: [
    { text: '风扇抽气 + 密封', role: 'hero', at: T.fan, spans: [{ k: '风扇抽气', c: 'blue' }, { k: '密封', c: 'blue' }] },
    { text: '车底气压变低（不是真空）', role: 'support', at: 16.0, spans: [{ k: '变低', c: 'blue' }] }] },
  { id: 'push', y: 1500, out: 20.45, lines: [
    { text: '外面压得更重', role: 'hero', at: T.push - 0.1, spans: [{ k: '更重', c: 'orange' }] },
    { text: '把车按在坡上', role: 'support', at: 18.85, spans: [{ k: '按在坡上', c: 'orange' }] }] },
  // the example is a rough quasi-static LOWER BOUND (Δp·A ≈ m·g only balances the weight); driving needs more margin
  { id: 'five', y: 1500, out: 24.8, lines: [
    { text: '举例：2 吨车，车底 4 ㎡', role: 'support', at: 20.7 },
    { text: '至少低约 5%', role: 'hero', at: T.five, spans: [{ k: '5%', c: 'blue' }] },
    { text: '只够托住重量，开起来要更多', role: 'support', at: 22.0, spans: [{ k: '要更多', c: 'orange' }] }] },
  // one card across the cut: the end of the deck, then the consequence; its glyphs fall as the car leaves the deck
  { id: 'end', y: 1500, out: 28.0, exit: 'fall', lines: [
    { text: '可是，坡有尽头', role: 'hero', at: 25.1 },
    { text: '离开坡面，压差就没了', role: 'support', at: 25.9 }] },
  { id: 'gas', y: 1530, out: 33.45, lines: [
    { text: '它自带一罐压缩气', role: 'hero', at: T.gasLine, spans: [{ k: '压缩气', c: 'mint' }] },
    { text: '向下喷气，推力向上', role: 'support', at: 31.5, spans: [{ k: '推力向上', c: 'mint' }] }] },
  { id: 'refill', y: 1560, out: 35.5, lines: [
    { text: '储气有限，用完要补', role: 'support', at: T.refill, spans: [{ k: '用完要补', c: 'mint' }] }] },
  { id: 'ans', y: 1400, out: T.fadeEnd, lines: [
    { text: '倒着开，凭什么不掉？', role: 'support', at: T.ansQ },
    { text: '外面的空气', role: 'hero', at: T.ansA, spans: [{ k: '空气', c: 'orange' }] },
    { text: '把它按在坡上', role: 'hero', at: T.ansB }] },
];

// small provenance tag, top left (windows in s)
export const TAGS = [
  { from: 0, to: T.air, text: 'CG重建 · 据特斯拉 2026.10.16 发布的视频' },
  { from: T.air, to: T.ten, text: 'CG重建 · 空气粒子为示意' },
  { from: T.ten, to: T.under, text: '原理示意' },
  { from: T.under, to: T.chase, text: '原理示意 · 比例夸张 · 举例估算，非实车数据' },
  { from: T.chase, to: T.drop, text: 'CG重建' },
  { from: T.drop, to: T.answer, text: 'CG重建 · 慢放' },
  { from: T.answer, to: T.fadeEnd, text: 'CG重建 · 叠加示意' },
];

// reading rule: after a line lands it stays ≥ max(1.2, 0.4 + 0.2 × CJK chars) s; whole card ≥ same rule on all chars
export const cjk = (s) => [...s].filter((c) => /[㐀-鿿]/.test(c)).length;
export const readNeed = (s) => Math.max(1.2, 0.4 + 0.2 * cjk(s));
export const allText = () => CARDS.flatMap((c) => c.lines.map((l) => l.text)).concat(TAGS.map((g) => g.text));
