// Codex integration: compose existing native Blender plates using Opus's UI and score. Never launches Blender.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, existsSync, linkSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {auditCaptions, measureAudio, sha256, verifyFilm} from './verify-film.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {const i = a.indexOf('='); return [a.slice(2, i < 0 ? undefined : i), i < 0 ? true : a.slice(i + 1)];}));
const need = (ok, text) => {if (!ok) throw Error(text);};
const run = (bin, argv) => {
  console.log(`${new Date().toISOString()} ${bin} ${argv.join(' ')}`);
  const p = spawnSync(bin, argv, {cwd: ROOT, stdio: 'inherit'});
  need(p.status === 0, `${bin} failed (${p.status}): ${p.error || 'see preceding output'}`);
};
const linkOrCopy = (src, dest) => {
  mkdirSync(dirname(dest), {recursive: true});
  if (existsSync(dest)) {need(sha256(src) === sha256(dest), `Existing staged asset differs: ${dest}; choose a new output directory`); return;}
  try {linkSync(src, dest);} catch (e) {if (e.code !== 'EXDEV') throw e; copyFileSync(src, dest);}
};
const srtTime = t => {const ms = Math.round(t * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;};

async function main() {
  need(typeof args.frames === 'string', 'Usage: node scripts/finalize.mjs --frames=/absolute/frames --out=/absolute/delivery [--range=0-29] [--chrome=/path/to/Chrome]');
  const source = resolve(args.frames), out = resolve(args.out || join(ROOT, 'out/delivery'));
  const chrome = args.chrome || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const concurrency = Number(args.concurrency || 3);
  need(existsSync(chrome), 'Installed Chrome is required; set --chrome. This tool never downloads a browser.');
  need(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 8, 'Concurrency must be 1–8');
  let range = [0, 2249], mode = 'full';
  if (args.range) {need(/^\d+-\d+$/.test(args.range), '--range must be inclusive, e.g. 0-29'); range = args.range.split('-').map(Number); mode = 'partial-proof';}
  need(range[0] >= 0 && range[1] < 2250 && range[1] >= range[0], 'Frame range must lie inside 0–2249');
  mkdirSync(out, {recursive: true});
  const runtime = join(out, '.runtime'), publicDir = join(runtime, 'public');
  mkdirSync(publicDir, {recursive: true});
  // Staging is isolated; existing project public assets are retained, including all real font faces and licence.
  cpSync(join(ROOT, 'public'), publicDir, {recursive: true, force: false, errorOnExist: false});
  const frameRecords = [];
  for (let f = range[0]; f <= range[1]; f++) {
    const name = `f${String(f).padStart(5, '0')}.png`, file = join(source, name);
    need(existsSync(file), `Missing actual Blender plate ${file}`);
    const bytes = readFileSync(file);
    need(bytes.length > 24 && bytes.subarray(1, 4).toString() === 'PNG' && bytes.readUInt32BE(16) === 1080 && bytes.readUInt32BE(20) === 1920, `Plate must be a native 1080×1920 PNG: ${file}`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    frameRecords.push({frame: f, name, bytes: bytes.length, sha256: hash});
    linkOrCopy(file, join(publicDir, 'plates/frames', name));
  }
  const coverFrame = mode === 'full' ? 35 : range[0]; // source B: complete car and plumes clear of the headline in both cover ratios
  linkOrCopy(join(source, `f${String(coverFrame).padStart(5, '0')}.png`), join(publicDir, 'plates/cover.png'));
  writeFileSync(join(out, 'plate-manifest.json'), JSON.stringify({source, mode, range, frames: frameRecords}, null, 2) + '\n');
  const exporter = join(ROOT, 'blender/tools/export_overlay.py');
  need(existsSync(exporter), 'Missing Opus blender/tools/export_overlay.py; restore it before finalizing');
  run('python3', [exporter]);
  const overlay = JSON.parse(readFileSync(join(ROOT, 'src/data/overlay.json')));
  const events = JSON.parse(readFileSync(join(ROOT, 'src/data/events.json')));
  need(overlay.frames?.length === 2250 && events.fps === 30, 'Canonical overlay/events export is incomplete');
  run(process.execPath, [join(ROOT, 'scripts/text-check.mjs')]);
  run(process.execPath, [join(ROOT, 'scripts/score.mjs')]);
  const master = join(ROOT, 'out/audio/master.wav');
  need(existsSync(master) && statSync(master).size > 1000, 'Opus score did not create a master WAV');
  const masterMeasurement = measureAudio(master);
  need(Math.abs(masterMeasurement.integrated_lufs + 14) <= 0.3 && masterMeasurement.true_peak_dbtp <= -1.5, 'Audio master misses loudness/true-peak targets');
  const captionAudit = await auditCaptions(out, chrome);
  const inputProps = {plates: {kind: 'frames', dir: 'plates/frames', ext: 'png'}, captions: true};
  writeFileSync(join(out, 'input-props.json'), JSON.stringify(inputProps, null, 2) + '\n');
  console.log('Bundling with cache disabled');
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src/index.ts'), publicDir, outDir: join(runtime, 'bundle'), enableCaching: false});
  const browser = await openBrowser('chrome', {browserExecutable: chrome});
  const video = join(out, mode === 'full' ? 'roadster-flight-explainer.mp4' : 'partial-proof.mp4');
  try {
    const composition = await selectComposition({serveUrl, id: 'Film', inputProps, puppeteerInstance: browser});
    let last = -1;
    await renderMedia({serveUrl, composition, inputProps, outputLocation: join(runtime, 'picture.mp4'), codec: 'h264', crf: 16, pixelFormat: 'yuv420p', colorSpace: 'bt709', imageFormat: 'png', muted: true, frameRange: range, concurrency, puppeteerInstance: browser, overwrite: true,
      onProgress: p => {const n = Math.floor(p.progress * 20); if (n > last) {last = n; console.log(`Picture ${Math.round(p.progress * 100)}% (${p.renderedFrames} rendered)`);}}});
    for (const [id, name, height] of [['Cover', 'cover-9x16.png', 1920], ['Cover34', 'cover-3x4.png', 1440]]) {
      const props = {plate: 'plates/cover.png', height};
      const comp = await selectComposition({serveUrl, id, inputProps: props, puppeteerInstance: browser});
      await renderStill({serveUrl, composition: comp, inputProps: props, output: join(out, name), puppeteerInstance: browser, overwrite: true});
    }
  } finally {await browser.close({silent: true});}
  const length = (range[1] - range[0] + 1) / 30;
  run('ffmpeg', ['-v', 'error', '-y', '-i', join(runtime, 'picture.mp4'), '-ss', String(range[0] / 30), '-i', master, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-t', String(length), '-movflags', '+faststart', video]);
  const captions = JSON.parse(readFileSync(join(ROOT, 'support/narration/caption-cues.json'))).cues;
  writeFileSync(join(out, 'narration.zh-CN.srt'), captions.map((c, i) => `${i + 1}\n${srtTime(c.start_s)} --> ${srtTime(c.end_s)}\n${c.display_text}\n`).join('\n'));
  const metadata = {mode, composition: 'Film', inputProps, range, fps: 30, frames: range[1] - range[0] + 1, duration_s: length, resolution: [1080, 1920], plate_manifest: 'plate-manifest.json', plate_manifest_sha256: sha256(join(out, 'plate-manifest.json')), master_sha256: sha256(master), master_measurement: masterMeasurement, output_sha256: sha256(video), source_post: 'https://x.com/elonmusk/status/2110913107094606330', source_date: '2026-10-16', credits: 'Opus 5.5 primary author; Codex tool integration, targeted corrections and technical QA.', status: mode === 'full' ? 'Awaiting encoded-output technical verification and human aesthetic review' : 'Partial technical proof only; NOT a final film', created_at: new Date().toISOString()};
  writeFileSync(join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
  if (mode === 'full') {
    await verifyFilm({video, metadata: join(out, 'metadata.json'), out, chrome, captionAudit});
    metadata.status = 'Encoded-output technical verification passed; visual, human sound and phone reviews are separate gates';
    metadata.technical_verification = 'verification.json';
    metadata.cover_frame = coverFrame;
    writeFileSync(join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
  } else console.log('PARTIAL PROOF ONLY: final-film verification deliberately skipped; SRT retains full-film timing.');
  console.log(video);
}
main().catch(e => {console.error(e.stack); process.exitCode = 1;});
