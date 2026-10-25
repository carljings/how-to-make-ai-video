#!/usr/bin/env node
// verify.mjs — mux the rendered picture with the original-BGM passage and run the CORE checks only (protects the user's
// choices; it never reshapes the music):
//   format 1080×1920 · 30 fps · exactly 300 frames · 10.0 s · H.264 + AAC stereo · strict decode without errors ·
//   the reference audio is the expected file (sha256) and bgm.wav is that passage (bgm-report: lag 0, correlation) ·
//   the muxed AAC is aligned with bgm.wav (global cross-correlation lag) · no overload (true peak ≤ −0.5 dBTP on the AAC) ·
//   src/cues.js equals the regenerated out/audio/cues.js.
//   node tools/verify.mjs [--picture out/picture.mp4] [--out out/clawd-10s-v2.mp4]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { CUES } from '../src/cues.js';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const pic = path.resolve(ROOT, opt('picture', 'out/picture.mp4')), wav = path.resolve(ROOT, 'out/audio/bgm.wav'), outF = path.resolve(ROOT, opt('out', 'out/clawd-10s-v2.mp4'));
const run = (cmd, args) => { const r = spawnSync(cmd, args, { maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr}`); return r; };
const checks = []; const check = (name, ok, got) => { checks.push({ name, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${typeof got === 'object' ? JSON.stringify(got) : got}`); };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

run('ffmpeg', ['-v', 'error', '-y', '-i', pic, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', outF]);
const pr = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-of', 'json', outF]).stdout);
const v = pr.streams.find((s) => s.codec_type === 'video'), a = pr.streams.find((s) => s.codec_type === 'audio');
check('video 1080×1920 h264', v.width === 1080 && v.height === 1920 && v.codec_name === 'h264', `${v.width}×${v.height} ${v.codec_name} ${v.pix_fmt}`);
check('30 fps, 300 frames', v.r_frame_rate === '30/1' && +v.nb_read_frames === CUES.frames, `${v.r_frame_rate} ${v.nb_read_frames}`);
check('10.0 s picture and audio (±25 ms)', Math.abs(+v.duration - CUES.end_s) < 0.04 && Math.abs(+a.duration - CUES.end_s) < 0.025, `v ${v.duration} a ${a.duration}`);
check('AAC stereo 48 kHz', a.codec_name === 'aac' && a.channels === 2 && +a.sample_rate === 48000, `${a.codec_name} ${a.channels} ${a.sample_rate}`);
const strict = spawnSync('ffmpeg', ['-v', 'error', '-xerror', '-i', outF, '-f', 'null', '-'], { encoding: 'utf8' });
check('strict decode (no errors)', strict.status === 0 && !strict.stderr.trim(), strict.stderr.trim() || 'clean');
const rep = JSON.parse(fs.readFileSync(path.join(ROOT, 'out/audio/bgm-report.json'), 'utf8'));
check('reference audio = the user\'s original BGM (sha256)', rep.source.sha256 === '6987131efbeb44cc19e106b9db1d4f0b10aba55263c8f37531b973b0ef144b61', rep.source.sha256);
check('bgm.wav = source [15.810, 25.810) s (lag 0, correlation ≥ 0.9999)', rep.provenance_check.lag_samples_44k1 === 0 && rep.provenance_check.correlation >= 0.9999 && rep.passage_source_s[0] === 15.81, rep.provenance_check);
check('bgm.wav is the one bgm.py reported', sha(wav) === rep.wav_sha256, sha(wav));
// AAC vs WAV: global cross-correlation (mono, 48 kHz, 2–9.5 s), lag in samples
const dec = (f, extra = []) => { const b = run('ffmpeg', ['-v', 'error', '-i', f, ...extra, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']).stdout; return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const A = dec(outF, ['-map', '0:a']), Wv = dec(wav);
const i0 = 2 * 48000, i1 = 9.5 * 48000; let best = [0, -2];
for (let lag = -2048; lag <= 2048; lag += 1) {
  let sxy = 0, sxx = 0, syy = 0; for (let i = i0; i < i1; i += 4) { const x = Wv[i], y = A[i + lag] || 0; sxy += x * y; sxx += x * x; syy += y * y; }
  const r = sxy / Math.sqrt(sxx * syy + 1e-12); if (r > best[1]) best = [lag, r];
}
check('muxed AAC aligned with bgm.wav (|lag| ≤ 48 samples = 1 ms, r ≥ 0.98)', Math.abs(best[0]) <= 48 && best[1] >= 0.98, { lag_samples_48k: best[0], r: +best[1].toFixed(6) });
const e = run('ffmpeg', ['-hide_banner', '-nostats', '-i', outF, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
const s = e.slice(e.lastIndexOf('Summary')); const I = +/I:\s+(-?[\d.]+) LUFS/.exec(s)[1], TP = +/Peak:\s+(-?[\d.]+) dBFS/.exec(s.slice(s.indexOf('True peak')))[1];
check('no overload: AAC true peak ≤ −0.5 dBTP', TP <= -0.5, { I_lufs: I, TP_dbtp: TP });
const cuesSame = fs.existsSync(path.join(ROOT, 'out/audio/cues.js')) && fs.readFileSync(path.join(ROOT, 'out/audio/cues.js'), 'utf8') === fs.readFileSync(path.join(ROOT, 'src/cues.js'), 'utf8');
check('src/cues.js = regenerated cues', cuesSame, cuesSame);
const report = { file: path.relative(ROOT, outF), sha256: sha(outF), bytes: fs.statSync(outF).size, picture_sha256: sha(pic), bgm_sha256: sha(wav), loudness: { I_lufs: I, TP_dbtp: TP }, aac_vs_wav: { lag_samples_48k: best[0], r: best[1] }, checks, all_pass: checks.every((c) => c.ok), listening: 'none — measurements only' };
fs.writeFileSync(path.join(ROOT, 'out/verify.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`${report.all_pass ? 'ALL PASS' : 'FAILURES'} → out/verify.json  ${report.sha256}`);
process.exit(report.all_pass ? 0 : 1);
