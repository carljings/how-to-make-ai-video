// Codex integration QA. Media measurements and actual caption DOM geometry; no aesthetic/listening claims.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {dirname, extname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {openBrowser} from '@remotion/renderer';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const command = (bin, args) => {
  const p = spawnSync(bin, args, {encoding: 'utf8', maxBuffer: 16 << 20});
  if (p.status !== 0) throw new Error(`${bin} failed (${p.status}): ${p.stderr || p.error}`);
  return p;
};
export const measureAudio = (file) => {
  const {stderr} = command('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']);
  const last = stderr.slice(stderr.lastIndexOf('Summary:'));
  return {integrated_lufs: Number(last.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]), true_peak_dbtp: Number(last.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1])};
};
const check = (ok, message) => { if (!ok) throw new Error(message); };

// Imports the production Captions component, rather than copying its layout into a test implementation.
// A local browser measures every actual phrase with the bundled fonts, including natural line wrapping.
export async function auditCaptions(out, chrome = CHROME) {
  const qa = join(out, '.caption-audit');
  mkdirSync(qa, {recursive: true});
  const captions = json(join(ROOT, 'support/narration/caption-cues.json'));
  const entry = join(qa, 'entry.tsx');
  writeFileSync(entry, `import React from ${JSON.stringify(join(ROOT, 'node_modules/react/index.js'))};
import {createRoot} from ${JSON.stringify(join(ROOT, 'node_modules/react-dom/client.js'))};
import {flushSync} from ${JSON.stringify(join(ROOT, 'node_modules/react-dom/index.js'))};
import {Captions} from ${JSON.stringify(join(ROOT, 'src/film/Type.tsx'))};
import {fontsReady} from ${JSON.stringify(join(ROOT, 'src/lib/fonts.ts'))};
const cues=${JSON.stringify(captions.cues)};
fontsReady.then(async()=>{
  flushSync(()=>createRoot(document.getElementById('root')).render(<>{cues.map(c=><section key={c.id} data-id={c.id} style={{position:'relative',width:1080,height:1920}}><Captions t={(c.start_s+c.end_s)/2}/></section>)}</>));
  await document.fonts.ready;
  window.captionAudit=[...document.querySelectorAll('section')].map(s=>{
    const el=s.firstElementChild?.firstElementChild;
    if(!el)return {id:Number(s.dataset.id),missing:true};
    const origin=s.getBoundingClientRect(), box=el.getBoundingClientRect(), r=document.createRange();r.selectNodeContents(el);
    const rects=[...r.getClientRects()].map(b=>({left:b.left-origin.left,top:b.top-origin.top,right:b.right-origin.left,bottom:b.bottom-origin.top}));
    return {id:Number(s.dataset.id),text:el.textContent,font:getComputedStyle(el).fontFamily,fontLoaded:document.fonts.check('700 54px "Roadster Film Sans"',el.textContent),box:{left:box.left-origin.left,top:box.top-origin.top,right:box.right-origin.left,bottom:box.bottom-origin.top},textRects:rects};
  });
}).catch(e=>window.auditError=String(e));`);
  await build({entryPoints: [entry], outfile: join(qa, 'audit.js'), bundle: true, platform: 'browser', jsx: 'automatic', absWorkingDir: ROOT, nodePaths: [join(ROOT, 'node_modules')], logLevel: 'silent'});
  writeFileSync(join(qa, 'index.html'), '<!doctype html><meta charset="utf-8"><style>body{margin:0}</style><div id="root"></div><script src="/audit.js"></script>');
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/favicon.ico') {res.writeHead(204).end(); return;}
    const base = pathname.startsWith('/fonts/') ? join(ROOT, 'public') : qa;
    const file = resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(base + sep) || !existsSync(file) || !statSync(file).isFile()) {res.writeHead(404).end(); return;}
    res.setHeader('Content-Type', ({'.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2'})[extname(file)] || 'application/octet-stream');
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await openBrowser('chrome', {browserExecutable: chrome});
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: 1080, height: 1920, deviceScaleFactor: 1});
    await page.goto({url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000});
    const rows = await page.evaluate(async () => {
      const end = Date.now() + 20000;
      while (!window.captionAudit && !window.auditError && Date.now() < end) await new Promise(r => setTimeout(r, 50));
      if (window.auditError) throw Error(window.auditError);
      if (!window.captionAudit) throw Error('Caption audit timed out');
      return window.captionAudit;
    });
    const failures = [];
    for (let i = 0; i < captions.cues.length; i++) {
      const c = captions.cues[i], r = rows[i];
      if (!r || r.missing || r.text !== c.display_text) failures.push(`caption ${c.id}: text differs or is missing`);
      if (!r?.fontLoaded || !r?.font?.includes('Roadster Film Sans')) failures.push(`caption ${c.id}: bundled font unavailable`);
      for (const b of r?.textRects ?? []) if (b.left < 60 || b.right > 980 || b.top < 1180 || b.bottom > 1500) failures.push(`caption ${c.id}: text outside caption safe box`);
    }
    const report = {scope: 'Actual production Captions component, all phrases, real Chromium DOM and bundled fonts; not phone review or pixel OCR of the MP4.', safe_box_px: [60, 1180, 980, 1500], rows, failures};
    writeFileSync(join(out, 'caption-layout.json'), JSON.stringify(report, null, 2) + '\n');
    check(!failures.length, failures.join('\n'));
    return {checked: rows.length, report: 'caption-layout.json', failures};
  } finally {
    if (browser) await browser.close({silent: true});
    await new Promise(r => server.close(r));
  }
}

export async function verifyFilm({video, metadata, out, chrome = CHROME, captionAudit}) {
  mkdirSync(out, {recursive: true});
  const report = {video, technical_pass: false, limitations: ['No subjective listening or phone aesthetic acceptance is claimed.', 'Caption layout is checked from the actual component DOM; visual composition and source motion still require review.']};
  try {
    const m = json(metadata), cues = json(join(ROOT, 'blender/data/film_cues.json'));
    const c = json(join(ROOT, 'support/narration/caption-cues.json'));
    check(m.mode === 'full', 'Partial proofs cannot pass final-film verification');
    check(m.composition === 'Film' && m.inputProps?.plates?.kind === 'frames' && m.inputProps.captions === true, 'Real frame plates and captions must be explicitly selected; TEST CARD is forbidden');
    check(m.output_sha256 === sha256(video), 'Output hash differs from finalizer metadata');
    const manifestFile = join(out, 'plate-manifest.json'), plates = json(manifestFile);
    check(sha256(manifestFile) === m.plate_manifest_sha256 && plates.mode === 'full' && plates.frames.length === 2250 && plates.frames.every((p, i) => p.frame === i && /^[a-f0-9]{64}$/.test(p.sha256)), 'Real-plate manifest is incomplete or changed');
    const p = jsonText(command('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', video]).stdout);
    const v = p.streams.filter(s => s.codec_type === 'video'), a = p.streams.filter(s => s.codec_type === 'audio');
    check(v.length === 1 && a.length === 1, 'Exactly one video and one audio stream required');
    check(v[0].codec_name === 'h264' && v[0].pix_fmt === 'yuv420p', 'H.264 yuv420p required');
    check(v[0].width === 1080 && v[0].height === 1920, 'Native 1080×1920 required');
    check(v[0].avg_frame_rate === '30/1' && Number(v[0].nb_read_frames) === 2250, 'Exactly 2250 frames at 30 fps required');
    check(Math.abs(Number(v[0].duration) - 75) < 1 / 30 && Math.abs(Number(p.format.duration) - 75) < 0.08, 'Duration must be 75 seconds');
    check(Number(a[0].sample_rate) === 48000 && a[0].channels === 2 && Number(p.format.size) > 0, 'Stereo 48 kHz audio and nonempty file required');
    check(Math.abs(Number(a[0].duration) - 75) < 0.08, 'Soundtrack must span the whole 75-second film');
    command('ffmpeg', ['-v', 'error', '-xerror', '-i', video, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-']);
    report.media = {width: v[0].width, height: v[0].height, fps: v[0].avg_frame_rate, frames: Number(v[0].nb_read_frames), duration_s: Number(p.format.duration), bytes: Number(p.format.size), codec: v[0].codec_name, audio_codec: a[0].codec_name, full_decode: 'passed'};
    report.audio = measureAudio(video);
    check(Number.isFinite(report.audio.integrated_lufs) && Math.abs(report.audio.integrated_lufs + 14) <= 0.3, 'Encoded soundtrack must measure −14 LUFS ±0.3 LU');
    check(Number.isFinite(report.audio.true_peak_dbtp) && report.audio.true_peak_dbtp <= -1.5, 'Encoded soundtrack true peak exceeds −1.5 dBTP');
    let previous = 0;
    for (const q of c.cues) {
      check(q.start_s >= previous && q.end_s > q.start_s && q.end_s <= 75, `Caption ${q.id}: invalid timing/overlap`);
      previous = q.end_s;
    }
    const canonical = cues.lines.flatMap(l => l.phrases.map(p => ({line_id: l.id, ...p})));
    check(canonical.length === c.cues.length && canonical.every((p, i) => p.text === c.cues[i].text && p.start_s === c.cues[i].start_s && p.end_s === c.cues[i].end_s && p.line_id === c.cues[i].line_id), 'Caption content/times differ from canonical film cues');
    const srt = readFileSync(join(out, 'narration.zh-CN.srt'), 'utf8').trim().replace(/\r/g, '').split(/\n\n+/);
    const parseTime = s => {const [h, m, sec] = s.replace(',', '.').split(':').map(Number); return h * 3600 + m * 60 + sec;};
    check(srt.length === c.cues.length && srt.every((block, i) => {
      const lines = block.split('\n'), times = lines[1]?.split(' --> ');
      return times?.length === 2 && Math.abs(parseTime(times[0]) - c.cues[i].start_s) < 0.0011 && Math.abs(parseTime(times[1]) - c.cues[i].end_s) < 0.0011 && lines.slice(2).join('\n') === c.cues[i].display_text;
    }), 'Delivery SRT text or timing differs from actual captions');
    for (const [name, height] of [['cover-9x16.png', 1920], ['cover-3x4.png', 1440]]) {
      const png = readFileSync(join(out, name));
      check(png.subarray(1, 4).toString() === 'PNG' && png.readUInt32BE(16) === 1080 && png.readUInt32BE(20) === height, `${name}: incorrect PNG dimensions`);
    }
    report.captions = captionAudit ?? await auditCaptions(out, chrome);
    report.technical_pass = true;
  } catch (e) {report.failure = e.message;}
  writeFileSync(join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  check(report.technical_pass, report.failure);
  return report;
}
const jsonText = (text) => JSON.parse(text);

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).map(a => {const i = a.indexOf('='); return [a.slice(2, i < 0 ? undefined : i), i < 0 ? true : a.slice(i + 1)];}));
  const out = resolve(args.out || 'out/delivery');
  try {
    if (args['captions-only']) console.log(JSON.stringify(await auditCaptions(out, args.chrome || CHROME)));
    else console.log(JSON.stringify(await verifyFilm({video: resolve(args.video || join(out, 'roadster-flight-explainer.mp4')), metadata: resolve(args.metadata || join(out, 'metadata.json')), out, chrome: args.chrome || CHROME})));
  } catch (e) {console.error(e.stack); process.exitCode = 1;}
}
