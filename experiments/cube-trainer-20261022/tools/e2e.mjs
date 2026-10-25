// 端到端复核（真实 Chrome，WebGL）：
//  1) 3D 网格反推的状态 == cubing.js 数据算出的状态（静态跳转 + 动画播放之后）
//  2) 三种模式的交互：示例播放/暂停/前后步/复位/切换方法、自由探索转动与从当前状态求解、通用求解（随机、自定义、非法输入）
//  3) 桌面与手机的实际截图
// 用法：node tools/e2e.mjs <URL> <截图目录>
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:4173/cube/";
const OUT = process.argv[3] || "reports/shots";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const s = a.join(" "); log.push(s); console.log(s); };
const fail = [];
const expect = (cond, what) => { if (!cond) { fail.push(what); note("✗", what); } else note("✓", what); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  userDataDir: process.env.CHROME_PROFILE || "/dev/shm/rubiks-science-20261021/cache/chrome-profile",
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--lang=zh-CN"],
});

async function openPage(vp, label) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction(() => window.__cube && window.__cube.app.results.cfop && window.__cube.app.results.cfop.check, { timeout: 60000 });
  await sleep(900);
  return { page, errors, label };
}
const shot = async (page, name, full = false) => { await sleep(500); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); note("  截图", name); };
const evalApp = (page, fn, ...args) => page.evaluate(fn, ...args);
const checkRender = (page) => page.evaluate(() => window.__cube.checkRender());
const waitIdle = (page) => page.waitForFunction(() => !window.__cube.view.anim && !window.__cube.app.playing, { timeout: 60000 });
// 魔方坐标 → 屏幕坐标（按当前相机投影）
const projectPoint = (page, xyz) => page.evaluate(([x, y, z]) => {
  const v = window.__cube.view;
  const r = v.renderer.domElement.getBoundingClientRect();
  const p = v.stickers[0].position.clone().set(x, y, z).project(v.camera);
  return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
}, xyz);
// 从魔方上某点向右拖（鼠标或触控），期望转顶层 U'
async function dragTurn(page, xyz, { touch = false } = {}) {
  const before = await page.evaluate(() => window.__cube.app.free.moves.length);
  const pt = await projectPoint(page, xyz);
  if (touch) {
    await page.touchscreen.touchStart(pt.x, pt.y);
    await page.touchscreen.touchMove(pt.x + 30, pt.y + 1);
    await page.touchscreen.touchMove(pt.x + 70, pt.y + 2);
    await page.touchscreen.touchEnd();
  } else {
    await page.mouse.move(pt.x, pt.y); await page.mouse.down();
    await page.mouse.move(pt.x + 40, pt.y + 2, { steps: 6 }); await page.mouse.move(pt.x + 90, pt.y + 4, { steps: 6 });
    await page.mouse.up();
  }
  await sleep(150);
  await waitIdle(page);
  const a = await page.evaluate(() => ({ n: window.__cube.app.free.moves.length, last: window.__cube.app.free.moves.slice(-1)[0] }));
  return { ok: a.n === before + 1 && a.last === "U'", n: a.n, desc: `${a.last}（${before} → ${a.n} 步）` };
}

// ================= 桌面 =================
{
  const { page, errors } = await openPage({ width: 1440, height: 900, deviceScaleFactor: 1 }, "desktop");
  const checks = await evalApp(page, () => Object.fromEntries(Object.entries(window.__cube.app.results).map(([k, r]) => [k, r.check.ok])));
  expect(checks.lbl && checks.cfop && checks.roux, `示例 1 三法在页面内用 cubing.js 复核通过 ${JSON.stringify(checks)}`);
  expect((await checkRender(page)).same, "初始打乱：3D 网格状态 == cubing.js 状态");
  await shot(page, "desktop-01-example-cfop-start");

  // 播放到第一个阶段结束（阶段末暂停）
  await page.click("#btn-play");
  await sleep(300);
  await waitIdle(page);
  const st1 = await evalApp(page, () => ({ pos: window.__cube.app.pos, end: window.__cube.app.stageBounds[0].end, playing: window.__cube.app.playing }));
  expect(st1.pos === st1.end && !st1.playing, `播放后在第 1 阶段末自动暂停（pos ${st1.pos} / 阶段末 ${st1.end}）`);
  expect((await checkRender(page)).same, "动画播放之后：3D 网格状态 == cubing.js 状态");
  await shot(page, "desktop-02-cfop-cross-done");

  // F2L 中段
  await evalApp(page, () => { const a = window.__cube.app; const b = a.stageBounds[1]; document.querySelector(`[data-seek="${b.start}"]`)?.click(); });
  await sleep(200);
  for (let i = 0; i < 9; i++) { await page.click("#btn-next"); await sleep(60); }
  await waitIdle(page);
  expect((await checkRender(page)).same, "连续单步前进（动画被打断也要正确）：3D 网格状态 == cubing.js 状态");
  await shot(page, "desktop-03-cfop-f2l-mid");
  // 后退
  for (let i = 0; i < 4; i++) { await page.click("#btn-prev"); await sleep(80); }
  await waitIdle(page);
  expect((await checkRender(page)).same, "连续后退：3D 网格状态 == cubing.js 状态");

  // OLL 开头（带顶层小图）
  await evalApp(page, () => { const a = window.__cube.app; const b = a.stageBounds[2]; document.querySelector(`.stage-head[data-seek="${b.start}"]`).click(); });
  await sleep(1200);
  const hasDiag = await page.$(".stage.is-open .ll-diagram");
  expect(!!hasDiag, "OLL 阶段显示由真实状态生成的顶层小图");
  await shot(page, "desktop-04-cfop-oll");

  // 随机跳转 + 逐一比对（三法）
  for (const m of ["lbl", "cfop", "roux"]) {
    await page.click(`#methods [data-method="${m}"]`);
    await sleep(300);
    let ok = true;
    const total = await evalApp(page, () => window.__cube.app.flat.length);
    for (let i = 0; i < 25; i++) {
      const k = Math.floor(Math.random() * (total + 1));
      await page.evaluate((k) => { const el = document.createElement("button"); el.dataset.seek = String(k); document.body.appendChild(el); el.click(); el.remove(); }, k);
      const r = await checkRender(page);
      if (!r.same) { ok = false; note("  不一致", m, k, JSON.stringify(r)); break; }
    }
    expect(ok, `${m}：随机跳转 25 处，3D 网格状态全部 == cubing.js 状态（共 ${total} 步）`);
  }
  // 桥式 LSE、层先法中层截图
  await page.click(`#methods [data-method="roux"]`);
  await sleep(300);
  await evalApp(page, () => { const a = window.__cube.app; const b = a.stageBounds[3]; document.querySelector(`.stage-head[data-seek="${b.start}"]`).click(); });
  await sleep(300);
  for (let i = 0; i < 3; i++) { await page.click("#btn-next"); await sleep(420); }
  await waitIdle(page); await sleep(800);
  await shot(page, "desktop-05-roux-lse");
  await evalApp(page, () => { const a = window.__cube.app; const b = a.stageBounds[0]; const el = document.createElement("button"); el.dataset.seek = String(b.start + 4); document.body.appendChild(el); el.click(); el.remove(); });
  await sleep(1200);
  await shot(page, "desktop-06-roux-fb");
  await page.click(`#methods [data-method="lbl"]`);
  await sleep(300);
  await evalApp(page, () => { const a = window.__cube.app; const b = a.stageBounds[2]; const el = document.createElement("button"); el.dataset.seek = String(b.start + 3); document.body.appendChild(el); el.click(); el.remove(); });
  await sleep(1200);
  await shot(page, "desktop-07-lbl-middle");
  // 跳到最后：已还原
  await page.keyboard.press("End");
  await sleep(1200);
  const solvedShown = await evalApp(page, () => document.querySelector("#hud-stage").textContent);
  expect(solvedShown.includes("已还原") && (await checkRender(page)).same, "跳到末尾：显示“已还原”，3D 状态与 cubing.js 一致");
  await shot(page, "desktop-08-lbl-solved");
  // 复位
  await page.click("#btn-reset");
  await sleep(300);
  expect((await evalApp(page, () => window.__cube.app.pos)) === 0 && (await checkRender(page)).same, "复位回到打乱状态");
  // 示例 2、3
  for (const i of [1, 2]) {
    await page.click(`#example-picker [data-example="${i}"]`);
    await sleep(400);
    const c = await evalApp(page, () => Object.values(window.__cube.app.results).every((r) => r.check.ok));
    expect(c && (await checkRender(page)).same, `示例 ${i + 1}：三法复核通过，初始状态一致`);
  }

  // 自由探索
  await page.click('.modes [data-mode="free"]');
  await sleep(500);
  for (const b of ["R", "U", "F'", "L2", "D", "B'"]) { await page.click(`[data-turn="${b}"]`); await sleep(280); }
  await waitIdle(page);
  expect((await checkRender(page)).same, "自由探索：按钮转动 6 次后 3D 状态 == cubing.js 状态");
  await page.keyboard.press("r"); await sleep(300); await page.keyboard.down("Shift"); await page.keyboard.press("u"); await page.keyboard.up("Shift"); await sleep(400);
  const fm = await evalApp(page, () => window.__cube.app.free.moves.join(" "));
  expect(fm.endsWith("R U'"), `键盘转动（r、Shift+u）→ ${fm}`);
  // 在魔方上拖动：起点取实际 3D 位置的屏幕投影（不依赖固定像素）。前面顶行向右拖 = 顶层逆时针（U'）
  const d1 = await dragTurn(page, [0, 1, 1.4785]);
  expect(d1.ok && (await checkRender(page)).same, `在贴纸上向右拖动转顶层：${d1.desc}，状态仍一致`);
  const d2 = await dragTurn(page, [0.44, 1, 1.45]);
  expect(d2.ok && (await checkRender(page)).same, `按在两张贴纸之间的黑边上拖动同样转层：${d2.desc}，状态仍一致`);
  const camBefore = await evalApp(page, () => window.__cube.view.camera.position.toArray().join(","));
  const vb = await (await page.$("#viewport")).boundingBox();
  await page.mouse.move(vb.x + 40, vb.y + vb.height - 60); await page.mouse.down();
  await page.mouse.move(vb.x + 160, vb.y + vb.height - 70, { steps: 8 }); await page.mouse.up();
  await sleep(500);
  const camMoved = (await evalApp(page, () => window.__cube.view.camera.position.toArray().join(","))) !== camBefore;
  expect(camMoved && d2.n === (await evalApp(page, () => window.__cube.app.free.moves.length)), "在空白处拖动只旋转视角，不转层");
  await shot(page, "desktop-09-free");
  // 从当前状态用桥式求解
  await page.click('[data-free-solve="roux"]');
  await page.waitForFunction(() => window.__cube.app.results.roux && window.__cube.app.mode === "solve", { timeout: 60000 });
  await sleep(600);
  const fr = await evalApp(page, () => ({ ok: window.__cube.app.results.roux.check.ok, kind: window.__cube.app.source.kind, n: window.__cube.app.source.scramble.length, where: window.__cube.app.results.roux.where }));
  expect(fr.ok && fr.kind === "free" && fr.where === "worker", `自由探索 → 桥式接着解：在 Web Worker 中求解并复核通过（打乱 ${fr.n} 步，运行于 ${fr.where}）`);
  expect((await checkRender(page)).same, "求解播放起点 == 自由探索时的状态");
  await shot(page, "desktop-10-free-to-roux");

  // 通用求解：非法输入
  await page.$eval("#scramble-input", (el) => { el.value = ""; });
  await page.type("#scramble-input", "R U M' x");
  await page.click("#solve-go");
  await sleep(300);
  const msg = await evalApp(page, () => document.querySelector("#solve-msg").textContent);
  expect(msg.includes("只接受") && msg.includes("M'"), `非法输入被拒绝：${msg}`);
  // 自定义合法输入（含括号重复）
  await page.$eval("#scramble-input", (el) => { el.value = ""; });
  await page.type("#scramble-input", "(R U R' U')3 F2 D' [R, U] B L2");
  await page.click(`#methods [data-method="cfop"]`);
  await sleep(200);
  await page.click("#solve-go");
  await page.waitForFunction(() => window.__cube.app.results.cfop && window.__cube.app.source.kind === "solve", { timeout: 60000 });
  await sleep(500);
  const cu = await evalApp(page, () => ({ ok: window.__cube.app.results.cfop.check.ok, scr: window.__cube.app.source.scramble.join(" ") }));
  expect(cu.ok, `自定义打乱（括号与交换子展开为 ${cu.scr}）CFOP 求解复核通过`);
  // 切换方法：同一打乱重新计算
  await page.click(`#methods [data-method="lbl"]`);
  await page.waitForFunction(() => window.__cube.app.results.lbl, { timeout: 60000 });
  await sleep(400);
  expect(await evalApp(page, () => window.__cube.app.results.lbl.check.ok), "同一打乱切换到层先法：重新求解并复核通过");
  // 随机打乱
  const prevId = await evalApp(page, () => window.__cube.app.source.id);
  await page.click("#solve-random");
  await page.waitForFunction((prev) => { const a = window.__cube.app; return a.source && a.source.id !== prev && a.results[a.method] && a.results[a.method].check && document.querySelector("#solve-msg").textContent.includes("已用"); }, { timeout: 90000 }, prevId);
  await sleep(600);
  const rnd = await evalApp(page, () => ({ msg: document.querySelector("#solve-msg").textContent, ok: window.__cube.app.results[window.__cube.app.method].check.ok, scr: window.__cube.app.source.scramble.join(" "), where: window.__cube.app.results[window.__cube.app.method].where }));
  expect(rnd.ok && rnd.msg.includes("随机状态打乱（cubing.js）") && rnd.where === "worker", `随机状态打乱（cubing.js 生成）在 Worker 中求解并复核通过：${rnd.msg}｜${rnd.scr}`);
  await page.click("#btn-play"); await sleep(2500); await page.click("#btn-play"); await waitIdle(page);
  expect((await checkRender(page)).same, "通用求解播放中暂停：3D 状态一致");
  await shot(page, "desktop-11-solve-random");
  await page.evaluate(() => window.scrollTo(0, document.querySelector(".compare").offsetTop - 10));
  await shot(page, "desktop-12-sections", false);
  await page.evaluate(() => window.scrollTo(0, document.querySelector(".numbers").offsetTop - 10));
  await shot(page, "desktop-13-numbers", false);
  expect(errors.length === 0, `桌面控制台无报错 ${errors.slice(0, 3).join(" | ")}`);
  await page.close();
}

// ================= 手机 =================
{
  const vp = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
  const { page, errors } = await openPage(vp, "mobile");
  expect((await checkRender(page)).same, "手机：初始 3D 状态一致");
  await shot(page, "mobile-01-start");
  await page.tap("#btn-play");
  await sleep(300);
  await waitIdle(page);
  expect((await checkRender(page)).same, "手机：触控播放后状态一致");
  await shot(page, "mobile-02-after-cross");
  await page.evaluate(() => window.scrollTo(0, 700));
  await sleep(500);
  await shot(page, "mobile-03-scrolled-panel");
  // 方法按钮滚到吸顶播放区下方再点（被吸顶区盖住时点不到，真实用户也会先滚动）
  await page.evaluate(() => { const m = document.querySelector("#methods"); window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - document.querySelector(".player").offsetHeight - 12); });
  await sleep(400);
  await page.tap(`#methods [data-method="roux"]`);
  await sleep(500);
  expect(await evalApp(page, () => window.__cube.app.method === "roux" && document.body.dataset.method === "roux"), "手机：点按方法按钮切换到桥式");
  await page.evaluate(() => { const a = window.__cube.app; const b = a.stageBounds[2]; const el = document.createElement("button"); el.dataset.seek = String(b.start); document.body.appendChild(el); el.click(); el.remove(); });
  await sleep(1300);
  await shot(page, "mobile-04-roux-cmll");
  // 触控拖动旋转视角（空白处）
  const box = await (await page.$("#viewport")).boundingBox();
  await page.touchscreen.touchStart(box.x + 30, box.y + box.height - 60);
  await page.touchscreen.touchMove(box.x + 150, box.y + box.height - 70);
  await page.touchscreen.touchEnd();
  await sleep(600);
  expect((await checkRender(page)).same, "手机：拖动旋转视角不改变魔方状态");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.tap('.modes [data-mode="free"]');
  await sleep(600);
  for (const b of ["R", "U'", "F2"]) { await page.tap(`[data-turn="${b}"]`); await sleep(320); }
  await waitIdle(page);
  expect((await checkRender(page)).same, "手机：自由探索触控转动后状态一致");
  const td = await dragTurn(page, [0, 1, 1.4785], { touch: true });
  expect(td.ok && (await checkRender(page)).same, `手机：手指在贴纸上拖动转层：${td.desc}，状态仍一致`);
  await page.evaluate(() => window.scrollTo(0, 400));
  await shot(page, "mobile-05-free");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.tap('.modes [data-mode="solve"]');
  await sleep(400);
  await page.tap("#solve-random");
  await page.waitForFunction(() => { const a = window.__cube.app; return a.source && a.source.kind === "solve" && a.results[a.method] && a.results[a.method].check && document.querySelector("#solve-msg").textContent.includes("已用"); }, { timeout: 90000 });
  await sleep(800);
  const mr = await evalApp(page, () => ({ ok: window.__cube.app.results[window.__cube.app.method].check.ok, msg: document.querySelector("#solve-msg").textContent, where: window.__cube.app.results[window.__cube.app.method].where }));
  expect(mr.ok && mr.msg.includes("随机状态打乱（cubing.js）") && mr.where === "worker", `手机：随机状态打乱（cubing.js）在 Worker 中求解并复核通过：${mr.msg}`);
  await shot(page, "mobile-06-solve");
  await page.evaluate(() => window.scrollTo(0, document.querySelector(".compare").offsetTop));
  await shot(page, "mobile-07-compare");
  expect(errors.length === 0, `手机控制台无报错 ${errors.slice(0, 3).join(" | ")}`);
  await page.close();
}
await browser.close();
writeFileSync(`${OUT}/e2e-log.txt`, log.join("\n") + `\n\n失败项：${fail.length}\n${fail.join("\n")}\n`);
console.log(`\n失败项：${fail.length}`);
process.exit(fail.length ? 1 : 0);
