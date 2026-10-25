// prep.mjs: turn the Seedance clips into what the film plays, and measure them.
//   node scripts/prep.mjs [--draft]
// Each clips/segN-1080p.mp4 (10-bit HEVC from Seedance) becomes public/clips/segN.mp4: H.264 8-bit 1080×1920 24 fps,
// silent (the sound goes through the mix). Durations go to src/clips.json, which timeline.ts reads.
// --draft uses the 480p drafts, scaled up, to build and check the film before the finals exist.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const draft = process.argv.includes('--draft');
const IDS = ['seg1', 'seg2', 'seg3', 'seg4'];
mkdirSync(join(ROOT, 'public/clips'), {recursive: true});
const out = {source: draft ? 'draft' : '1080p', clips: []};
for (const id of IDS) {
  const src = join(ROOT, 'clips', draft ? `${id}-draft.mp4` : `${id}-1080p.mp4`);
  if (!existsSync(src)) throw new Error(`missing ${src}`);
  const dst = join(ROOT, 'public/clips', `${id}.mp4`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-an', '-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p,fps=24', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', dst], {encoding: 'utf8'});
  if (r.status) throw new Error(r.stderr);
  const dur = +spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=nb_frames', '-of', 'csv=p=0', dst], {encoding: 'utf8'}).stdout.trim() / 24;
  out.clips.push({id, file: `clips/${id}.mp4`, src: src.slice(ROOT.length + 1), dur: +dur.toFixed(4)});
  console.log(`${id}: ${dur.toFixed(3)} s ← ${src.slice(ROOT.length + 1)}`);
}
writeFileSync(join(ROOT, 'src/clips.json'), JSON.stringify(out, null, 2) + '\n');
