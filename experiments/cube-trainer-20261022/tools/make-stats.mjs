// 由验算报告生成页面“对比区”用的 src/data/stats.json，保证页面数字与可下载的验算记录一致。
// 用法：node tools/make-stats.mjs [随机状态报告] [公式表报告]
import { readFileSync, writeFileSync } from "node:fs";
const p = (x) => new URL(x, new URL("../", import.meta.url));
const rs = JSON.parse(readFileSync(process.argv[2] || p("reports/verify-random-states-1000.json"), "utf8"));
const al = JSON.parse(readFileSync(process.argv[3] || p("reports/algs-report.json"), "utf8"));
const failures = Array.isArray(rs.failures) ? rs.failures.length : rs.failures;
if (failures !== 0 || al.oll.uncoveredPatterns.length !== 0 || al.pll.uncoveredStates !== 0) throw new Error("报告里有失败或未覆盖，不生成统计");
const perMethod = Object.fromEntries(Object.entries(rs.perMethod).map(([k, v]) => [k, {
  mean: v.totalMoves.mean, p95: v.totalMoves.p95, max: v.totalMoves.max,
  stages: Object.fromEntries(Object.entries(v.stages).map(([id, s]) => [id, s.mean])),
  timeMeanMs: v.timeMs.mean,
}]));
const stats = {
  samples: rs.samples, kind: rs.kind, generatedAt: rs.generatedAt, failures, perMethod,
  ollClasses: al.oll.classesIncludingSolved - 1, pllClasses: al.pll.classesIncludingSolved - 1,
};
writeFileSync(p("src/data/stats.json"), JSON.stringify(stats));
console.log(JSON.stringify(stats));
