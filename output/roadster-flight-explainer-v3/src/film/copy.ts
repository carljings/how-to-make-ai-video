// copy.ts: every on-screen Chinese string that is not a narration caption or a film.py diagram label. The font
// subset (support/fonts/subset-characters.txt) must cover all of it: `npm run text:check` audits this file, the
// diagram labels in src/data/overlay.json and the approved captions.
export const TAG = '原理示意 · 非现场画面';
export const HOOK = ['没有翅膀，', '靠什么飞？'];
export const SOURCE_CHIP = '动作重建 · 2026.10.16 马斯克发布';
export const ATTRIBUTION_CHIP = '来源：Tesla / Elon Musk';
export const INTERNALS_CHIP = '非厂商结构图';
export const RESERVE_LABEL = '气量余量示意';

// one short chapter marker per explanatory act (shown for its first seconds)
export const CHAPTERS: {start: number; text: string}[] = [
  {start: 14, text: '① 贴地靠吸附'},
  {start: 27, text: '② 腾空靠反作用'},
  {start: 40, text: '③ 偏心推力 → 力矩'},
  {start: 52.1, text: '④ 气从哪来'},
  {start: 64.5, text: '⑤ 悬停 · 气量 · 安全'},
];

// how film.py / shots.py notes are shown: 'chip' = small qualifier in the left stack, 'card' = medium statement,
// 'key' = the act's takeaway, large
export const NOTE_STYLE: Record<string, 'chip' | 'card' | 'key'> = {
  replay: 'chip', slowmo: 'chip', rotation_only: 'chip', slowmo_fall: 'chip', hypothesis: 'chip',
  cold: 'card', react: 'card',
  not_hover: 'key', demo: 'key', limits: 'key',
};

// label colour groups (match the Blender fx materials: amber = thrust / torque, cyan = air and pressure)
export const LABEL_GROUP: Record<string, 'amber' | 'cyan' | 'white'> = {
  thrust: 'amber', thrust_rear: 'amber', thrust_front: 'amber', torque: 'amber', torque_back: 'amber', line: 'amber',
  balance: 'amber', low: 'cyan', outside: 'cyan', net: 'cyan', exhaust: 'cyan',
};
export const GROUP_COLOR = {amber: '#ffb04a', cyan: '#62d4ff', white: '#f1f4f7'};
