// stills.mjs (v2): composite proof plates with the vector overlay, type and post of THEIR film frame.
//   node scripts/v2/stills.mjs --dir=/abs/v2-proof-01/frames --out=/abs/v2-proof-01/composited [--chrome=...] [--cols=5]
// Input names: tSS.SSS.png (render_v2.py --proof/--times) or fNNNNN.png. Output: one PNG per input plus sheet.jpg.
import {spawnSync} from 'node:child_process';
import {copyFileSync, cpSync, existsSync, mkdirSync, readdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {const i = a.indexOf('='); return [a.slice(2, i < 0 ? undefined : i), i < 0 ? true : a.slice(i + 1)];}));
const need = (ok, text) => {if (!ok) throw Error(text);};

async function main() {
  need(typeof args.dir === 'string' && typeof args.out === 'string', 'Usage: node scripts/v2/stills.mjs --dir=/abs/frames --out=/abs/out');
  const dir = resolve(args.dir), out = resolve(args.out);
  const chrome = args.chrome || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  need(existsSync(chrome), 'Installed Chrome is required; set --chrome');
  const files = readdirSync(dir).filter((f) => /^(t\d+\.\d+|f\d{5})\.png$/.test(f)).sort();
  need(files.length > 0, `No tSS.SSS.png / fNNNNN.png plates in ${dir}`);
  const runtime = join(out, '.runtime'), pub = join(runtime, 'public');
  mkdirSync(join(pub, 'proof'), {recursive: true});
  cpSync(join(ROOT, 'public/fonts'), join(pub, 'fonts'), {recursive: true});
  cpSync(join(ROOT, 'public/v2'), join(pub, 'v2'), {recursive: true});
  for (const f of files) copyFileSync(join(dir, f), join(pub, 'proof', f));
  spawnSync('python3', [join(ROOT, 'blender/tools/export_v2_overlay.py')], {cwd: ROOT, stdio: 'inherit', env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}});
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src/v2/index.ts'), publicDir: pub, outDir: join(runtime, 'bundle'), enableCaching: false});
  const browser = await openBrowser('chrome', {browserExecutable: chrome});
  const made = [];
  try {
    for (const f of files) {
      const frame = f.startsWith('t') ? Math.round(parseFloat(f.slice(1, -4)) * 30) : parseInt(f.slice(1, 6), 10);
      const props = {plates: {kind: 'still', src: `proof/${f}`}, frame};
      const comp = await selectComposition({serveUrl, id: 'V2Still', inputProps: props, puppeteerInstance: browser});
      const dest = join(out, f.replace('.png', '-comp.png'));
      await renderStill({serveUrl, composition: comp, inputProps: props, output: dest, puppeteerInstance: browser, overwrite: true});
      made.push([dest, `${f.replace('.png', '')}  f${frame}`]);
      console.log('composited', dest);
    }
  } finally {await browser.close({silent: true});}
  const cols = Number(args.cols || 5);
  const py = `
import sys, json
from PIL import Image, ImageDraw
items = json.loads(sys.argv[1]); cols = int(sys.argv[2]); out = sys.argv[3]
w, h = 324, 576
rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 6) + 6, rows * (h + 30) + 6), (24, 24, 24))
d = ImageDraw.Draw(sheet)
for i, (path, label) in enumerate(items):
    im = Image.open(path).convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = 6 + (i % cols) * (w + 6), 6 + (i // cols) * (h + 30)
    sheet.paste(im, (x, y)); d.text((x + 4, y + h + 6), label, fill=(255, 220, 90))
sheet.save(out, quality=92)
print(out, sheet.size)
`;
  spawnSync('python3', ['-c', py, JSON.stringify(made), String(cols), join(out, 'sheet.jpg')], {stdio: 'inherit'});
}
main().catch((e) => {console.error(e.stack); process.exitCode = 1;});
