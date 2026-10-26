// Deterministic state-space illustration and the actual computer-proof outline.
import { W, H, seg, clamp, lerp, easeOut, expoOut, easeInOut, easeIn, hex, rgba, rng } from '../lib/core.js';
import { camera, drawCube, shadow } from '../lib/draw3d.js';
import { solved } from '../lib/cube.js';
import { backdrop, vignette, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber, MONO, INK } from '../lib/text.js';
import { chip, check, odometer } from '../lib/ui.js';
import { S } from '../seqs.js';
import { heroBack } from '../hero.js';
import { CUE, KICK as KICKS, RULE } from '../timeline.js';
import { drawSearch, drawJoin, SEARCH_LAYOUT } from './search-rings.js';

const VIO = '#9b7bff', ORANGE = '#ff8a3a', CYAN = '#36d6ff', GREEN = '#2ee58a';
const KICK = KICKS.twenty;
let TILES = [];
const HOME = solved();
const MISS = new Set([147, 286, 429, 611, 774, 936]);
export function init() {
  const r = rng(2010);
  TILES = [];
  for (let row = 0; row < 30; row++) for (let col = 0; col < 36; col++)
    TILES.push({ row, col, id: row*36+col, cover: r(), radius: Math.hypot(col-17.5,row-14.5) });
}
export function draw(ctx, t) {
  const C = CUE;
  backdrop(ctx, { color: t < C.proof ? VIO : t < C.superflip ? GREEN : VIO, k: 0.14, ly: 980 });
  heroBack(ctx, t); // r6: rays behind the hero numbers
  if (t < C.shells) rule(ctx,t);
  else if (t < C.searchJoin) drawSearch(ctx,t);
  else if (t < C.challenge) drawJoin(ctx,t);
  else if (t < C.proof) challenge(ctx,t);
  else if (t < C.superflip) proof(ctx,t);
  else if (t < C.slam) lowerBound(ctx,t);
  else slam(ctx,t);
  const texts = [
    [C.twenty,C.shells,['最难的状态，','最少要 **几步**？'],VIO],
    [C.shells,C.searchBoth,['先从还原态出发，','找出 **10 步内**所有状态'],CYAN],
    [C.searchBoth,C.searchMeet,['再从当前打乱出发，','也找 **10 步内**所有状态'],VIO],
    [C.searchMeet,C.searchJoin,['如果找到 **同一个状态**，','两段路线就能接上'],GREEN],
    [C.searchJoin,C.challenge,['经交点，反向走回还原态：','全程 **不超过 20 步**'],CYAN],
    [C.challenge,C.proof,['每一种合法打乱，','都 **一定能接上**吗？'],ORANGE],
    [C.proof,C.cover,['2010 年：按数学结构，','分成 **约 22 亿组**'],GREEN],
    [C.cover,C.sweep,['借对称与覆盖，','缩减到 **约 5588 万组**'],GREEN],
    [C.sweep,C.recheck,['电脑批量搜解，','逐组核验 **≤20 步**'],GREEN],
    [C.recheck,C.superflip,['没有覆盖的状态，','再 **逐一补查**'],ORANGE],
    [C.superflip,C.slam,['1995 年：**超级翻转**','已证明至少需要 **20 步**'],CYAN],
    [C.slam,C.human,['上限与下限合拢：','上帝之数 **20**'],VIO],
  ];
  for (const [a,b,lines,accent] of texts) headline(ctx,t,{t0:a,t1:b,kicker:KICK,lines,accent,size:76,stagger:0.012});
  if (t>=C.shells && t<C.proof) footnote(ctx,t,{t0:C.shells,t1:C.proof,text:'搜索集合为示意；高亮路线采用真实魔方状态',y:1585,size:28});
  if (t>=C.proof && t<C.superflip) footnote(ctx,t,{t0:C.proof,t1:C.superflip,text:'分组核验示意 · 依据 cube20.org 与原作者求解器说明',y:1620,size:25});
  if (t>=C.slam) footnote(ctx,t,{t0:C.slam,t1:C.human,text:'计步：单面 90° 或 180° 均为 1 步',y:1452,size:28});
  vignette(ctx,0.52);
}

function challenge(ctx,t) {
  const C=CUE,k=easeInOut(seg(t,C.challenge,C.proof));
  const settle=easeInOut(seg(t,C.challenge,C.challenge+0.8));
  const [sx,sy]=SEARCH_LAYOUT.finalCubePosition;
  const cam=camera({yaw:0.62+k*0.18,pitch:0.42,dist:lerp(42/SEARCH_LAYOUT.cubeScale,350,k),cx:lerp(sx,540,settle),cy:lerp(sy,990,settle)});
  drawCube(ctx,cam,{state:HOME,rim:0.3,alpha:1-k*0.2});
  for(let r=0;r<16;r++)for(let c=0;c<20;c++){
    const dist=Math.hypot(c-9.5,r-7.5),a=seg(k,dist*0.035,dist*0.035+0.25)*0.65;
    const x=100+c*46,y=590+r*45;
    ctx.fillStyle=rgba(VIO,a);ctx.fillRect(x,y,6,6);
  }
  label(ctx,'一个相交的例子，仍不足以证明所有状态',540,1480,{size:36,weight:700,align:'center',alpha:easeOut(seg(t,C.challenge+0.2,C.challenge+0.6))});
}
function proof(ctx,t) {
  const C=CUE,foldX=easeInOut(seg(t,C.cover,C.cover+1.2)),foldY=easeInOut(seg(t,C.cover+1.3,C.cover+2.5));
  const cover=seg(t,C.cover+2.3,C.sweep),regrow=easeInOut(seg(t,C.sweep,C.sweep+0.5));
  const sweep=seg(t,C.sweep+0.3,C.recheck-0.4),patch=seg(t,C.recheck+0.2,C.superflip-1);
  const size=24,gap=4,x0=38,y0=560;
  for(const tl of TILES){
    const appear=easeOut(seg(t,C.proof+tl.radius*0.02,C.proof+tl.radius*0.02+0.4));if(appear<=0)continue;
    const fx=foldX*(1-regrow),fy=foldY*(1-regrow);
    let x=x0+tl.col*28+12,y=y0+tl.row*28+12,sx=1,sy=1,a=appear;
    if(tl.col>=18){const cs=Math.cos(Math.PI*fx);x=540+(x-540)*cs;sx=Math.abs(cs);if(fx>0.999)a=0;}
    if(tl.row>=15){const cs=Math.cos(Math.PI*fy);y=980+(y-980)*cs;sy=Math.abs(cs);if(fy>0.999)a=0;}
    if(tl.cover<0.62 && cover>tl.cover/0.62*0.9 && regrow<1)a*=0.15;
    let color=VIO;
    const patched=MISS.has(tl.id)&&patch>([...MISS].indexOf(tl.id)+0.5)/MISS.size;
    const fk=clamp((sweep-tl.id/1080)/0.06); // r6: each tile flips as the sweep reaches it
    if(fk>0&&fk<1&&!MISS.has(tl.id)){sy*=Math.max(0.06,Math.abs(Math.cos(Math.PI*fk)));}
    const marked=fk>=0.5 && (!MISS.has(tl.id)||patched);
    if(marked)color=GREEN;
    else if(MISS.has(tl.id)&&sweep>=1)color=ORANGE;
    ctx.fillStyle=rgba(color,a*(marked?0.95:0.52));ctx.fillRect(x-size*sx/2,y-size*sy/2,Math.max(1,size*sx),Math.max(1,size*sy));
    if(MISS.has(tl.id)&&sweep>=1&&!patched){ctx.strokeStyle=rgba(ORANGE,0.85);ctx.lineWidth=2;ctx.strokeRect(x-17,y-17,34,34);}
  }
  if(t>=C.sweep && t<C.recheck){const y=560+840*sweep;const g=ctx.createLinearGradient(0,y-40,0,y+10);g.addColorStop(0,rgba(GREEN,0));g.addColorStop(1,rgba(GREEN,0.28));ctx.fillStyle=g;ctx.fillRect(38,y-40,1004,50);}
  const val=t<C.cover+0.6?'2,217,093,120':'55,882,296';
  odometer(ctx,val,t<C.cover+0.6?1:seg(t,C.cover+0.6,C.cover+1.8),540,1510,{size:110,color:t<C.cover?INK:GREEN,alpha:1,spins:1,spread:0.35,seed:7});
  label(ctx,'组 · 每组约 195 亿个状态',540,1565,{size:30,align:'center',alpha:0.75});
  const notes=t<C.cover?'按数学结构分组':t<C.sweep?'对称折叠 · 覆盖消重':t<C.recheck?'批量搜索可行解':'遗漏补查 · 确认完整覆盖';
  label(ctx,notes,540,510,{size:32,color:t<C.recheck?GREEN:ORANGE,weight:700,align:'center'});
  if(patch>=1){check(ctx,540,980,120,'#ffffff',seg(t,C.superflip-1,C.superflip-0.7),16);}
}
function lowerBound(ctx,t) {
  const C=CUE,k=easeOut(seg(t,C.superflip,C.superflip+0.4)),out=easeIn(seg(t,C.slam-0.5,C.slam));
  const cam=camera({yaw:0.62+(t-C.superflip)*0.14,pitch:0.46,dist:28,cy:930});
  const q=S.superflip.at(t);shadow(ctx,cam,[0,0,0],1,0.6*k);
  drawCube(ctx,cam,{...q,rim:0.5,alpha:k*(1-out),look:(c)=>c.type==='edge'&&q.done===0?{glow:0.4,glowColor:hex(CYAN)}:null});
  bigNumber(ctx,q.done+' / 20',540,1400,{size:120,color:CYAN,alpha:k*(1-out)});
  label(ctx,'20 步解演示 · 下限另有严格证明',540,1480,{size:32,align:'center',alpha:k*(1-out)*0.8});
  if(q.done===0 && !q.turn)label(ctx,'初态：12 棱翻面，8 角归位',540,1540,{size:32,color:CYAN,align:'center',alpha:k*(1-out)*0.8});
  if(out>0)bars(ctx,out);
}

function rule(ctx, t) {
  const C = CUE;
  const cam = camera({ yaw: 0.5, pitch: 0.42, dist: 36, cy: 960 });
  const k = easeOut(seg(t, C.twenty, C.twenty + 0.5));
  for (const [seq, x, txt, tAt] of [[S.rule90, -2.3, '转 90°', C.twenty + 1.45 * RULE], [S.rule180, 2.3, '转 180°', C.twenty + 2.3 * RULE]]) {
    const pos = [x, 0, -x * 0.5];
    shadow(ctx, cam, pos, 0.82, 0.6 * k);
    drawCube(ctx, cam, { ...seq.at(t), pos, scale: 0.82, alpha: k, look: (c) => (c.pos[0] === 1 ? { glow: 0.35, glowColor: hex(VIO) } : null) });
    const p = cam.project([x, -2.3, -x * 0.5]);
    label(ctx, txt, p[0], p[1] + 60, { size: 54, weight: 900, align: 'center', alpha: k });
    const ck = easeOut(seg(t, tAt, tAt + 0.3));
    chip(ctx, '= 1 步', p[0], p[1] + 140, { size: 44, color: '#fff', bg: rgba(VIO, 0.85 * ck), align: 'center', alpha: ck, weight: 900 });
  }
  footnote(ctx, t, { t0: C.twenty + 0.3, t1: C.shells, text: '计步规则：拧一个面，不管 90° 还是 180°，都算 1 步' });
}


function bars(ctx, k, impact = 0) {
  const gap = lerp(560, 0, easeIn(k));
  const mid = 960;
  const shake = impact > 0 ? Math.sin(impact * 80) * 18 * Math.exp(-impact * 6) : 0;
  ctx.save(); ctx.translate(shake, 0);
  // upper bound bar (from the top)
  const g1 = ctx.createLinearGradient(0, mid - gap / 2 - 300, 0, mid - gap / 2);
  g1.addColorStop(0, rgba(ORANGE, 0)); g1.addColorStop(1, rgba(ORANGE, 0.95));
  ctx.fillStyle = g1; ctx.fillRect(60, mid - gap / 2 - 300, 960, 300);
  label(ctx, '上限 ≤ 20（2010）', 90, mid - gap / 2 - 26, { size: 40, weight: 900, color: '#1a0d00' });
  const g2 = ctx.createLinearGradient(0, mid + gap / 2, 0, mid + gap / 2 + 300);
  g2.addColorStop(0, rgba(CYAN, 0.95)); g2.addColorStop(1, rgba(CYAN, 0));
  ctx.fillStyle = g2; ctx.fillRect(60, mid + gap / 2, 960, 300);
  label(ctx, '下限 ≥ 20（1995）', 90, mid + gap / 2 + 56, { size: 40, weight: 900, color: '#001a22' });
  ctx.restore();
}

function slam(ctx, t) {
  const C = CUE;
  const i = t - C.slam;
  const open = easeInOut(seg(t, C.slam + 0.25, C.slam + 0.9));
  if (open < 1) { ctx.save(); ctx.globalAlpha = 1 - open; bars(ctx, 1, i); ctx.restore(); }
  const k = seg(t, C.slam, C.slam + 0.35);
  const sc = lerp(1.9, 1, expoOut(k)) + 0.04 * Math.exp(-i * 4) * Math.sin(i * 40);
  const handoff = easeInOut(seg(t, C.human - 0.6, C.human));
  ctx.save(); ctx.translate(540, lerp(1060,1050,handoff)); ctx.scale(sc, sc);
  bigNumber(ctx, '20', 0, 0, { size: lerp(720,600,handoff), color: '#ffffff', glow: lerp(80 * Math.exp(-i * 2) + 20,30,handoff), glowColor: VIO, alpha: clamp(k * 4), split: 30 * Math.exp(-Math.max(0, i) * 6) });
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,'+(0.55*handoff)+')'; ctx.fillRect(160,lerp(855,845,handoff),760,6);
  label(ctx, '任何合法状态，都有不超过 20 步的解', 540, 1260, { size: 42, weight: 900, align: 'center', alpha: easeOut(seg(t, C.slam + 0.8, C.slam + 1.2)) * (1 - seg(t, C.human - 0.3, C.human)) });
  label(ctx, 'Rokicki · Kociemba · Davidson · Dethridge (2010)', 540, 1330, { size: 28, weight: 500, family: MONO, align: 'center', alpha: easeOut(seg(t, C.slam + 1.2, C.slam + 1.6)) * 0.6 * (1 - seg(t, C.human - 0.3, C.human)) });
  flash(ctx, Math.exp(-Math.max(0, i) * 9) * 0.7, '#e9e1ff');
}

