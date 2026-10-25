// Codex technical packaging; artistic picture, graphics, typography and score belong to Opus.
// Full/preview: node scripts/v3/finalize.mjs --plates=/abs/batch --out=/abs/delivery [--range=0-155]
// Proof: node scripts/v3/stills.mjs --plates=/abs/proof --out=/abs/composited --frames=0,48,255 --lock=/abs/source-lock.json
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, existsSync, linkSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {measureAudio, verifyV3} from './verify.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const need = (ok, message) => {if (!ok) throw Error(message);};
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const pad = (n) => String(n).padStart(5, '0');
const run = (command, argv, env = {}) => {
  const p = spawnSync(command, argv, {cwd: ROOT, stdio: 'inherit', env: {...process.env, PYTHONDONTWRITEBYTECODE: '1', ...env}});
  need(p.status === 0, `${command} failed (${p.status}): ${p.error || 'see output'}`);
};
const argsOf = () => Object.fromEntries(process.argv.slice(2).map((s) => {const i = s.indexOf('='); return [s.slice(2, i < 0 ? undefined : i), i < 0 ? true : s.slice(i + 1)];}));
const srtTime = (t) => {const ms = Math.round(t * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;};
const display = (s) => s.replace(/[，。！？、；]+$/u, '').replace(/[，、]/gu, ' ');

function checkLock(file) {
  need(existsSync(file), `Render source lock missing: ${file}. Freeze the Blender source and cue/timing hashes before rendering.`);
  const lock = read(file);
  for (const name of ['blender/render_v3.py', 'blender/v3_film.py', 'blender/v3_ramp.py', 'v3/cues.json', 'v3/timing.json']) need(typeof lock[name] === 'string', `Lock lacks ${name}`);
  for (const [name, expected] of Object.entries(lock)) {
    need(!name.startsWith('/') && !name.split('/').includes('..') && typeof expected === 'string', `Invalid lock entry ${name}`);
    need(hash(join(ROOT, name)) === expected, `Rendered source changed: ${name}. Use matching plates/source; do not silently mix versions.`);
  }
  return lock;
}

function requiredAssets(plates, frames) {
  const assets = new Map();
  const add = (family, name) => assets.set(`${family}/${name}`, {family, name});
  const still = (id) => {need(/^[A-Z0-9_]+$/.test(id), `Invalid still id ${id}`); add('new', `stills/${id}.png`);};
  const frame = (family, prefix, f) => {need(Number.isInteger(f) && f >= 0, `Invalid source frame ${f}`); add(family, `${prefix}f${pad(f)}.png`);};
  for (const k of frames) {
    const p = plates[k]; need(p, `Missing plate record for film frame ${k}`);
    if (p.k === 'r') frame('new', 'frames/', p.f);
    else if (p.k === 's') still(p.id);
    else if (p.k === 'w') {still(p.a); still(p.b);}
    else if (p.k === 'v2') frame('v2', '', p.f);
    else if (p.k === 'p') {
      still('POSTER_BG');
      if (p.cloud > 0) still('POSTER_CLOUD');
      for (const g of p.ghosts || []) still(g.id);
      if (p.live?.still) still(p.live.still);
      else if (p.live) frame('new', 'layers/', p.live.f);
    } else need(p.k === '0' || p.k === 0 || p.k === 'b', `Unknown plate kind ${p.k}`);
  }
  return [...assets.values()];
}

function stage({assets, platesDir, v2Dir, publicDir, cues, poster, fps, v2Records}) {
  const records = [];
  for (const item of assets) {
    let src = join(item.family === 'new' ? platesDir : v2Dir, item.name);
    if (!existsSync(src) && item.family === 'new' && /^frames\/f\d{5}\.png$/.test(item.name)) {
      const k = Number(item.name.match(/f(\d+)\.png$/)[1]);
      const exactProofName = `t${(k / fps).toFixed(3).padStart(6, '0')}.png`;
      src = join(platesDir, 'frames', exactProofName); // only EXACT frame-time proofs; no nearest-frame substitution
    }
    need(existsSync(src), `Missing asset ${item.family}/${item.name}: ${src}`);
    const bytes = readFileSync(src);
    need(bytes.length > 29 && bytes.subarray(1, 4).toString() === 'PNG', `Not a PNG: ${src}`);
    const wide = item.name.startsWith('layers/') || /stills\/(GHOST_|POSTER_)/.test(item.name);
    const [w, h] = wide ? poster : [cues.width, cues.height];
    need(bytes.readUInt32BE(16) === w && bytes.readUInt32BE(20) === h, `Unexpected PNG dimensions: ${src}; expected ${w}×${h}`);
    const alpha = item.name.startsWith('layers/') || /stills\/(GHOST_|POSTER_CLOUD)/.test(item.name);
    need(!alpha || bytes[25] === 6 || bytes[25] === 4, `RGBA required for transparent layer: ${src}`);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (item.family === 'v2') need(v2Records.get(item.name) === sha256, `v2 source hash mismatch: ${src}`);
    const dest = join(publicDir, 'plates', item.family, item.name);
    mkdirSync(dirname(dest), {recursive: true});
    if (existsSync(dest)) need(hash(dest) === sha256, `Staged asset differs: ${dest}; choose a fresh output directory`);
    else {try {linkSync(src, dest);} catch (e) {if (e.code !== 'EXDEV') throw e; copyFileSync(src, dest);}}
    records.push({path: `plates/${item.family}/${item.name}`, source: src, bytes: bytes.length, sha256});
  }
  return records;
}

export async function main({stillsOnly = false} = {}) {
  const args = argsOf();
  need(typeof args.plates === 'string' && typeof args.out === 'string', 'Provide --plates=/abs/render-batch and --out=/abs/output');
  const platesDir = resolve(args.plates), out = resolve(args.out);
  const chrome = args.chrome || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  need(existsSync(chrome), 'Installed Chrome required; this script never downloads a browser');
  run('python3', [join(ROOT, 'blender/tools/retime_v3.py')]);
  const sourceLock = checkLock(resolve(args.lock || join(platesDir, 'source-lock.json')));
  run('python3', [join(ROOT, 'blender/tools/export_v3_overlay.py')]);
  const cuesFile = join(ROOT, 'v3/cues.json'), timingFile = join(ROOT, 'v3/timing.json');
  const cues = read(cuesFile), timing = read(timingFile);
  const mapping = read(join(ROOT, 'src/v3/data/plates.json')), overlay = read(join(ROOT, 'src/v3/data/overlay.json'));
  const fps = cues.fps, count = Math.round(cues.duration_s * fps), cueHash = hash(cuesFile), timingHash = hash(timingFile);
  need(timing.cues_sha256 === cueHash, 'Measured timing is stale');
  need(mapping.cues_sha256 === cueHash && overlay.cues_sha256 === cueHash && mapping.timing_sha256 === timingHash && overlay.timing_sha256 === timingHash, 'Derived plate/overlay data is stale');
  need(mapping.plates.length === count && overlay.frames.length === count, 'Incomplete derived frame data');
  let range = [0, count - 1], mode = 'full';
  if (args.range) {need(/^\d+-\d+$/.test(args.range), '--range must be inclusive a-b'); range = args.range.split('-').map(Number); mode = 'preview';}
  need(range[0] >= 0 && range[1] < count && range[1] >= range[0], 'Range outside the composition');
  const proofFrames = stillsOnly ? String(args.frames || '0,48').split(',').map(Number) : [];
  if (stillsOnly) need(proofFrames.every((n) => Number.isInteger(n) && n >= 0 && n < count), '--frames must be comma-separated exact film frame indices');
  const coverFrame = Number(args['cover-frame'] || 48);
  need(Number.isInteger(coverFrame) && coverFrame >= 0 && coverFrame < count, 'Invalid cover frame');
  const neededFrames = stillsOnly ? proofFrames : [...Array(range[1] - range[0] + 1)].map((_, i) => range[0] + i).concat(coverFrame);
  mkdirSync(out, {recursive: true});
  const runtime = join(out, '.runtime'), publicDir = join(runtime, 'public');
  mkdirSync(publicDir, {recursive: true});
  cpSync(join(ROOT, 'public'), publicDir, {recursive: true}); // fonts + existing seeded grain/static art assets
  const available = read(join(ROOT, 'v3/v2-plate-availability.json'));
  const v2Dir = resolve(args['v2-frames'] || available.source_directory);
  const v2Records = new Map(available.proposed_ranges.flatMap((r) => r.files.map((f) => [f.name, f.sha256])));
  const records = stage({assets: requiredAssets(mapping.plates, neededFrames), platesDir, v2Dir, publicDir, cues, poster: mapping.poster, fps, v2Records});
  writeFileSync(join(out, 'plate-manifest.json'), JSON.stringify({mode: stillsOnly ? 'proof' : mode, source_lock: sourceLock, range, proof_frames: proofFrames, assets: records}, null, 2) + '\n');
  writeFileSync(join(out, 'source-lock.json'), JSON.stringify(sourceLock, null, 2) + '\n');
  const inputProps = {plateRoot: 'plates'};
  writeFileSync(join(out, 'input-props.json'), JSON.stringify(inputProps) + '\n');
  let master, levels;
  if (!stillsOnly) {
    const audioDir = join(out, 'audio');
    run(process.execPath, [join(ROOT, 'scripts/v3/score.mjs')], {V3_AUDIO_OUT: audioDir});
    master = join(audioDir, 'master.wav'); need(existsSync(master), 'Score did not write master.wav');
    levels = measureAudio(master);
    need(Math.abs(levels.integrated_lufs + 14) <= 0.3 && levels.true_peak_dbtp <= -1.5, `Master level failure: ${JSON.stringify(levels)}`);
  }
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src/v3/index.ts'), publicDir, outDir: join(runtime, 'bundle'), enableCaching: false});
  const browser = await openBrowser('chrome', {browserExecutable: chrome});
  let video;
  try {
    const composition = await selectComposition({serveUrl, id: 'V3', inputProps, puppeteerInstance: browser});
    need(composition.width === cues.width && composition.height === cues.height && composition.fps === fps && composition.durationInFrames === count, 'Composition differs from cues');
    if (stillsOnly) {
      for (const frame of proofFrames) {
        const dest = join(out, `f${pad(frame)}.png`);
        await renderStill({serveUrl, composition, inputProps, frame, output: dest, puppeteerInstance: browser, overwrite: true});
        console.log(`Composited exact film frame ${frame}: ${dest}`);
      }
    } else {
      let previous = -1;
      await renderMedia({serveUrl, composition, inputProps, outputLocation: join(runtime, 'picture.mp4'), codec: 'h264', crf: 16,
        pixelFormat: 'yuv420p', colorSpace: 'bt709', imageFormat: 'png', muted: true, frameRange: range,
        concurrency: Number(args.concurrency || 3), puppeteerInstance: browser, overwrite: true,
        onProgress: (p) => {const n = Math.floor(p.progress * 20); if (n > previous) {previous = n; console.log(`Picture ${Math.round(p.progress * 100)}% (${p.renderedFrames} frames)`);}}});
      for (const [id, name, height] of [['V3Cover', 'cover-9x16.png', 1920], ['V3Cover34', 'cover-3x4.png', 1440]]) {
        const props = {frame: coverFrame, plateRoot: 'plates', height};
        const comp = await selectComposition({serveUrl, id, inputProps: props, puppeteerInstance: browser});
        await renderStill({serveUrl, composition: comp, inputProps: props, output: join(out, name), puppeteerInstance: browser, overwrite: true});
      }
      const start = range[0] / fps, duration = (range[1] - range[0] + 1) / fps;
      video = join(out, mode === 'full' ? 'roadster-v3-steeper-than-a-wall.mp4' : `preview-v3-f${range[0]}-${range[1]}.mp4`);
      run('ffmpeg', ['-v', 'error', '-y', '-i', join(runtime, 'picture.mp4'), '-ss', String(start), '-i', master, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-t', String(duration), '-movflags', '+faststart', video]);
      const captions = timing.lines.flatMap((l) => l.phrases).filter((p) => p.end_s > start && p.start_s < start + duration).map((p) => ({text: display(p.text), start: Math.max(0, p.start_s - start), end: Math.min(duration, p.end_s - start)}));
      writeFileSync(join(out, 'narration-v3.zh-CN.srt'), captions.map((p, i) => `${i + 1}\n${srtTime(p.start)} --> ${srtTime(p.end)}\n${p.text}\n`).join('\n'));
      const metadata = {film: 'Roadster v3 比墙还陡', mode, range, frames: range[1] - range[0] + 1, fps, duration_s: duration,
        resolution: [cues.width, cues.height], cues_sha256: cueHash, timing_sha256: timingHash,
        output_sha256: hash(video), master_sha256: hash(master), master_measurement: levels, source_lock: sourceLock,
        plate_manifest_sha256: hash(join(out, 'plate-manifest.json')), sources: cues.sources,
        credits: 'Opus 5.5: creative direction, script, scene/graphics/type and score. Codex: tools, rendering, narration synthesis, fonts, technical packaging and QA.',
        status: mode === 'full' ? 'Awaiting encoded-output verification and audiovisual review' : 'Preview only; not the final film', created_at: new Date().toISOString()};
      writeFileSync(join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
      if (mode === 'full') {
        const check = verifyV3({video, out, expectFrames: count, fps, width: cues.width, height: cues.height});
        metadata.status = check.pass ? 'Encoded-output technical checks passed; sampled visual, subjective listening and physical-phone review are separate checks' : 'Technical verification failed; see verification.json';
        writeFileSync(join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n'); need(check.pass, 'Encoded-output verification failed');
      }
      console.log(video);
    }
  } finally {await browser.close({silent: true});}
  if (stillsOnly) writeFileSync(join(out, 'proof-metadata.json'), JSON.stringify({mode: 'proof', frames: proofFrames, cues_sha256: cueHash, timing_sha256: timingHash, source_lock: sourceLock, note: 'Exact composited samples; visual review still required.'}, null, 2) + '\n');
  return video || out;
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => {console.error(e.stack); process.exitCode = 1;});
