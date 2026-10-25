// contact.mjs: contact sheet from a finished video (what viewers get, after encoding), with a time label per tile.
//   node scripts/contact.mjs --video=out/hook-v1.mp4 --range=0:3:0.25 [--cols=5] [--w=360] [--out=out/hook-contact.jpg]
import {spawnSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v]; }));
const video = resolve(ROOT, args.video), out = resolve(ROOT, args.out || 'out/hook-contact.jpg');
const [a, b, st] = (args.range || '0:3:0.25').split(':').map(Number), cols = +(args.cols || 5), w = +(args.w || 360);
const times = []; for (let t = a; t <= b + 1e-9; t += st) times.push(+t.toFixed(3));
const tmp = join(ROOT, 'out/.contact'); rmSync(tmp, {recursive: true, force: true}); mkdirSync(tmp, {recursive: true});
times.forEach((t, i) => {
  // frame-accurate: pick frame round(t·30) by number, then label it with its time and frame index
  const f = Math.round(t * 30);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', `select=eq(n\\,${f}),scale=${w}:-2`, '-frames:v', '1', '-q:v', '2', join(tmp, `t${String(i).padStart(3, '0')}.jpg`)], {encoding: 'utf8'});
  if (r.status) throw new Error(r.stderr);
});
// Pillow keeps QA timestamps portable when the installed FFmpeg lacks drawtext.
const script = `import sys,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
folder,times,cols,w,out,font=sys.argv[1:]
times=json.loads(times);cols=int(cols);w=int(w)
ims=[Image.open(Path(folder)/('t%03d.jpg'%i)).convert('RGB') for i in range(len(times))]
h=ims[0].height;pad=6;rows=(len(ims)+cols-1)//cols
sheet=Image.new('RGB',(cols*(w+pad)+pad,rows*(h+pad)+pad),(32,32,32))
font=ImageFont.truetype(font,round(w/13))
for i,(im,t) in enumerate(zip(ims,times)):
    draw=ImageDraw.Draw(im);frame=round(t*30);text='%.3f s  f%d'%(frame/30,frame)
    box=draw.textbbox((10,10),text,font=font)
    draw.rectangle((box[0]-4,box[1]-4,box[2]+4,box[3]+4),fill=(0,0,0))
    draw.text((10,10),text,font=font,fill=(255,235,90))
    sheet.paste(im,(pad+(i%cols)*(w+pad),pad+(i//cols)*(h+pad)))
Path(out).parent.mkdir(parents=True,exist_ok=True)
sheet.save(out,quality=95)
`;
const r = spawnSync('python3', ['-c', script, tmp, JSON.stringify(times), String(cols), String(w), out, join(ROOT, 'support/fonts/RoadsterFilmSans-500.ttf')], {encoding: 'utf8'});
if (r.status) throw new Error(r.stderr);
rmSync(tmp, {recursive: true, force: true});
console.log(`${out}  ${times.length} frames`);
