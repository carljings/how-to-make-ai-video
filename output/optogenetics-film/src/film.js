import { W,H,DUR,at,CAPTIONS } from './timeline.js';
import { text,tag,round,rgba,FONT,WHITE,MUTED,BLUE,clearBoxes,textBoxes } from './gfx.js';
import { drawScene } from './scenes.js';
import { rng,clamp,seg } from './lib.js';
let ctx,light,lc,glow,gc;
const R=rng(141),stars=Array.from({length:110},()=>({x:R()*W,y:400+R()*1010,r:.5+R()*1.4,a:.1+R()*.17,p:R()*7}));
export function init(canvas) {
  ctx=canvas.getContext('2d');light=Object.assign(document.createElement('canvas'),{width:W,height:H});lc=light.getContext('2d');
  glow=Object.assign(document.createElement('canvas'),{width:W/4,height:H/4});gc=glow.getContext('2d');
}
function wrapped(value,width,size=54) {
  ctx.font=`500 ${size}px ${FONT}`;const rows=[];let line='';
  const clauses=value.match(/[^，。？！]+[，。？！]?/g)||[value];
  for(const clause of clauses){
    if(line&&ctx.measureText(line+clause).width>width){rows.push(line);line='';}
    for(const ch of clause){if(ctx.measureText(line+ch).width>width&&line){rows.push(line);line=ch;}else line+=ch;}
  }
  if(line)rows.push(line);
  if(rows.length>1&&rows.at(-1).length<4){const tail=rows.pop(),prev=rows.pop(),move=Math.min(6,prev.length);rows.push(prev.slice(0,-move),prev.slice(-move)+tail);}
  return rows;
}
export function renderAt(t) {
  t=clamp(t,0,DUR-1/30);clearBoxes();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  const bg=ctx.createRadialGradient(W*.55,H*.47,20,W*.55,H*.47,H*.7);bg.addColorStop(0,'#102336');bg.addColorStop(.55,'#091321');bg.addColorStop(1,'#040911');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  for(const p of stars){ctx.fillStyle=rgba(BLUE,p.a*(.75+.2*Math.sin(t*.3+p.p)));ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}
  const s=at(t),fade=Math.min(seg(t,s.a,s.a+.42),1-seg(t,s.b-.35,s.b));
  lc.setTransform(1,0,0,1,0,0);lc.globalAlpha=s.a===0?1:Math.max(.25,fade);lc.globalCompositeOperation='source-over';lc.clearRect(0,0,W,H);
  const labels=drawScene(s.id,lc,t,s);
  gc.clearRect(0,0,W/4,H/4);gc.filter='blur(6px)';gc.drawImage(light,0,0,W/4,H/4);gc.filter='none';
  ctx.globalCompositeOperation='lighter';ctx.drawImage(light,0,0);ctx.globalAlpha=.72;ctx.drawImage(glow,0,0,W,H);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  for(const v of labels){if(v.type==='tag')tag(ctx,v.value,v.x,v.y,v.color);else text(ctx,v.value,v.x,v.y,v.size,v.color,v.align,v.weight);}
  // Sharp typography and subtitles are composited after all light/glow layers.
  text(ctx,s.kicker,88,160,30,BLUE,'left',600);lineTop();
  let titleSize=s.id==='nobel'?130:84;while(s.title.some(v=>{ctx.font=`800 ${titleSize}px ${FONT}`;return ctx.measureText(v).width>904;})&&titleSize>62)titleSize-=2;
  const firstY=s.title.length===1?315:280;s.title.forEach((v,i)=>text(ctx,v,88,firstY+i*112,titleSize,WHITE,'left',800));
  text(ctx,s.note,88,496,28,MUTED,'left',400);
  const caption=CAPTIONS.find(([a,b])=>t>=a&&t<b)?.[2]||'';
  const rows=wrapped(caption,890,53),y=1530-(rows.length-1)*38;
  const panelY=y-66;round(ctx,68,panelY,944,rows.length*76+75,24,rgba('#07101c',.9),rgba('#29435a',.45),1);
  rows.forEach((v,i)=>text(ctx,v,540,y+i*76,53,WHITE,'center',500));
  text(ctx,'光遗传学 · 原理示意',88,1765,28,MUTED,'left',400);
  const index=s.id==='ending'?10:at(t).a===0?1:([5,12,21,32,41,49,57,66].filter(x=>t>=x).length+1);
  for(let i=0;i<10;i++)round(ctx,88+i*90,1830,72,4,2,i<index?rgba(BLUE,.72):rgba(MUTED,.16));
  if(t>74.4){ctx.fillStyle=rgba('#03070d',seg(t,74.4,75)*.65);ctx.fillRect(0,0,W,H);}
  return textBoxes;
}
function lineTop(){ctx.strokeStyle=rgba(BLUE,.25);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(88,205);ctx.lineTo(992,205);ctx.stroke();}
