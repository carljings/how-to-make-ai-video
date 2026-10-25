// score.mjs: render the soundtrack (src/audio/score.ts) in headless Chrome, then master it into public/score.wav.
//   node scripts/score.mjs            → out/score-raw.wav (float) and public/score.wav (mastered, 48 kHz 16-bit)
// Mastering: gain to −10 LUFS (the user's choice for this film, matching comparable Douyin films) and a true-peak
// limiter at 4× sample rate, so the true peak stays at or under −1.5 dBTP; repeated until the loudness is within 0.2 LU.
import {build} from 'esbuild';
import puppeteer from 'puppeteer-core';
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = -10, CEILING = -1.5, LIMIT = -2.4; // starting limiter ceiling; lowered further below if the AAC test copy needs it
const CHROME = process.env.CHROME_PATH || [join(ROOT, 'node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell'),
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));
if (!CHROME) throw new Error('No Chrome found: run `npx remotion browser ensure` or set CHROME_PATH');

const bundle = await build({entryPoints: [join(ROOT, 'src/audio/entry.ts')], bundle: true, write: false, format: 'iife', target: 'chrome120', logLevel: 'error'});
const browser = await puppeteer.launch({executablePath: CHROME, headless: true, protocolTimeout: 0, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
const start = Date.now();
let info;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.setContent('<!doctype html><title>score</title>');
  await page.addScriptTag({content: bundle.outputFiles[0].text});
  info = await page.evaluate(() => window.renderScoreWav());
} finally {
  await browser.close();
}
mkdirSync(join(ROOT, 'out'), {recursive: true}); mkdirSync(join(ROOT, 'public'), {recursive: true});
const raw = join(ROOT, 'out/score-raw.wav'), out = join(ROOT, 'public/score.wav');
writeFileSync(raw, Buffer.from(info.b64, 'base64'));
console.log(`rendered ${info.seconds.toFixed(2)} s in ${((Date.now() - start) / 1000).toFixed(1)} s, peak ${(20 * Math.log10(info.peak)).toFixed(1)} dBFS`);

const measure = (f) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const j = JSON.parse(r.slice(r.lastIndexOf('{'), r.lastIndexOf('}') + 1));
  return {I: +j.input_i, TP: +j.input_tp, LRA: +j.input_lra};
};
const run = (args) => new Promise((ok, bad) => { const p = spawn('ffmpeg', args, {stdio: 'inherit'}); p.on('close', (c) => (c ? bad(new Error('ffmpeg ' + c)) : ok())); });
const src = measure(raw);
// Master at a given limiter ceiling: adjust gain until the loudness is within 0.2 LU of the target
async function master(limitDb) {
  let gain = TARGET - src.I, fin;
  const limit = (10 ** (limitDb / 20)).toFixed(4);
  for (let k = 0; k < 6; k++) {
    await run(['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-af', `volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=${limit}:attack=2:release=60:level=disabled,aresample=48000`, '-c:a', 'pcm_s16le', out]);
    fin = measure(out);
    if (Math.abs(fin.I - TARGET) < 0.2) break;
    gain += TARGET - fin.I;
  }
  return fin;
}
// The film's soundtrack is AAC, which adds a few tenths of a dB of overshoot: encode a test copy the way Remotion
// does (AAC, 256 kb/s) and lower the limiter until even the encoded version stays under the ceiling, with 0.2 dB to spare.
const aacPeak = () => {
  const m4a = join(ROOT, 'out/.score-test.m4a');
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', out, '-c:a', 'aac', '-b:a', '256k', m4a]);
  return measure(m4a).TP;
};
let limitDb = LIMIT, fin = await master(limitDb), tp = aacPeak();
for (let k = 0; k < 4 && tp > CEILING - 0.2; k++) {
  limitDb -= tp - (CEILING - 0.2) + 0.05;
  fin = await master(limitDb); tp = aacPeak();
}
console.log(`mastered ${src.I.toFixed(1)} → ${fin.I.toFixed(1)} LUFS, true peak ${fin.TP.toFixed(1)} dBTP (${tp.toFixed(1)} after AAC), limiter at ${limitDb.toFixed(1)} dB, loudness range ${fin.LRA.toFixed(1)} LU → public/score.wav`);
