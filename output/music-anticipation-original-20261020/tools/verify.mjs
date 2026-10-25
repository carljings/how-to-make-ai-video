#!/usr/bin/env node
// verify.mjs — mux picture + master into the delivery MP4 (--mux) and verify the DELIVERED file: full decode, frames, size,
// durations, encoded loudness/true peak (native stereo), the encoded audio is the master in time (cross-correlation), the
// spliced soundtrack is the source music where the edit plan says (two spans), and the tail is black and silent.
//   node tools/verify.mjs --mux [--ref <reference-audio.m4a>] [--pic out/picture.mp4] [--film out/deng-ta-luo-xia-lai.mp4]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { FRAMES, FPS, END, W, H, FADE_V1 } from '../src/timeline.js';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PIC = path.resolve(ROOT, opt('pic', 'out/picture.mp4')), WAV = path.join(ROOT, 'out/audio/master.wav');
const REF = path.resolve(ROOT, opt('ref', '../../.omx/artifacts/music-anticipation-original-20261020/assets/reference-audio.m4a'));
const FILM = path.resolve(ROOT, opt('film', 'out/deng-ta-luo-xia-lai.mp4'));
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/edit-plan.json'), 'utf8'));
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
if (argv.includes('--mux')) {
  const r = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', PIC, '-i', WAV, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-metadata', 'title=等它落下来', FILM]);
  if (r.code) { console.error(r.err); process.exit(1); }
}
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', FILM]).out);
const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
const dec = run('ffmpeg', ['-v', 'error', '-xerror', '-i', FILM, '-f', 'null', '-']);
const meter = (file, pre = [], map = []) => { const e = run('ffmpeg', ['-hide_banner', '-nostats', ...pre, '-i', file, ...map, '-af', 'aformat=sample_fmts=dbl,ebur128=peak=true', '-f', 'null', '-']).err, s = e.slice(e.lastIndexOf('Summary'));
  return { I: +(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: +(/Peak:\s+(-?[\d.inf]+) dBFS/.exec(s.slice(s.indexOf('True peak')))?.[1]) }; };
const enc = meter(FILM, [], ['-map', '0:a']), mas = meter(WAV);
const pcm = (file, ss, dur) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(ss), '-i', file, '-map', '0:a:0', '-ac', '1', '-ar', '8000', '-t', String(dur), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 }); return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4); };
const xcorr = (x, y) => { let best = { lag: 0, c: -1 }; for (let lag = -80; lag <= 80; lag++) { let s = 0, nx = 0, ny = 0; for (let i = 100; i < x.length - 100; i += 2) { const p = x[i], q = y[i + lag] ?? 0; s += p * q; nx += p * p; ny += q * q; } const c = s / Math.sqrt(nx * ny + 1e-12); if (c > best.c) best = { lag, c }; } return { lag_ms: best.lag / 8, c: +best.c.toFixed(4) }; };
const s2 = plan.segments[1], s3 = plan.segments[2];
const sync = {
  encoded_vs_master_whole: xcorr(pcm(FILM, 1, 30), pcm(WAV, 1, 30)),
  film_vs_source_S1: xcorr(pcm(FILM, 5, 20), pcm(REF, 5, 20)),
  film_vs_source_S2: xcorr(pcm(FILM, s2.film[0] + 0.3, 5), pcm(REF, s2.source[0] + 0.3, 5)),
  film_vs_source_S3_hold: xcorr(pcm(FILM, s3.film[0] + 0.05, 0.3), pcm(REF, s3.source[0] + 0.05, 0.3)),
};
const tailY = run('ffmpeg', ['-v', 'error', '-sseof', '-0.3', '-i', FILM, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-an', '-f', 'null', '-']).out.split('\n').filter((l) => l.includes('YAVG=')).map((l) => +l.split('=')[1]);
const vol = run('ffmpeg', ['-hide_banner', '-sseof', '-0.3', '-i', FILM, '-vn', '-af', 'volumedetect', '-f', 'null', '-']).err, maxVol = /max_volume:\s+(-?[\d.inf]+) dB/.exec(vol)?.[1];
const rep = { file: path.relative(ROOT, FILM), bytes: fs.statSync(FILM).size, sha256: sha(FILM), full_decode_exit: dec.code, decode_errors: dec.err.trim() || null,
  video: { codec: v.codec_name, width: +v.width, height: +v.height, fps: v.r_frame_rate, frames: +v.nb_read_frames, duration_s: +v.duration, pix_fmt: v.pix_fmt, color: [v.color_space, v.color_primaries, v.color_transfer, v.color_range].join('/') },
  audio: { codec: a.codec_name, sample_rate: +a.sample_rate, channels: a.channels, duration_s: +a.duration, encoded: enc, master: mas, gain_db_vs_source: plan.gain_db, last_0_3s_max_dB: maxVol },
  sync, design: { W, H, FPS, FRAMES, END, picture_black_from_s: FADE_V1 }, last_frames_mean_Y: tailY, checks: {} };
const C = rep.checks;
C.decode = dec.code === 0 && !dec.err.trim();
C.size = rep.video.width === W && rep.video.height === H;
C.frames = rep.video.frames === FRAMES;
C.duration = Math.abs(rep.video.duration_s - FRAMES / FPS) < 0.02 && Math.abs(rep.audio.duration_s - FRAMES / FPS) < 0.06;
C.loudness_matches_master = Math.abs(enc.I - mas.I) <= 0.5;
C.true_peak = enc.TP <= -1.0;
C.in_time = Object.values(sync).every((x) => Math.abs(x.lag_ms) <= 1 && x.c > 0.9);
C.black_tail = tailY.length > 0 && Math.max(...tailY) < 17;
C.silent_tail = maxVol === '-inf' || +maxVol <= -90;
fs.writeFileSync(path.join(ROOT, 'out/verification.json'), JSON.stringify(rep, null, 1) + '\n');
console.log(JSON.stringify(rep, null, 1));
process.exit(Object.values(C).every(Boolean) ? 0 : 2);
