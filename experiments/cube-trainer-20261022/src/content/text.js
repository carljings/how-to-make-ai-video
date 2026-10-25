// 页面中文文案：方法与阶段说明。
// show：该阶段着色的块集合（其余块变灰）；cam：镜头预设。

export const METHODS = {
  lbl: {
    key: "lbl", name: "层先法", short: "LBL", en: "Layer by Layer", tag: "入门常用",
    summary: "一层一层地拼：先底层，再中层，最后顶层。公式少，每一步的目标都看得见，常用来入门。",
    stages: {
      cross: { title: "底层十字", short: "十字", goal: "白色朝下：4 个白色棱块归位，侧面颜色与中心一致。", how: "一次放好一条白色棱块，靠观察，不用背公式。", show: "cross", cam: "bottom" },
      corners: { title: "底层四角", short: "底角", goal: "4 个白色角块归位，第一层完成。", how: "把角块转到目标位置正上方，重复右手公式 R U R' U'（其他位置用对称写法）直到白色朝下，每个角最多 5 次。", show: "firstLayer", cam: "side" },
      middle: { title: "中层四棱", short: "中层", goal: "4 个不含黄色的棱块插入中层，前两层完成。", how: "顶层棱块的侧面颜色先对准中心，再向左或向右插入。如果棱块卡在中层错位，先用同一条公式把它换出来。", show: "f2l", cam: "side" },
      llcross: { title: "顶层十字", short: "黄十字", goal: "顶面出现黄色十字（4 个顶层棱块黄色朝上）。", how: "公式 F R U R' U' F'，形状按“点 → L 形 → 一字 → 十字”变化。", show: "all", cam: "top" },
      llface: { title: "顶面同色", short: "黄面", goal: "整个顶面变黄。", how: "“小鱼”公式 R U R' U R U2 R'，调整顶层后重复。", show: "all", cam: "top" },
      llcorners: { title: "顶层角归位", short: "顶角", goal: "4 个顶层角块回到正确位置。", how: "A 型换角公式。先找“车灯”（同一侧两个角颜色一致）放在后面，再做公式；最后转顶层对齐。", show: "all", cam: "top" },
      lledges: { title: "顶层棱归位", short: "顶棱", goal: "全部还原。", how: "U 型三棱换公式：已对好的一面放在后面，做 1–2 次。", show: "all", cam: "top" },
    },
  },
  cfop: {
    key: "cfop", name: "CFOP", short: "CFOP", en: "Cross · F2L · OLL · PLL", tag: "速拧主流",
    summary: "仍是逐层的思路，但更高效：十字之后把前两层的角块和棱块配对，一起插进槽位，最后两步用公式解决顶层。",
    stages: {
      cross: { title: "十字 Cross", short: "Cross", goal: "底面白色十字。", how: "4 条棱一起规划。本页给出这 4 个块的最少步数解；选手通常在赛前 15 秒观察里想好。", show: "cross", cam: "bottom" },
      f2l: { title: "前两层 F2L", short: "F2L", goal: "4 组“角块 + 棱块”各自配对，插进 4 个槽，前两层同时完成。", how: "程序每次挑当前最省步的一组；块卡在别的槽里时，先把它取出来。", show: "f2l", cam: "side" },
      oll: { title: "顶层定向 OLL", short: "OLL", goal: "顶面全部变黄（暂不管侧面）。", how: "完整 OLL 共有 57 种情况（本页程序已逐一枚举核对），每种对应一条公式；这里按实际状态从表中挑最短的一条。", show: "all", cam: "top" },
      pll: { title: "顶层排列 PLL", short: "PLL", goal: "顶层块换到正确位置，整体还原。", how: "完整 PLL 共有 21 种情况（同样枚举核对），名称取自通行叫法，如 T、Y、J、U 型。", show: "all", cam: "top" },
    },
  },
  roux: {
    key: "roux", name: "桥式", short: "Roux", en: "Roux · Gilles Roux", tag: "块构建",
    summary: "先在左右两侧各搭一个 1×2×3 的块，像两座桥墩；再调好顶层四个角；最后只用 M 层和 U 层，收拾剩下六条棱和四个中心。",
    stages: {
      fb: { title: "第一块 First Block", short: "左块", goal: "左侧下两层的 1×2×3 块：2 个角、3 条棱，加左中心。", how: "先拼一个 1×2×2 小方块，再补一组角块和棱块。全靠观察，没有固定公式。", show: "fb", cam: "left" },
      sb: { title: "第二块 Second Block", short: "右块", goal: "右侧对称的 1×2×3 块。", how: "这一步只用 R、r、U、M（r = R M'），都不碰左块。同样先方块、后补一组。", show: "sb", cam: "right" },
      cmll: { title: "顶层四角 CMLL", short: "CMLL", goal: "顶层 4 个角块的位置和朝向全部对好；中间一列和左右顶棱暂时不管。", how: "共有 42 种情况（本页程序枚举核对）。本页公式由程序搜索生成，只用 R、U、F、L，一次做好。", show: "cmll", cam: "top" },
      lse: { title: "最后六棱 LSE", short: "LSE", goal: "只用 M 和 U：6 条棱和 M 层的 4 个中心全部归位，回到正确的中心参考系。", how: "分三小步：4a 棱块定向（EO）→ 4b 放好左右两棱（UL/UR）→ 4c 完成 M 层，中心一起归位。", show: "all", cam: "front" },
    },
  },
};

export const MODES = {
  example: { name: "示例教学", desc: "同一个打乱、三种方法。解法在构建时生成，并已用 cubing.js 逐步复核。" },
  free: { name: "自由探索", desc: "自己拧魔方。随时查看三种方法的阶段进度，也可以让程序从当前状态接着解。" },
  solve: { name: "通用求解", desc: "输入任意合法打乱或随机生成，浏览器内按所选方法分阶段求解，并当场用 cubing.js 复核。" },
};

export const MOVE_DESC = (name) => {
  const fam = name[0];
  const amt = name.slice(1);
  const faceName = { U: "顶层", D: "底层", L: "左层", R: "右层", F: "前层", B: "后层", M: "中层 M", E: "中层 E", S: "中层 S", r: "右侧两层", l: "左侧两层", u: "上方两层", d: "下方两层", f: "前方两层", b: "后方两层" }[fam] || fam;
  const look = { U: "从上看", D: "从下看", L: "从左看", R: "从右看", F: "从前看", B: "从后看", M: "跟 L 同向", E: "跟 D 同向", S: "跟 F 同向", r: "从右看", l: "从左看", u: "从上看", d: "从下看", f: "从前看", b: "从后看" }[fam] || "";
  const dir = amt === "2" ? "转 180°" : amt === "'" ? "逆时针 90°" : "顺时针 90°";
  return amt === "2" ? `${faceName} · ${dir}` : `${faceName} · ${look}${dir}`;
};
