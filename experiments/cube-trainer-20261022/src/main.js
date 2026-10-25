import { cube3x3x3 } from "cubing/puzzles";
import { Alg } from "cubing/alg";
import { CubeView } from "./render/cube3d.js";
import { CubeCore, CubeState, invertNames, simplifyNames } from "./solver/core.js";
import { makeVerifier } from "./solver/verify.js";
import { METHODS, MOVE_DESC } from "./content/text.js";
import { llDiagram } from "./ui/diagram.js";
import { PIECES, placementToPattern } from "./render/geometry.js";
import EXAMPLES from "./data/examples.json";
import STATS from "./data/stats.json";
import { createLearningStudio } from "./learning/studio.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const METHOD_KEYS = ["lbl", "cfop", "roux"];
const SPEED_MS = { 0.5: 720, 1: 380, 2: 200, 4: 105 };
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const app = {
  mode: "example", method: "cfop", exampleIndex: 0,
  source: null, // { kind, scramble: string[], label }
  results: {}, // method → { res, check, ms }
  flat: [], stageBounds: [], stepBounds: [], pos: 0,
  playing: false, speed: 1,
  opts: { highlight: true, follow: true, pauseAtStage: true },
  free: { moves: [] },
  core: null, verifier: null, kp: null,
  userMovedCamera: false,
  touched: false, // 示例刚打开、尚未操作时，展示完整配色的打乱魔方与默认视角
};

// ---------------------------------------------------------------- 3D
const viewport = $("#viewport");
let view;
try {
  view = new CubeView(viewport, { onUserOrbit: () => { app.userMovedCamera = true; } });
  $("#loading").hidden = true;
} catch (err) {
  $("#loading").textContent = "当前浏览器无法创建 WebGL 3D 画面。请换用较新的浏览器，或开启硬件加速。";
  throw err;
}
// 便于自动化测试读取状态（不含任何敏感信息）：checkRender 从实际 3D 网格反推状态，与 cubing.js 数据算出的状态逐块比对
window.__cube = {
  app, view,
  checkRender() {
    const ms = view.debugMeshState();
    const list = PIECES.map((p) => ({ piece: p, pos: ms[p.key].pos, firstNormal: ms[p.key].faces[p.faces[0]] }));
    const fromMesh = placementToPattern(list);
    const names = app.mode === "free" ? app.free.moves : movesUpTo(app.pos);
    const s = CubeState.solved().applyAll(app.core, app.core.parse(names));
    const want = { ep: Array.from(s.ep), eo: Array.from(s.eo), cp: Array.from(s.cp), co: Array.from(s.co), zp: Array.from(s.zp) };
    return { same: JSON.stringify(fromMesh) === JSON.stringify(want), fromMesh, want, moves: names.length };
  },
};

// ---------------------------------------------------------------- 方法 / 示例选择器
$("#methods").innerHTML = METHOD_KEYS.map((k) => `
  <button type="button" role="tab" data-method="${k}" aria-selected="false">
    <b>${METHODS[k].name}</b><span>${METHODS[k].short === METHODS[k].name ? METHODS[k].tag : METHODS[k].short + " · " + METHODS[k].tag}</span>
  </button>`).join("");
$("#example-picker").innerHTML = EXAMPLES.map((e, i) => `<button type="button" role="tab" data-example="${i}" aria-selected="false">示例 ${i + 1}</button>`).join("");

// ---------------------------------------------------------------- 时间线数据
function loadResult(method) {
  const r = app.results[method];
  app.method = method;
  document.body.dataset.method = method;
  app.flat = []; app.stageBounds = []; app.stepBounds = [];
  if (!r) { app.pos = 0; return; }
  r.res.stages.forEach((st, si) => {
    const s0 = app.flat.length;
    st.steps.forEach((step, ti) => {
      const t0 = app.flat.length;
      step.moves.forEach((name) => app.flat.push({ name, si, ti }));
      app.stepBounds.push({ si, ti, start: t0, end: app.flat.length });
    });
    app.stageBounds.push({ si, id: st.id, start: s0, end: app.flat.length });
  });
}
const startMoves = () => (app.source ? app.source.scramble : []);
const movesUpTo = (k) => [...startMoves(), ...app.flat.slice(0, k).map((m) => m.name)];
function stageAt(pos) {
  const b = app.stageBounds;
  if (!b.length) return null;
  for (const x of b) if (pos < x.end) return x;
  return b[b.length - 1];
}
function stepAt(pos) {
  const b = app.stepBounds.filter((x) => x.end > x.start);
  for (const x of b) if (pos < x.end) return x;
  return b[b.length - 1] || null;
}
const justCompletedStage = (pos) => app.stageBounds.find((x) => x.end === pos && x.end > x.start && pos > 0) || null;

// ---------------------------------------------------------------- 着色集合
const KEYS = { cross: ["E4", "E5", "E6", "E7"], dc: ["C4", "C5", "C6", "C7"], mid: ["E8", "E9", "E10", "E11"], centers: ["Z0", "Z1", "Z2", "Z3", "Z4", "Z5"] };
const SHOW = {
  cross: new Set([...KEYS.cross, ...KEYS.centers]),
  firstLayer: new Set([...KEYS.cross, ...KEYS.dc, ...KEYS.centers]),
  f2l: new Set([...KEYS.cross, ...KEYS.dc, ...KEYS.mid, ...KEYS.centers]),
  fb: new Set(["E7", "E9", "E11", "C5", "C6", "Z1"]),
  sb: new Set(["E7", "E9", "E11", "C5", "C6", "Z1", "E5", "E8", "E10", "C4", "C7", "Z3"]),
  cmll: new Set(["E7", "E9", "E11", "C5", "C6", "Z1", "E5", "E8", "E10", "C4", "C7", "Z3", "C0", "C1", "C2", "C3"]),
  all: null,
};
function applyStickering() {
  if (app.mode === "library" || app.mode === "training") { learning.stickering(); return; }
  if (app.mode === "free") { view.setStickering(null, null); return; }
  const r = app.results[app.method];
  if (!r || !app.flat.length || (!app.touched && app.pos === 0)) { view.setStickering(null, null); return; }
  const st = stageAt(app.pos);
  const stage = r.res.stages[st.si];
  const meta = METHODS[app.method].stages[stage.id];
  const done = justCompletedStage(app.pos);
  const visible = app.opts.highlight && !(app.pos === app.flat.length) ? SHOW[meta.show] : null;
  const step = stepAt(app.pos);
  const sObj = step ? r.res.stages[step.si].steps[step.ti] : null;
  const focus = app.opts.highlight && sObj && app.pos < app.flat.length && !done ? new Set([...sObj.focus.e.map((i) => "E" + i), ...sObj.focus.c.map((i) => "C" + i)]) : null;
  view.setStickering(visible, focus);
}

// ---------------------------------------------------------------- 播放
const dur = () => (reduceMotion ? 1 : SPEED_MS[app.speed]);
async function stepForward() {
  app.touched = true;
  if (app.pos >= app.flat.length) return;
  const name = app.flat[app.pos].name;
  app.pos++;
  render();
  await view.animate(name, dur());
}
async function stepBack() {
  app.touched = true;
  if (app.pos <= 0) return;
  app.pos--;
  const name = invertNames([app.flat[app.pos].name])[0];
  render();
  await view.animate(name, dur());
}
function seek(k, { user = true } = {}) {
  pause();
  if (user) app.touched = true;
  app.pos = Math.max(0, Math.min(app.flat.length, k));
  view.setMoves(movesUpTo(app.pos));
  render();
}
let playbackRun = 0;
async function play() {
  if (app.playing || !app.flat.length) return;
  if (app.pos >= app.flat.length) seek(0);
  const run = ++playbackRun;
  app.playing = true;
  render();
  while (app.playing && run === playbackRun && app.pos < app.flat.length) {
    await stepForward();
    if (run !== playbackRun) return;
    if (app.opts.pauseAtStage && justCompletedStage(app.pos) && app.pos < app.flat.length) break;
    if (app.speed >= 2) await new Promise((r) => setTimeout(r, 10));
  }
  if (run === playbackRun) { app.playing = false; render(); }
}
function pause() { playbackRun++; app.playing = false; }

function loadLesson(seq) {
  pause();
  app.source = { kind: "lesson", id: seq.title + ":" + seq.setup.join(" "), scramble: seq.setup };
  app.flat = []; app.stageBounds = []; app.stepBounds = [];
  seq.stages.forEach((stage, si) => {
    const start = app.flat.length;
    stage.moves.forEach((name) => app.flat.push({ name, si, ti: 0 }));
    app.stageBounds.push({ si, start, end: app.flat.length });
    app.stepBounds.push({ si, ti: 0, start, end: app.flat.length });
  });
  app.pos = 0; app.touched = true;
  view.setMoves(seq.setup); view.look(seq.cam || "home");
  render();
}
const learning = createLearningStudio({ app, view, load: loadLesson, play, seek, pause });

// ---------------------------------------------------------------- 渲染面板
let lastStageForCam = null;
function render() {
  const r = app.results[app.method];
  const m = METHODS[app.method];
  $$("#methods [data-method]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.method === app.method)));
  $("#method-summary").textContent = m.summary;
  $("#hud-method").innerHTML = `${esc(m.name)}${m.short !== m.name ? `<span class="long"> · ${esc(m.short)}</span>` : ""}`;
  document.body.classList.toggle("is-playing", app.playing);
  $("#btn-play").setAttribute("aria-label", app.playing ? "暂停" : "播放");

  if (app.mode === "library" || app.mode === "training") { learning.playback(); return; }

  if (app.mode === "free") { renderFree(); return; }
  if (!r) {
    $("#stage-list").innerHTML = app.pendingMsg ? `<li class="stage-empty">${esc(app.pendingMsg)}</li>` : "";
    $("#hud-stage").textContent = "等待求解";
    $("#hud-move").textContent = "·";
    $("#hud-move-desc").textContent = "拖动魔方可旋转视角";
    $("#progress-text").textContent = "0 / 0";
    $("#verify-box").innerHTML = "";
    $("#timeline").innerHTML = "";
    $("#hud-done").hidden = true;
    applyStickering();
    return;
  }
  const total = app.flat.length;
  const st = stageAt(app.pos);
  const stage = r.res.stages[st.si];
  const meta = m.stages[stage.id];
  const done = justCompletedStage(app.pos);
  const finished = app.pos === total;

  // HUD
  $("#hud-stage").innerHTML = finished ? "已还原" : `${st.si + 1}/${r.res.stages.length} · <span class="long">${esc(meta.title)}</span><span class="short">${esc(meta.short)}</span>`;
  const nextMove = app.pos < total ? app.flat[app.pos].name : null;
  const lastMove = app.pos > 0 ? app.flat[app.pos - 1].name : null;
  const showMove = app.playing ? lastMove : nextMove;
  $("#hud-move").textContent = showMove || (finished ? "✓" : "·");
  $("#hud-move-desc").textContent = showMove ? (app.playing ? "" : "下一步 · ") + MOVE_DESC(showMove) : finished ? `共 ${total} 步，全部还原` : "";
  const hd = $("#hud-done");
  if (done && !app.playing) {
    const dm = m.stages[r.res.stages[done.si].id];
    const chk = r.check && r.check.stages[done.si];
    const key = `${app.method}:${done.si}:${app.source && app.source.id}`;
    if (hd.dataset.key !== key) {
      hd.dataset.key = key;
      hd.innerHTML = `<b>✓ ${esc(dm.title)}</b><span>${chk && chk.ok ? "目标已由 cubing.js 复核" : "阶段完成"}</span>`;
      hd.hidden = false;
      hd.classList.remove("is-leaving");
      void hd.offsetWidth;
      clearTimeout(hd._t);
      hd._t = setTimeout(() => { hd.classList.add("is-leaving"); hd._t = setTimeout(() => { hd.hidden = true; }, 450); }, 2800);
    }
  } else { hd.hidden = true; hd.dataset.key = ""; clearTimeout(hd._t); }
  $("#progress-text").textContent = `${app.pos} / ${total}`;

  // 阶段列表
  const step = stepAt(app.pos);
  $("#stage-list").innerHTML = r.res.stages.map((s, i) => {
    const b = app.stageBounds[i];
    const sm = m.stages[s.id];
    const state = finished || i < st.si ? "done" : i === st.si ? "current" : "todo";
    const isCur = i === st.si && !finished;
    const chk = r.check && r.check.stages[i];
    let inner = "";
    if (isCur) {
      inner += `<div class="stage-body"><p><em>目标</em>${esc(sm.goal)}</p><p><em>做法</em>${esc(sm.how)}</p>`;
      inner += `<ol class="steps">${s.steps.map((x, ti) => {
        const sb = app.stepBounds.find((y) => y.si === i && y.ti === ti);
        const cur = step && step.si === i && step.ti === ti;
        const moved = sb.end > sb.start;
        const chips = x.moves.map((mv, k) => {
          const gi = sb.start + k;
          const cls = gi < app.pos ? "done" : gi === app.pos ? "next" : "";
          return `<button type="button" class="mv ${cls}" data-seek="${gi + 1}" title="跳到这一步之后">${esc(mv)}</button>`;
        }).join("");
        const diag = x.llPattern || (s.id === "pll" && x.llPerm) ? `<div class="diag" aria-hidden="true">${llDiagram(movesUpTo(sb.start), s.id === "oll" ? "oll" : s.id === "cmll" ? "cmll" : "pll")}</div>` : "";
        return `<li class="step ${cur ? "is-current" : ""} ${moved ? "" : "is-skip"}">
          <button type="button" class="step-head" data-seek="${sb.start}"><span class="step-label">${esc(x.label)}</span><span class="step-n">${moved ? x.moves.length + " 步" : "跳过"}</span></button>
          ${cur ? `${x.detail ? `<p class="step-detail">${esc(x.detail)}</p>` : ""}${x.alg ? `<p class="step-alg">公式 <code>${esc(x.alg)}</code>${x.reps > 1 ? ` × ${x.reps}` : ""}</p>` : ""}${diag}<div class="chips">${chips}</div>` : ""}
        </li>`;
      }).join("")}</ol></div>`;
    }
    // 序号处的 ✓ 只表示“当前播放已走过这个阶段”；解法是否验算通过统一放在下方复核框里，避免两种含义混淆
    return `<li class="stage stage-${state} ${isCur ? "is-open" : ""}">
      <button type="button" class="stage-head" data-seek="${b.start}" aria-expanded="${isCur}">
        <span class="stage-no">${state === "done" ? "✓" : i + 1}</span>
        <span class="stage-name">${esc(sm.title)}</span>
        <span class="stage-meta">${s.moveCount} 步${chk && !chk.ok ? ' <i class="bad" title="cubing.js 复核未通过">✗</i>' : ""}</span>
      </button>${inner}</li>`;
  }).join("");

  // 时间线
  const tl = $("#timeline");
  tl.setAttribute("aria-valuemax", String(total));
  tl.setAttribute("aria-valuenow", String(app.pos));
  tl.setAttribute("aria-valuetext", `第 ${app.pos} 步，共 ${total} 步`);
  if (!tl.dataset.built || tl.dataset.built !== `${app.method}:${total}:${app.source && app.source.id}`) {
    tl.dataset.built = `${app.method}:${total}:${app.source && app.source.id}`;
    tl.innerHTML = `<div class="tl-track">${app.stageBounds.filter((b) => b.end > b.start).map((b) => {
      const sm = m.stages[r.res.stages[b.si].id];
      return `<div class="tl-seg" style="flex:${b.end - b.start}" data-si="${b.si}"><span>${esc(sm.short)}</span></div>`;
    }).join("")}</div><div class="tl-head" id="tl-head"></div>`;
  }
  $$(".tl-seg", tl).forEach((el) => {
    const b = app.stageBounds[Number(el.dataset.si)];
    el.classList.toggle("is-cur", b.si === st.si && !finished);
    el.classList.toggle("is-done", app.pos >= b.end);
    el.style.setProperty("--fill", `${Math.max(0, Math.min(1, (app.pos - b.start) / (b.end - b.start))) * 100}%`);
  });
  $("#tl-head").style.left = `${total ? (app.pos / total) * 100 : 0}%`;

  // 复核信息
  renderVerify(r);
  renderFullSolution(r);
  applyStickering();

  // 镜头跟随
  const camKey = finished || !app.touched ? "home" : meta.cam;
  if (app.opts.follow && lastStageForCam !== `${app.method}:${st.si}:${finished}:${app.touched}`) {
    lastStageForCam = `${app.method}:${st.si}:${finished}:${app.touched}`;
    if (!app.userMovedCamera) view.look(camKey);
  }
}

// 两行分开说：上行是“当前播放到哪了”（随播放变化），下行是“整套解法是否验算通过”（与播放进度无关）
function renderVerify(r) {
  const src = app.source;
  const n = r.res.stages.length;
  const total = app.flat.length;
  const passed = r.check ? r.check.stages.filter((x) => x.ok).length : 0;
  const ok = r.check && r.check.ok;
  const finished = app.pos >= total;
  const now = app.pos === 0 ? "还没开始，魔方是打乱状态" : finished ? `${n}/${n} 个阶段走完，魔方已还原` : `已走完 ${app.stageBounds.filter((b) => b.end <= app.pos).length}/${n} 个阶段`;
  const proof = !r.check ? "cubing.js 复核模块没有加载成功，这套解法暂未验算" : ok ? `cubing.js 从打乱开始重算这 ${r.res.total} 步：${n} 个阶段目标依次达成，终点还原` : `cubing.js 重算：${passed}/${n} 个阶段目标达成${r.check.solved ? "，终点还原" : "，终点未还原"}`;
  const kind = src.kind === "example" ? "示例（构建时生成并复核；本页加载时再次复核）" : src.kind === "free" ? "通用求解 · 打乱来自自由探索" : "通用求解 · 浏览器内实时计算";
  $("#verify-box").innerHTML = `
    <div class="verify-now ${finished ? "is-done" : ""}"><b>${finished ? "✓ " : ""}播放进度</b><span>第 ${app.pos}/${total} 步 · ${now}</span></div>
    <div class="verify-row ${!r.check ? "" : ok ? "is-ok" : "is-bad"}"><b>${!r.check ? "解法尚未复核" : ok ? "✓ 整套解法已验算" : "✗ 解法复核未通过"}</b><span>${proof}</span></div>
    <p class="verify-meta">${esc(kind)} · 本解法 ${r.res.total} 步${r.ms != null ? ` · 计算 ${r.ms < 10 ? r.ms.toFixed(1) : Math.round(r.ms)} ms` : ""}</p>
    <p class="verify-scr">打乱：<code>${esc(src.scramble.join(" ") || "（无）")}</code></p>`;
}
function renderFullSolution(r) {
  const m = METHODS[app.method];
  let gi = 0;
  $("#moves-all").innerHTML = r.res.stages.map((s) => {
    const chips = s.steps.flatMap((x) => x.moves).map((mv) => { gi++; return `<button type="button" class="mv ${gi <= app.pos ? "done" : ""}" data-seek="${gi}">${esc(mv)}</button>`; }).join("");
    return `<div class="moves-stage"><span>${esc(m.stages[s.id].short)}</span>${chips || '<i class="skip">跳过</i>'}</div>`;
  }).join("");
  const alg = r.res.stages.map((s) => `${s.steps.flatMap((x) => x.moves).join(" ")} // ${m.stages[s.id].short}`).join("\n");
  const url = `https://alpha.twizzle.net/edit/?puzzle=3x3x3&setup-alg=${encodeURIComponent("z2 " + app.source.scramble.join(" "))}&alg=${encodeURIComponent(alg)}`;
  $("#twizzle-link").href = url;
}

// ---------------------------------------------------------------- 自由探索
function renderFree() {
  const s = currentFreeState();
  const P = app.verifier ? app.verifier.P : null;
  $("#hud-stage").textContent = "自由探索";
  const last = app.free.moves[app.free.moves.length - 1];
  $("#hud-move").textContent = last || "·";
  $("#hud-move-desc").textContent = last ? MOVE_DESC(last) : "点按钮、按键盘字母，或在贴纸上拖动";
  $("#hud-done").hidden = true;
  $("#progress-text").textContent = `${app.free.moves.length} 步`;
  $("#timeline").innerHTML = "";
  $("#timeline").dataset.built = "";
  $("#stage-list").innerHTML = "";
  $("#verify-box").innerHTML = "";
  const n = app.free.moves.length;
  const simp = simplifyNames(app.free.moves);
  $("#free-moves").innerHTML = n ? `已拧 ${n} 步${simp.length !== n ? `（相邻同一面合并后 ${simp.length} 步）` : ""}：<code>${esc(simp.join(" ") || "互相抵消")}</code>` : "当前：已还原";
  if (!P || !s) return;
  const rows = {
    lbl: [["底层十字", P.cross], ["底层四角", P.firstLayer], ["中层四棱", P.f2l], ["顶层十字", P.llEdgesOriented], ["顶面同色", P.oll], ["顶层角", P.llCorners], ["还原", P.solved]],
    cfop: [["Cross", P.cross], ["F2L", P.f2l], ["OLL", P.oll], ["PLL", P.solved]],
    roux: [["左块", P.fb], ["右块", P.sb], ["CMLL", P.cmll], ["LSE", P.rouxSolved]],
  };
  $("#free-progress").innerHTML = METHOD_KEYS.map((k) => {
    let chain = true;
    const items = rows[k].map(([label, f]) => { chain = chain && f(s); return `<span class="${chain ? "ok" : ""}">${chain ? "✓" : "○"} ${label}</span>`; }).join("");
    return `<div class="fp-row"><b>${METHODS[k].name}</b><div>${items}</div></div>`;
  }).join("") + `<p class="fine">按各方法的阶段顺序累计：前一阶段没完成，后面的阶段不算完成。</p>`;
}
function currentFreeState() {
  if (!app.core) return null;
  return CubeState.solved().applyAll(app.core, app.core.parse(app.free.moves));
}
const FACE_BTNS = ["U", "D", "L", "R", "F", "B"];
$("#free-pad").innerHTML = FACE_BTNS.map((f) => `<div class="pad-col"><button type="button" data-turn="${f}">${f}</button><button type="button" data-turn="${f}'">${f}'</button><button type="button" data-turn="${f}2">${f}2</button></div>`).join("");
async function freeTurn(name) {
  if (app.mode !== "free") return;
  app.free.moves.push(name);
  renderFree();
  await view.animate(name, Math.min(dur(), 240));
}

// ---------------------------------------------------------------- 打乱输入
function parseScramble(text) {
  // 全角标点转半角；逗号、冒号、括号在 cubing.js 记号里有意义（交换子 [A, B]、共轭 [A: B]、重复 (A)n），保留
  const t = text.replace(/[’‘`´′]/g, "'").replace(/，/g, ",").replace(/：/g, ":").replace(/（/g, "(").replace(/）/g, ")").replace(/【/g, "[").replace(/】/g, "]").replace(/[；;\n\r\t]/g, " ").trim();
  if (!t) return { moves: [] };
  let alg;
  try { alg = Alg.fromString(t); } catch (e) { return { error: "无法解析这段公式，请检查记号。" }; }
  const out = [];
  for (const mv of alg.expand().experimentalLeafMoves()) {
    const fam = mv.family;
    if (!FACE_BTNS.includes(fam) || mv.innerLayer != null || mv.outerLayer != null) return { error: `只接受 U D L R F B 六个面的转动，不支持“${mv.toString()}”（中层、双层或整体转动会改变中心朝向）。` };
    const a = ((mv.amount % 4) + 4) % 4;
    if (a === 1) out.push(fam); else if (a === 2) out.push(fam + "2"); else if (a === 3) out.push(fam + "'");
  }
  if (out.length > 400) return { error: "打乱太长（超过 400 步）。" };
  return { moves: out };
}
let randomScrambleFn = null;
async function randomScramble() {
  try {
    if (!randomScrambleFn) randomScrambleFn = (await import("cubing/scramble")).randomScrambleForEvent;
    const alg = await Promise.race([randomScrambleFn("333"), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000))]);
    return { text: alg.toString(), kind: "随机状态打乱（cubing.js）", randomState: true };
  } catch (e) {
    // 退路：随机 25 步（不是随机状态）
    const faces = FACE_BTNS, suf = ["", "2", "'"];
    const out = []; let last = "", prevAxis = -1;
    while (out.length < 25) {
      const f = faces[Math.floor(Math.random() * 6)];
      const ax = "UDLRFB".indexOf(f) >> 1;
      if (f === last || (ax === prevAxis && out.length && ("UDLRFB".indexOf(out[out.length - 1][0]) >> 1) === ax && out.length > 1 && ("UDLRFB".indexOf(out[out.length - 2][0]) >> 1) === ax)) continue;
      out.push(f + suf[Math.floor(Math.random() * 3)]); last = f; prevAxis = ax;
    }
    return { text: out.join(" "), kind: "随机 25 步打乱（随机状态生成器不可用时的退路）" };
  }
}

// ---------------------------------------------------------------- Worker 求解
let worker = null, workerReady = null, reqId = 0;
const pending = new Map();
function getWorker() {
  if (worker) return workerReady;
  try {
    worker = new Worker(new URL("./worker/solver.worker.js", import.meta.url), { type: "module" });
    workerReady = new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("worker timeout")), 20000);
      worker.addEventListener("message", (e) => {
        if (e.data && e.data.hello) { clearTimeout(to); resolve(worker); return; }
        const p = pending.get(e.data.id);
        if (p) { pending.delete(e.data.id); e.data.ok ? p.resolve(e.data) : p.reject(new Error(e.data.error)); }
      });
      worker.addEventListener("error", (e) => { clearTimeout(to); reject(e); });
    });
  } catch (e) { workerReady = Promise.reject(e); }
  return workerReady;
}
async function solveRemote(method, scramble) {
  try {
    const w = await getWorker();
    const id = ++reqId;
    return await new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); w.postMessage({ id, method, scramble }); });
  } catch (e) {
    // 退路：主线程计算（同一套代码）
    const { MethodSolver } = await import("./solver/methods.js");
    if (!app.mainSolver) app.mainSolver = new MethodSolver(app.core);
    const t0 = performance.now();
    const res = app.mainSolver.solve(method, scramble);
    const ms = performance.now() - t0;
    return { res, ms, check: app.verifier.verify(method, scramble, null, res), mainThread: true, fallbackReason: String(e && e.message || e) };
  }
}
async function solveSource(method) {
  const src = app.source;
  if (app.results[method]) return;
  app.pendingMsg = "正在计算…";
  render();
  const out = await solveRemote(method, src.scramble);
  if (app.source !== src) return; // 已切换
  app.results[method] = { res: out.res, check: out.check, ms: out.ms, where: out.mainThread ? "main" : "worker" };
  app.pendingMsg = null;
}

// ---------------------------------------------------------------- 模式切换
async function setMode(mode) {
  pause();
  const wasLearning = app.mode === "library" || app.mode === "training";
  const isLearning = mode === "library" || mode === "training";
  if (wasLearning && !isLearning) { learning.leave(); app.source = null; app.results = {}; }
  app.mode = mode;
  document.body.dataset.mode = mode;
  $$(".modes [data-mode]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === mode)));
  $$(".mode-pane").forEach((p) => (p.hidden = p.dataset.pane !== mode));
  $("#learning").hidden = !isLearning;
  view.dragEnabled = mode === "free";
  lastStageForCam = null;
  app.userMovedCamera = false;
  if (isLearning) { learning.enter(mode); return; }
  if (mode === "example") { await loadExample(app.exampleIndex); return; }
  if (mode === "free") { view.setMoves(app.free.moves); view.look("home"); render(); return; }
  if (mode === "solve") {
    if (app.source && app.source.kind !== "example") { loadResult(app.method); seek(0, { user: false }); }
    else { app.source = null; app.results = {}; loadResult(app.method); view.setMoves([]); render(); }
  }
}
async function loadExample(i) {
  app.exampleIndex = i;
  const ex = EXAMPLES[i];
  app.source = { kind: "example", id: ex.id, scramble: ex.scramble.split(" ") };
  app.results = {};
  for (const k of METHOD_KEYS) {
    const res = ex.solutions[k];
    const check = app.verifier ? app.verifier.verify(k, ex.scramble, null, res) : null;
    app.results[k] = { res, check, ms: null };
  }
  $$("#example-picker [data-example]").forEach((b) => b.setAttribute("aria-selected", String(Number(b.dataset.example) === i)));
  loadResult(app.method);
  lastStageForCam = null;
  app.userMovedCamera = false;
  app.touched = false;
  seek(0, { user: false });
}
async function setMethod(k) {
  pause();
  app.method = k;
  document.body.dataset.method = k;
  lastStageForCam = null;
  app.userMovedCamera = false;
  if (app.mode === "free") { render(); return; }
  if (app.source && !app.results[k] && app.source.kind !== "example") await solveSource(k);
  loadResult(k);
  seek(0, { user: false });
}
async function startSolve(scrambleMoves, kind, label) {
  app.source = { kind, id: `s${Date.now()}`, scramble: scrambleMoves, label };
  app.results = {};
  loadResult(app.method);
  view.setMoves(scrambleMoves);
  try {
    await solveSource(app.method);
    loadResult(app.method);
    app.touched = true; // 通用求解：直接进入阶段讲解视图
    seek(0, { user: false });
    $("#solve-msg").textContent = label ? `${label}：已用${METHODS[app.method].name}求解。切换方法会用同一个打乱重新计算。` : "";
  } catch (e) {
    app.pendingMsg = null;
    $("#solve-msg").textContent = "求解失败：" + e.message;
    render();
  }
}

// ---------------------------------------------------------------- 事件
document.addEventListener("click", (e) => {
  const t = e.target.closest("button, [data-seek]");
  if (!t) return;
  if (t.dataset.seek != null) { seek(Number(t.dataset.seek)); return; }
  if (t.dataset.method) { setMethod(t.dataset.method); return; }
  if (t.dataset.mode) { setMode(t.dataset.mode); return; }
  if (t.dataset.example != null) { loadExample(Number(t.dataset.example)); return; }
  if (t.dataset.turn) { freeTurn(t.dataset.turn); return; }
  if (t.dataset.freeSolve) {
    const moves = simplifyNames(app.free.moves);
    if (!moves.length) { $("#free-moves").textContent = "魔方现在是还原状态，先拧几下再求解。"; return; }
    app.method = t.dataset.freeSolve;
    setMode("solve").then(() => {
      $("#scramble-input").value = moves.join(" ");
      startSolve(moves, "free", `打乱来自自由探索（${moves.length} 步）`);
    });
  }
});
$("#btn-play").addEventListener("click", () => (app.playing ? (pause(), render()) : play()));
$("#btn-next").addEventListener("click", () => { pause(); stepForward(); });
$("#btn-prev").addEventListener("click", () => { pause(); stepBack(); });
$("#btn-reset").addEventListener("click", () => seek(0));
$("#btn-next-stage").addEventListener("click", () => { const b = app.stageBounds.find((x) => x.end > app.pos && x.end > x.start); seek(b ? b.end : app.flat.length); });
$("#btn-prev-stage").addEventListener("click", () => { const bs = app.stageBounds.filter((x) => x.start < app.pos && x.end > x.start); const b = bs[bs.length - 1]; seek(b ? b.start : 0); });
$("#speed").addEventListener("change", (e) => { app.speed = Number(e.target.value); });
$("#pause-at-stage").addEventListener("change", (e) => { app.opts.pauseAtStage = e.target.checked; });
$("#btn-view").addEventListener("click", () => {
  app.userMovedCamera = false;
  if (app.mode === "library" || app.mode === "training") { view.look("home"); return; }
  const r = app.results[app.method];
  const st = r && app.mode !== "free" ? stageAt(app.pos) : null;
  view.look(st && app.pos < app.flat.length ? METHODS[app.method].stages[r.res.stages[st.si].id].cam : "home");
});
$("#btn-highlight").addEventListener("click", (e) => { app.opts.highlight = !app.opts.highlight; e.currentTarget.setAttribute("aria-pressed", String(app.opts.highlight)); applyStickering(); });
$("#btn-follow").addEventListener("click", (e) => { app.opts.follow = !app.opts.follow; e.currentTarget.setAttribute("aria-pressed", String(app.opts.follow)); if (app.opts.follow) { app.userMovedCamera = false; lastStageForCam = null; render(); } });
// 时间线拖动
(() => {
  const tl = $("#timeline");
  let dragging = false;
  const at = (ev) => { const r = tl.getBoundingClientRect(); return Math.round(((ev.clientX - r.left) / r.width) * app.flat.length); };
  tl.addEventListener("pointerdown", (ev) => { if (!app.flat.length) return; dragging = true; tl.setPointerCapture(ev.pointerId); seek(at(ev)); });
  tl.addEventListener("pointermove", (ev) => { if (dragging) seek(at(ev)); });
  tl.addEventListener("pointerup", () => (dragging = false));
  tl.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowRight") { ev.preventDefault(); seek(app.pos + 1); }
    if (ev.key === "ArrowLeft") { ev.preventDefault(); seek(app.pos - 1); }
  });
})();
// 键盘
document.addEventListener("keydown", (e) => {
  const tag = e.target && e.target.tagName;
  if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (app.mode === "free") {
    const k = e.key.toUpperCase();
    if (FACE_BTNS.includes(k)) { e.preventDefault(); freeTurn(e.shiftKey ? k + "'" : k); }
    return;
  }
  if (e.key === " ") { e.preventDefault(); app.playing ? (pause(), render()) : play(); }
  else if (e.key === "ArrowRight" && e.target.id !== "timeline") { e.preventDefault(); pause(); stepForward(); }
  else if (e.key === "ArrowLeft" && e.target.id !== "timeline") { e.preventDefault(); pause(); stepBack(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); $("#btn-next-stage").click(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); $("#btn-prev-stage").click(); }
  else if (e.key === "Home") { e.preventDefault(); seek(0); }
  else if (e.key === "End") { e.preventDefault(); seek(app.flat.length); }
});
// 自由探索按钮
$("#free-undo").addEventListener("click", async () => { if (!app.free.moves.length) return; const m = app.free.moves.pop(); renderFree(); await view.animate(invertNames([m])[0], 200); });
$("#free-reset").addEventListener("click", () => { app.free.moves = []; view.setMoves([]); renderFree(); });
$("#free-scramble").addEventListener("click", async (e) => {
  const b = e.currentTarget; b.disabled = true; b.textContent = "生成中…";
  const r = await randomScramble();
  b.disabled = false; b.textContent = "随机打乱";
  app.free.moves = r.text.split(" ");
  view.setMoves(app.free.moves);
  renderFree();
});
// 通用求解
$("#solve-random").addEventListener("click", async (e) => {
  const b = e.currentTarget; b.disabled = true; b.textContent = "生成中…";
  const r = await randomScramble();
  b.disabled = false; b.textContent = "随机打乱";
  $("#scramble-input").value = r.text;
  $("#solve-msg").textContent = r.kind;
  startSolve(r.text.split(" "), "solve", r.kind);
});
$("#solve-go").addEventListener("click", () => {
  const p = parseScramble($("#scramble-input").value);
  if (p.error) { $("#solve-msg").textContent = p.error; return; }
  if (!p.moves.length) { $("#solve-msg").textContent = "请先输入打乱公式，或点“随机打乱”。"; return; }
  startSolve(p.moves, "solve", `自定义打乱（${p.moves.length} 步）`);
});
$("#scramble-input").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#solve-go").click(); } });
// 拖动贴纸转层（仅自由探索）
view.enableDragTurns((name) => freeTurn(name));

// ---------------------------------------------------------------- 对比区
function renderCompare() {
  const S = STATS.perMethod;
  $("#compare-grid").innerHTML = METHOD_KEYS.map((k) => {
    const m = METHODS[k];
    const st = Object.entries(m.stages);
    return `<article class="cmp cmp-${k}">
      <header><b>${m.name}</b><span>${esc(m.en)}</span></header>
      <ol>${st.map(([id, s]) => `<li><span>${esc(s.short)}</span><em>${S[k].stages[id] != null ? S[k].stages[id].toFixed(1) : "–"}</em></li>`).join("")}</ol>
      <p class="cmp-total"><b>${S[k].mean.toFixed(1)}</b> 步<small>本页求解器在 ${STATS.samples} 个随机状态上的平均（95% 不超过 ${S[k].p95} 步）</small></p>
    </article>`;
  }).join("");
  $("#truth-stats").textContent = `发布前，三种方法各在 ${STATS.samples} 个均匀随机合法状态上求解，并在 cubing.js 中逐阶段复核：失败 ${STATS.failures} 次。OLL ${STATS.ollClasses} 种、PLL ${STATS.pllClasses} 种情况都由程序枚举，确认公式表全覆盖。`;
}
renderCompare();

// ---------------------------------------------------------------- 启动
(async () => {
  try {
    app.kp = await cube3x3x3.kpuzzle();
    app.core = new CubeCore(app.kp);
    app.verifier = makeVerifier(app.kp);
  } catch (e) { console.error(e); }
  const initial = new URLSearchParams(location.search).get("mode");
  await setMode(["example", "free", "solve", "library", "training"].includes(initial) ? initial : "library");
  // 预热 worker（不阻塞）
  setTimeout(() => getWorker().catch(() => {}), 1500);
})();
