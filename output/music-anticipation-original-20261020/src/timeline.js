// timeline.js — THE single source of time for picture and type. Pure data, no DOM.
// 《等它落下来》: the film's time is the edited soundtrack's time (tools/edit.py → out/audio/master.wav). Every cue asks for
// a planned musical moment (a bar line or a drop from assets/edit-plan.json, carried in src/music.js) and is resolved to
// the onset DETECTED on the final master within ±70 ms — or this module throws.
import { MUSIC } from './music.js';
export const W = 1080, H = 1920, FPS = 30;
const ONS = MUSIC.onsets.map((o) => o[0]);
export function snap(t, why = '') {
  let best = null; for (const o of ONS) if (best === null || Math.abs(o - t) < Math.abs(best - t)) best = o;
  if (best === null || Math.abs(best - t) > 0.07) throw new Error(`no detected onset within 70 ms of ${t.toFixed(3)} s ${why}`);
  return best;
}
const B = MUSIC.bars, E = MUSIC.events;
const bar = (i) => snap(B[i], `(bar ${i})`);

// cues (film s). Musical position · what happens
export const T = {
  start: 0,
  d1: snap(E.drop1, 'drop 1'),         // the sub-bass returns after the intro build · RELEASE 1
  q2: bar(2),                          // · “那几秒里，大脑在做什么？”
  study: bar(3),                       // · the study: favourite music, a PET ring
  peak: bar(4),                        // · the chill moment and the seconds before it
  places: bar(5),                      // · coming: caudate
  nacc: bar(6),                        // · arrived: nucleus accumbens
  meaning: bar(7),                     // thin bar · anticipation is part of reward
  feel2: bar(8),                       // build bar · wait again, knowing
  d2: snap(E.drop2, 'drop 2'),         // · RELEASE 2
  craft: bar(10),                      // · this song, measured: the bass thins before each drop
  last: bar(12),                       // · “最后一次”
  feel3: bar(13),                      // thin bar · the last wait begins
  build3: bar(14),                     // build bar
  extra: snap(E.build3_repeat, 'repeated build bar'),   // our edit: the build bar again · “再等一下”
  d3: snap(E.drop3, 'drop 3'),         // · RELEASE 3
  coda: bar(17),                       // · second line of the last card
  hit: snap(E.final_hit, 'final hit'), // the song’s first-drop hit as the final downbeat; filtered decay follows
};
export const FADE_V0 = T.hit + 1.75, FADE_V1 = T.hit + 2.6;    // picture to black with the decaying final hit (text stays crisp until then)
export const END = MUSIC.end;                                   // ≈ 42.44 s (audio is digital silence for the last ≥ 0.4 s)
export const FRAMES = Math.round(END * FPS);
export const frameOf = (t) => Math.round(t * FPS);
// the build windows (the waits), film time: intro build, 2nd build (thin bar + build bar), 3rd (thin + build + our repeat)
export const WAITS = [[B[0], T.d1], [B[7], T.d2], [B[13], T.d3]];
export const DROPS = [T.d1, T.d2, T.d3];

export const SCENES = [
  { id: 'A', t0: T.start, t1: T.d1, fn: 'feel1', what: 'feel #1: the orb charges with the intro build; “等它落下来”' },
  { id: 'B', t0: T.d1, t1: T.study, fn: 'release1', what: 'release #1; “落下来之前，你已经在等它了”; “那几秒里，大脑在做什么？”' },
  { id: 'C', t0: T.study, t1: T.places, fn: 'study', what: 'the study: favourite music, a PET ring; the chill moment and the seconds before it' },
  { id: 'D', t0: T.places, t1: T.meaning, fn: 'places', what: 'coming: caudate; arrived: nucleus accumbens (research schematic, coronal)' },
  { id: 'E', t0: T.meaning, t1: T.feel2, fn: 'meaning', what: 'anticipation is part of reward' },
  { id: 'F', t0: T.feel2, t1: T.d2, fn: 'feel2', what: 'feel #2, knowing: the orb charges, the schematic caudate glows' },
  { id: 'G', t0: T.d2, t1: T.craft, fn: 'release2', what: 'release #2, the schematic nucleus accumbens flashes — no words' },
  { id: 'H', t0: T.craft, t1: T.last, fn: 'craft', what: 'this song, measured: its sub-bass thins before each drop' },
  { id: 'I', t0: T.last, t1: T.feel3, fn: 'last', what: '“最后一次 / 这次多等一会儿”' },
  { id: 'J', t0: T.feel3, t1: T.d3, fn: 'feel3', what: 'the last wait: three bars (one added by the edit); “感受这几秒” → “再等一下”' },
  { id: 'K', t0: T.d3, t1: END, fn: 'finale', what: 'release #3, the map of the three waits, the final downbeat and its filtered decay; fade' },
];

// colours: wait = cyan, arrival = coral; white text
export const C = { white: '#F4F6FA', dim: '#A9B3C4', wait: '#46E3FF', hit: '#FF5C7E', gold: '#FFD27A' };

// type. roles: hero (900, 96 px) · support (500, 54 px) · note (500, 30 px)
// a card: y (centre), out (exit time), exit 'cut' (gone on that frame) or 'fade', lines [{text, role, at, spans}]
const Y = 1200;
export const CARDS = [
  { id: 'wait', y: Y, out: T.d1, exit: 'cut', lines: [
    { text: '等它落下来', role: 'hero', at: 0.12, spans: [{ k: '等', c: 'wait' }] }] },
  { id: 'before', y: Y, out: T.q2, exit: 'cut', lines: [
    { text: '落下来之前', role: 'hero', at: T.d1 + 0.2 },
    { text: '你已经在等了', role: 'support', at: T.d1 + 0.4, spans: [{ k: '等', c: 'wait' }] }] },
  { id: 'q', y: Y, out: T.study, exit: 'cut', lines: [
    { text: '那几秒里', role: 'hero', at: T.q2 + 0.02, spans: [{ k: '那几秒', c: 'wait' }] },
    { text: '大脑在做什么？', role: 'support', at: T.q2 + 0.3 }] },
  { id: 'study', y: Y, out: T.peak, exit: 'cut', lines: [
    { text: '听最爱的歌', role: 'hero', at: T.study + 0.02 },
    { text: '测大脑里的多巴胺', role: 'support', at: T.study + 0.25, spans: [{ k: '多巴胺', c: 'gold' }] }] },
  { id: 'peak', y: Y, out: T.places, exit: 'cut', lines: [
    { text: '找到起鸡皮疙瘩的一刻', role: 'hero', at: T.peak + 0.02, spans: [{ k: '起鸡皮疙瘩', c: 'hit' }] }] },
  { id: 'caud', y: Y, out: T.nacc, exit: 'cut', lines: [
    { text: '快到的时候', role: 'hero', at: T.places + 0.02, spans: [{ k: '快到', c: 'wait' }] },
    { text: '尾状核更活跃', role: 'support', at: T.places + 0.3, spans: [{ k: '尾状核', c: 'wait' }] }] },
  { id: 'nacc', y: Y, out: T.meaning, exit: 'cut', lines: [
    { text: '真的到了', role: 'hero', at: T.nacc + 0.02, spans: [{ k: '到了', c: 'hit' }] },
    { text: '伏隔核更活跃', role: 'support', at: T.nacc + 0.3, spans: [{ k: '伏隔核', c: 'hit' }] }] },
  { id: 'mean', y: Y, out: T.feel2, exit: 'cut', lines: [
    { text: '期待也在奖赏里', role: 'hero', at: T.meaning + 0.02, spans: [{ k: '期待', c: 'wait' }] },
    { text: '不只是“到了”', role: 'support', at: T.meaning + 0.35, spans: [{ k: '到了', c: 'hit' }] }] },
  { id: 'feel2', y: Y, out: T.d2, exit: 'cut', lines: [
    { text: '带着它，再等一次', role: 'hero', at: T.feel2 + 0.02, spans: [{ k: '再等一次', c: 'wait' }] }] },
  { id: 'craft', y: Y, out: T.last, exit: 'cut', lines: [
    { text: '这首歌也这样写', role: 'hero', at: T.craft + 0.02 },
    { text: '每次落下前，低音先变薄', role: 'support', at: T.craft + 0.45, spans: [{ k: '低音先变薄', c: 'wait' }] }] },
  { id: 'last', y: Y, out: T.feel3, exit: 'cut', lines: [
    { text: '最后一次', role: 'hero', at: T.last + 0.02 },
    { text: '这次多等一会儿', role: 'support', at: T.last + 0.3, spans: [{ k: '多等一会儿', c: 'wait' }] }] },
  { id: 'feel3', y: Y, out: T.extra, exit: 'cut', lines: [
    { text: '感受这几秒', role: 'hero', at: T.feel3 + 0.02, spans: [{ k: '这几秒', c: 'wait' }] }] },
  { id: 'extra', y: Y, out: T.d3, exit: 'cut', lines: [
    { text: '再等一下', role: 'hero', at: T.extra + 0.02, spans: [{ k: '等', c: 'wait' }] }] },
  { id: 'final', y: Y, out: FADE_V1, exit: 'fade', lines: [
    { text: '你爱的，不只是那一下', role: 'hero', at: T.d3 + 0.55, spans: [{ k: '那一下', c: 'hit' }] },
    { text: '还有等它的那几秒', role: 'support', at: T.coda + 0.02, spans: [{ k: '等它的那几秒', c: 'wait' }] }] },
];

// small top-left tags (honesty labels), windows in s
export const TAGS = [
  { from: 0, to: T.d1, text: '开声音 · 跟着等' },
  { from: T.study, to: T.feel2, text: '研究示意' },
  { from: T.feel2, to: T.craft, text: '示意 · 不是在测你的大脑' },
  { from: T.craft, to: T.last, text: '实测：这首歌的低音能量' },
  { from: T.feel3, to: T.d3, text: '演示：最后这次等待，剪辑加长了一小节' },
  { from: T.d3, to: FADE_V1, text: '研究示意 · 本片体验为演示，非实验' },
];
// phone-readable footnotes (source and conditions), above the platform's bottom UI
export const NOTES = [
  { from: T.study, to: T.places, lines: ['研究：Salimpoor 等，2011，Nature Neuroscience', '自选、能稳定起鸡皮疙瘩的音乐 · 8 份 PET 数据'] },
  { from: T.places, to: T.feel2, lines: ['PET：两处都有多巴胺释放', '“先、后”来自 fMRI 活动 · 研究示意'] },
  { from: T.d3 + 0.4, to: FADE_V1, lines: ['期待阶段也有奖赏参与（Salimpoor 等，2011）', '本片的等与落是体验演示，不是实验'] },
];
// strings drawn inside the graphics (for the font subset)
export const LABELS = ['尾状核', '伏隔核', '示意图（冠状切面）', '快到时', '起鸡皮疙瘩', '等', '落', '低音能量', '时间', '你的期待', 'PET'];

// reading rule (≈ 8 CJK chars/s): after a line lands it stays ≥ max(0.8, 0.3 + 0.13 × CJK) s; whole card ≥ 0.3 + 0.11 × all
export const cjk = (s) => [...s].filter((c) => /[㐀-鿿]/.test(c)).length;
export const allText = () => CARDS.flatMap((c) => c.lines.map((l) => l.text)).concat(TAGS.map((g) => g.text), NOTES.flatMap((n) => n.lines), LABELS);
