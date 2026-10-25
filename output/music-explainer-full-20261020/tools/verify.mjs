#!/usr/bin/env node
// verify.mjs — mux the rendered picture with the original-BGM soundtrack and run the core checks:
//   1080×1920 H.264 yuv420p BT.709 · 30 fps · exactly CUES.frames frames · picture/audio length · AAC stereo 48 kHz · strict
//   decode · reference sha256 · each source segment of bgm.wav matches the source (bgm-report: lag 0, r ≥ 0.9999) · bgm.wav is
//   the reported one · muxed AAC aligned with bgm.wav · no overload (TP ≤ −0.5 dBTP) · src/cues.js = regenerated cues ·
//   Clawd's flat fill decodes (BT.709) within ±8 of the brand orange #d97757 on two frames.
//   node tools/verify.mjs [--picture out/picture.mp4] [--out out/music-explainer-full.mp4]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { CUES } from '../src/cues.js';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const pic = path.resolve(ROOT, opt('picture', 'out/picture.mp4')), wav = path.resolve(ROOT, 'out/audio/bgm.wav'), outF = path.resolve(ROOT, opt('out', 'out/music-explainer-full.mp4'));
const run = (cmd, args) => { const r = spawnSync(cmd, args, { maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr}`); return r; };
const checks = []; const check = (name, ok, got) => { checks.push({ name, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${typeof got === 'object' ? JSON.stringify(got) : got}`); };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const END = CUES.end_s;

run('ffmpeg', ['-v', 'error', '-y', '-i', pic, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', outF]);
const pr = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-of', 'json', outF]).stdout);
const v = pr.streams.find((s) => s.codec_type === 'video'), a = pr.streams.find((s) => s.codec_type === 'audio');
check('video 1080×1920 h264 yuv420p bt709', v.width === 1080 && v.height === 1920 && v.codec_name === 'h264' && v.pix_fmt === 'yuv420p' && v.color_space === 'bt709', `${v.width}×${v.height} ${v.codec_name} ${v.pix_fmt} ${v.color_space}`);
check(`30 fps, ${CUES.frames} frames`, v.r_frame_rate === '30/1' && +v.nb_read_frames === CUES.frames, `${v.r_frame_rate} ${v.nb_read_frames}`);
check(`picture and audio ${END.toFixed(3)} s (±40 ms)`, Math.abs(+v.duration - END) < 0.04 && Math.abs(+a.duration - END) < 0.04, `v ${v.duration} a ${a.duration}`);
check('AAC stereo 48 kHz', a.codec_name === 'aac' && a.channels === 2 && +a.sample_rate === 48000, `${a.codec_name} ${a.channels} ${a.sample_rate}`);
const strict = spawnSync('ffmpeg', ['-v', 'error', '-xerror', '-i', outF, '-f', 'null', '-'], { encoding: 'utf8' });
check('strict decode (no errors)', strict.status === 0 && !strict.stderr.trim(), strict.stderr.trim() || 'clean');
const rep = JSON.parse(fs.readFileSync(path.join(ROOT, 'out/audio/bgm-report.json'), 'utf8'));
check('reference audio = the user\'s original BGM (sha256)', rep.source.sha256 === '6987131efbeb44cc19e106b9db1d4f0b10aba55263c8f37531b973b0ef144b61', rep.source.sha256);
check('each film segment = its source passage at the construction\'s exact sample offset (lag 0, r ≥ 0.9999; placement vs the nominal map < 1 sample)', rep.provenance_check.every((p) => p.lag_samples_44k1 === 0 && p.correlation >= 0.9999 && Number.isFinite(p.placement_vs_nominal_map_us) && Math.abs(p.placement_vs_nominal_map_us) < 1e6 / 44100), rep.provenance_check);
check('bgm.wav is the one bgm_full.py reported', sha(wav) === rep.wav_sha256, sha(wav));
const dec = (f, extra = []) => { const b = run('ffmpeg', ['-v', 'error', '-i', f, ...extra, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']).stdout; return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const A = dec(outF, ['-map', '0:a']), Wv = dec(wav);
let best = [0, -2];
for (let lag = -2048; lag <= 2048; lag++) { let sxy = 0, sxx = 0, syy = 0; for (let i = 2 * 48000; i < 30 * 48000; i += 16) { const x = Wv[i], y = A[i + lag] || 0; sxy += x * y; sxx += x * x; syy += y * y; } const r = sxy / Math.sqrt(sxx * syy + 1e-12); if (r > best[1]) best = [lag, r]; }
check('muxed AAC aligned with bgm.wav (|lag| ≤ 48 samples, r ≥ 0.98)', Math.abs(best[0]) <= 48 && best[1] >= 0.98, { lag_samples_48k: best[0], r: +best[1].toFixed(6) });
const e = run('ffmpeg', ['-hide_banner', '-nostats', '-i', outF, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
const s = e.slice(e.lastIndexOf('Summary')); const I = +/I:\s+(-?[\d.]+) LUFS/.exec(s)[1], TP = +/Peak:\s+(-?[\d.]+) dBFS/.exec(s.slice(s.indexOf('True peak')))[1];
check('no overload: AAC true peak ≤ −0.5 dBTP', TP <= -0.5, { I_lufs: I, TP_dbtp: TP });
const cuesSame = fs.existsSync(path.join(ROOT, 'out/audio/cues.js')) && fs.readFileSync(path.join(ROOT, 'out/audio/cues.js'), 'utf8') === fs.readFileSync(path.join(ROOT, 'src/cues.js'), 'utf8');
check('src/cues.js = regenerated cues', cuesSame, cuesSame);
// Clawd's flat fill after encoding: decode with the BT.709 matrix the stream is tagged with; average an 8×8 patch of the body
const px = (fr, x, y) => { const b = run('ffmpeg', ['-v', 'error', '-i', outF, '-vf', `select=eq(n\\,${fr}),scale=in_color_matrix=bt709:in_range=tv,format=rgb24,crop=8:8:${x}:${y}`, '-frames:v', '1', '-f', 'rawvideo', '-']).stdout;
  const m = [0, 0, 0]; for (let i = 0; i < 64; i++) for (let c = 0; c < 3; c++) m[c] += b[i * 3 + c] / 64; return m.map(Math.round); };
const want = [0xd9, 0x77, 0x57], samples = [[0, 536, 1346], [CUES.frames - 1, 816, 1436]].map(([fr, x, y]) => ({ frame: fr, rgb: px(fr, x, y) }));
check('Clawd fill decodes as brand orange #d97757 (±8 per channel)', samples.every((p) => p.rgb.every((c, i) => Math.abs(c - want[i]) <= 8)), samples);
const report = { file: path.relative(ROOT, outF), sha256: sha(outF), bytes: fs.statSync(outF).size, picture_sha256: sha(pic), bgm_sha256: sha(wav), loudness: { I_lufs: I, TP_dbtp: TP }, aac_vs_wav: { lag_samples_48k: best[0], r: best[1] }, clawd_rgb: samples, checks, all_pass: checks.every((c) => c.ok), listening: 'none — measurements only' };
fs.writeFileSync(path.join(ROOT, 'out/verify.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`${report.all_pass ? 'ALL PASS' : 'FAILURES'} → out/verify.json  ${report.sha256}`);
process.exit(report.all_pass ? 0 : 1);
