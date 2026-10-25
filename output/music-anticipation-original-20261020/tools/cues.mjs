#!/usr/bin/env node
// cues.mjs — the cue sheet: every cue with its planned musical moment (from assets/edit-plan.json), the onset DETECTED on
// the final master that it snapped to, its frame, and the frame − onset error. Writes out/cues.json + docs/CUE_SHEET.md.
import fs from 'node:fs';
import path from 'node:path';
import { T, FPS, frameOf, END, FRAMES, FADE_V0, FADE_V1, SCENES } from '../src/timeline.js';
import { MUSIC } from '../src/music.js';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/edit-plan.json'), 'utf8'));
const ons = MUSIC.onsets;
const near = (t) => ons.reduce((b, o) => (Math.abs(o[0] - t) < Math.abs(b[0] - t) ? o : b), ons[0]);
const planned = (name, t) => {
  const ev = Object.entries(plan.events_film).find(([, v]) => Math.abs(v - t) < 0.08);
  if (ev) return `event ${ev[0]} (${ev[1]})`;
  const b = plan.bars_film.findIndex((v) => Math.abs(v - t) < 0.08); return b >= 0 ? `bar line #${b} (${plan.bars_film[b]})` : (name === 'start' ? 'film start' : '—');
};
const cutAt = new Map(SCENES.map((s) => [s.t0, s.id]));
const rows = Object.entries(T).map(([name, t]) => {
  const f = frameOf(t), tf = f / FPS, o = near(tf);
  return { cue: name, scene_cut: cutAt.get(t) ?? null, planned: planned(name, t), cue_s: +t.toFixed(4), frame: f, frame_s: +tf.toFixed(4), nearest_onset_s: o[0], frame_minus_onset_ms: Math.round((tf - o[0]) * 1000), strength: o[1] };
});
const errs = rows.filter((r) => r.cue !== 'start').map((r) => Math.abs(r.frame_minus_onset_ms));
const out = { about: 'Film time = the edited soundtrack’s time. Cues snap to onsets detected on out/audio/master.wav (±70 ms) or the build fails.', frames: FRAMES, end_s: END,
  fades: { picture: [FADE_V0, FADE_V1] }, edit_segments: plan.segments, cues: rows, max_abs_frame_minus_onset_ms: Math.max(...errs), mean_abs_ms: +(errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(1) };
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true }); fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out/cues.json'), JSON.stringify(out, null, 1) + '\n');
const md = ['# Cue sheet —《等它落下来》（tools/cues.mjs 生成，勿手改）', '',
  `片时间 = 剪辑后音轨时间；帧 = round(t×30)；“最近起音”在最终 master 上检测。音乐分析与剪辑只是编排辅助：**无人工试听**。`, '',
  '| cue | 切到 | 计划的音乐位置 | cue s | 帧 | 帧时刻 s | 最近起音 s | 帧−起音 ms | 强度 |', '|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.cue} | ${r.scene_cut ?? ''} | ${r.planned} | ${r.cue_s} | ${r.frame} | ${r.frame_s} | ${r.nearest_onset_s} | ${r.frame_minus_onset_ms} | ${r.strength} |`), '',
  `最大 |帧−起音| = ${out.max_abs_frame_minus_onset_ms} ms，平均 ${out.mean_abs_ms} ms（1 帧 = 33.3 ms）。`, '', '## 音轨剪辑段（源时间 → 片时间）', '', '| 段 | 源 s | 片 s | 偏移 s |', '|---|---|---|---|',
  ...plan.segments.map((s) => `| ${s.name} | ${s.source.join('–')} | ${s.film.join('–')} | ${s.offset} |`), '',
  `交叉淡化 ${plan.crossfade_s * 1000} ms（等功率，在下一下拍起音前 ${plan.crossfade_ends_before_attack_s * 1000} ms 结束）；整体静态增益 ${plan.gain_db} dB（${plan.gain_reason}）。`, ''];
fs.writeFileSync(path.join(ROOT, 'docs/CUE_SHEET.md'), md.join('\n'));
console.log(`${rows.length} cues; max |frame − onset| ${out.max_abs_frame_minus_onset_ms} ms, mean ${out.mean_abs_ms} ms → out/cues.json, docs/CUE_SHEET.md`);
