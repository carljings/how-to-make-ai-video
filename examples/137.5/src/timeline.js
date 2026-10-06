// timeline.js: the single source of truth for "137.5°". Picture, captions and sound all read these numbers.

export const FPS = 30;
export const BEAT = 0.5; // 120 BPM grid
export const DUR = 150;
export const PHI = (1 + Math.sqrt(5)) / 2;
export const GOLDEN = 360 * (1 - 1 / PHI); // 137.50776…°
export const NMAX = 1500;

export const CUE = {
  // Act I: one rule
  firstSeed: 1.0,
  slow: [3.0, 8.0], // seeds 1–8, one at a time, with the protractor
  fast: [8.0, 16.5], // exponential growth to NMAX
  // Act II: hidden numbers
  arms34: [21.4, 24.9], arms55: [24.9, 28.6],
  bands: [29.0, 40.6], // spiral families 8, 13, 21, 34, 55, 89 from the centre outward
  ratios: [41.0, 46.6], // F(n+1)/F(n) closing in on φ
  split: [46.8, 52.2], // a full turn divided in the golden ratio
  // Act III: why not another angle
  trials: [52.4, 66.4], // regrow at 90°, 120°, 144°, 138.46°, 137.2°, then golden
  fraction: [66.6, 77.4], // the continued fraction of φ
  bloom: [77.4, 84.0],
  // Act IV: everywhere
  pinecone: [84.0, 90.8], pineapple: [90.6, 97.4], rosette: [97.2, 107.8],
  // Act V: nobody calculates
  emerge: [107.6, 131.0],
  // Finale
  field: [130.6, 150], title: [138.4, 147.2],
};

// Act III trials: [start, angle in degrees, label]
export const TRIALS = [
  [53.6, 90, '90° = 1/4 圈 · 1/4 OF A TURN'],
  [55.6, 120, '120° = 1/3 圈 · 1/3 OF A TURN'],
  [57.6, 144, '144° = 2/5 圈 · 2/5 OF A TURN'],
  [59.6, 360 * 5 / 13, '138.46° = 5/13 圈 · 5/13 OF A TURN'],
  [61.8, 137.2, '137.2° · 空隙 GAPS'],
  [64.0, GOLDEN, '137.508° · 黄金角 GOLDEN ANGLE'],
];

export const SCENES = [
  ['head', 0, 85.0],
  ['math', 40.6, 77.8],
  ['plants', 83.6, 108.4],
  ['emerge', 107.2, 131.4],
  ['field', 130.4, 150],
];

// Chinese on top, English below. {braces} mark words drawn in gold.
export const CAPTIONS = [
  [1.2, 3.7, '一颗种子。', 'One seed.'],
  [4.0, 8.6, '转 {137.5°}，再长一颗。', 'Turn {137.5°}. Grow another.'],
  [9.0, 13.6, '就这一条规则，一遍又一遍。', 'Just this one rule, again and again.'],
  [21.6, 28.6, '{34} 条螺旋朝一边，{55} 条朝另一边。', '{34} spirals one way, {55} the other.'],
  [29.2, 34.8, '从中心往外数：8、13、21、34、55、89……', 'Count outward from the centre: 8, 13, 21, 34, 55, 89…'],
  [35.0, 40.6, '每个数都是前两个数之和：斐波那契数列。', 'Each is the sum of the two before it: the Fibonacci sequence.'],
  [41.2, 46.4, '相邻两个数的比，越来越接近 {φ}。', 'The ratio of neighbours closes in on {φ}.'],
  [46.8, 52.2, '用 φ 把一整圈分开，小的那份就是 {137.5°}。', 'Split a full turn by φ, and the smaller part is {137.5°}.'],
  [52.6, 57.4, '换一个角度试试。', 'Try a different angle.'],
  [57.8, 63.8, '简单的分数都会重复：种子排成直线，中间留下空隙。', 'Simple fractions repeat: the seeds line up and leave gaps.'],
  [66.8, 72.4, '{φ} 是最难被分数逼近的数：它的连分数全是 1。', '{φ} is the number fractions approximate worst: its continued fraction is all ones.'],
  [72.6, 77.2, '所以黄金角永远不会对齐。', 'So the golden angle never lines up.'],
  [78.0, 83.6, '每一颗都挤得下，一点空间都不浪费。', 'Every seed fits, and no space is wasted.'],
  [84.4, 89.8, '同一个角度，长在许多植物上。', 'The same angle grows in many plants.'],
  [98.4, 104.4, '叶子这样错开，很少正好挡在彼此上方。', 'Leaves set this way rarely sit right above one another.'],
  [108.4, 113.6, '可是，植物怎么知道 137.5°？', 'But how does a plant know 137.5°?'],
  [114.0, 120.4, '它不知道。每颗新芽只是长在最有空间的地方。', "It doesn't. Each new bud simply grows where there is the most room."],
  [121.0, 127.4, '就这样，角度自己落到了 {137.5°} 附近。', 'And the angle settles near {137.5°} by itself.'],
  [132.0, 137.6, '自然不会计算。它只是一直在长。', "Nature doesn't calculate. It just keeps growing."],
].map(([t0, t1, zh, en]) => ({ t0, t1, zh, en }));

export const CHAPTERS = [];

// Every other on-screen string, for the font subsetter
export const STRINGS = [
  '137.5°', '137.508°', '一个角度', 'ONE ANGLE', '360° ÷ φ² ≈ 137.5°', 'φ = 1.6180339887…', '黄金角', 'GOLDEN ANGLE', '222.5°',
  '1 1 2 3 5 8 13 21 34 55 89', '斐波那契数列', 'FIBONACCI', '比值', 'RATIO', '连分数', 'CONTINUED FRACTION', '+', '/',
  ...[
    '90° = 1/4 圈 · 1/4 OF A TURN', '120° = 1/3 圈 · 1/3 OF A TURN', '144° = 2/5 圈 · 2/5 OF A TURN',
    '138.46° = 5/13 圈 · 5/13 OF A TURN', '137.2° · 空隙 GAPS', '137.508° · 黄金角 GOLDEN ANGLE',
  ],
  '松果', 'PINECONE', '菠萝', 'PINEAPPLE', '多肉莲座', 'ROSETTE', '8 / 13', '5 / 8', '叶', 'LEAF',
  '新芽之间的角度', 'ANGLE BETWEEN NEW BUDS', '第', '个', 'BUD', '生长点', 'GROWING TIP',
  '0123456789.,°÷²≈φ…·×=−', 'Douady & Couder, 1992',
];
