// music.mjs: cut the clean pass of the song out of the music screen recording → public/music.wav.
//   node scripts/music.mjs [recording.MP4] [--tp=-1.7]
// The Douyin clip in the recording restarts at 0.698 s; from there, 19.2 s is exactly six bars at 75 BPM, ending just
// before the seventh downbeat, so the film loops on the beat. Gain only (no limiter, no EQ): the level is set so the
// true peak lands at --tp dBTP before AAC encoding (default −1.7; the AAC encoder adds about 0.1 dB, measured).
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SRC = args.find((a) => !a.startsWith('--')) ?? '/root/Templates/ScreenRecording_10-10-2026 21-52-17_1.MP4';
const TP = +(args.find((a) => a.startsWith('--tp='))?.split('=')[1] ?? -1.7);
const START = 0.698, DUR = 19.2;
if (!existsSync(SRC)) throw new Error(`recording not found: ${SRC}`);

const cut = `atrim=start=${START}:duration=${DUR},asetpts=PTS-STARTPTS,aresample=48000:resampler=soxr:precision=28`;
const loud = (filters) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', SRC, '-vn', '-af', `${filters},ebur128=peak=true`, '-f', 'null', '-'], {encoding: 'utf8'});
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  return {I: +s.match(/I:\s+(-?[\d.]+) LUFS/)[1], TP: +s.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]};
};
const before = loud(cut);
const gain = +(TP - before.TP).toFixed(2);
const fades = `afade=t=in:d=0.005,afade=t=out:st=${(DUR - 0.015).toFixed(3)}:d=0.015`;
const out = join(ROOT, 'public/music.wav');
mkdirSync(dirname(out), {recursive: true});
const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', SRC, '-vn', '-af', `${cut},volume=${gain}dB,${fades}`, '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', out]);
if (r.status) throw new Error(String(r.stderr));
const after = loud(`${cut},volume=${gain}dB,${fades}`);
console.log(`source  ${before.I} LUFS, true peak ${before.TP} dBTP`);
console.log(`gain    ${gain} dB`);
console.log(`music   ${after.I} LUFS, true peak ${after.TP} dBTP → ${out}`);
