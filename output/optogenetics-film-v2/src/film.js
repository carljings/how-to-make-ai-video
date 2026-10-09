import { W,H,DUR,at,CAPTIONS } from './timeline.js';
import { Gfx } from './cinema.js';
import { drawScene } from './scenes.js';
import { LIFT } from './world.js';
import { clamp,seg } from './lib.js';
let gfx,boxes=[];
const SANS='"Noto Film",sans-serif',SERIF='"Noto Cinema","Noto Film",serif';
export function init(canvas){gfx=new Gfx(canvas);}
function type(value,x,y,size=44,color='#e4ecf2',a=1,align='left',font=SANS,weight=400){
  if(a<.01)return;const c=gfx.normal();c.globalAlpha=a;c.font=`${weight} ${size}px ${font}`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;
  const m=c.measureText(value),left=align==='center'?x-m.width/2:align==='right'?x-m.width:x;
  boxes.push({text:value,x:left,y:y-size*.65,w:m.width,h:size*1.3,size});c.fillText(value,x,y);c.globalAlpha=1;
}
function wrap(value,width,size=51){const c=gfx.ctx;c.font=`600 ${size}px ${SANS}`;let line='',rows=[];
  for(const ch of value){if(c.measureText(line+ch).width>width&&line){rows.push(line);line=ch;}else line+=ch;}if(line)rows.push(line);
  if(rows.length>1&&rows.at(-1).length<5){const tail=rows.pop(),last=rows.pop();rows.push(last.slice(0,-5),last.slice(-5)+tail);}return rows;
}
const headings={target:['先选中一组细胞'],algae:['开关，藏在微生物里'],membrane:['走进细胞膜'],rhythm:['让光，成为节拍'],inhibit:['也可以让活动安静'],research:['从相关，走向因果'],vision:['从实验，到早期临床']};
export function renderAt(t){
  t=clamp(t,0,DUR-1/30);boxes=[];gfx.begin([3,6,13]);const s=at(t);
  const labels=drawScene(gfx,t,s);gfx.bloom(.65);gfx.vignette(.67);
  const transition=Math.min(seg(t,s.a,s.a+.24),1-seg(t,s.b-.20,s.b));
  if(s.a>0)gfx.fade(.3+.7*transition);
  if(s.id==='hook'){
    type('给神经元',85,270,92,'#f2efeb',1,'left',SERIF,600);
    type('装一个光开关',85,390,92,'#f2efeb',1,'left',SERIF,600);
    type('一束光，怎样影响放电？',85,510,36,'#9db7ca');
  }else if(headings[s.id]){
    const a=Math.min(seg(t,s.a+.08,s.a+.4),1-seg(t,s.a+3.4,s.a+4.5));
    type(headings[s.id][0],85,337,65,'#ecebe5',a,'left',SERIF,600);
  }else if(s.id==='nobel'){
    const a=seg(t,66.25,67),ctx=gfx.normal();
    // Dim the cells drifting behind the title and the prize line so the text reads cleanly.
    for(const [y,rx,ry] of [[735,470,190],[1273,420,100]]){
      ctx.save();ctx.translate(510,y);ctx.scale(rx,ry);const sg=ctx.createRadialGradient(0,0,0,0,0,1);
      sg.addColorStop(0,`rgba(2,5,11,${.8*a})`);sg.addColorStop(.6,`rgba(2,5,11,${.62*a})`);sg.addColorStop(1,'rgba(2,5,11,0)');ctx.fillStyle=sg;ctx.fillRect(-1,-1,2,2);ctx.restore();
    }
    type('光遗传学',510,696,116,'#f4efe4',a,'center',SERIF,600);
    type('OPTOGENETICS',510,795,29,'#b6c6d2',a,'center','Inter',400);
    type('2026 诺贝尔生理学或医学奖',510,1240,36,'#e6be88',a,'center');
    type('Deisseroth · Hegemann · Nagel',510,1306,28,'#aebecb',a,'center','Inter');
  }else if(s.id==='ending'){
    type('一束光',85,300,83,'#ecebe5',1,'left',SERIF,600);type('照见回路中的因果',85,410,73,'#ecebe5',1,'left',SERIF,600);
  }
  for(const v of labels)type(v.value,v.x,v.y,v.size,v.color,v.a*transition,v.align,SANS,v.weight);
  const c=gfx.normal(),gr=c.createLinearGradient(0,1460-LIFT,0,1740-LIFT);gr.addColorStop(0,'rgba(2,5,11,0)');gr.addColorStop(.38,'rgba(2,5,11,.82)');gr.addColorStop(1,'rgba(2,5,11,.92)');c.fillStyle=gr;c.fillRect(0,1460-LIFT,W,H);
  const cue=CAPTIONS.find(([a,b])=>t>=a&&t<b),caption=cue?.[2]||'',rows=cue?.[3]||wrap(caption,835);
  rows.forEach((v,i)=>type(v,510,1550-LIFT+i*74,51,'#eff4f7',1,'center',SANS,600));
  type('光遗传学 · 原理示意',85,1720-LIFT,25,'#8095a7');
  if(t>74.65)gfx.fade(1-seg(t,74.65,75)*.75);
  return boxes;
}
