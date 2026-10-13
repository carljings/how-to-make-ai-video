// mix.mjs: build the film's soundtrack.
//   node scripts/mix.mjs   → out/seedance.wav, public/mix.wav (48 kHz 16-bit stereo, mastered)
// 1. Lay the three Seedance soundtracks (narration, music and sound effects, all generated with the picture) end to end,
//    each cut to its clip's picture length, with 10 ms fades at the seams so no cut clicks. Clip C uses audio/clipC.wav,
//    where the last line was replaced (scripts/patch_vo.py).
// 2. Master to −10 LUFS (the user's choice) with a 4× oversampled limiter so the true peak stays ≤ −1.5 dBTP after AAC.
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = -10, CEILING = -1.5, SEAM = 0.01;
mkdirSync(join(ROOT, 'out'), {recursive: true}); mkdirSync(join(ROOT, 'public'), {recursive: true});
const run = (args) => new Promise((ok, bad) => { const p = spawn('ffmpeg', args, {stdio: ['ignore', 'ignore', 'inherit']}); p.on('close', (c) => (c ? bad(new Error('ffmpeg ' + c)) : ok())); });
const measure = (f) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const j = JSON.parse(r.slice(r.lastIndexOf('{'), r.lastIndexOf('}') + 1));
  return {I: +j.input_i, TP: +j.input_tp, LRA: +j.input_lra};
};

// 1. the Seedance soundtrack, clip by clip
const {clips} = JSON.parse(readFileSync(join(ROOT, 'src/clips.json'), 'utf8'));
const srcs = clips.map((c) => (existsSync(join(ROOT, `audio/${c.id}.wav`)) ? join(ROOT, `audio/${c.id}.wav`) : join(ROOT, c.src)));
const seedance = join(ROOT, 'out/seedance.wav');
const parts = clips.map((c, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${c.dur},apad=whole_dur=${c.dur},asetpts=PTS-STARTPTS,` +
  `afade=t=in:d=${SEAM},afade=t=out:st=${(c.dur - SEAM).toFixed(4)}:d=${SEAM}[a${i}]`).join(';');
await run(['-y', '-v', 'error', ...srcs.flatMap((s) => ['-i', s]), '-filter_complex', `${parts};${clips.map((_, i) => `[a${i}]`).join('')}concat=n=${clips.length}:v=0:a=1[o]`,
  '-map', '[o]', '-c:a', 'pcm_f32le', seedance]);
clips.forEach((c, i) => console.log(`${c.id}: ${c.dur.toFixed(3)} s ← ${srcs[i].slice(ROOT.length + 1)}`));

// 2. master
const out = join(ROOT, 'public/mix.wav'), src = measure(seedance);
async function master(limitDb) {
  let g = TARGET - src.I, fin;
  const limit = (10 ** (limitDb / 20)).toFixed(4);
  for (let k = 0; k < 8; k++) {
    await run(['-y', '-v', 'error', '-i', seedance, '-af', `volume=${g.toFixed(2)}dB,aresample=192000,alimiter=limit=${limit}:attack=2:release=60:level=disabled,aresample=48000`, '-c:a', 'pcm_s16le', out]);
    fin = measure(out);
    if (Math.abs(fin.I - TARGET) < 0.2) break;
    g += TARGET - fin.I;
  }
  return fin;
}
const aacPeak = () => { const m4a = join(ROOT, 'out/.mix-test.m4a'); spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', out, '-c:a', 'aac', '-b:a', '256k', m4a]); return measure(m4a).TP; };
let limitDb = -2.4, fin = await master(limitDb), tp = aacPeak();
for (let k = 0; k < 4 && tp > CEILING - 0.2; k++) { limitDb -= tp - (CEILING - 0.2) + 0.05; fin = await master(limitDb); tp = aacPeak(); }
console.log(`mastered ${src.I.toFixed(1)} → ${fin.I.toFixed(1)} LUFS, true peak ${fin.TP.toFixed(1)} dBTP (${tp.toFixed(1)} after AAC), limiter ${limitDb.toFixed(1)} dB, range ${fin.LRA.toFixed(1)} LU → public/mix.wav`);
