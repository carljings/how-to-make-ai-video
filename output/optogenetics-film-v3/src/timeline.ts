// timeline.ts: the single source of truth for timing. Scenes, on-screen text and the score all read from here.
// Times are in seconds. 120 BPM, so a beat is 0.5 s and a bar is 2 s; cuts and hits sit on that grid.
export const W = 1080, H = 1920, FPS = 30, DUR = 70, BPM = 120;
export const BEAT = 60 / BPM, BAR = 4 * BEAT;
export const FRAMES = Math.round(DUR * FPS);

export type SceneId = 'hook' | 'brain' | 'quiz' | 'alga' | 'gate' | 'control' | 'payoff' | 'clinic' | 'legacy' | 'end';
// a..b: when the scene owns the screen. Neighbouring scenes overlap by OVERLAP s around each cut so a transition
// can show both; the cut itself is at b (= the next scene's a).
export const SCENES: {id: SceneId; a: number; b: number; name: string}[] = [
  {id: 'hook', a: 0, b: 6, name: '00 Hook: the mouse and the light'},
  {id: 'brain', a: 6, b: 18, name: '01 Title, 86 billion neurons, the electrode'},
  {id: 'quiz', a: 18, b: 22.4, name: '02 Quiz: where does the switch come from?'},
  {id: 'alga', a: 22.4, b: 30, name: '03 The alga and channelrhodopsin'},
  {id: 'gate', a: 30, b: 36, name: '04 Blue light opens the gate'},
  {id: 'control', a: 36, b: 51, name: '05 2005, rhythm and the brake'},
  {id: 'payoff', a: 51, b: 56, name: '06 Back to the mouse'},
  {id: 'clinic', a: 56, b: 60, name: '07 2021 clinical report'},
  {id: 'legacy', a: 60, b: 64, name: '08 Where it started: curiosity'},
  {id: 'end', a: 64, b: 70, name: '09 Title and the debate'},
];
export const OVERLAP = 0.5;
export type CutKind = 'zoom' | 'glitch' | 'iris' | 'whip' | 'slam' | 'leak' | 'flash';
export const CUTS: Record<number, CutKind> = {6: 'zoom', 18: 'glitch', 22.4: 'iris', 30: 'zoom', 36: 'whip', 51: 'slam', 56: 'leak', 60: 'leak', 64: 'flash'};

// Chapter strip at the top: where the viewer is in the story. Hidden during the two title lockups.
export const CHAPTERS: [number, number, string][] = [
  [0, 6, '现象'], [10, 18, '难题'], [18, 30, '发现'], [30, 36, '原理'], [36, 42, '改造'], [42, 51, '控制'], [51, 56, '验证'], [56, 60, '应用'], [60, 64, '意义'],
];

// Colour carries meaning: blue = light that switches cells on, amber = the brake, orange = the clinical light, green = the alga
export type Key = 'blue' | 'ice' | 'white' | 'sun' | 'amber' | 'green' | 'orange' | 'red' | 'dim';
export const RGB: Record<Key, [number, number, number]> = {
  blue: [74, 182, 255], ice: [168, 222, 255], white: [255, 248, 230], sun: [255, 214, 102], amber: [255, 176, 56],
  green: [120, 222, 130], orange: [255, 122, 64], red: [255, 96, 80], dim: [150, 166, 184],
};

// On-screen text: kicker / headline lines (**keyword** takes the key colour) / sub-line (from subAt).
// style 'flip': consecutive blocks with the same group stay on screen and only the changed characters flip over.
// style 'title': the big title lockup.
export interface Cue {
  a: number; b: number; lines: string[]; key: Key;
  kicker?: string; sub?: string; subAt?: number; style?: 'head' | 'flip' | 'title'; group?: string;
}
const NOBEL = '2026 诺贝尔生理学或医学奖';
export const TEXTS: Cue[] = [
  {a: 0, b: 2, style: 'flip', group: 'hook', kicker: NOBEL, lines: ['灯一**亮**，它就**跑**'], key: 'blue'},
  {a: 2, b: 3.5, style: 'flip', group: 'hook', kicker: NOBEL, lines: ['灯一**灭**，它就**慢**'], key: 'dim'},
  {a: 3.5, b: 4.5, style: 'flip', group: 'hook', kicker: NOBEL, lines: ['灯一**亮**，它又**跑**'], key: 'blue'},
  {a: 4.5, b: 6, kicker: NOBEL, lines: ['它的脑子里，', '藏着什么**开关**？'], key: 'blue'},
  {a: 6, b: 10, style: 'title', kicker: NOBEL, lines: ['给神经元，装一个', '**光开关**'], sub: '光遗传学 OPTOGENETICS · 1分钟看懂', subAt: 7, key: 'blue'},
  {a: 10, b: 12.5, lines: ['你的大脑里'], key: 'ice'},
  {a: 12.5, b: 14, lines: ['哪一类，', '管**哪件事**？'], key: 'ice'},
  {a: 14, b: 16, lines: ['用电极刺激？', '周围**一起亮**'], key: 'white'},
  {a: 16, b: 18, lines: ['我们需要：', '只点亮**这一类**'], key: 'blue'},
  {a: 18, b: 21.5, lines: ['这样的开关，', '去**哪儿**找？'], key: 'sun'},
  {a: 21.5, b: 24, kicker: '莱茵衣藻 · 单细胞绿藻', lines: ['答案：**绿藻**'], sub: '它总往亮处游', subAt: 22.5, key: 'green'},
  {a: 24, b: 27, lines: ['秘密在它的**眼点**上'], sub: '那里的膜上，有见光就打开的通道', subAt: 24.6, key: 'red'},
  {a: 27, b: 30, kicker: '2002–2003 · Nagel、Hegemann 等', lines: ['**通道视紫红质**'], sub: 'Channelrhodopsin · 见光就开的离子通道', subAt: 27.5, key: 'blue'},
  {a: 30, b: 31, lines: ['平时，闸门**紧闭**'], key: 'dim'},
  {a: 31, b: 33.5, kicker: 'ChR2 · 蓝光约 470 nm', lines: ['蓝光一照，', '**闸门打开**'], sub: '带正电的离子涌入细胞', subAt: 31.6, key: 'blue'},
  {a: 33.5, b: 36, lines: ['神经元，', '被**激活**了'], sub: '膜电位升高，触发放电', subAt: 34, key: 'blue'},
  {a: 36, b: 39, kicker: '2005 · Boyden、Deisseroth 等', lines: ['把这道闸门，', '装进**哺乳动物神经元**'], key: 'blue'},
  {a: 39, b: 42, lines: ['细胞自己', '造出**光控闸门**'], sub: '病毒载体把基因送进目标细胞', subAt: 39.4, key: 'blue'},
  {a: 42, b: 45, lines: ['每一次闪光，', '对应**一次放电**'], key: 'blue'},
  {a: 45, b: 48, kicker: '毫秒级 · 可重复', lines: ['节奏，', '由**光**来定'], sub: '条件合适时，闪光与放电一一对应', subAt: 45.5, key: 'blue'},
  {a: 48, b: 51, kicker: '抑制工具 · 如嗜盐菌视紫红质', lines: ['还能踩**刹车**：', '黄光让它安静'], key: 'amber'},
  {a: 51, b: 53.5, kicker: '回到开头 · 小鼠实验', lines: ['光打开的，', '是管**跑**的神经元'], sub: '中脑运动区的一类神经元', subAt: 51.6, key: 'blue'},
  {a: 53.5, b: 56, lines: ['开灯就跑，关灯就慢：', '**因果**，直接验证'], key: 'blue'},
  {a: 56, b: 60, kicker: '2021 · 单例临床报告', lines: ['几乎失明的人，', '重新**感知**到物体'], sub: '基因治疗 + 光刺激眼镜 · 部分恢复，并非正常视力', subAt: 57, key: 'orange'},
  {a: 60, b: 64, kicker: '从好奇心，到诺贝尔奖', lines: ['起点，只是一个好奇：', '绿藻为什么**追光**？'], sub: '没人想到：近二十年后，它帮一位盲人重新感知到物体', subAt: 61.0, key: 'green'},
  {a: 64, b: 70, style: 'title', kicker: NOBEL, lines: ['一束光，', '照见大脑的**因果**'], sub: 'Deisseroth · Hegemann · Nagel', subAt: 64.6, key: 'blue'},
];
// The closing question: a two-sided debate with a personal stake, asked after the film has paid off. Not a request
// for likes. The note keeps it honest: changing emotions with light has only been done in animals.
export const CTA = {at: 65.6, question: ['如果有一天，光能调节情绪，', '你愿意用在自己身上吗？'], options: ['愿意', '不愿意'], note: '目前只在动物实验中做到', call: '评论区说说理由'};

// ---- story cues ----
// Hook and payoff: the fibre light on the mouse's head. [on, off) windows.
export const HOOK_LIGHT: [number, number][] = [[0, 2], [3.5, 4.5]];
export const PAY_LIGHT: [number, number][] = [[51.5, 53.5], [54.5, 56.2]];
// Brain: blue flashes make the hero neuron fire under the title; the field; the electrode; the targets
export const TITLE_FIRE = [6.0, 7.0, 8.0, 9.0];
export const COUNT = [10.2, 11.6];          // the neuron counter rolls from 0 to 860 (亿)
export const SCAN = [12.5, 14.0];           // a scan line sweeps the field
export const ELECTRODE_IN = 14.0, ZAP = 14.5, ELECTRODE_OUT = 15.6;
export const LOCK = 16.25;                  // targets light up one by one, a 16th apart
// Quiz
export const QUIZ_CARDS = [18.5, 19.0, 19.5];
export const COUNTDOWN = [20.0, 20.5, 21.0];
export const REVEAL = 21.5;
// Alga
export const MAGNIFY = 24.2, ALGA_OPEN = 25.0;
// Gate
export const GATE_LIGHT = 31.0, GATE_OPEN = 31.25, THRESHOLD = 33.25, GATE_FIRE = 33.5;
export const GATE_SPIKES = [33.5, 34.25, 35.0, 35.75];
// Install: the gene is packed, flies, and the drop lands as the virus reaches the neuron; then the gates appear
export const PACK = 37.0, FLY: [number, number] = [37.4, 38.0], DROP = 38.0;
export const CHANNEL_TIMES = Array.from({length: 16}, (_, i) => DROP + 0.25 + i * BEAT / 4);
// Rhythm: light pulses on the beat grid, doubling in rate: 2, 4, then 8 per second
const grid = (a: number, n: number, step: number) => Array.from({length: n}, (_, i) => a + i * step);
export const PULSES = [...grid(42, 4, BEAT), ...grid(44, 8, BEAT / 2), ...grid(46, 16, BEAT / 4)];
export const RATE_STEPS: [number, number][] = [[42, 2], [44, 4], [46, 8]];
export const AMBER_ON = 48.0;
// Clinic
export const GOGGLES_ON = 56.5, RETINA_ON = 57.0, OBJECTS: [number, number] = [57.6, 58.4];
// Legacy: a pulse of light runs along a timeline and lights 2002, 2005, 2021 and 2026 in turn
export const LEGACY = [60.5, 61.5, 62.5, 63.5];
// End
export const END_FIRE = [64.0, 65.0, 66.0, 67.0, 68.0, 69.0];

// ---- helpers ----
export const sceneAt = (t: number) => SCENES.find((s) => t >= s.a && t < s.b) ?? SCENES[SCENES.length - 1];
export const cueAt = (t: number) => TEXTS.find((x) => t >= x.a && t < x.b) ?? TEXTS[TEXTS.length - 1];
export const lightOn = (t: number, windows: [number, number][]) => windows.some(([a, b]) => t >= a && t < b);
// 1 right after each event, decaying with time constant k (s)
export const pulse = (t: number, times: number[], k = 0.25) => {
  let v = 0;
  for (const p of times) if (t >= p && t - p < 8 * k) v = Math.max(v, Math.exp(-(t - p) / k));
  return v;
};
// Every visual hit that also gets a flash and a camera kick: [time, strength 0..1, colour]
export const HITS: [number, number, Key][] = [
  [0, 0.35, 'blue'], [3.5, 0.45, 'blue'], [6, 0.9, 'blue'], [14.5, 1, 'white'], [21.5, 0.25, 'green'], [31, 0.7, 'blue'],
  [33.5, 0.5, 'blue'], [38, 0.9, 'blue'], [48, 0.6, 'amber'], [51, 0.9, 'blue'], [51.5, 0.4, 'blue'], [54.5, 0.4, 'blue'], [64, 0.8, 'blue'],
];
