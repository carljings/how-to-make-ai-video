// cues.js — v7 「空气现形」 science-corrected, text-led, voice-free cut. THE single source of time for picture, type,
// diagram plates and sound. Pure data + pure functions, no DOM: imported by the browser engine (timeline.js, text.js,
// diagram.js) and by Node tools (score.mjs, mix.mjs, render.mjs --info, text_inventory.mjs). Every on-screen string
// lives in this file (STR, CARDS, PLATES); text.js and diagram.js hold no Chinese literals. Times are film seconds at
// 30 fps. Corrections against SCIENCE_AUDIT.en.md / science-claims.json are marked with their claim ids (A01–A22).

export const FPS = 30;

// ------------------------------------------------------------------------------------------------ picture/sound events
// Named instants (s). timeline.js maps the shot functions onto these; score.mjs hits the same instants.
export const E = {
  // A1 hook
  hook: 0.0, cut12: 3.6,
  // A2 the legitimate question (A04: suction is pressure-difference adhesion; no crack, no "not suction" twist)
  ask: 3.62, cut23: 5.85,
  // A3 the Ping → air presses on every surface (no net push yet)
  ping: 5.95, airLine: 6.3, press: 7.15, cut34: 9.55,
  // B1 plate 1: fan + ground seal maintain a low-pressure region (A02, A03, A20)
  plate1: 9.55, sealOn: 10.45, fanOn: 10.65, lowP: 11.35, leakOn: 11.85, cut45: 13.8,
  // B2 outside higher / underneath lower → the pressure difference → tyres pressed (A05, A06, A09)
  outer: 14.05, inner: 14.75, converge: 17.0, beam: 17.55, an: 20.4, cut56: 21.1,
  // B3 grip
  zhua: 21.75, cut67: 23.6,
  // C1 always toward the surface, gravity always down (A07–A09)
  force: 23.85, wall: 24.7, gravAll: 25.4, ceil: 26.1, always: 26.3, toward: 26.9, cut78: 28.0,
  // D1 the free end of the finite flat deck
  endOf: 28.6, cut89: 30.1,
  // D2 seal broken → adhesion weakens progressively (A10); clear: the source clock key where the floor has crossed
  open: 30.45, weak: 30.9, clear: 31.25, drop: 33.0, textFall: 33.3, cut910: 33.8,
  // E1 plate 2: onboard high-pressure gas, reservoir → control valve → nozzle (A11–A13)
  plate2: 33.8, valve: 35.0, cut1011: 37.3,
  // E2 exhaust down / thrust up; the car keeps descending (A14, A15)
  spray: 37.75, push: 38.55, plunge: 40.3,
  // E3 / S separator
  black: 41.0, sepIn: 41.05, lot: 42.0,
  // F1 the other demonstration: freeze → plate 3 (A16–A18) → resume, flip
  kfJet: 42.7, kfOff: 43.1, kfResume: 47.05, net: 47.15, flip: 47.9, over: 48.65, cut1314: 49.95,
  // G1 summary, the finite and refillable reserve (A19), title
  borrow: 50.2, spend: 51.0, refill: 53.95, title: 56.4,
};
export const END = 59.0;
E.end = END;
export const FRAMES = Math.ceil(END * FPS - 1e-9);                       // 1770

// ------------------------------------------------------------------------------------------------ shots
// fn: the shot function in timeline.js; world: night | air | diagram | lot | black (drives the provenance tag)
export const SHOTS = [
  { id: 'A1', t0: 0.0, t1: E.cut12, fn: 's01', world: 'night', what: 'frame-0 poster: inverted car under the finite flat ceiling, dust falling through flood shafts' },
  { id: 'A2', t0: E.cut12, t1: E.cut23, fn: 's02', world: 'night', what: 'head-on at the slit between car and ceiling: where does the adhesion come from?' },
  { id: 'A3', t0: E.cut23, t1: E.cut34, fn: 's03', world: 'night>air', what: 'the Ping: air becomes visible; gold impacts on every exposed face (pressure acts on all surfaces)' },
  { id: 'B1', t0: E.cut34, t1: E.cut45, fn: 's04', world: 'diagram', what: 'plate 1 (functional diagram, not the car layout): fan + ground seal maintain a low-pressure gap' },
  { id: 'B2', t0: E.cut45, t1: E.cut56, fn: 's05', world: 'air', what: 'outside higher / underneath lower; impacts converge into one push toward the ceiling; tyre reactions and gravity stay distinct' },
  { id: 'B3', t0: E.cut56, t1: E.cut67, fn: 's06', world: 'night', what: 'tyre macro on the ceiling; lilac contact glow; grip; the car pulls away' },
  { id: 'C1', t0: E.cut67, t1: E.cut78, fn: 's07', world: 'air', what: 'hologram ramp: the pressure load always toward the surface, gravity always down' },
  { id: 'D1', t0: E.cut78, t1: E.cut89, fn: 's08', world: 'night', what: 'chase toward the deck free end; the edge lights' },
  { id: 'D2', t0: E.cut89, t1: E.drop, fn: 's09', world: 'night>air', what: 'side-on at the free end: leakage grows, the push shrinks with the sealed share, gravity remains' },
  { id: 'D3', t0: E.drop, t1: E.cut910, fn: 's09b', world: 'night', what: 'from below: the car leaves the deck and drops' },
  { id: 'E1', t0: E.cut910, t1: E.cut1011, fn: 's10', world: 'diagram', what: 'plate 2 (functional diagram, not the car layout): reservoir → control valve → nozzle; exhaust down, thrust up' },
  { id: 'E2', t0: E.cut1011, t1: E.plunge, fn: 's11', world: 'air', what: 'the descending car: jets down, thrust up, gravity down (thrust up ≠ rising)' },
  { id: 'E3', t0: E.plunge, t1: E.black, fn: 's11b', world: 'night', what: 'into its own cloud' },
  { id: 'S', t0: E.black, t1: E.lot, fn: 's12', world: 'black', what: 'separator: another demonstration' },
  { id: 'F1', t0: E.lot, t1: E.cut1314, fn: 's13', world: 'lot', what: 'kickflip: rise, freeze under a veil with plate 3 (thrust line vs centre of mass), resume, flip; cables stay' },
  { id: 'G1', t0: E.cut1314, t1: END, fn: 's14', world: 'night', what: 'summary on the ramp wide; the finite, refillable reserve; title' },
];
export const PROOF = { from: 0, to: Math.round(E.cut45 * FPS) - 1, seconds: E.cut45,
  what: 'A1–B1: poster, the corrected question, the pressure reveal, plate 1 (fan + seal maintain low pressure)' };

// ------------------------------------------------------------------------------------------------ every on-screen string
export const STR = {
  srcTesla: 'CG重建 · 据特斯拉 2026.10.16 发布的视频',
  srcMusk: 'CG重建 · 据马斯克 2026.10.16 发布的视频',
  tagNight: 'CG重建',                                                 // the external CG reconstruction (A21)
  tagOverlay: 'CG重建 · 叠加示意',                                     // reconstruction + a schematic overlay
  tagAir: '原理示意 · 非实拍',                                          // air vision
  tagArrows: '箭头只示方向，长度不按比例',                               // whenever force arrows are on screen
  headFunc: '功能示意 · 非实车布局',                                     // plates 1 and 2 (A02, A12)
  headPrinciple: '原理示意 · 长度不按比例',                              // plate 3 (A16)
  cable: '画面中可见细线，作用未公开',                                    // A18
  creditFit: '车与坡道按视频外形拟合，未做力学验证',                       // A08, A21
  creditDiagram: '风扇与储气为功能示意，非实车布局；箭头不按比例',          // A02, A12, A05
  title: '空气现形',
};

// Semantic colours: gold = air-pressure load / adhesion (toward the nearby surface); ice = the low-pressure gap, the air;
// cyan = own gas and thrust; lilac = tyre–surface contact force (never gold); white = gravity and neutral statements.
export const COLORS = { white: '#f3f5f8', gold: '#ffc46b', ice: '#a6e0ff', cyan: '#62e6ff', lilac: '#cdbcff',
  dim: 'rgba(232,238,245,0.78)' };

// Text cards. A card: block centre y (px, 1080×1920 space), out (exit starts; 0.25 s fade), lines[]. A line: text, role
// (hero | support | heavy | light | chapter | source | title | credit), at (entry start; 0.3 s staggered), optional spans
// (colour/scale/anim per substring), anim (line entry: rise | none | drop | float | down | up), exit (fade | fall).
// Reading rule (checked by tools/text_inventory.mjs), with R(n) = max(1.2 s, 0.4 s + 0.2 s × n CJK characters):
//   1. after the last line has landed, the card holds still for ≥ R(characters of that line);
//   2. from the first line's landing to the exit, ≥ R(characters of the whole card).
export const CARDS = [
  { id: 'C01', shot: 'A1', y: 1236, out: 3.3, lines: [
    { text: '它凭什么不掉？', role: 'hero', at: 0.0, anim: 'none', spans: [{ k: '不掉', color: 'white', glow: 'red' }] }] },
  { id: 'C02', shot: 'A2', y: 1290, out: 5.72, lines: [
    { text: '吸附从何而来？', role: 'hero', at: E.ask, spans: [{ k: '吸附', color: 'gold' }] }] },
  { id: 'C03', shot: 'A3', y: 1240, out: 9.3, lines: [
    { text: '空气，', role: 'support', at: E.airLine },
    { text: '从四面八方压着它', role: 'hero', at: E.press, anim: 'none', spans: [{ k: '压', color: 'gold', scale: 1.5, anim: 'slam' }] }] },
  { id: 'C04', shot: 'B1', y: 1262, out: 13.5, lines: [
    { text: '风扇 + 密封', role: 'hero', at: E.sealOn, spans: [{ k: '风扇', color: 'ice' }, { k: '密封', color: 'ice' }] },
    { text: '维持车底低压', role: 'support', at: E.lowP - 0.15, spans: [{ k: '低压', color: 'ice' }] }] },
  { id: 'C05', shot: 'B2', y: 1250, out: E.converge, lines: [
    { text: '外面 气压高', role: 'heavy', at: E.outer, anim: 'drop', spans: [{ k: '外面 气压高', color: 'gold' }] },
    { text: '车底 气压低', role: 'light', at: E.inner, anim: 'float', spans: [{ k: '车底 气压低', color: 'ice' }] }] },
  { id: 'C06', shot: 'B2', y: 1260, out: E.beam + 2.6, lines: [
    { text: '压力差', role: 'hero', at: E.beam, spans: [{ k: '压力差', color: 'gold' }] },
    { text: '把车压向坡面', role: 'support', at: E.beam + 0.2 }] },
  { id: 'C07', shot: 'B2>B3', y: 1250, out: E.cut67 - 0.25, lines: [
    { text: '轮胎被压紧，', role: 'support', at: E.an, spans: [{ k: '压紧', color: 'lilac' }] },
    { text: '才抓得住', role: 'hero', at: E.zhua, anim: 'drop' }] },
  { id: 'C08', shot: 'C1', y: 1300, out: E.cut78 - 0.15, lines: [
    { text: '这股力，始终压向坡面', role: 'support', at: E.force, spans: [{ k: '这股力', color: 'gold' }, { k: '压向坡面', color: 'gold' }] },
    { text: '重力，始终向下', role: 'hero', at: E.gravAll }] },
  { id: 'C09', shot: 'D1', y: 1240, out: E.cut89 - 0.15, edge: { at: E.endOf }, lines: [
    { text: '坡，总有尽头', role: 'hero', at: E.cut78 + 0.1 }] },
  { id: 'C10', shot: 'D2>D3', y: 1300, out: E.textFall, exit: 'fall', lines: [
    { text: '密封被破坏，', role: 'support', at: E.open, spans: [{ k: '密封', color: 'ice' }] },
    { text: '吸附减弱', role: 'hero', at: E.weak, spans: [{ k: '吸附', color: 'gold' }] }] },
  { id: 'C11', shot: 'E1', y: 1262, out: E.cut1011 - 0.3, lines: [
    { text: '车载高压气体', role: 'hero', at: E.plate2 + 0.35, spans: [{ k: '高压气体', color: 'cyan' }] }] },
  { id: 'C12', shot: 'E2', y: 1250, out: E.plunge - 0.15, lines: [
    { text: '喷气向下', role: 'hero', at: E.spray, anim: 'down', arrow: 'down', spans: [{ k: '向下', color: 'cyan' }] },
    { text: '推力向上', role: 'hero', at: E.push, anim: 'up', arrow: 'up', spans: [{ k: '向上', color: 'cyan' }] }] },
  { id: 'CH', shot: 'S>F1', y: 930, out: E.lot + 0.9, lines: [
    { text: '另一场演示', role: 'chapter', at: E.sepIn },
    { text: STR.srcMusk, role: 'source', at: E.sepIn + 0.15 }] },
  { id: 'C13', shot: 'F1', y: 1262, out: E.kfResume - 0.3, lines: [
    { text: '推力线不过重心，', role: 'hero', at: E.kfOff + 0.15, spans: [{ k: '推力线', color: 'cyan' }] },
    { text: '就产生转矩', role: 'hero', at: E.kfOff + 0.9, spans: [{ k: '转矩', color: 'cyan' }] }] },
  { id: 'C14', shot: 'F1', y: 1290, out: E.cut1314 - 0.25, lines: [
    { text: '实际翻转看合转矩', role: 'hero', at: E.net, spans: [{ k: '合转矩', color: 'cyan' }] }] },
  { id: 'C15', shot: 'G1', y: 1250, out: E.borrow + 3.5, lines: [
    { text: '坡上，借大气压', role: 'hero', at: E.borrow, spans: [{ k: '借大气压', color: 'gold' }] },
    { text: '空中，花自带的气', role: 'hero', at: E.spend, spans: [{ k: '花自带的气', color: 'cyan' }] }] },
  { id: 'C16', shot: 'G1', y: 1250, out: E.refill + 2.35, lines: [
    { text: '储气有限，需补气', role: 'hero', at: E.refill, spans: [{ k: '储气', color: 'cyan' }, { k: '补气', color: 'cyan' }] }] },
  { id: 'TITLE', shot: 'G1', y: 400, out: 99, lines: [
    { text: STR.title, role: 'title', at: E.title },
    { text: STR.srcTesla, role: 'credit', at: E.title + 0.3, anim: 'fade' },
    { text: STR.srcMusk, role: 'credit', at: E.title + 0.3, anim: 'fade' },
    { text: STR.creditFit, role: 'credit', at: E.title + 0.45, anim: 'fade' },
    { text: STR.creditDiagram, role: 'credit', at: E.title + 0.45, anim: 'fade' }] },
];

// Diagram plates: separate, visibly abstract systems drawn by diagram.js over the air-vision void (plates 1, 2) or a
// dark veil over the frozen kickflip (plate 3). Geometry and label anchors live in diagram.js (PLATE_LAYOUT); the
// strings and their entry times live here. A plate fades in over 0.3 s from `from` and out over 0.3 s before `to`.
export const PLATES = [
  { id: 'P1', shot: 'B1', kind: 'seal', from: E.plate1 + 0.05, to: E.cut45, header: STR.headFunc, labels: [
    { k: 'surface', text: '坡面', at: E.plate1 + 0.45 },
    { k: 'body', text: '车体', at: E.plate1 + 0.7 },
    { k: 'seal', text: '密封', at: E.sealOn + 0.1 },
    { k: 'fan', text: '风扇', at: E.fanOn + 0.15 },
    { k: 'low', text: '低压区·有空气', at: E.lowP }] },   // lower pressure, air still in it: a partial vacuum, not empty space
  { id: 'P2', shot: 'E1', kind: 'gas', from: E.plate2 + 0.05, to: E.cut1011, header: STR.headFunc, labels: [
    { k: 'store', text: '储气', at: E.plate2 + 0.3 },
    { k: 'valve', text: '控制阀', at: E.plate2 + 0.7 },
    { k: 'nozzle', text: '喷口', at: E.plate2 + 0.95 },
    { k: 'jet', text: '喷气', at: E.valve + 0.25 },
    { k: 'thrust', text: '推力', at: E.valve + 0.4 }] },
  { id: 'P3', shot: 'F1', kind: 'torque', from: E.kfOff + 0.15, to: E.kfResume, header: STR.headPrinciple, labels: [
    { k: 'comL', text: '重心', at: E.kfOff + 0.4 },
    { k: 'comR', text: '重心', at: E.kfOff + 0.4 },
    { k: 'none', text: '无转矩', at: E.kfOff + 0.95 },
    { k: 'arm', text: '力臂', at: E.kfOff + 1.45 },
    { k: 'some', text: '有转矩', at: E.kfOff + 1.85 }] },
];

// Provenance tag (top left) and the source line under it, the arrow note, and the cable footnote. Windows in seconds.
export const TAGS = {
  sourceIntro: { text: STR.srcTesla, from: 0.0, to: 3.3 },          // full source line at the start, then the compact tag
  cableNote: { text: STR.cable, from: E.lot + 0.5, to: E.cut1314 - 0.2 },   // still footnote through the kickflip
  hideFrom: E.title - 0.2,                                           // the title card carries the sources itself
  // the second tag line 「箭头只示方向，长度不按比例」 shows in air vision while force arrows are drawn
  arrows: [[E.converge, E.cut56], [E.cut67, E.cut78], [E.open + 0.2, E.drop], [E.cut1011, E.plunge]],
};
// tag state (set per frame by timeline.js) → compact tag text; diagram plates carry their own header instead
export function tagFor(tag) {
  return tag === 'air' ? STR.tagAir : tag === 'overlay' ? STR.tagOverlay : tag === 'night' ? STR.tagNight : null;
}
export const arrowNoteAt = (t) => TAGS.arrows.some(([a, b]) => t >= a && t < b);

// ------------------------------------------------------------------------------------------------ helpers
export const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
export const cjkCount = (s) => [...s].filter((c) => /[㐀-鿿]/.test(c)).length;
export const readNeed = (s) => Math.max(1.2, 0.4 + 0.2 * cjkCount(s));
export const ENTRY = 0.3, STAGGER = 0.03, EXIT = 0.25, PLATE_FADE = 0.3, LABEL_IN = 0.25;
// when a line has fully landed (all characters in)
export const landed = (line) => line.anim === 'none' ? line.at + 0.15 : line.anim === 'fade' ? line.at + ENTRY
  : line.at + ENTRY + STAGGER * Math.max(0, [...line.text].length - 1);
// when a card has fully left the screen, as text.js draws it: fade exits end EXIT after out; the fall exit drops glyph i
// from out + 0.035 s × i and it is gone 0.42 s later
export const cardGone = (c) => Math.min(END, c.exit === 'fall'
  ? c.out + 0.42 + 0.035 * (Math.max(...c.lines.map((l) => [...l.text].length)) - 1)
  : c.out + EXIT);

// all on-screen strings with their windows (for the inventory and coverage check)
export function inventory() {
  const items = [];
  for (const c of CARDS) for (const l of c.lines) items.push({ id: `${c.id}.${c.lines.indexOf(l) + 1}`, text: l.text, role: l.role, from: l.at, to: cardGone(c) });
  for (const p of PLATES) {
    items.push({ id: `${p.id}.header`, text: p.header, role: 'plateHeader', from: p.from, to: p.to });
    for (const l of p.labels) items.push({ id: `${p.id}.${l.k}`, text: l.text, role: 'plateLabel', from: l.at, to: p.to });
  }
  items.push({ id: 'TAG.source', text: TAGS.sourceIntro.text, role: 'tag', from: TAGS.sourceIntro.from, to: TAGS.sourceIntro.to });
  items.push({ id: 'TAG.night', text: STR.tagNight, role: 'tag', from: TAGS.sourceIntro.to, to: TAGS.hideFrom, note: 'night / lot reconstruction shots' });
  items.push({ id: 'TAG.overlay', text: STR.tagOverlay, role: 'tag', from: E.cut56, to: TAGS.hideFrom, note: 'night shots carrying a schematic overlay (B3, G1)' });
  items.push({ id: 'TAG.air', text: STR.tagAir, role: 'tag', from: E.ping, to: TAGS.hideFrom, note: 'air-vision shots' });
  items.push({ id: 'TAG.arrows', text: STR.tagArrows, role: 'tagNote', from: TAGS.arrows[0][0], to: TAGS.arrows[TAGS.arrows.length - 1][1],
    note: 'second tag line while force arrows are drawn: ' + TAGS.arrows.map(([a, b]) => `${a}–${b} s`).join(', ') });
  items.push({ id: 'NOTE.cable', text: TAGS.cableNote.text, role: 'note', from: TAGS.cableNote.from, to: TAGS.cableNote.to });
  return items;
}
