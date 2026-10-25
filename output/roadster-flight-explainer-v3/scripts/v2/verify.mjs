// verify.mjs (v2): encoded-output technical checks. Library (finalize.mjs) and CLI:
//   node scripts/v2/verify.mjs --video=/abs/roadster-v2-yikouqi.mp4 --out=/abs/delivery-v2
// Checks: one H.264 yuv420p video stream at the cue size and fps, exact frame count by full decode, duration,
// one stereo 48 kHz AAC stream, encoded loudness −14 ±0.3 LUFS and true peak ≤ −1.5 dBTP. Technical only: it does not
// judge picture, sound or phone readability.
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function measureAudio(file) {
  const e = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const g = (re) => +(e.match(re) || [])[1];
  return {integrated_lufs: g(/I:\s+(-?[\d.]+) LUFS/), lra_lu: g(/LRA:\s+(-?[\d.]+) LU/), true_peak_dbtp: g(/Peak:\s+(-?[\d.]+) dBFS/)};
}

export function verifyV2({video, out, expectFrames, fps, width, height}) {
  const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video], {encoding: 'utf8'}).stdout);
  const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
  const count = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', video], {encoding: 'utf8'});
  const decoded = Number(count.stdout.trim());
  const full = spawnSync('ffmpeg', ['-v', 'error', '-i', video, '-f', 'null', '-'], {encoding: 'utf8'});
  const audio = measureAudio(video);
  const [n, d] = (v?.r_frame_rate || '0/1').split('/').map(Number);
  const checks = {
    video_stream: !!v && v.codec_name === 'h264' && v.pix_fmt === 'yuv420p',
    size: v?.width === width && v?.height === height,
    fps: Math.abs(n / d - fps) < 1e-6,
    frames: decoded === expectFrames,
    full_decode_clean: full.status === 0 && !full.stderr.trim(),
    duration: Math.abs(Number(probe.format.duration) - expectFrames / fps) < 0.05,
    audio_stream: !!a && a.codec_name === 'aac' && Number(a.sample_rate) === 48000 && a.channels === 2,
    loudness: Math.abs(audio.integrated_lufs + 14) <= 0.3,
    true_peak: audio.true_peak_dbtp <= -1.5,
  };
  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  const report = {video, checks, failures, pass: failures.length === 0, decoded_frames: decoded, audio,
    note: 'Technical checks only; no claim about picture quality, sound quality or phone readability.', checked_at: new Date().toISOString()};
  writeFileSync(join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({pass: report.pass, failures, decoded, audio}));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).map((x) => {const i = x.indexOf('='); return [x.slice(2, i < 0 ? undefined : i), i < 0 ? true : x.slice(i + 1)];}));
  const cues = JSON.parse(readFileSync(join(ROOT, 'v2/cues.json'), 'utf8'));
  const r = verifyV2({video: resolve(args.video), out: resolve(args.out), expectFrames: Math.round(cues.duration_s * cues.fps), fps: cues.fps, width: cues.width, height: cues.height});
  process.exitCode = r.pass ? 0 : 1;
}
