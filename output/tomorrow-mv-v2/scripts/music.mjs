// music.mjs: cut both soundtracks out of the music screen recording → public/music-full.wav, public/music-short.wav.
//   node scripts/music.mjs [recording.MOV] [--tp=-1.7]
// Song time 0 is 0.479 s into the recording (just before the first downbeat; the same remix as V1's clip, matched by
// cross-correlation). Full: song 0–51.2 s (16 bars). Short: song bars 1–8 then 13–16, joined on the bar line with an
// 8 ms crossfade, 38.4 s. Gain only (no limiter, no EQ), the same gain for both, set so the louder one's true peak lands
// at --tp dBTP before AAC encoding (default −1.7; the AAC encoder adds about 0.1 dB, measured in V1).
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SRC = args.find((a) => !a.startsWith('--')) ?? '/root/Templates/ScreenRecording_10-11-2026 01-14-58_1.MOV';
const TP = +(args.find((a) => a.startsWith('--tp='))?.split('=')[1] ?? -1.7);
if (!existsSync(SRC)) throw new Error(`recording not found: ${SRC}`);
const START = 0.479, T0 = 0.0574, BAR = 8 * 0.39998, bar = (b) => T0 + b * BAR, X = 0.004; // X: half the crossfade

const rs = 'aresample=48000:resampler=soxr:precision=28';
const graphs = {
  full: `[0:a]atrim=start=${START}:duration=51.2,asetpts=PTS-STARTPTS,${rs}[m]`,
  short: `[0:a]atrim=start=${START}:duration=${(bar(8) + X).toFixed(4)},asetpts=PTS-STARTPTS,${rs}[a];` +
    `[0:a]atrim=start=${(START + bar(12) - X).toFixed(4)}:duration=${(38.4 - bar(8) + X + 0.0001).toFixed(4)},asetpts=PTS-STARTPTS,${rs}[b];` +
    `[a][b]acrossfade=d=${2 * X}:c1=qsin:c2=qsin,atrim=duration=38.4[m]`,
};
const run = (graph, extra, out) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', '-i', SRC, '-filter_complex', `${graph};[m]${extra}[o]`, '-map', '[o]', ...out], {encoding: 'utf8'});
const loud = (graph) => {
  const r = run(graph, 'ebur128=peak=true', ['-f', 'null', '-']);
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  return {I: +s.match(/I:\s+(-?[\d.]+) LUFS/)[1], TP: +s.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]};
};
const before = Object.fromEntries(Object.entries(graphs).map(([k, g]) => [k, loud(g)]));
const gain = +(TP - Math.max(before.full.TP, before.short.TP)).toFixed(2);
mkdirSync(join(ROOT, 'public'), {recursive: true});
for (const [k, g] of Object.entries(graphs)) {
  const dur = k === 'full' ? 51.2 : 38.4;
  const fx = `volume=${gain}dB,afade=t=in:d=0.005,afade=t=out:st=${(dur - 0.015).toFixed(3)}:d=0.015`;
  const out = join(ROOT, `public/music-${k}.wav`);
  const r = run(g, fx, ['-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', out]);
  if (r.status) throw new Error(r.stderr);
  console.log(`${k.padEnd(5)} source ${before[k].I} LUFS ${before[k].TP} dBTP → gain ${gain} dB → ${out}`);
}
for (const k of ['full', 'short']) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', join(ROOT, `public/music-${k}.wav`), '-af', 'ebur128=peak=true', '-f', 'null', '-'], {encoding: 'utf8'});
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  console.log(`${k.padEnd(5)} result ${s.match(/I:\s+(-?[\d.]+) LUFS/)[1]} LUFS, true peak ${s.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]} dBTP`);
}
