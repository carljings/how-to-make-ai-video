// timeline.js: the single source of truth for timing. Scenes, type and score.js all read from here.
export const W = 1080, H = 1920, FPS = 30, DUR = 64, BPM = 120, BEAT = 60 / BPM;

export const ACTS = [
  { id: 'hook', a: 0, b: 3 },
  { id: 'network', a: 3, b: 9 },
  { id: 'electrode', a: 9, b: 15 },
  { id: 'algae', a: 15, b: 23 },
  { id: 'membrane', a: 23, b: 30 },
  { id: 'install', a: 30, b: 35 },
  { id: 'rhythm', a: 35, b: 43 },
  { id: 'brake', a: 43, b: 48 },
  { id: 'mouse', a: 48, b: 55 },
  { id: 'clinic', a: 55, b: 60 },
  { id: 'ending', a: 60, b: 64 },
];
// Acts that continue the previous picture without a dip to black
export const CONTINUOUS = new Set(['network', 'electrode', 'brake']);

// On-screen text: kicker / headline (**keyword** changes colour at `at`) / sub-line (appears at subAt)
export const TEXTS = [
  { a: 0, b: 3, kicker: '2026 诺贝尔生理学或医学奖', lines: ['给神经元，', '装一个**光开关**'], sub: '光遗传学 · 60秒看懂', key: 'blue', at: 0.6 },
  { a: 3, b: 6, lines: ['你的每个**念头**，', '都伴随着神经元放电'], key: 'ice', at: 3.4 },
  { a: 6, b: 9, lines: ['可是，哪一个，', '管**哪一件事**？'], key: 'ice', at: 6.4 },
  { a: 9, b: 12, lines: ['用电极刺激？', '周围**一起亮**'], key: 'white', at: 10.3 },
  { a: 12, b: 15, lines: ['我们需要：', '只点亮**这一类**细胞'], key: 'blue', at: 12.6 },
  { a: 15, b: 23, kicker: '2002–2003 · 莱茵衣藻', lines: ['一种绿藻，为什么', '总往**亮处**游？'], sub: '它的眼点里，有见光就开的通道', subAt: 19.6, key: 'sun', at: 16.0 },
  { a: 23, b: 30, kicker: '通道视紫红质 ChR2 · 蓝光约470 nm', lines: ['蓝光，就是**钥匙**'], sub: '闸门一开，正离子涌入，细胞被激活', subAt: 25.6, key: 'blue', at: 25.0 },
  { a: 30, b: 35, kicker: '2005 · Deisseroth 团队', lines: ['把这道闸门，装进', '**哺乳动物神经元**'], sub: '用病毒把基因送进特定细胞，细胞自己造出闸门', subAt: 32.0, key: 'blue', at: 32.4 },
  { a: 35, b: 39, lines: ['**节拍**由光来定'], key: 'blue', at: 35.5 },
  { a: 39, b: 43, kicker: '毫秒级 · 可重复', lines: ['每一次闪光，', '对应一次**放电**'], key: 'blue', at: 39.0 },
  { a: 43, b: 48, lines: ['也能踩**刹车**：', '黄光让它沉默'], sub: '换一种蛋白（如嗜盐菌视紫红质），激活和抑制是两种工具', subAt: 44.2, key: 'amber', at: 43.3 },
  { a: 48, b: 55, lines: ['在小鼠身上：', '**开灯**它就跑，', '关灯就慢下来'], sub: '例：激活中脑运动区的特定神经元 · 因果可以直接验证', subAt: 49.6, key: 'blue', at: 49.0 },
  { a: 55, b: 60, kicker: '2021 · 首个临床报告（单例）', lines: ['几乎失明的人，重新', '**感知**到桌上的物体'], sub: '基因治疗 + 光刺激眼镜 · 部分恢复，不是正常视力', subAt: 56.0, key: 'orange', at: 57.0 },
  { a: 60, b: 64, kicker: '2026 诺贝尔生理学或医学奖', lines: ['一束光，照见', '回路中的**因果**'], sub: 'Deisseroth · Hegemann · Nagel', key: 'blue', at: 60.6 },
];
// Captions for the .srt and the verifier: one cue per text block, contiguous from 0 to DUR
export const CAPTIONS = TEXTS.map(x => [x.a, x.b, x.lines.join('').replace(/\*\*/g, ''), x.lines.map(l => l.replace(/\*\*/g, ''))]);

// Light: blue flashes that make the neuron fire
export const FLASHES = [0.6, 1.9, 60.6, 62.0];
const twoHz = Array.from({ length: 7 }, (_, i) => 35.5 + i * BEAT);
const eightHz = Array.from({ length: 32 }, (_, i) => 39 + i * BEAT / 4);
export const PULSES = [...twoHz, ...eightHz];
export const ZAP = 10.3;            // electrode stimulation
export const GATE_LIGHT = 25.0;     // blue light reaches the channel
export const GATE_OPEN = 25.4;
export const DELIVER = 32.0;        // virus reaches the neuron
export const AMBER_ON = 43.2;
export const MOUSE_LIGHT = [[49.0, 51.5], [52.6, 54.4]];
export const GOGGLES_ON = 56.5;

export const at = t => ACTS.find(s => t >= s.a && t < s.b) || ACTS.at(-1);
export const textAt = t => TEXTS.find(x => t >= x.a && t < x.b) || TEXTS.at(-1);
// 1 right after each event, decaying with time constant k
export const flash = (t, times, k = 0.25) => Math.max(0, ...times.map(p => (t >= p && t - p < 2 ? Math.exp(-(t - p) / k) : 0)));
export const lightOn = (t, windows) => windows.some(([a, b]) => t >= a && t < b);

const stamp = seconds => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
export const srt = () => CAPTIONS.map(([a, b, text], i) => `${i + 1}\n${stamp(a)} --> ${stamp(b)}\n${text}\n`).join('\n');
