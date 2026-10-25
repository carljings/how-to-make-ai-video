import LIB from "../data/library.json";
import BANK from "../data/training.json";
import { llDiagram } from "../ui/diagram.js";
import { inspect, parsePlan, tracked, caseSequence, SLOTS, EDGE_POS, CORNER_POS, FACE_LABEL } from "./engine.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const SETS = { F2L: "前两层", OLL: "顶面定向", PLL: "顶层排列", CMLL: "桥式四角", LBL: "入门公式", LSE: "桥式最后六棱" };
const GOALS = { F2L: "十字与其余三槽保留，右前角棱一起归位", OLL: "保留前两层，让顶面同色", PLL: "保留前两层与顶面定向，完成排列", CMLL: "保留两侧块，完成顶层四角", LBL: "按本例的入门目标演示", LSE: "依次定向、放好左右棱、完成中层" };
const options = (items) => `<option value="">请选择</option>${items.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}`;
const route = (moves) => `<code>${moves.map(esc).join(" ")}</code>`;

export function createLearningStudio({ app, view, load, play, seek, pause }) {
  const root = document.querySelector("#learning");
  const state = { set: "F2L", index: 0, group: "all", query: "", task: "cross", level: "one", n: 1, qIndex: 0, attempts: 0, correct: 0, question: null, seq: null, timer: null };
  const $ = (s) => root.querySelector(s);
  const setSequence = (seq) => { state.seq = seq; load(seq); };
  function enter(mode) {
    clearInterval(state.timer);
    root.replaceChildren();
    if (mode === "library") renderLibrary(); else renderTraining();
  }
  function renderLibrary() {
    const rows = LIB[state.set], groups = [...new Set(rows.map((x) => x.group).filter(Boolean))];
    root.innerHTML = `<h1 class="learn-title">公式库</h1><p class="learn-lede">选一种情况，逐步看它怎样还原。每种情况一套可复核的演示。</p>
      <div class="learn-sets" role="group" aria-label="公式集合">${Object.entries(SETS).map(([k, label]) => `<button type="button" data-set="${k}" aria-pressed="${state.set === k}"><b>${k}</b><span>${label} · ${LIB[k].length}</span></button>`).join("")}</div>
      <div class="learn-filter"><label>查找案例<input id="case-search" type="search" placeholder="编号或名称，如 OLL 27" value="${esc(state.query)}"></label><label>分组<select id="case-group"><option value="all">全部分组</option>${groups.map((g) => `<option value="${esc(g)}" ${state.group === g ? "selected" : ""}>${esc(g === "Solved" ? "O · 顶角已定向" : g)}</option>`).join("")}</select></label></div>
      <div id="case-detail"></div><p class="catalog-caption" id="case-count"></p><div class="case-catalog" id="case-catalog" aria-label="案例列表"></div>
      <details class="learn-note"><summary>范围与记号</summary><p>常用标准集：F2L 41、OLL 57、PLL 21、CMLL 42；另有入门与 LSE 典型演示。每类有许多写法，这里并不声称收录所有变体。F2L 与桥式搭块应结合理解来练。</p><p>黄顶、白底、绿前、橙右。含 x / y / z 的参考公式在播放器中使用固定视角等价写法，原记号另列。M 为中层，r 为右双层；逆时针标 '，半圈标 2。</p></details>`;
    $("#case-search").addEventListener("input", (e) => { state.query = e.target.value; renderCatalog(); });
    $("#case-group").addEventListener("change", (e) => { state.group = e.target.value; renderCatalog(); });
    renderCatalog(); selectCase(Math.min(state.index, rows.length - 1));
  }
  function renderCatalog() {
    const rows = LIB[state.set].map((item, i) => ({ item, i })).filter(({ item }) => (state.group === "all" || item.group === state.group) && `${item.id} ${item.title || ""} ${item.desc || ""}`.toLowerCase().includes(state.query.toLowerCase()));
    $("#case-count").textContent = `${rows.length} / ${LIB[state.set].length} 个案例 · 点选后在左侧演示`;
    $("#case-catalog").innerHTML = rows.length ? rows.map(({ item, i }) => {
      const seq = caseSequence(state.set, item);
      const diagram = ["OLL", "PLL", "CMLL"].includes(state.set) ? llDiagram(seq.setup, state.set.toLowerCase()) : "";
      return `<button type="button" class="case-choice" data-case="${i}" aria-pressed="${state.index === i}">${diagram}<b>${esc(item.id)}</b>${!diagram ? `<span>${esc(item.title || item.group || "")}</span>` : ""}</button>`;
    }).join("") : `<p class="learn-empty">没有找到这个案例。试试编号，或切回“全部分组”。</p>`;
  }
  function selectCase(i) {
    state.index = i;
    const item = LIB[state.set][i], seq = caseSequence(state.set, item), a = item.ref || item.own;
    const check = inspect(app.kp, seq.setup, seq.moves);
    if (!check[seq.goal]) throw new Error("公式目标复核失败：" + item.id);
    $("#case-detail").innerHTML = `<article class="lesson-detail"><div class="lesson-heading"><h2>${esc(item.id)}</h2><span>${esc(SETS[state.set])}</span></div><p>${esc(item.desc || item.goal || item.title)}</p><p class="lesson-goal"><b>看什么</b>${esc(GOALS[state.set])}</p><div class="lesson-formula"><span>演示写法${a?.hasRotation ? " · 固定视角等价" : ""}</span>${route(seq.moves)}</div>${a?.hasRotation ? `<p class="original-notation">参考原记号：${esc(a.text)}</p>` : ""}<div class="learn-actions"><button type="button" class="btn btn-accent" data-action="lesson-play">从头播放</button><button type="button" class="btn" data-action="lesson-end">看完成状态</button>${a?.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">参考案例 ↗</a>` : ""}</div><p class="lesson-live" id="lesson-live" role="status"></p></article>`;
    setSequence({ ...seq, title: item.id, label: SETS[state.set], cam: ["OLL", "PLL", "CMLL"].includes(state.set) ? "top" : "home", focus: state.set === "F2L" ? new Set(["C4", "E8"]) : null });
    renderCatalog();
  }
  function questions() {
    if (state.task === "prediction") return BANK.prediction;
    if (state.task === "extended") return BANK.extended.filter((q) => q.n === state.n);
    return BANK.cross.filter((q) => q.level === state.level);
  }
  function renderTraining() {
    root.innerHTML = `<h1 class="learn-title">先观察，再验证</h1><p class="learn-lede">“一次做好十字”是提前规划整段路线，不是每次只转一个面。先不限时练，再缩短观察时间。</p>
      <div class="training-tabs" role="group" aria-label="训练类型">${[["cross", "规划十字"], ["prediction", "预判第一组"], ["extended", "扩展十字"]].map(([k, l]) => `<button type="button" data-task="${k}" aria-pressed="${state.task === k}">${l}</button>`).join("")}</div>
      <div class="training-settings">${state.task === "cross" ? `<label>难度<select id="cross-level"><option value="one" ${state.level === "one" ? "selected" : ""}>1 步热身</option><option value="short" ${state.level === "short" ? "selected" : ""}>2–4 步规划</option><option value="normal" ${state.level === "normal" ? "selected" : ""}>5–8 步常规</option></select></label>` : state.task === "extended" ? `<label>目标<select id="extended-count">${[1, 2, 3].map((n) => `<option value="${n}" ${n === state.n ? "selected" : ""}>${"X".repeat(n)}Cross · 十字 + ${n} 组</option>`).join("")}</select></label>` : `<p>沿十字路线，在脑中追踪一组角棱。</p>`}<button class="btn" type="button" data-action="next-question">换一题</button></div>
      <div id="question"></div><div id="training-feedback" class="training-feedback" role="status" hidden></div><p id="session-stats" class="session-stats"></p>
      <details class="learn-note"><summary>怎样练习，练到哪一步？</summary><p>① 先找到四条白棱及对应侧面中心。② 在脑中追踪整段十字，写下后再拧。③ 十字稳定后，追踪第一组角棱的去向。④ 有机会时一起规划 XCross，不强求每个打乱都做扩展十字。</p><p>XCross 是十字 + 1 组，XXCross + 2 组，XXXCross + 3 组。十字后预判第一组和把它一起完成，是两种不同练习。</p><p>当前为固定题库：十字 36 题、第一组 24 题、扩展 18 题。常规题从随机 22 步筛选，并非均匀随机状态。十字参考解为固定白底、面转动 HTM 最短解；扩展路线只保证达成目标。</p><p><a href="https://jperm.net/3x3/cfop/cross" target="_blank" rel="noopener noreferrer">十字与预判教程 ↗</a> · 本页计时仅供练习，不代替比赛计时。</p></details>`;
    $("#cross-level")?.addEventListener("change", (e) => { state.level = e.target.value; state.qIndex = 0; loadQuestion(); });
    $("#extended-count")?.addEventListener("change", (e) => { state.n = Number(e.target.value); state.qIndex = 0; loadQuestion(); });
    loadQuestion();
  }
  function loadQuestion() {
    clearInterval(state.timer); state.userMoves = null;
    const qs = questions(), q = qs[state.qIndex % qs.length]; state.question = q;
    $("#training-feedback").hidden = true;
    const target = q.slot && SLOTS[q.slot];
    const select = (id, label, items) => `<label>${label}<select id="${id}" data-prediction="${id}">${options(items)}</select></label>`;
    $("#question").innerHTML = `<div class="question-heading"><h2>${state.task === "cross" ? "把四条白棱一次规划好" : state.task === "prediction" ? `追踪${target.label}这一组` : `这段路线完成哪些槽？`}</h2><span>第 ${state.qIndex % qs.length + 1} / ${qs.length} 题</span></div>
      <div class="observation-tools"><button type="button" class="btn" data-action="bottom-view">看底面</button><label><input type="checkbox" id="focus-pieces" checked> ${state.task === "prediction" ? "突出目标角棱" : "突出白色十字"}</label><button type="button" class="btn" data-action="timer" id="inspection-timer">开始 15 秒观察</button></div>
      <p class="training-instruction">${state.task === "cross" ? "先转动视角观察，魔方层暂不转动。写好完整方案，再检查四条白棱。" : state.task === "prediction" ? `黄顶白底，绿前橙右。执行下面的十字后，${target.label}角块和棱块会在哪里？白贴纸与${target.color}贴纸分别朝哪？` : `观察并在脑中执行候选路线，勾选最终已经归位的角棱槽。路线已验算能完成 ${q.n} 组，不保证最短；你也可以改写路线再验证。`}</p>
      ${state.task === "prediction" ? `<div class="planned-route"><span>待预判的十字路线</span>${route(q.solution)}</div><div class="prediction-fields">${select("predict-corner", "角块位置", CORNER_POS.map((v) => [v, v]))}${select("predict-white", "角块白色贴纸朝向", Object.entries(FACE_LABEL))}${select("predict-edge", "棱块位置", EDGE_POS.map((v) => [v, v]))}${select("predict-color", `棱块${target.color}色贴纸朝向`, Object.entries(FACE_LABEL))}</div><button type="button" class="btn btn-accent" data-action="check-prediction">检查预判</button>` : `<label class="plan-field">${state.task === "extended" ? "候选路线（可修改）" : "我的完整十字方案"}<textarea id="plan-input" rows="2" spellcheck="false" placeholder="例如：R U2 F'">${state.task === "extended" ? esc(q.solution.join(" ")) : ""}</textarea></label>${state.task === "extended" ? `<fieldset class="slot-prediction"><legend>我预判这些槽会一起归位</legend>${Object.entries(SLOTS).map(([k, s]) => `<label><input type="checkbox" name="predicted-slot" value="${k}"> ${s.label} ${k}</label>`).join("")}</fieldset>` : `<div class="plan-pad" role="group" aria-label="组成方案">${["U", "D", "L", "R", "F", "B"].map((f) => [f, f + "'", f + "2"].map((v) => `<button type="button" data-plan-move="${v}">${v}</button>`).join("")).join("")}<button type="button" data-action="plan-undo">退一格</button></div>`}<div class="learn-actions"><button type="button" class="btn btn-accent" data-action="check-plan">${state.task === "cross" ? "检查我的方案" : "检查路线与预判"}</button><button type="button" class="btn" data-action="reveal">揭晓参考</button></div>`}
      <div id="reference-answer" hidden></div><p class="scramble-small">打乱：${route(q.setup)}</p>`;
    setSequence({ setup: q.setup, moves: [], stages: [], title: "观察中", label: "十字训练", cam: "home", focus: state.task === "prediction" ? new Set(["C" + target.c, "E" + target.e]) : new Set(["E4", "E5", "E6", "E7"]), goal: "cross" });
    $("#focus-pieces").addEventListener("change", () => stickering());
    updateStats();
  }
  function feedback(ok, html) {
    state.attempts++; if (ok) state.correct++; updateStats();
    const f = $("#training-feedback"); f.hidden = false; f.classList.toggle("is-correct", ok); f.innerHTML = `<b>${ok ? "这次判断正确" : "再追踪一次"}</b>${html}`;
  }
  function updateStats() { $("#session-stats").textContent = `本次页面练习：尝试 ${state.attempts} 次，正确 ${state.correct} 次。记录仅在当前页面内。`; }
  function stopObservation() { clearInterval(state.timer); if (state.timer && $("#inspection-timer")) $("#inspection-timer").textContent = "观察已结束"; state.timer = null; }
  function checkPlan() {
    const parsed = parsePlan($("#plan-input").value);
    if (parsed.error) { const f = $("#training-feedback"); f.hidden = false; f.innerHTML = `<b>检查输入</b><p>${esc(parsed.error)}</p>`; return; }
    const q = state.question, end = inspect(app.kp, q.setup, parsed.moves);
    const predicted = Array.from(root.querySelectorAll('[name="predicted-slot"]:checked'), (x) => x.value);
    const ok = end.cross && (state.task === "cross" || (end.slots.length >= q.n && predicted.length === end.slots.length && predicted.every((s) => end.slots.includes(s))));
    const edgeInfo = `<ul class="edge-checks">${end.edges.map((e) => `<li class="${e.ok ? "is-correct" : ""}">${e.name}：${e.ok ? "位置、朝向正确" : `在 ${e.position}，${e.oriented ? "朝向正确" : "朝向需调整"}`}</li>`).join("")}</ul>`;
    const more = state.task === "cross" ? `你的方案 ${parsed.moves.length} 步；参考最少 ${q.distance} 步${end.cross ? `，多用 ${parsed.moves.length - q.distance} 步。不同正确解法同样通过。` : "。先检查没有归位的白棱。"}` : `十字${end.cross ? "已完成" : "未完成"}；已归位：${end.slots.map((s) => SLOTS[s].label).join("、") || "无"}。${!predicted.length ? "请先勾选你预判的槽位。" : "预判需与实际归位槽一致。"}`;
    stopObservation();
    feedback(ok, `<p>${more}</p>${state.task === "cross" ? edgeInfo : ""}<button class="btn" type="button" data-action="play-answer" data-route="user">播放刚才的方案</button>`);
    state.userMoves = parsed.moves;
  }
  function checkPrediction() {
    const q = state.question, expected = tracked(app.kp, q.setup, q.solution, q.slot);
    const got = { corner: $("#predict-corner").value, white: $("#predict-white").value, edge: $("#predict-edge").value, color: $("#predict-color").value };
    const ok = Object.keys(expected).every((k) => expected[k] === got[k]);
    stopObservation();
    const doneSlots = inspect(app.kp, q.setup, q.solution).slots;
    feedback(ok, `<p>角块在 <strong>${expected.corner}</strong>，白色朝${FACE_LABEL[expected.white]}；棱块在 <strong>${expected.edge}</strong>，${SLOTS[q.slot].color}色朝${FACE_LABEL[expected.color]}。</p><p>${doneSlots.includes(q.slot) ? `这组已随十字归位；这条路线结束时共有 ${doneSlots.length} 组 F2L 已完成。` : "这组还未归位，做完十字后要继续配对与插入。"}点播放，核对角棱经过每次转动的位置与朝向。</p><button class="btn" type="button" data-action="play-answer">逐步验证这条路线</button>`);
  }
  function reveal() {
    const q = state.question; stopObservation();
    $("#reference-answer").hidden = false;
    $("#reference-answer").innerHTML = `<div class="reference-answer"><h3>${state.task === "cross" ? `参考最短解 · ${q.distance} 步 HTM` : "一条已验证的扩展路线"}</h3>${route(q.solution)}${state.task === "cross" ? q.alternatives.map((a, i) => `<p>最短起手 ${i + 1}：${route(a)}</p>`).join("") : `<p>一起完成：${q.slots.map((k) => SLOTS[k].label).join("、")}。这条路线 ${q.solution.length} 步；只做十字的最短解 ${q.distance} 步，顺带完成 ${q.crossSlots.length} 组。扩展路线未证明最短。</p>`}<button class="btn" type="button" data-action="play-answer">播放参考路线</button></div>`;
  }
  function showAnswer(which) {
    const q = state.question, moves = which === "user" ? state.userMoves : q.solution;
    if (!moves) return;
    const extended = state.task === "extended";
    setSequence({ setup: q.setup, moves, stages: [{ title: "路线验证", moves }], title: "路线验证", label: "十字训练", goal: "cross", check: extended ? (s) => s.cross && s.slots.length >= q.n : null, doneText: extended ? `十字 + ${q.n} 组目标达成` : "十字路线已完成", focus: state.seq?.focus, cam: "bottom" });
    play();
  }
  function stickering() {
    if (!state.seq) return;
    const on = app.opts.highlight && (app.mode === "library" || $("#focus-pieces")?.checked);
    view.setStickering(null, on ? state.seq.focus : null);
  }
  function playback() {
    const seq = state.seq; if (!seq) return;
    const total = app.flat.length, finished = total > 0 && app.pos === total;
    const cur = inspect(app.kp, seq.setup, seq.moves.slice(0, app.pos));
    document.querySelector("#hud-method").textContent = seq.label;
    const reached = seq.check ? seq.check(cur) : cur[seq.goal];
    const segment = app.stageBounds.find((x) => app.pos < x.end) || app.stageBounds.at(-1);
    document.querySelector("#hud-stage").textContent = finished ? (reached ? (seq.doneText || "本例目标达成") : "路线结束，目标尚未达成") : total ? (seq.stages[segment?.si]?.title || seq.title) : "先观察，暂不转层";
    const name = app.flat[app.playing ? Math.max(0, app.pos - 1) : app.pos]?.name;
    document.querySelector("#hud-move").textContent = name || (finished ? "完成" : "观察");
    document.querySelector("#hud-move-desc").textContent = total ? `第 ${app.pos} / ${total} 步 · 可暂停、前后逐步检查` : "拖动空白处转视角；先在右侧作答";
    document.querySelector("#hud-done").hidden = true;
    document.querySelector("#progress-text").textContent = `${app.pos} / ${total}`;
    const tl = document.querySelector("#timeline");
    tl.setAttribute("aria-valuemax", String(total)); tl.setAttribute("aria-valuenow", String(app.pos)); tl.setAttribute("aria-valuetext", `第 ${app.pos} 步，共 ${total} 步`);
    tl.innerHTML = total ? `<div class="lesson-track"><div style="transform:scaleX(${app.pos / total})"></div></div>` : "";
    const live = $("#lesson-live"); if (live) live.textContent = finished ? `当前状态复核：${cur[seq.goal] ? "目标已达成" : "目标尚未达成"}。` : `完整路线已验算；当前播放到第 ${app.pos} 步。`;
    stickering();
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.set) { state.set = b.dataset.set; state.index = 0; state.group = "all"; state.query = ""; renderLibrary(); }
    else if (b.dataset.case != null) selectCase(Number(b.dataset.case));
    else if (b.dataset.task) { state.task = b.dataset.task; state.qIndex = 0; renderTraining(); }
    else if (b.dataset.planMove) { const t = $("#plan-input"); t.value = `${t.value.trim()} ${b.dataset.planMove}`.trim(); }
    else switch (b.dataset.action) {
      case "lesson-play": seek(0); play(); break;
      case "lesson-end": seek(app.flat.length); break;
      case "next-question": state.qIndex++; loadQuestion(); break;
      case "plan-undo": $("#plan-input").value = $("#plan-input").value.trim().split(/\s+/).slice(0, -1).join(" "); break;
      case "check-plan": checkPlan(); break;
      case "check-prediction": checkPrediction(); break;
      case "reveal": reveal(); break;
      case "play-answer": showAnswer(b.dataset.route); break;
      case "bottom-view": view.look("bottom"); break;
      case "timer": {
        clearInterval(state.timer); let remaining = 15; b.textContent = `观察还剩 ${remaining} 秒`;
        state.timer = setInterval(() => { remaining--; b.textContent = remaining > 0 ? `观察还剩 ${remaining} 秒` : "观察结束，试着作答"; if (!remaining) clearInterval(state.timer); }, 1000); break;
      }
    }
  });
  return { enter, playback, stickering, leave() { pause(); clearInterval(state.timer); } };
}
