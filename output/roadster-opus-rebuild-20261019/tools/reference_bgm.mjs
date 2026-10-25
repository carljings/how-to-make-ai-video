#!/usr/bin/env node
// reference_bgm.mjs — replace the v2 synth score with the music of the user's reference video (the user's request,
// 2026-10-19: "用他那个视频bgm"), keeping the v2 H.264 stream byte-identical (stream copy). FFmpeg does all audio
// processing; this script only orchestrates and measures. No time-stretch, no pitch change, no re-arrangement other
// than one two-bar repeat; the music's own timbre, groove and pitch are kept.
//
//   node tools/reference_bgm.mjs [--ref PATH.m4a] [--film out/kanbujian-de-shidun.mp4] [--out out/kanbujian-de-shidun-v2-reference-bgm.mp4]
//
// Edit decisions (Opus 5.5; measured on the source with spectral-flux onset analysis, see production-log.md):
//   • source = the reference video's own AAC track (reference-original.m4a, 44.1 kHz stereo, 39.033 s)
//   • the music's body ends with a hard cut at 36.004 s; 37.0–37.5 s is a platform end-card sound; ≥ 37.75 s silence.
//     None of 36.0 s+ is used (the cut is never reached: film 41.9 s ↔ source 35.46 s).
//   • offset 0.324 s: the music's own stop (3.449–4.824 s) is kept; its re-entry at 4.824 s lands on the v2 「空气」 reveal
//     (film 4.5 s). Film t ↔ source t + 0.324 up to the repeat.
//   • one repeat to cover 42.3 s: tempo ≈ 70.97 BPM (beat 0.8454 s); after source 27.9502 s jump back to 21.1876 s
//     (8 beats = 6.763 s; +26-sample alignment, correlation 0.75; lowest spectral discontinuity of all bar-aligned
//     candidates), 30 ms equal-power crossfade. It lands at film ≈ 27.63 s, inside the fall.
//   • the fall (film 27.0–31.0 s) dips the music by 8 dB (linear ramps 26.9–27.3 s down, 30.6–31.0 s up): the film's
//     "hold your breath" moment and the catch on 31.0 s, without changing the music itself.
//   • 15 ms fade-in at 0; fade-out 40.6–41.9 s with the picture; digital silence 41.9–42.3 s.
//   • static gain to −20 LUFS integrated (ITU-R BS.1770 via ffmpeg ebur128), true peak must be ≤ −6 dBTP; no limiter.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const REF = path.resolve(ROOT, opt('ref', '../../.omx/artifacts/roadster-reference-bgm-20261019/reference-original.m4a'));
const FILM = path.resolve(ROOT, opt('film', 'out/kanbujian-de-shidun.mp4'));
const OUT = path.resolve(ROOT, opt('out', 'out/kanbujian-de-shidun-v2-reference-bgm.mp4'));
const AUD = path.join(ROOT, 'out/audio-reference-bgm'); fs.mkdirSync(AUD, { recursive: true });
const END = 42.3, FADE0 = 40.6, FADE1 = 41.9;
const OFF = 0.324, SPLICE_OUT = 27.9502, SPLICE_IN = 21.1876, XF = 0.03, SRC_END = 36.0;
const DIP_DB = -8, D0 = 26.9, D1 = 27.3, D2 = 30.6, D3 = 31.0;

const run = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) { console.error(`ffmpeg failed (${r.status}):\n${r.stderr}`); process.exit(1); }
  return r;
};
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const meter = (file, map = []) => {
  const e = run(['-i', file, ...map, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr, s = e.slice(e.lastIndexOf('Summary'));
  return { I: +/I:\s+(-?[\d.]+) LUFS/.exec(s)[1], LRA: +/LRA:\s+(-?[\d.]+) LU/.exec(s)[1], TP: +/Peak:\s+(-?[\d.inf]+) dBFS/.exec(s.slice(s.indexOf('True peak')))[1] };
};
for (const f of [REF, FILM]) if (!fs.existsSync(f)) { console.error(`missing input: ${f}`); process.exit(1); }

// 1 · edit (float, 48 kHz): two takes joined by an equal-power crossfade centred on the splice, then dip, fades, silence
const g = 10 ** (DIP_DB / 20);
const dip = `if(lt(t,${D0}),1,if(lt(t,${D1}),1-${1 - g}*(t-${D0})/${D1 - D0},if(lt(t,${D2}),${g},if(lt(t,${D3}),${g}+${1 - g}*(t-${D2})/${D3 - D2},1))))`;
const graph = [
  `[0:a]atrim=start=${OFF}:end=${SPLICE_OUT + XF / 2},asetpts=PTS-STARTPTS[a]`,
  `[0:a]atrim=start=${SPLICE_IN - XF / 2}:end=${SRC_END},asetpts=PTS-STARTPTS[b]`,
  `[a][b]acrossfade=d=${XF}:c1=qsin:c2=qsin,aresample=48000,aformat=sample_fmts=flt:channel_layouts=stereo,` +
  `afade=t=in:st=0:d=0.015,volume='${dip}':eval=frame,afade=t=out:st=${FADE0}:d=${FADE1 - FADE0},` +
  `atrim=end=${FADE1},apad=whole_dur=${END},atrim=end=${END}[out]`,
].join(';');
const pre = path.join(AUD, 'pre-gain.wav');
run(['-y', '-i', REF, '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_f32le', pre]);
const m0 = meter(pre), gain = -20 - m0.I;

// 2 · static gain → 24-bit master
const master = path.join(AUD, 'master-reference-bgm.wav');
run(['-y', '-i', pre, '-af', `volume=${gain.toFixed(3)}dB`, '-c:a', 'pcm_s24le', master]);
const m1 = meter(master);
if (!(m1.TP <= -6)) { console.error(`true peak ${m1.TP} dBTP > −6 (no limiter by design)`); process.exit(1); }

// 3 · mux: the v2 picture stream copied byte for byte, the new music as AAC
run(['-y', '-i', FILM, '-i', master, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
  '-movflags', '+faststart', '-metadata', 'title=看不见的十吨（参考视频 BGM 版）', OUT]);

// 4 · verify: identical video elementary stream, loudness/peak of the encoded audio, decode, durations, silent tail
const vhash = (f) => crypto.createHash('sha256').update(spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-map', '0:v:0', '-c', 'copy', '-f', 'h264', '-'], { maxBuffer: 1 << 30 }).stdout).digest('hex');
const probe = (f) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-of', 'json', f], { encoding: 'utf8' }).stdout).streams;
const dec = spawnSync('ffmpeg', ['-v', 'error', '-xerror', '-i', OUT, '-f', 'null', '-'], { encoding: 'utf8' });
const tail = run(['-sseof', '-0.3', '-i', OUT, '-vn', '-af', 'volumedetect', '-f', 'null', '-']).stderr;
const st = probe(OUT), v = st.find((s) => s.codec_type === 'video'), a = st.find((s) => s.codec_type === 'audio'), m2 = meter(OUT, ['-map', '0:a']);
const rep = {
  about: 'v2 picture (stream copy) + the reference video music, edited by tools/reference_bgm.mjs. Third-party music: rights not cleared by this project (see SOURCES.md).',
  inputs: { reference: { file: REF, sha256: sha(REF) }, film_v2: { file: FILM, sha256: sha(FILM) } },
  edit: { offset_s: OFF, splice_out_s: SPLICE_OUT, splice_in_s: SPLICE_IN, crossfade_s: XF, source_end_s: SRC_END, dip_db: DIP_DB, dip_ramps_s: [D0, D1, D2, D3], fade_s: [FADE0, FADE1], end_s: END },
  pre_gain: m0, gain_db: +gain.toFixed(3), master_wav: { file: path.relative(ROOT, master), sha256: sha(master), ...m1 },
  output: { file: path.relative(ROOT, OUT), bytes: fs.statSync(OUT).size, sha256: sha(OUT), video_frames: +v.nb_read_frames, video_duration_s: +v.duration,
    audio_duration_s: +a.duration, audio_codec: a.codec_name, sample_rate: +a.sample_rate, encoded_audio: m2,
    last_0_3s_max_volume: /max_volume:\s+(-?[\d.inf]+) dB/.exec(tail)?.[1], full_decode_exit: dec.status, decode_errors: dec.stderr.trim() || null },
  video_stream_sha256: { v2: vhash(FILM), reference_bgm: vhash(OUT) },
};
rep.checks = {
  video_stream_identical: rep.video_stream_sha256.v2 === rep.video_stream_sha256.reference_bgm,
  frames: rep.output.video_frames === 1269, duration: Math.abs(rep.output.audio_duration_s - END) < 0.05,
  loudness: Math.abs(m2.I + 20) <= 1, true_peak: m2.TP <= -6, decode: dec.status === 0 && !dec.stderr.trim(),
  silent_tail: rep.output.last_0_3s_max_volume === '-inf' || +rep.output.last_0_3s_max_volume < -80,
};
fs.writeFileSync(path.join(ROOT, 'out/reference-bgm-verification.json'), JSON.stringify(rep, null, 1) + '\n');
console.log(JSON.stringify(rep, null, 1));
process.exit(Object.values(rep.checks).every(Boolean) ? 0 : 2);
