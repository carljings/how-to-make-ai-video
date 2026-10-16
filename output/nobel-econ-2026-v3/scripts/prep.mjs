// prep.mjs: turn the Seedance clips into what the film plays, and measure them.
//   node scripts/prep.mjs [--draft]
// Each Seedance clip (clips/<id>-720p.mp4 since 2026-10-15; this film's are <id>-1080p.mp4) becomes public/clips/<id>.mp4:
// H.264 8-bit, scaled to 1080×1920, 24 fps,
// silent (the sound goes through scripts/mix.mjs). Durations go to src/clips.json, which timeline.ts reads.
// --draft uses the 480p drafts, scaled up, to build and check the film before the finals exist.
//
// Some shop signs carry made-up lettering: Latin on clip A's furniture and noodle shops (9.875–13.125 s, two shots between
// hard cuts), pseudo-Chinese on clip B's flour shop (2.333–4.75 s, at the very top). The top of the picture is blurred
// there, feathered out above the faces, like a tilt-shift lens.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const draft = process.argv.includes('--draft');
const IDS = ['clipA', 'clipB', 'clipC'];
// [from, to) seconds, sharp below y = solid, fully blurred above it, feathered over `feather` pixels
const SIGN_BLUR = {clipA: {from: 9.875, to: 13.125, solid: 440, feather: 180}, clipB: {from: 2.333, to: 4.75, solid: 170, feather: 90}};

mkdirSync(join(ROOT, 'public/clips'), {recursive: true});
const out = {source: draft ? 'draft' : 'final', clips: []};
for (const id of IDS) {
  const src = (draft ? [`${id}-draft.mp4`] : [`${id}-720p.mp4`, `${id}-1080p.mp4`]).map((f) => join(ROOT, 'clips', f)).find((f) => existsSync(f));
  if (!src) throw new Error(`missing clips/${id}-${draft ? 'draft' : '720p'}.mp4`);
  const dst = join(ROOT, 'public/clips', `${id}.mp4`);
  const base = 'scale=1080:1920:flags=lanczos,format=yuv420p,fps=24';
  const b = SIGN_BLUR[id];
  const graph = b
    ? `[0:v]${base},split[v][top];[top]crop=1080:${b.solid + b.feather}:0:0,boxblur=luma_radius=26:luma_power=2,format=yuva420p,` +
      `geq=lum='p(X,Y)':cb='p(X,Y)':cr='p(X,Y)':a='255*clip((${b.solid + b.feather}-Y)/${b.feather},0,1)'[bl];` +
      `[v][bl]overlay=0:0:enable='between(t,${b.from - 0.01},${b.to - 0.03})',format=yuv420p[o]`
    : `[0:v]${base}[o]`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-an', '-filter_complex', graph, '-map', '[o]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', dst], {encoding: 'utf8'});
  if (r.status) throw new Error(r.stderr);
  const dur = +spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=nb_frames', '-of', 'csv=p=0', dst], {encoding: 'utf8'}).stdout.trim() / 24;
  out.clips.push({id, file: `clips/${id}.mp4`, src: src.slice(ROOT.length + 1), dur: +dur.toFixed(4)});
  console.log(`${id}: ${dur.toFixed(3)} s ← ${src.slice(ROOT.length + 1)}${b ? ' (sign lettering blurred)' : ''}`);
}
writeFileSync(join(ROOT, 'src/clips.json'), JSON.stringify(out, null, 2) + '\n');
