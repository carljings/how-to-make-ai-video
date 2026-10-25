#!/usr/bin/env node
// verify.mjs — mux picture + out/audio/master.wav into the delivery MP4 (--mux) and verify the DELIVERED file.
// Adapted to a film WITH narration (the voice changes the waveform, so there is no "whole film vs the original song" test):
//   · decode, size, frames, durations, colour tags
//   · encoded audio vs the final master: loudness within 0.5 LU, true peak ≤ −1.0 dBTP, cross-correlation lag ≤ 1 ms
//   · the MUSIC is the user's song in time: in the three music-only windows (no voice, no duck) the encoded audio is
//     cross-correlated with the reference AAC at the v1 edit-plan offsets (S1: film = source; S2: film = source + 2.1304 s)
//   · the voice: every line's span in the voice stem has energy, and the voice stem is silent between lines (no clipped
//     tail, nothing extra); line placement/overlap is checked by tools/place_narration.mjs + tools/textcheck.mjs
//   · black, silent tail
//   node tools/verify.mjs --mux [--ref <reference-audio.m4a>] [--pic out/picture.mp4] [--film out/shangtou-v2.mp4]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { FRAMES, FPS, END, W, H, FADE_V1, MUSIC_ONLY } from '../src/timeline.js';
import { NARR } from '../src/narration.js';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PIC = path.resolve(ROOT, opt('pic', 'out/picture.mp4')), WAV = path.join(ROOT, 'out/audio/master.wav'), VOICE = path.join(ROOT, 'out/audio/voice_stem.wav');
const REF = path.resolve(ROOT, opt('ref', '../../.omx/artifacts/music-anticipation-original-20261020/assets/reference-audio.m4a'));
const FILM = path.resolve(ROOT, opt('film', 'out/shangtou-v2.mp4'));
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/music/edit-plan.json'), 'utf8'));
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
if (argv.includes('--mux')) {
  const r = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', PIC, '-i', WAV, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-metadata', 'title=这首开智小曲，为啥这么上头？', FILM]);
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
const srcOf = (filmT) => { const sg = plan.segments.find((g) => filmT >= g.film[0] && filmT < g.film[1]); return filmT - sg.offset; };
const sync = { encoded_vs_master_whole: xcorr(pcm(FILM, 1, 38), pcm(WAV, 1, 38)) };
MUSIC_ONLY.forEach(([w0, w1], i) => { const s0 = w0 + 0.15, d = w1 - w0 - 0.3; sync[`music_only_${i + 1}_vs_source`] = { film_s: [+s0.toFixed(3), +(s0 + d).toFixed(3)], source_s: +srcOf(s0).toFixed(3), ...xcorr(pcm(FILM, s0, d), pcm(REF, srcOf(s0), d)) }; });
// voice stem: energy inside each line, silence between lines
const vx = (() => { const r = spawnSync('ffmpeg', ['-v', 'error', '-i', VOICE, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 }); return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4); })();
const dbfs = (a0, a1) => { let s = 0, n = 0; for (let i = Math.max(0, Math.floor(a0 * 8000)); i < Math.min(vx.length, a1 * 8000); i++) { s += vx[i] * vx[i]; n++; } return n ? 10 * Math.log10(s / n + 1e-20) : -200; };
const voice = NARR.map((L) => ({ id: L.id, at: L.at, end: +(L.at + L.dur).toFixed(3), rms_db: +dbfs(L.at + 0.1, L.at + L.dur - 0.1).toFixed(1) }));
const gaps = []; for (let i = 1; i < NARR.length; i++) gaps.push({ between: `${NARR[i - 1].id}-${NARR[i].id}`, rms_db: +dbfs(NARR[i - 1].at + NARR[i - 1].dur + 0.02, NARR[i].at - 0.02).toFixed(1) });
const tailY = run('ffmpeg', ['-v', 'error', '-sseof', '-0.3', '-i', FILM, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-an', '-f', 'null', '-']).out.split('\n').filter((l) => l.includes('YAVG=')).map((l) => +l.split('=')[1]);
const vol = run('ffmpeg', ['-hide_banner', '-sseof', '-0.3', '-i', FILM, '-vn', '-af', 'volumedetect', '-f', 'null', '-']).err, maxVol = /max_volume:\s+(-?[\d.inf]+) dB/.exec(vol)?.[1];
const mixRep = JSON.parse(fs.readFileSync(path.join(ROOT, 'out/audio/mix.json'), 'utf8'));
const rep = { file: path.relative(ROOT, FILM), bytes: fs.statSync(FILM).size, sha256: sha(FILM), full_decode_exit: dec.code, decode_errors: dec.err.trim() || null,
  video: { codec: v.codec_name, width: +v.width, height: +v.height, fps: v.r_frame_rate, frames: +v.nb_read_frames, duration_s: +v.duration, pix_fmt: v.pix_fmt, color: [v.color_space, v.color_primaries, v.color_transfer, v.color_range].join('/') },
  audio: { codec: a.codec_name, sample_rate: +a.sample_rate, channels: a.channels, duration_s: +a.duration, encoded: enc, master: mas, master_sha256: sha(WAV), music_used: mixRep.inputs.music, last_0_3s_max_dB: maxVol },
  sync, voice, voice_gaps: gaps, design: { W, H, FPS, FRAMES, END, picture_black_from_s: FADE_V1 }, last_frames_mean_Y: tailY, checks: {} };
const C = rep.checks;
C.decode = dec.code === 0 && !dec.err.trim();
C.size = rep.video.width === W && rep.video.height === H;
C.frames = rep.video.frames === FRAMES;
C.duration = Math.abs(rep.video.duration_s - FRAMES / FPS) < 0.02 && Math.abs(rep.audio.duration_s - FRAMES / FPS) < 0.06;
C.loudness_matches_master = Math.abs(enc.I - mas.I) <= 0.5;
C.true_peak = enc.TP <= -1.0;
C.encoded_in_time_with_master = Math.abs(sync.encoded_vs_master_whole.lag_ms) <= 1 && sync.encoded_vs_master_whole.c > 0.95;
C.music_is_the_song_in_time = Object.entries(sync).filter(([k]) => k.startsWith('music_only')).every(([, x]) => Math.abs(x.lag_ms) <= 1 && x.c > 0.9);
C.voice_present_every_line = voice.every((x) => x.rms_db > -45);
C.voice_silent_between_lines = gaps.every((g) => g.rms_db < -80);
C.mix_checks = Object.values(mixRep.checks).every(Boolean);
C.black_tail = tailY.length > 0 && Math.max(...tailY) < 17;
C.silent_tail = maxVol === '-inf' || +maxVol <= -90;
fs.writeFileSync(path.join(ROOT, 'out/verification.json'), JSON.stringify(rep, null, 1) + '\n');
console.log(JSON.stringify(rep, null, 1));
process.exit(Object.values(C).every(Boolean) ? 0 : 2);
