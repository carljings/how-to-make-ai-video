// 快速取景：指定若干状态截图（审美复核用）
import puppeteer from "puppeteer-core";
const [,, url = "http://127.0.0.1:4173/cube/", out = "/dev/shm/rubiks-science-20261021/cache/shots", which = "all"] = process.argv;
import { mkdirSync } from "node:fs"; mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, userDataDir: "/dev/shm/rubiks-science-20261021/cache/chrome-profile", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(vp) {
  const page = await browser.newPage(); await page.setViewport(vp);
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__cube && window.__cube.app.results.cfop && window.__cube.app.results.cfop.check);
  await sleep(1500); return page;
}
const seek = (page, k) => page.evaluate((k) => { const el = document.createElement("button"); el.dataset.seek = String(k); document.body.appendChild(el); el.click(); el.remove(); }, k);
const stageStart = (page, i, off = 0) => page.evaluate((i, off) => window.__cube.app.stageBounds[i].start + off, i, off);
const method = async (page, m) => { await page.click(`#methods [data-method="${m}"]`); await sleep(300); };
const scenes = {
  desk: { width: 1440, height: 900, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
for (const [vpName, vp] of Object.entries(scenes)) {
  if (which !== "all" && which !== vpName) continue;
  const page = await open(vp);
  await page.screenshot({ path: `${out}/${vpName}-a-start.png` });
  await seek(page, await stageStart(page, 1, 9)); await sleep(1600);
  await page.screenshot({ path: `${out}/${vpName}-b-f2l.png` });
  await seek(page, await stageStart(page, 2, 0)); await sleep(1600);
  await page.screenshot({ path: `${out}/${vpName}-c-oll.png` });
  await method(page, "roux"); await seek(page, await stageStart(page, 1, 3)); await sleep(1600);
  await page.screenshot({ path: `${out}/${vpName}-d-roux-sb.png` });
  await method(page, "lbl"); await seek(page, await stageStart(page, 1, 6)); await sleep(1600);
  await page.screenshot({ path: `${out}/${vpName}-e-lbl-corners.png` });
  await page.keyboard.press("End"); await sleep(1600);
  await page.screenshot({ path: `${out}/${vpName}-f-solved.png` });
  await page.close();
}
await browser.close();
console.log("done");
