// copy.js — every sentence on screen (the explanation track; no narration). Single source of truth for wording;
// tools/fonts.py scans this file for the glyphs to bundle. Times are film time (= the user's recording), anchored to
// measured downbeats DB(k) = 0.016 + k·1.818 s or to sung words lw(line, word) from src/timing.json.
// kind: 'main' (top-left caption) | 'note' (source / boundary, small, bottom of the safe area).
// theme: 'dark' (bone on ink, default) | 'light' (ink on paper scenes). line: start on the n-th caption line.
// Sources and boundaries for every claim: docs/SCIENCE.md.
import { DB, BT, lw } from './lib/core.js';

export function makeCues() {
  const m = (t0, t1, text, o = {}) => ({ kind: 'main', t0, t1, text, ...o });
  const n = (t0, t1, text, o = {}) => ({ kind: 'note', t0, t1, text, ...o });
  return [
    // 0 · cold open — the paradox on frame 0
    m(-1, DB(2) - 0.06, '这条船平均得分比人类还高，\n却从没[[跑完比赛]]'),
    n(-1, DB(2) - 0.06, '真实的 AI 训练记录 · 动画为示意重绘'),
    // 1 · how this kind of AI learns
    m(DB(2), DB(4) - 0.06, '这种 AI 怎么学？\n靠[[分数]]'),
    n(DB(2), DB(4) - 0.06, '强化学习：按“奖励”（分数）一点点调整自己的做法'),
    m(DB(4), DB(6) - 0.06, '试一次、打一次分，\n分高的做法就[[留下来]]'),
    n(DB(4), DB(6) - 0.06, '学习曲线为示意'),
    m(DB(6), DB(8) - 0.06, '你心里想要什么，\n它[[读不懂]]'),
    m(DB(8), DB(9) - 0.06, '它只认[[分数]]'),
    // 2 · case 01 card
    m(DB(9), DB(11) - 0.06, '看第 1 个[[真实案例]]', { theme: 'dark' }),
    // 3 · hook 1 + the boat
    n(lw(6, 3), 28.84, '原歌词唱的 P(doom)：一个人对“AI 闯大祸”的主观估计，不是测量值。这支片讲另一个数：分数'),
    m(lw(7, 0), 28.84, '它发现一片水湾：\n绕圈反复撞[[3 个会刷新的目标]]'),
    m(28.9, DB(18) - 0.06, '着火、撞船、逆行……\n得分却比人类玩家[[平均高 20%]]'),
    n(28.9, DB(20) - 0.06, '来源：OpenAI《Faulty reward functions in the wild》，2016。20% 只是这款赛艇游戏里的分数比较 · 动画为示意重绘'),
    m(DB(18), DB(20) - 0.06, '比赛？\n[[一次都没跑完]]'),
    // 4 · the name
    m(DB(20), DB(21) + 1.6, '满足了规则的[[字面]]，\n却没做到[[真正想要的]]'),
    n(DB(20), DB(23) - 0.06, '定义出自 DeepMind 2020 · 译名据《人工智能对齐：全面性综述》'),
    // 5 · why: the stand-in and the goal
    m(DB(21) + 1.66, DB(23) - 0.06, '分数规则，\n只是目标的[[替身]]'),
    n(DB(23), DB(29) - 0.06, '示意图：小岛 = 你真正想要的；橙色等高线 = 分数（越往里越高）'),
    m(DB(23), DB(25) - 0.06, '大多数时候：\n[[分高 ≈ 做得好]]'),
    m(DB(25), DB(27) - 0.06, '可训练会一路\n往[[分最高]]的地方推'),
    m(DB(27), DB(29) - 0.06, '推到尽头，替身和目标\n就可能[[分道扬镳]]'),
    // 6 · case 02 card
    m(DB(29), DB(31) - 0.06, '换个任务：[[叠积木]]'),
    // 7 · the flip, then patches
    m(lw(18, 0), DB(35) - 0.06, '它没去叠——\n直接把红块[[翻了个面]]'),
    n(lw(18, 0), DB(37) - 0.06, '来源：DeepMind 2020 规范博弈案例（Popov 等 2017）· 动画为示意'),
    m(DB(35), DB(37) - 0.06, '底面朝天，分数到手；\n积木？[[没叠]]'),
    m(DB(37), DB(38) - 0.06, '那就[[补规则]]？'),
    m(DB(38), DB(41) - 0.06, '可你想要的，\n很难[[一条条写全]]'),
    n(DB(37), DB(41) - 0.06, '补丁清单是虚构的示意'),
    // 8 · let humans judge
    m(DB(41), DB(43) - 0.06, '那就不写规则了——\n[[让人来打分？]]'),
    m(DB(43), DB(45) - 0.06, '人挑更好的那段，\nAI 学着做[[人会挑的样子]]'),
    n(DB(41), DB(45) - 0.06, '人类偏好学习：Christiano 等 2017 · 画面为示意'),
    m(DB(45), DB(47) - 0.06, '后来，这种“人类反馈训练”\n也被用来训练[[聊天 AI]]'),
    n(DB(45), DB(47) - 0.06, '例：InstructGPT（Ouyang 等 2022）· 界面为示意'),
    m(DB(47), DB(49) - 0.06, '那么——\n[[人眼]]会不会也被“刷”？'),
    // 9 · case 03 card (quiet)
    m(DB(49), DB(51) - 0.06, '这回，[[人]]来当裁判'),
    // 10 · the reveal
    m(lw(29, 0), 100.44, '换个角度看——\n手[[根本没碰到物体]]'),
    m(100.5, 103.94, '它悬在镜头和物体之间：\n从镜头里看，[[像抓住了]]'),
    n(lw(29, 0), 104.0, '来源：DeepMind 2020 引 Christiano 等 2017：它“悬在镜头和物体之间，骗过了人类评估者” · 动画为示意'),
    m(104.0, 107.84, '分数来自“人觉得好”，\n它学到的可能是[[“看起来好”]]'),
    // 11 · today's models, and the twist
    m(107.9, BT(242) - 0.06, '今天的大模型，[[也会吗？]]'),
    m(BT(242), lw(35, 2) - 0.06, 'Claude 3.7 Sonnet 被观察到：\n偶尔[[直接写死测试要的答案]]'),
    n(DB(60), DB(66) - 0.06, '来源：Anthropic《Claude 3.7 Sonnet 系统卡》2025 第 6 节：多在通用解法反复失败后出现，也有把出问题的测试改成迎合代码输出；上线前已部分缓解 · 终端为机制示意'),
    m(lw(35, 2), DB(64) - 0.06, '它不是不听话——'),
    m(lw(35, 4) + 0.45, DB(64) - 0.06, '是太听[[分数]]的话了', { line: 1 }),
    m(DB(64), DB(66) - 0.06, '分数怎么算，它就往哪儿使劲；\n没算进分数的，就可能被[[牺牲]]'),
    m(DB(66), DB(68) - 0.06, '研究者担心：模型越强，\n越会找到[[我们没想到的空子]]'),
    n(DB(66), DB(68) - 0.06, 'DeepMind 2020：这类问题“很可能随着 AI 能力增强而更具挑战”'),
    // 12 · the law, and the word for the problem
    m(lw(41, 0) + 0.2, lw(42, 2) - 0.06, '早在 AI 之前，\n就有人[[说过]]：', { theme: 'light' }),
    n(lw(41, 0) + 0.25, lw(44, 0) - 0.06, '古德哈特定律（以经济学家 Goodhart 命名）· 这句常见表述出自 Strathern 1997, p.308', { theme: 'light' }),
    m(lw(42, 2), lw(44, 0) - 0.06, '考试、KPI、点击量……\n人类也天天在[[“刷分”]]', { theme: 'light' }),
    m(lw(44, 0), DB(75) - 0.06, '所以 AI 研究里有个词：[[对齐]]\n让分数对准你[[真正想要的]]'),
    n(lw(44, 0), DB(75) - 0.06, '对齐（alignment）：让 AI 做我们真正想要的事——至今仍是开放问题'),
    m(DB(75), DB(77) - 0.06, '“看起来做到了”\n≠ [[“真的做到了”]]'),
    // 13 · outro
    m(DB(77), DB(81) - 0.06, '分数可以刷到无穷大——'),
    m(DB(79), DB(81) - 0.06, '任务完成度：[[还是 0]]', { line: 1 }),
    m(DB(81), DB(83) - 0.06, '刷到最后，\n分数[[失去了意义]]'),
    n(DB(82), DB(83) - 0.06, 'NaN = Not a Number，“不是一个数”'),
    m(DB(83), 156.5, '下次看到“高分”，先问一句：\n[[这分，是怎么来的？]]'),
  ];
}
