// finalize.mjs (v2 「一口气」): Blender plates -> composited, scored, verified MP4 + covers + SRT. Never launches Blender.
//   node scripts/v2/finalize.mjs --frames=/abs/v2-frames/frames --out=/abs/delivery-v2 [--range=0-404] [--chrome=...]
//                                [--concurrency=3] [--cover-frame=48]
// Steps: cue/timing hash check -> overlay export (python3) -> score (node) -> stage public assets + plates in an
// isolated runtime -> bundle src/v2/index.ts (webpack cache OFF) -> render composition V2 muted -> covers -> mux the
// measured master -> SRT -> metadata -> scripts/v2/verify.mjs (full runs only).
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, existsSync, linkSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {measureAudio, verifyV2} from './verify.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {const i = a.indexOf('='); return [a.slice(2, i < 0 ? undefined : i), i < 0 ? true : a.slice(i + 1)];}));
const need = (ok, text) => {if (!ok) throw Error(text);};
const sha256 = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const run = (bin, argv, env = {}) => {
  console.log(`${new Date().toISOString()} ${bin} ${argv.join(' ')}`);
  const p = spawnSync(bin, argv, {cwd: ROOT, stdio: 'inherit', env: {...process.env, PYTHONDONTWRITEBYTECODE: '1', ...env}});
  need(p.status === 0, `${bin} failed (${p.status}): ${p.error || 'see preceding output'}`);
};
const linkOrCopy = (src, dest) => {
  mkdirSync(dirname(dest), {recursive: true});
  if (existsSync(dest)) {need(sha256(src) === sha256(dest), `Existing staged asset differs: ${dest}; choose a new output directory`); return;}
  try {linkSync(src, dest);} catch (e) {if (e.code !== 'EXDEV') throw e; copyFileSync(src, dest);}
};
const srtTime = (t) => {const ms = Math.round(t * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;};
const display = (s) => s.replace(/[，。！？、]+$/u, '').replace(/[，、]/gu, ' ');

async function main() {
  need(typeof args.frames === 'string', 'Usage: node scripts/v2/finalize.mjs --frames=/abs/frames --out=/abs/delivery [--range=a-b] [--chrome=...]');
  const cues = JSON.parse(readFileSync(join(ROOT, 'v2/cues.json'), 'utf8'));
  const timing = JSON.parse(readFileSync(join(ROOT, 'v2/timing.json'), 'utf8'));
  need(timing.cues_sha256 === sha256(join(ROOT, 'v2/cues.json')), 'v2/timing.json is stale: run python3 blender/tools/retime_v2.py');
  const FPS = cues.fps, FRAMES = Math.round(cues.duration_s * FPS);
  const source = resolve(args.frames), out = resolve(args.out || join(ROOT, 'out/v2/delivery'));
  const chrome = args.chrome || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const concurrency = Number(args.concurrency || 3);
  need(existsSync(chrome), 'Installed Chrome is required; set --chrome. This tool never downloads a browser.');
  let range = [0, FRAMES - 1], mode = 'full';
  if (args.range) {need(/^\d+-\d+$/.test(args.range), '--range must be inclusive, e.g. 0-404'); range = args.range.split('-').map(Number); mode = 'preview';}
  need(range[0] >= 0 && range[1] < FRAMES && range[1] >= range[0], `Frame range must lie inside 0–${FRAMES - 1}`);
  mkdirSync(out, {recursive: true});
  const runtime = join(out, '.runtime'), publicDir = join(runtime, 'public');
  mkdirSync(publicDir, {recursive: true});
  cpSync(join(ROOT, 'public/fonts'), join(publicDir, 'fonts'), {recursive: true, force: false, errorOnExist: false});
  cpSync(join(ROOT, 'public/v2'), join(publicDir, 'v2'), {recursive: true, force: false, errorOnExist: false});
  const frameRecords = [];
  for (let f = range[0]; f <= range[1]; f++) {
    const name = `f${String(f).padStart(5, '0')}.png`, file = join(source, name);
    need(existsSync(file), `Missing Blender plate ${file}`);
    const bytes = readFileSync(file);
    need(bytes.length > 24 && bytes.subarray(1, 4).toString() === 'PNG' && bytes.readUInt32BE(16) === cues.width && bytes.readUInt32BE(20) === cues.height, `Plate must be a native ${cues.width}×${cues.height} PNG: ${file}`);
    frameRecords.push({frame: f, name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')});
    linkOrCopy(file, join(publicDir, 'plates/frames', name));
  }
  const coverFrame = Number(args['cover-frame'] ?? 48);
  const coverSrc = join(source, `f${String(coverFrame).padStart(5, '0')}.png`);
  need(existsSync(coverSrc), `Cover plate missing: ${coverSrc}`);
  linkOrCopy(coverSrc, join(publicDir, 'plates/cover.png'));
  writeFileSync(join(out, 'plate-manifest.json'), JSON.stringify({source, mode, range, frames: frameRecords}, null, 2) + '\n');

  run('python3', [join(ROOT, 'blender/tools/export_v2_overlay.py')]);
  const overlay = JSON.parse(readFileSync(join(ROOT, 'src/v2/data/overlay.json'), 'utf8'));
  need(overlay.frames?.length === FRAMES && overlay.cues_sha256 === timing.cues_sha256, 'Overlay export incomplete or from other cues');
  const audioDir = join(out, 'audio');
  run(process.execPath, [join(ROOT, 'scripts/v2/score.mjs')], {V2_AUDIO_OUT: audioDir.startsWith(ROOT) ? audioDir.slice(ROOT.length + 1) : audioDir});
  const master = join(audioDir, 'master.wav');
  const mm = measureAudio(master);
  need(Math.abs(mm.integrated_lufs + 14) <= 0.3 && mm.true_peak_dbtp <= -1.5, `Master misses −14 LUFS / −1.5 dBTP: ${JSON.stringify(mm)}`);

  const inputProps = {plates: {kind: 'frames', dir: 'plates/frames', ext: 'png'}};
  writeFileSync(join(out, 'input-props.json'), JSON.stringify(inputProps, null, 2) + '\n');
  console.log('Bundling src/v2/index.ts with the webpack cache disabled');
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src/v2/index.ts'), publicDir, outDir: join(runtime, 'bundle'), enableCaching: false});
  const browser = await openBrowser('chrome', {browserExecutable: chrome});
  const video = join(out, mode === 'full' ? 'roadster-v2-yikouqi.mp4' : `preview-v2-f${range[0]}-${range[1]}.mp4`);
  try {
    const composition = await selectComposition({serveUrl, id: 'V2', inputProps, puppeteerInstance: browser});
    let last = -1;
    await renderMedia({serveUrl, composition, inputProps, outputLocation: join(runtime, 'picture.mp4'), codec: 'h264', crf: 16,
      pixelFormat: 'yuv420p', colorSpace: 'bt709', imageFormat: 'png', muted: true, frameRange: range, concurrency,
      puppeteerInstance: browser, overwrite: true,
      onProgress: (p) => {const n = Math.floor(p.progress * 20); if (n > last) {last = n; console.log(`Picture ${Math.round(p.progress * 100)}% (${p.renderedFrames} frames)`);}}});
    for (const [id, name, height] of [['V2Cover', 'cover-9x16.png', 1920], ['V2Cover34', 'cover-3x4.png', 1440]]) {
      const props = {plate: 'plates/cover.png', height};
      const comp = await selectComposition({serveUrl, id, inputProps: props, puppeteerInstance: browser});
      await renderStill({serveUrl, composition: comp, inputProps: props, output: join(out, name), puppeteerInstance: browser, overwrite: true});
    }
  } finally {await browser.close({silent: true});}
  const length = (range[1] - range[0] + 1) / FPS;
  run('ffmpeg', ['-v', 'error', '-y', '-i', join(runtime, 'picture.mp4'), '-ss', String(range[0] / FPS), '-i', master, '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-t', String(length), '-movflags', '+faststart', video]);
  const cues2 = timing.lines.flatMap((l) => l.phrases.map((p) => ({start: p.start_s, end: p.end_s, text: display(p.text)})));
  writeFileSync(join(out, 'narration-v2.zh-CN.srt'), cues2.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n'));
  const metadata = {film: 'Roadster v2 「一口气」', mode, composition: 'V2', range, fps: FPS, frames: range[1] - range[0] + 1, duration_s: length,
    resolution: [cues.width, cues.height], cues_sha256: timing.cues_sha256, plate_manifest_sha256: sha256(join(out, 'plate-manifest.json')),
    master_sha256: sha256(master), master_measurement: mm, output_sha256: sha256(video), cover_frame: coverFrame,
    source_post: cues.sources.musk_post, source_date: cues.sources.date,
    credits: 'Opus 5.5: direction, script, picture, graphics, typography and score code. Codex: tools, rendering, narration synthesis, fonts and technical QA.',
    status: mode === 'full' ? 'Awaiting encoded-output verification and human audiovisual review' : 'Preview only; NOT the final film',
    created_at: new Date().toISOString()};
  writeFileSync(join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
  if (mode === 'full') {
    const v = verifyV2({video, out, expectFrames: FRAMES, fps: FPS, width: cues.width, height: cues.height});
    metadata.status = v.pass ? 'Encoded-output technical checks passed; human picture/sound/phone review is a separate gate' : 'TECHNICAL CHECKS FAILED: see verification.json';
    writeFileSync(join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
    need(v.pass, 'Verification failed: ' + JSON.stringify(v.failures));
  }
  console.log(video);
}
main().catch((e) => {console.error(e.stack); process.exitCode = 1;});
