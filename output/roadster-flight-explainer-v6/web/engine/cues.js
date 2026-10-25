// cues.js — v6 「空气现形」 text-led, voice-free cut. THE single source of time for picture, type and sound.
// Pure data + pure functions, no DOM: imported by the browser engine (timeline.js, text.js) and by Node tools (score.mjs,
// mix.mjs, render.mjs --info, text_inventory.mjs). Every on-screen string lives in this file (STR + CARDS); text.js holds
// no Chinese literals. Times are film seconds at 30 fps. Nothing here depends on speech, TTS or v5 word timings.

export const FPS = 30;

// ------------------------------------------------------------------------------------------------ shots
// fn: the shot function in timeline.js; world: night | air | lot | black (drives the provenance tag)
export const SHOTS = [
  { id: 'A1', t0: 0.0, t1: 3.6, fn: 's01', world: 'night', what: 'frame-0 poster: inverted car under the ceiling, dust falling through flood shafts' },
  { id: 'A2', t0: 3.6, t1: 5.7, fn: 's02', world: 'night', what: 'head-on at the slit between car and ceiling; fans spool up' },
  { id: 'A3', t0: 5.7, t1: 9.6, fn: 's03', world: 'night>air', what: 'the Ping: air becomes visible; gold impacts; the push slams into the ceiling' },
  { id: 'B1', t0: 9.6, t1: 12.9, fn: 's04', world: 'air', what: 'oblique x-ray: fans pull the slit air out' },
  { id: 'B2', t0: 12.9, t1: 20.1, fn: 's05', world: 'air', what: 'outside heavy / slit light; impacts converge into one push; split into the tyres' },
  { id: 'B3', t0: 20.1, t1: 22.6, fn: 's06', world: 'night', what: 'tyre macro on the ceiling; grip; the car pulls away' },
  { id: 'C1', t0: 22.6, t1: 27.0, fn: 's07', world: 'air', what: 'hologram ramp: the push always into the surface, gravity always down' },
  { id: 'D1', t0: 27.0, t1: 29.1, fn: 's08', world: 'night', what: 'chase toward the deck free end; the edge lights' },
  { id: 'D2', t0: 29.1, t1: 32.0, fn: 's09', world: 'night>air', what: 'side-on at the free end: slit opens, push breaks, gravity remains' },
  { id: 'D3', t0: 32.0, t1: 32.8, fn: 's09b', world: 'night', what: 'from below: the car leaves the deck and drops' },
  { id: 'E1', t0: 32.8, t1: 35.3, fn: 's10', world: 'night>air', what: 'scan plane reveals the stored gas (schematic vessels)' },
  { id: 'E2', t0: 35.3, t1: 38.3, fn: 's11', world: 'air', what: 'jets down, reaction up' },
  { id: 'E3', t0: 38.3, t1: 39.0, fn: 's11b', world: 'night', what: 'into its own cloud' },
  { id: 'S', t0: 39.0, t1: 40.0, fn: 's12', world: 'black', what: 'separator: another demonstration' },
  { id: 'F1', t0: 40.0, t1: 45.8, fn: 's13', world: 'lot', what: 'kickflip: off-centre thrust, freeze, twist, flip; cables stay' },
  { id: 'G1', t0: 45.8, t1: 54.1, fn: 's14', world: 'night', what: 'summary on the ramp wide; the carried gas runs out; title' },
];
export const END = 54.1;
export const FRAMES = Math.ceil(END * FPS - 1e-9);                       // 1623
export const PROOF = { from: 0, to: 386, seconds: 12.9, what: 'A1–B1: poster, question, misconception, Ping/压 reveal, fans pull the slit air out' };

// ------------------------------------------------------------------------------------------------ picture/sound events
// Named instants (s). timeline.js maps the existing v5 shot functions onto these; score.mjs hits the same instants.
export const E = {
  // A1 hook
  hook: 0.0,
  cut12: 3.6,
  // A2 吸?
  xi: 3.75, crack: 5.4, cut23: 5.7,
  // A3 the Ping → 压
  ping: 5.9, airLine: 6.3, press: 7.2, cut34: 9.6,
  // B1 fans pull the slit air out
  fans: 9.85, suck: 10.3, evacStart: 10.25, evacDur: 1.6, cut45: 12.9,
  // B2 outside heavy / slit light → one push → into the tyres
  outer: 13.15, inner: 13.85, converge: 16.0, beam: 16.55, an: 19.4, cut56: 20.1,
  // B3 grip
  zhua: 20.75, cut67: 22.6,
  // C1 always into the surface
  force: 22.85, wall: 23.7, gravAll: 24.4, ceil: 25.1, always: 25.3, toward: 25.9, cut78: 27.0,
  // D1 the free end
  endOf: 27.6, cut89: 29.1,
  // D2 the slit opens → no pressure difference → D3 the drop
  open: 29.45, lose: 30.25, drop: 32.0, textFall: 32.3, cut910: 32.8,
  // E1 its own high-pressure cold gas
  swap: 32.9, own: 33.0, hp: 33.5, cut1011: 35.3,
  // E2 down → up
  spray: 35.75, push: 36.55, plunge: 38.3,
  // E3 / S separator
  black: 39.0, sepIn: 39.05, lot: 40.0,
  // F1 the other demonstration
  kfJet: 40.7, kfOff: 41.1, kfCom: 41.5, kfResume: 43.0, flipLine: 43.25, flip: 43.85, over: 44.6, cut1314: 45.8,
  // G1 summary, the finite reserve, title
  borrow: 46.05, spend: 46.85, spent: 50.05, title: 52.05, end: END,
};

// ------------------------------------------------------------------------------------------------ every on-screen string
// Provenance and fixed copy (cards below hold the explanatory lines).
export const STR = {
  srcTesla: 'CG重建 · 据特斯拉 2026.10.16 发布的视频',
  srcMusk: 'CG重建 · 据马斯克 2026.10.16 发布的视频',
  tagNight: 'CG重建',
  tagAir: '原理示意 · 非实拍',
  cable: '画面中可见细线，作用未公开',
  schematic: '风扇、储气、喷口与受力为示意',
  title: '空气现形',
  com: '重心',                                                       // the small centre-of-mass mark in the F1 freeze
};

// Semantic colours (type): gold = outside air pressure / the push; ice = low pressure in the slit, the air; cyan = the
// car's own gas; white = gravity, neutral statements.
export const COLORS = { white: '#f3f5f8', gold: '#ffc46b', ice: '#a6e0ff', cyan: '#62e6ff', dim: 'rgba(232,238,245,0.78)' };

// Text cards. A card: block centre y (px, 1080×1920 space), out (exit starts; 0.25 s fade), lines[]. A line: text, role
// (hero | support | heavy | light | chapter), at (entry start; 0.3 s staggered), optional spans (colour/scale/anim per
// substring), anim (line entry: rise | none | drop | float | down | up | flip), exit (fade | fall | crack).
// Reading rule (checked by tools/text_inventory.mjs), with R(n) = max(1.2 s, 0.4 s + 0.2 s × n CJK characters):
//   1. after the last line has landed, the card holds still for ≥ R(characters of that line);
//   2. from the first line's landing to the exit, ≥ R(characters of the whole card).
export const CARDS = [
  { id: 'C01', shot: 'A1', y: 1236, out: 3.3, lines: [
    { text: '它凭什么不掉？', role: 'hero', at: 0.0, anim: 'none', spans: [{ k: '不掉', color: 'white', glow: 'red' }] }] },
  { id: 'C02', shot: 'A2', y: 1290, out: 5.55, exit: 'crack', crack: { k: '吸', at: E.crack }, lines: [
    { text: '被吸住的？', role: 'hero', at: E.xi, spans: [{ k: '吸', color: 'ice', scale: 1.22 }] }] },
  { id: 'C03', shot: 'A3', y: 1240, out: 9.35, lines: [
    { text: '是空气，', role: 'support', at: E.airLine },
    { text: '把它压在顶上', role: 'hero', at: E.press, anim: 'none', spans: [{ k: '压', color: 'gold', scale: 1.5, anim: 'slam' }] }] },
  { id: 'C04', shot: 'B1', y: 1260, out: 12.7, lines: [
    { text: '风扇抽走缝里的空气', role: 'hero', at: 9.95, spans: [{ k: '风扇', color: 'ice' }, { k: '抽走', color: 'ice' }] }] },
  { id: 'C05', shot: 'B2', y: 1250, out: 16.0, lines: [
    { text: '外面 压得重', role: 'heavy', at: E.outer, anim: 'drop', spans: [{ k: '外面 压得重', color: 'gold' }] },
    { text: '缝里 压得轻', role: 'light', at: E.inner, anim: 'float', spans: [{ k: '缝里 压得轻', color: 'ice' }] }] },
  { id: 'C06', shot: 'B2', y: 1260, out: 19.15, lines: [
    { text: '压力差', role: 'hero', at: E.beam, spans: [{ k: '压力差', color: 'gold' }] },
    { text: '把车按向坡面', role: 'support', at: E.beam + 0.2 }] },
  { id: 'C07', shot: 'B2>B3', y: 1250, out: 22.35, lines: [
    { text: '轮胎被压紧，', role: 'support', at: E.an, spans: [{ k: '压紧', color: 'gold' }] },
    { text: '才抓得住', role: 'hero', at: E.zhua, anim: 'drop' }] },
  { id: 'C08', shot: 'C1', y: 1300, out: 26.85, lines: [
    { text: '这股力，始终压向坡面', role: 'support', at: E.force, spans: [{ k: '这股力', color: 'gold' }, { k: '压向坡面', color: 'gold' }] },
    { text: '重力，始终向下', role: 'hero', at: E.gravAll }] },
  { id: 'C09', shot: 'D1', y: 1240, out: 28.95, edge: { at: E.endOf }, lines: [
    { text: '坡，总有尽头', role: 'hero', at: 27.1 }] },
  { id: 'C10', shot: 'D2>D3', y: 1300, out: E.textFall, exit: 'fall', lines: [
    { text: '缝一敞开，', role: 'support', at: E.open, spans: [{ k: '敞开', color: 'ice' }] },
    { text: '压力差就没了', role: 'hero', at: E.lose, spans: [{ k: '压力差', color: 'gold' }] }] },
  { id: 'C11', shot: 'E1', y: 1250, out: 35.3, lines: [
    { text: '它自带高压冷气', role: 'hero', at: E.own, spans: [{ k: '高压冷气', color: 'cyan' }] }] },
  { id: 'C12', shot: 'E2', y: 1250, out: 38.15, lines: [
    { text: '气往下喷', role: 'hero', at: E.spray, anim: 'down', arrow: 'down', spans: [{ k: '往下喷', color: 'cyan' }] },
    { text: '车往上推', role: 'hero', at: E.push, anim: 'up', arrow: 'up', spans: [{ k: '往上推', color: 'cyan' }] }] },
  { id: 'CH', shot: 'S>F1', y: 930, out: 40.9, lines: [
    { text: '另一场演示', role: 'chapter', at: E.sepIn },
    { text: STR.srcMusk, role: 'source', at: E.sepIn + 0.15 }] },
  { id: 'C13', shot: 'F1', y: 1290, out: 45.35, lines: [
    { text: '喷气偏离重心', role: 'hero', at: 41.15, spans: [{ k: '偏离重心', color: 'cyan' }] },
    { text: '车就翻了过来', role: 'hero', at: E.flipLine, anim: 'flip' }] },
  { id: 'C15', shot: 'G1', y: 1250, out: 49.8, lines: [
    { text: '坡上，借空气的力', role: 'hero', at: E.borrow, spans: [{ k: '借空气的力', color: 'gold' }] },
    { text: '空中，花自己的气', role: 'hero', at: E.spend, spans: [{ k: '花自己的气', color: 'cyan' }] }] },
  { id: 'C16', shot: 'G1', y: 1250, out: 51.9, lines: [
    { text: '花完，就没了', role: 'hero', at: E.spent, spans: [{ k: '花完', color: 'cyan' }] }] },
  { id: 'TITLE', shot: 'G1', y: 380, out: 99, lines: [
    { text: STR.title, role: 'title', at: E.title },
    { text: STR.srcTesla, role: 'credit', at: E.title + 0.3 },
    { text: STR.srcMusk, role: 'credit', at: E.title + 0.3 },
    { text: STR.schematic, role: 'credit', at: E.title + 0.3 }] },
];

// Provenance tag (top left) and the source line under it, and the cable footnote. Windows in seconds.
export const TAGS = {
  sourceIntro: { text: STR.srcTesla, from: 0.0, to: 3.3 },          // full source line at the start, then the compact tag
  cableNote: { text: STR.cable, from: 40.5, to: 45.6 },            // still footnote at the top through the kickflip
  hideFrom: E.title - 0.2,                                           // the title card carries the sources itself
};
// world → compact tag (tagNight for night/lot reconstruction, tagAir for air vision / x-ray)
export function tagFor(world) { return world === 'air' ? STR.tagAir : world === 'black' ? null : STR.tagNight; }

// ------------------------------------------------------------------------------------------------ helpers
export const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
export const cjkCount = (s) => [...s].filter((c) => /[\u3400-\u9fff]/.test(c)).length;
export const readNeed = (s) => Math.max(1.2, 0.4 + 0.2 * cjkCount(s));
export const ENTRY = 0.3, STAGGER = 0.03, EXIT = 0.25;
// when a line has fully landed (all characters in)
export const landed = (line) => line.anim === 'none' ? line.at + 0.15 : line.at + ENTRY + STAGGER * Math.max(0, [...line.text].length - 1);
// when a card has fully left the screen, as text.js draws it: fade/crack exits end EXIT after out; the fall exit drops
// glyph i from out + 0.035 s × i and it is gone 0.42 s later
export const cardGone = (c) => Math.min(END, c.exit === 'fall'
  ? c.out + 0.42 + 0.035 * (Math.max(...c.lines.map((l) => [...l.text].length)) - 1)
  : c.out + EXIT);

// all on-screen strings with their windows (for the inventory and coverage check)
export function inventory() {
  const items = [];
  for (const c of CARDS) for (const l of c.lines) items.push({ id: `${c.id}.${c.lines.indexOf(l) + 1}`, text: l.text, role: l.role, from: l.at, to: cardGone(c) });
  items.push({ id: 'TAG.source', text: TAGS.sourceIntro.text, role: 'tag', from: TAGS.sourceIntro.from, to: TAGS.sourceIntro.to });
  items.push({ id: 'TAG.night', text: STR.tagNight, role: 'tag', from: TAGS.sourceIntro.to, to: TAGS.hideFrom, note: 'in night/lot shots' });
  items.push({ id: 'TAG.air', text: STR.tagAir, role: 'tag', from: E.ping, to: TAGS.hideFrom, note: 'in air-vision / x-ray shots' });
  items.push({ id: 'NOTE.cable', text: TAGS.cableNote.text, role: 'note', from: TAGS.cableNote.from, to: TAGS.cableNote.to });
  items.push({ id: 'MARK.com', text: STR.com, role: 'mark', from: E.kfOff + 0.4, to: E.kfResume + 0.4, note: 'small label at the centre-of-mass dot during the freeze' });
  return items;
}
