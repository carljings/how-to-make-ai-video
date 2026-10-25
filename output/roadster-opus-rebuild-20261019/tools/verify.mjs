#!/usr/bin/env node
// verify.mjs — mux picture + master into the delivery MP4 (if --mux) and verify the delivered file for real:
// full decode (exit code), frame count, size, fps, durations, EBU R128 loudness + true peak of the encoded audio,
// the last frames are black and the last 0.3 s is silent. Writes out/verification.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { FRAMES, FPS, END, W, H } from '../src/timeline.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PIC = path.join(ROOT, 'out/picture.mp4'), WAV = path.join(ROOT, 'out/audio/master.wav');
const FILM = path.resolve(ROOT, opt('film', 'out/kanbujian-de-shidun.mp4'));
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

if (argv.includes('--mux')) {
  const r = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', PIC, '-i', WAV, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
    '-ar', '48000', '-movflags', '+faststart', '-metadata', 'title=看不见的十吨', FILM]);
  if (r.code) { console.error(r.err); process.exit(1); }
}
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', FILM]).out);
const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
const dec = run('ffmpeg', ['-v', 'error', '-i', FILM, '-f', 'null', '-']);
const eb = run('ffmpeg', ['-hide_banner', '-nostats', '-i', FILM, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).err;
const I = +(/I:\s+(-?[\d.]+) LUFS/.exec(eb.slice(eb.lastIndexOf('Summary')))?.[1]);
const TP = +(/Peak:\s+(-?[\d.]+) dBFS/.exec(eb.slice(eb.lastIndexOf('True peak')))?.[1]);
// last frames: mean luma; last 0.3 s of audio: max |sample|
// metadata=print writes to stdout with file=- (with -v error its default log output would be suppressed)
const tailY = run('ffmpeg', ['-v', 'error', '-sseof', '-0.3', '-i', FILM, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-an', '-f', 'null', '-']).out
  .split('\n').filter((l) => l.includes('YAVG=')).map((l) => +l.split('=')[1]);
const vol = run('ffmpeg', ['-hide_banner', '-sseof', '-0.3', '-i', FILM, '-vn', '-af', 'volumedetect', '-f', 'null', '-']).err;
const maxVol = /max_volume:\s+(-?[\d.inf]+) dB/.exec(vol)?.[1];
const rep = {
  file: path.relative(ROOT, FILM), bytes: fs.statSync(FILM).size, sha256: sha(FILM),
  full_decode_exit: dec.code, decode_errors: dec.err.trim() || null,
  video: { codec: v.codec_name, width: +v.width, height: +v.height, fps: v.r_frame_rate, frames: +v.nb_read_frames, duration_s: +v.duration, pix_fmt: v.pix_fmt,
    color: [v.color_space, v.color_primaries, v.color_transfer, v.color_range].join('/') },
  audio: { codec: a.codec_name, sample_rate: +a.sample_rate, channels: a.channels, duration_s: +a.duration, integrated_lufs: I, true_peak_dbtp: TP, last_0_3s_max_dB: maxVol },
  design: { W, H, FPS, FRAMES, END }, last_frames_mean_Y: tailY,
  checks: {},
};
const C = rep.checks;
C.decode = dec.code === 0 && !dec.err.trim();
C.size = rep.video.width === W && rep.video.height === H;
C.frames = rep.video.frames === FRAMES;
C.duration = Math.abs(rep.video.duration_s - FRAMES / FPS) < 0.02 && Math.abs(rep.audio.duration_s - FRAMES / FPS) < 0.05;
C.loudness = Math.abs(I + 20) <= 1.0;
C.true_peak = TP <= -6.0;
C.black_tail = tailY.length > 0 && Math.max(...tailY) < 17;      // limited range: black is Y = 16
C.silent_tail = maxVol === '-inf' || +maxVol < -80;
fs.writeFileSync(path.join(ROOT, 'out/verification.json'), JSON.stringify(rep, null, 1) + '\n');
console.log(JSON.stringify(rep, null, 1));
process.exit(Object.values(C).every(Boolean) ? 0 : 2);
