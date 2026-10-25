#!/usr/bin/env node
// verify.mjs — mux picture + master into the delivery MP4 (with --mux) and verify the delivered file for real: full decode,
// frame count, size, fps, durations, EBU R128 loudness + true peak of the ENCODED audio (native stereo) against the
// source music, the black + silent tail, and that the encoded audio is still the source music in time (cross-correlation
// of the first 30 s against the source: lag must be within ±1 ms). Writes out/verification.json.
//   node tools/verify.mjs --mux [--ref PATH/reference-original.m4a] [--pic out/picture.mp4] [--film out/liangci-qifei.mp4]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { FRAMES, FPS, END, W, H, FADE_A0, FADE_A1, FADE_V1, SPLICE, OFF_END, STOP_F } from '../src/timeline.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PIC = path.resolve(ROOT, opt('pic', 'out/picture.mp4')), WAV = path.join(ROOT, 'out/audio/master.wav');
const REF = path.resolve(ROOT, opt('ref', '../../.omx/artifacts/roadster-reference-bgm-20261019/reference-original.m4a'));
const FILM = path.resolve(ROOT, opt('film', 'out/liangci-qifei.mp4'));
const run = (cmd, args, o = {}) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...o }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

if (argv.includes('--mux')) {
  const r = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', PIC, '-i', WAV, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
    '-ar', '48000', '-movflags', '+faststart', '-metadata', 'title=两次起飞 v5', FILM]);
  if (r.code) { console.error(r.err); process.exit(1); }
}
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', FILM]).out);
const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
const dec = run('ffmpeg', ['-v', 'error', '-xerror', '-i', FILM, '-f', 'null', '-']);
const meter = (file, pre = [], map = []) => {
  const e = run('ffmpeg', ['-hide_banner', '-nostats', ...pre, '-i', file, ...map, '-af', 'aformat=sample_fmts=dbl,ebur128=peak=true', '-f', 'null', '-']).err, s = e.slice(e.lastIndexOf('Summary'));
  return { I: +(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: +(/Peak:\s+(-?[\d.inf]+) dBFS/.exec(s.slice(s.indexOf('True peak')))?.[1]) };
};
// v5 audio map: film [0, SPLICE) = source same time; film [SPLICE, STOP_F] = source film − OFF_END (the song's own opening
// two bars and its stop). Each part's loudness is compared with the source over the same span.
const aT = (SPLICE - 0.05).toFixed(3), bS = SPLICE + 0.05, bT = (STOP_F - 0.1 - bS).toFixed(3);
const enc = meter(FILM, [], ['-map', '0:a']), encSeg = meter(FILM, ['-t', aT], ['-map', '0:a']), refSeg = meter(REF, ['-t', aT]);
const encEnd = meter(FILM, ['-ss', bS.toFixed(3), '-t', bT], ['-map', '0:a']), refEnd = meter(REF, ['-ss', (bS - OFF_END).toFixed(3), '-t', bT]);
// the last 0.3 s: luma of each frame, max volume
const tailY = run('ffmpeg', ['-v', 'error', '-sseof', '-0.3', '-i', FILM, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-an', '-f', 'null', '-']).out
  .split('\n').filter((l) => l.includes('YAVG=')).map((l) => +l.split('=')[1]);
const vol = run('ffmpeg', ['-hide_banner', '-sseof', '-0.3', '-i', FILM, '-vn', '-af', 'volumedetect', '-f', 'null', '-']).err;
const maxVol = /max_volume:\s+(-?[\d.inf]+) dB/.exec(vol)?.[1];
// timing: cross-correlate 8 kHz mono envelopes of the encoded audio and the source over 1–30 s
const pcm = (file, pre = [], dur = 30) => { const r = spawnSync('ffmpeg', ['-v', 'error', ...pre, '-i', file, '-map', '0:a:0', '-ac', '1', '-ar', '8000', '-t', String(dur), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 }); return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4); };
const x = pcm(FILM), y = pcm(REF);
let best = { lag: 0, c: -1 };
for (let lag = -80; lag <= 80; lag++) {   // ±10 ms at 8 kHz
  let s = 0, nx = 0, ny = 0;
  for (let i = 8000; i < 240000 - 100; i += 2) { const p = x[i], q = y[i + lag] ?? 0; s += p * q; nx += p * p; ny += q * q; }
  const c = s / Math.sqrt(nx * ny + 1e-12); if (c > best.c) best = { lag, c };
}
// the ending: film [bS, bS+2.8 s] against source [bS − OFF_END, …], best lag within ±10 ms
const xe = pcm(FILM, ['-ss', bS.toFixed(3)], 2.8), ye = pcm(REF, ['-ss', (bS - OFF_END).toFixed(3)], 2.8);
let bestE = { lag: 0, c: -1 };
for (let lag = -80; lag <= 80; lag++) {
  let s = 0, nx = 0, ny = 0;
  for (let i = 100; i < xe.length - 100; i++) { const p = xe[i], q = ye[i + lag] ?? 0; s += p * q; nx += p * p; ny += q * q; }
  const c = s / Math.sqrt(nx * ny + 1e-12); if (c > bestE.c) bestE = { lag, c };
}
const rep = {
  file: path.relative(ROOT, FILM), bytes: fs.statSync(FILM).size, sha256: sha(FILM),
  full_decode_exit: dec.code, decode_errors: dec.err.trim() || null,
  video: { codec: v.codec_name, width: +v.width, height: +v.height, fps: v.r_frame_rate, frames: +v.nb_read_frames, duration_s: +v.duration, pix_fmt: v.pix_fmt,
    color: [v.color_space, v.color_primaries, v.color_transfer, v.color_range].join('/') },
  audio: { codec: a.codec_name, sample_rate: +a.sample_rate, channels: a.channels, duration_s: +a.duration, encoded: enc, encoded_unfaded_part: encSeg, source_same_part: refSeg,
    encoded_ending_part: encEnd, source_ending_span: refEnd, ending_lag_vs_source_ms: +(bestE.lag / 8).toFixed(3), ending_correlation_vs_source: +bestE.c.toFixed(4),
    last_0_3s_max_dB: maxVol, lag_vs_source_ms: +(best.lag / 8).toFixed(3), correlation_vs_source: +best.c.toFixed(4) },
  design: { W, H, FPS, FRAMES, END, fade_audio_s: [FADE_A0, FADE_A1], picture_black_from_s: FADE_V1 }, last_frames_mean_Y: tailY,
  checks: {},
};
const C = rep.checks;
C.decode = dec.code === 0 && !dec.err.trim();
C.size = rep.video.width === W && rep.video.height === H;
C.frames = rep.video.frames === FRAMES;
C.duration = Math.abs(rep.video.duration_s - FRAMES / FPS) < 0.02 && Math.abs(rep.audio.duration_s - FRAMES / FPS) < 0.05;
C.loudness_same_as_source = Math.abs(encSeg.I - refSeg.I) <= 0.5 && Math.abs(encEnd.I - refEnd.I) <= 0.5;   // the user asked for the music not to get quieter (both parts)
C.true_peak = enc.TP <= -1.0;
C.in_time_with_source = Math.abs(best.lag) <= 8 && best.c > 0.9 && Math.abs(bestE.lag) <= 8 && bestE.c > 0.9;   // ≤ 1 ms, same music, body and ending
C.black_tail = tailY.length > 0 && Math.max(...tailY) < 17;                  // limited range: black is Y = 16
C.silent_tail = maxVol === '-inf' || +maxVol <= -90;                          // volumedetect reports digital zero as −91 dB
fs.writeFileSync(path.join(ROOT, 'out/verification.json'), JSON.stringify(rep, null, 1) + '\n');
console.log(JSON.stringify(rep, null, 1));
process.exit(Object.values(C).every(Boolean) ? 0 : 2);
