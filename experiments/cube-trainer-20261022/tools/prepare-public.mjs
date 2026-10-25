// 把验算报告与开源许可整理进 public/（构建时原样复制到 dist/）
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
const root = new URL("../", import.meta.url);
const p = (x) => new URL(x, root);
mkdirSync(p("public/"), { recursive: true });
copyFileSync(p("reports/verify-random-states-1000.json"), p("public/verification-random-states.json"));
copyFileSync(p("reports/algs-report.json"), p("public/verification-algs.json"));
const lic = (name, file) => `===== ${name} =====\n${readFileSync(p(file), "utf8").trim()}\n`;
const pkg = (n) => JSON.parse(readFileSync(p(`node_modules/${n}/package.json`), "utf8")).version;
const text = [
  "魔方三法 3D（carljings.top/cube/）使用的开源组件与许可",
  "",
  `cubing.js ${pkg("cubing")} — 许可：MPL-2.0 OR GPL-3.0-or-later。本站以 MPL-2.0 使用。`,
  "  源码：https://github.com/cubing/cubing.js （npm 包 cubing@" + pkg("cubing") + "，未修改；本站打包后的文件包含其代码）",
  `three.js ${pkg("three")} — 许可：MIT。源码：https://github.com/mrdoob/three.js`,
  `Space Grotesk（@fontsource/space-grotesk ${pkg("@fontsource/space-grotesk")}）— SIL Open Font License 1.1`,
  `JetBrains Mono（@fontsource/jetbrains-mono ${pkg("@fontsource/jetbrains-mono")}）— SIL Open Font License 1.1`,
  "",
  "桥式（Roux）方法由 Gilles Roux 提出：http://grrroux.free.fr/method/Intro.html",
  "cubing.js 以原版打包、未作修改；求解器、3D 渲染与界面为本站自写代码。",
  "",
  lic("cubing.js LICENSE（MPL-2.0 全文，取自 https://github.com/cubing/cubing.js/blob/main/LICENSE-MPL.md）", "licenses/cubing-LICENSE-MPL.md"),
  lic("three.js LICENSE", "node_modules/three/LICENSE"),
  lic("Space Grotesk LICENSE", "node_modules/@fontsource/space-grotesk/LICENSE"),
  lic("JetBrains Mono LICENSE", "node_modules/@fontsource/jetbrains-mono/LICENSE"),
].join("\n");
writeFileSync(p("public/licenses.txt"), text);
console.log("public/ 准备完成");
