// score.mjs: build the film's soundtrack.
//   node scripts/score.mjs   → out/music.wav, out/seedance.wav, public/mix.wav (48 kHz 16-bit stereo, mastered)
// 1. Render the music bed (src/audio/score.ts) in headless Chrome.
// 2. Lay the four Seedance soundtracks (narration + sound effects) end to end, each cut to its clip's picture length.
//    Clip 1 uses audio/seg1.wav, where one blurred syllable of the name was replaced (scripts/patch_name.py).
// 3. Mix: the bed is set 9 LU under the Seedance track and ducks about 5 dB under the voice (about 14 LU under it overall).
// 4. Master to −10 LUFS (the user's choice) with a 4× oversampled limiter so the true peak stays ≤ −1.5 dBTP after AAC.
import {build} from 'esbuild';
import puppeteer from 'puppeteer-core';
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = -10, CEILING = -1.5, UNDER = 9;
const CHROME = process.env.CHROME_PATH || [join(ROOT, 'node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell'),
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));
mkdirSync(join(ROOT, 'out'), {recursive: true}); mkdirSync(join(ROOT, 'public'), {recursive: true});
const run = (args) => new Promise((ok, bad) => { const p = spawn('ffmpeg', args, {stdio: ['ignore', 'ignore', 'inherit']}); p.on('close', (c) => (c ? bad(new Error('ffmpeg ' + c)) : ok())); });
const measure = (f) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const j = JSON.parse(r.slice(r.lastIndexOf('{'), r.lastIndexOf('}') + 1));
  return {I: +j.input_i, TP: +j.input_tp, LRA: +j.input_lra};
};

// 1. the music bed
const bundle = await build({entryPoints: [join(ROOT, 'src/audio/entry.ts')], bundle: true, write: false, format: 'iife', target: 'chrome120', logLevel: 'error', loader: {'.json': 'json'}});
const browser = await puppeteer.launch({executablePath: CHROME, headless: true, protocolTimeout: 0, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
let info;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.setContent('<!doctype html><title>score</title>');
  await page.addScriptTag({content: bundle.outputFiles[0].text});
  info = await page.evaluate(() => window.renderScoreWav());
} finally { await browser.close(); }
const music = join(ROOT, 'out/music.wav');
writeFileSync(music, Buffer.from(info.b64, 'base64'));
console.log(`music bed ${info.seconds.toFixed(2)} s`);

// 2. the Seedance soundtrack, clip by clip
const {clips} = JSON.parse(readFileSync(join(ROOT, 'src/clips.json'), 'utf8'));
const srcs = clips.map((c) => (c.id === 'seg1' && existsSync(join(ROOT, 'audio/seg1.wav')) ? join(ROOT, 'audio/seg1.wav') : join(ROOT, c.src)));
const seedance = join(ROOT, 'out/seedance.wav');
const parts = clips.map((c, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${c.dur},apad=whole_dur=${c.dur},asetpts=PTS-STARTPTS[a${i}]`).join(';');
await run(['-y', '-v', 'error', ...srcs.flatMap((s) => ['-i', s]), '-filter_complex', `${parts};${clips.map((_, i) => `[a${i}]`).join('')}concat=n=${clips.length}:v=0:a=1[o]`,
  '-map', '[o]', '-c:a', 'pcm_f32le', seedance]);

// 3. mix: the bed under the narration, ducked by it
const sd = measure(seedance), mb = measure(music), mg = sd.I - UNDER - mb.I;
const mixRaw = join(ROOT, 'out/mix-raw.wav');
await run(['-y', '-v', 'error', '-i', seedance, '-i', music, '-filter_complex',
  `[1:a]volume=${mg.toFixed(2)}dB[m];[0:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.05:ratio=3:attack=20:release=400:makeup=1[md];[v][md]amix=inputs=2:normalize=0:duration=first[o]`,
  '-map', '[o]', '-c:a', 'pcm_f32le', mixRaw]);
console.log(`seedance ${sd.I.toFixed(1)} LUFS, bed set ${UNDER} LU under it (${mg.toFixed(1)} dB), ducked by the voice`);

// 4. master
const out = join(ROOT, 'public/mix.wav'), src = measure(mixRaw);
async function master(limitDb) {
  let g = TARGET - src.I, fin;
  const limit = (10 ** (limitDb / 20)).toFixed(4);
  for (let k = 0; k < 8; k++) {
    await run(['-y', '-v', 'error', '-i', mixRaw, '-af', `volume=${g.toFixed(2)}dB,aresample=192000,alimiter=limit=${limit}:attack=2:release=60:level=disabled,aresample=48000`, '-c:a', 'pcm_s16le', out]);
    fin = measure(out);
    if (Math.abs(fin.I - TARGET) < 0.2) break;
    g += TARGET - fin.I;
  }
  return fin;
}
const aacPeak = () => { const m4a = join(ROOT, 'out/.score-test.m4a'); spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', out, '-c:a', 'aac', '-b:a', '256k', m4a]); return measure(m4a).TP; };
let limitDb = -2.4, fin = await master(limitDb), tp = aacPeak();
for (let k = 0; k < 4 && tp > CEILING - 0.2; k++) { limitDb -= tp - (CEILING - 0.2) + 0.05; fin = await master(limitDb); tp = aacPeak(); }
console.log(`mastered ${src.I.toFixed(1)} → ${fin.I.toFixed(1)} LUFS, true peak ${fin.TP.toFixed(1)} dBTP (${tp.toFixed(1)} after AAC), limiter ${limitDb.toFixed(1)} dB, range ${fin.LRA.toFixed(1)} LU → public/mix.wav`);
