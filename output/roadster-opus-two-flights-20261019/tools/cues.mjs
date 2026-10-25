#!/usr/bin/env node
// cues.mjs — the music/edit cue sheet: every cut and reveal with its musical position, the DETECTED onset it was snapped
// to (assets/music/analysis.json), the film frame it lands on, and the error between that frame and the nearest detected
// onset. Also lists the music's own measured events (its stop, bass drop-out, hard cut) and the fades.
//   node tools/cues.mjs        → out/cues.json + docs/CUE_SHEET.md
import fs from 'node:fs';
import path from 'node:path';
import { T, SHOTS, FPS, END, FRAMES, frameOf, onsetAt, FADE_A0, FADE_A1, FADE_V0, FADE_V1, STOP, STOP_END, BEAT, OFF_END, SPLICE, STOP_F, XFADE, HARD_CUT, MUSIC_MAP } from '../src/timeline.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const A = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/music/analysis.json'), 'utf8'));
const src = fs.readFileSync(path.join(ROOT, 'src/timeline.js'), 'utf8');
// the musical position each cue asked for, read from the timeline source (Q(bar, beat[, eighth]))
const asked = {};
for (const m of src.matchAll(/^\s+(\w+):\s+(Qe?)\((\d+)(?:,\s*(\d+))?(?:,\s*(\d+))?\)/gm)) asked[m[1]] = [+m[3], +(m[4] ?? 0), +(m[5] ?? 0), m[2] === 'Qe' ? OFF_END : 0];
const near = (t) => A.onsets.reduce((b, o) => (Math.abs(o.t - t) < Math.abs(b.t - t) ? o : b), A.onsets[0]);
const cutOf = Object.fromEntries(SHOTS.map((s) => [s.t0, s.id]));
const rows = Object.entries(T).map(([name, t]) => {
  const f = frameOf(t), tf = f / FPS, shift = tf >= SPLICE ? OFF_END : 0, o0 = near(tf - shift), o = { ...o0, t: +(o0.t + shift).toFixed(4) }, q = asked[name];
  const r = { cue: name, cut: cutOf[t] ?? null, music_s: +t.toFixed(4), frame: f, frame_s: +tf.toFixed(4) };
  if (q) {
    const on = onsetAt(q[0], q[1], q[2]), off = q[3];
    Object.assign(r, { asked: `${off ? 'ending: song bar' : 'bar'} ${q[0]} beat ${q[1]}${q[2] ? ` +${q[2]}/2` : ''}${off ? ` (source ${on.t} s + ${off.toFixed(4)})` : ''}`, grid_s: +(on.grid + off).toFixed(4), detected_onset_s: +(on.t + off).toFixed(4), onset_minus_grid_ms: Math.round((on.t - on.grid) * 1000),
      nearest_onset_to_frame_s: o.t, frame_minus_onset_ms: Math.round((tf - o.t) * 1000), strength: o.strength, bands: o.bands.join('+') });
  } else if (name === 'stop') Object.assign(r, { asked: 'music stop (measured: RMS < −30 dBFS)', detected_event_s: STOP, frame_minus_event_ms: Math.round((tf - STOP) * 1000) });
  else if (name === 'end') Object.assign(r, { asked: 'the song’s own stop again, at the end (source 3.46 s + OFF_END)', detected_event_s: +STOP_F.toFixed(4), frame_minus_event_ms: Math.round((tf - STOP_F) * 1000) });
  else if (name === 'hook') Object.assign(r, { asked: 'film start = music 0 s (first onset)', nearest_onset_to_frame_s: o.t, frame_minus_onset_ms: Math.round((tf - o.t) * 1000), strength: o.strength });
  return r;
});
const ev = [
  { event: 'music stop (its own break)', s: A.structure.stop, note: 'leave-the-deck slow motion sits in it; not an edit' },
  { event: 'bass drop-out (in the music)', s: A.structure.bass_dropouts_s, note: 'the "visible lines" caveat sits in it' },
  { event: 'splice into the song’s own opening (15 ms crossfade, the opening is silent there)', s: [+SPLICE.toFixed(4), +(SPLICE + 0.015).toFixed(4)], note: `film = source + ${OFF_END.toFixed(4)} s from here` },
  { event: 'the song’s own stop (ending)', s: +STOP_F.toFixed(4) },
  { event: 'stop tail to digital zero', s: [+FADE_A0.toFixed(4), +FADE_A1.toFixed(4)] }, { event: 'picture fade to black', s: [+FADE_V0.toFixed(4), +FADE_V1.toFixed(4)] },
  { event: 'digital silence + black', s: [FADE_A1, END] },
  { event: 'music hard cut in the source (never used)', s: A.structure.hard_cut_s }, { event: 'platform end-card sound (never used)', s: A.structure.platform_sound_s },
];
const errs = rows.filter((r) => r.cue !== 'hook' && r.frame_minus_onset_ms !== undefined).map((r) => Math.abs(r.frame_minus_onset_ms));
const out = {
  about: 'Film time = music time up to the splice, then source time + OFF_END (the song’s own opening two bars and stop). Each cue asks for a musical position; the timeline resolves it to the onset detected there (±70 ms) or throws. Frame = round(t × 30).',
  // the audio edit as declared by the timeline (tools/sync_check.py measures the MP4 against the source along this map)
  music_map: MUSIC_MAP.map((m) => ({ film: m.film.map((x) => +x.toFixed(4)), src0: +m.src0.toFixed(4) })),
  ending: { splice_s: +SPLICE.toFixed(4), xfade_s: XFADE, off_end_s: +OFF_END.toFixed(4), song_stop_film_s: +STOP_F.toFixed(4), fade_audio_s: [+FADE_A0.toFixed(4), +FADE_A1.toFixed(4)],
    fade_picture_s: [+FADE_V0.toFixed(4), +FADE_V1.toFixed(4)], source_hard_cut_s: HARD_CUT, source_platform_sound_s: A.structure.platform_sound_s },
  tempo: { bpm: A.grid.bpm, beat_s: BEAT, bar_s: A.grid.bar_s, first_bar_s: A.grid.first_bar_s }, frames: FRAMES, end_s: END,
  cues: rows, music_events: ev, max_abs_frame_minus_onset_ms: Math.max(...errs), mean_abs_frame_minus_onset_ms: +(errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(1),
};
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out/cues.json'), JSON.stringify(out, null, 1) + '\n');
const md = [
  '# Cue sheet —《两次起飞》（由 `tools/cues.mjs` 生成，勿手改）', '',
  `音乐：用户指定参考视频 BGM，实测 ${A.grid.bpm} BPM（拍 ${BEAT.toFixed(4)} s，小节 ${A.grid.bar_s} s，首小节线 ${A.grid.first_bar_s} s）。片时间 = 曲时间；帧 = round(t×30)。`,
  '“检测起音”来自 `tools/music_analyze.py` 对实际音轨的谱通量检测（不是网格）；“帧−起音”是该帧时刻与最近检测起音之差。', '',
  '| cue | 剪切 | 要求的位置 | 网格 s | 检测起音 s | 帧 | 帧时刻 s | 帧−起音 ms | 强度 | 频带 |', '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.cue} | ${r.cut ?? ''} | ${r.asked ?? ''} | ${r.grid_s ?? ''} | ${r.detected_onset_s ?? r.detected_event_s ?? r.nearest_onset_to_frame_s ?? ''} | ${r.frame} | ${r.frame_s} | ${r.frame_minus_onset_ms ?? r.frame_minus_event_ms ?? ''} | ${r.strength ?? ''} | ${r.bands ?? ''} |`),
  '', `最大 |帧−起音| = ${out.max_abs_frame_minus_onset_ms} ms，平均 ${out.mean_abs_frame_minus_onset_ms} ms（1 帧 = 33.3 ms）。`, '',
  '## 音乐自身的事件与片尾', '', '| 事件 | 时间 s | 说明 |', '|---|---|---|',
  ...ev.map((e) => `| ${e.event} | ${JSON.stringify(e.s)} | ${e.note ?? ''} |`), '',
];
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/CUE_SHEET.md'), md.join('\n'));
console.log(`${rows.length} cues; max |frame − onset| ${out.max_abs_frame_minus_onset_ms} ms, mean ${out.mean_abs_frame_minus_onset_ms} ms → out/cues.json, docs/CUE_SHEET.md`);
