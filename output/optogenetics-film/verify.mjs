import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import puppeteer from 'puppeteer-core';
import {ACTS,CAPTIONS,W,H,DUR} from './src/timeline.js';
const port=8137,server=spawn(process.execPath,['render.mjs','--serve','--port='+port],{stdio:'ignore'});
const hash=s=>createHash('sha256').update(s).digest('hex');
const errors=[],report={dimensions:[W,H],duration:DUR,timeline:true,deterministic:true,textBounds:true,frames:[]};
let browser;
try{
  for(let i=0;i<60;i++){try{const r=await fetch('http://localhost:'+port);if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--force-device-scale-factor=1'],protocolTimeout:0});
  const page=await browser.newPage();await page.setViewport({width:W,height:H});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:'+port+'/index.html?render');await page.waitForFunction('window.READY===true');
  if(ACTS[0].a!==0||ACTS.at(-1).b!==DUR||ACTS.some((s,i)=>i&&ACTS[i-1].b!==s.a))throw new Error('Timeline gap');
  if(CAPTIONS[0][0]!==0||CAPTIONS.at(-1)[1]!==DUR||CAPTIONS.some((s,i)=>i&&CAPTIONS[i-1][1]!==s[0]))throw new Error('Caption gap');
  for(const s of ACTS){
    const t=Math.min(s.b-.5,s.a+1.4),a=await page.evaluate(t=>window.frame(t),t);
    await page.evaluate(t=>window.frame(t),Math.max(0,t-.8));const b=await page.evaluate(t=>window.frame(t),t);
    if(hash(a)!==hash(b))throw new Error('Frame state leak at '+t);
    const boxes=await page.evaluate(t=>window.inspect(t),t),bad=boxes.filter(x=>x.x<25||x.x+x.w>W-25||x.y<0||x.y+x.h>H);
    if(bad.length)throw new Error('Text exceeds canvas: '+JSON.stringify(bad));
    report.frames.push({scene:s.id,t,hash:hash(a),textCount:boxes.length});
  }
  const a=await page.evaluate(()=>window.frame(1.1)),b=await page.evaluate(()=>window.frame(2.4));if(hash(a)===hash(b))throw new Error('Animation does not change');
  if(errors.length)throw new Error(errors.join('\n'));
  writeFileSync('out/verification.json',JSON.stringify(report,null,2));console.log('PASS: timeline, captions, all ten scenes, deterministic frames, text bounds and animated changes');
}finally{if(browser)await browser.close();server.kill();}
