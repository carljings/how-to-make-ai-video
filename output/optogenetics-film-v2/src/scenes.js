import { rng,TAU,seg,smooth,lerp } from './lib.js';
import { pulse,PULSES,WARM } from './timeline.js';
import { BLUE,ICE,GOLD,GREEN,camera,project,atmosphere,neuron,beam,pointCloud,sphere,volume } from './world.js';

const R=rng(202110),ions=Array.from({length:56},()=>({x:(R()-.5)*1200,y:-460-R()*340,z:(R()-.5)*340,p:R()}));
const lipids=Array.from({length:25},(_,i)=>Array.from({length:8},(_,j)=>[(i-12)*51,(j-3.5)*63])).flat();
const microbe=sphere.map(([x,y,z])=>[x*280,y*375,z*240]);
const mouse=[];
// Surface points on a schematic animal volume; this is an illustration, not a scan.
for(const [cx,cy,cz,rx,ry,rz] of [[-45,35,0,275,135,100],[210,-35,0,115,95,78],[194,-125,-35,42,53,18],[164,-126,43,44,57,18],[-180,150,-48,75,26,27],[60,148,-48,70,25,25]]){
  for(const [x,y,z] of sphere)mouse.push([cx+x*rx,cy+y*ry,cz+z*rz]);
}
for(let i=0;i<200;i++){const u=i/199;mouse.push([-288-u*285,42+Math.sin(u*4)*95,-10+u*90]);}
const field=Array.from({length:16},(_,i)=>({p:[(i%4-1.5)*620+(R()-.5)*170,(Math.floor(i/4)-1.5)*630+(R()-.5)*140,(R()-.5)*950],s:.58+R()*.28,id:i%3,target:[5,6,9].includes(i)}));
const label=(value,x,y,size=32,color='#b5c6d6',a=1,align='left',weight=400)=>({value,x,y,size,color,a,align,weight});
function network(g,t,u,hero=true){
  const c=camera(t,{d:lerp(hero?1030:1100,hero?1180:1420,smooth(u)),ry:-.2+u*.3,rx:.07+u*.11,cy:hero?990:950});
  atmosphere(g,c,t);
  if(hero){
    neuron(g,c,t,{offset:[-570,-420,380],scale:1.15,color:BLUE,activity:.09,alpha:.28,model:1,signalTimes:[]});
    neuron(g,c,t,{offset:[640,400,650],scale:1.2,color:BLUE,activity:.08,alpha:.25,model:2,signalTimes:[]});
    const n=neuron(g,c,t,{scale:2.05,activity:.25+pulse(t)*.72,channels:true});
    if(n)beam(g,-90,250,n.x,n.y,BLUE,.1+pulse(t)*.65,175);
  }else{
    for(const f of field)neuron(g,c,t,{offset:f.p,scale:f.s,color:f.target?BLUE:ICE,activity:f.target?.32+pulse(t)*.55:.09,channels:f.target,model:f.id,alpha:f.target?.9:.22,signalTimes:f.target?PULSES:[]});
  }
  return c;
}
function drawMicrobe(g,c,t,a){
  volume(g,c,[0,0,0],[280,375,240],GREEN,a*.8);
  for(const p of [[-95,70,-25],[65,140,-100],[50,-160,-30]])volume(g,c,p,[80,105,50],GREEN,a*.68);
  pointCloud(g,c,microbe,GREEN,a*.68,2.1);
  const nucleus=project([-20,-25,-195],c);if(nucleus)g.glowArc(nucleus.x,nucleus.y,35,GREEN,a*.48,2);
  for(let k=0;k<2;k++){
    const pts=[];for(let i=0;i<=55;i++){const u=i/55;pts.push(project([(k?1:-1)*(60+u*140+Math.sin(u*9-t*3)*50*u),-310-u*500,Math.sin(u*7-t*2)*50],c));}
    g.glowLine(pts.filter(Boolean).map(p=>[p.x,p.y]),GREEN,a*.65,3);
  }
  const eye=project([150,-110,-130],c);if(eye)g.glow(eye.x,eye.y,42,GOLD,a*.68);
  const p=project([0,0,0],c);if(p)g.glow(p.x,p.y,250,GREEN,a*.07,'halo');
}
function protein(g,c,t,amount=1){
  for(let h=0;h<7;h++){
    const a=h*TAU/7,pts=[];
    for(let i=0;i<=65;i++){const u=i/65,spin=u*TAU*4;
      const p=project([Math.cos(a)*125+Math.cos(spin)*18,-155+u*310,Math.sin(a)*125+Math.sin(spin)*18],c);if(p)pts.push([p.x,p.y]);}
    g.glowLine(pts,GOLD,.58*amount,6.8);
    for(let i=0;i<65;i+=5){const u=i/65,spin=u*TAU*4,p=project([Math.cos(a)*125+Math.cos(spin)*18,-155+u*310,Math.sin(a)*125+Math.sin(spin)*18],c);if(p)g.glow(p.x,p.y,4.8,GOLD,.7*amount);}
  }
}
function membrane(g,t,u){
  const c=camera(t,{d:lerp(1040,900,smooth(u)),rx:.28-u*.12,ry:-.5+u*.6,cy:1020});atmosphere(g,c,t);
  for(const [x,z] of lipids){if(Math.hypot(x,z)<165)continue;
    for(const side of [-1,1]){
      const p=project([x,side*115,z],c),tail=project([x+10,side*18,z+6],c);if(!p||!tail)continue;
      g.line(p.x,p.y,tail.x,tail.y,BLUE,.22,2.1);g.line(p.x+5,p.y,tail.x+8,tail.y,BLUE,.12,1.4);g.dof(p,8,BLUE,.56,c.d,5);
    }
  }
  protein(g,c,t,.92);
  const opening=seg(t,26.1,26.5),activity=pulse(t,PULSES,.45)*opening;
  const core=project([0,0,0],c);if(core){g.glow(core.x,core.y,110,BLUE,.09+activity*.38,'halo');beam(g,65,260,core.x,core.y,BLUE,.12+activity*.72,100);}
  for(const v of ions){
    const moving=seg(t,26.2,27.3),phase=(t*.3+v.p)%1,route=Math.sin(v.p*TAU)*55;
    const x=lerp(v.x,route,moving),y=lerp(v.y,-430+phase*850,moving),z=lerp(v.z,Math.cos(v.p*TAU)*45,moving),p=project([x,y,z],c);
    if(p){g.dof(p,5.3,ICE,.4+moving*.4,c.d,6);if(moving>.2)g.streak(p.x,p.y,Math.PI/2,18,3,BLUE,moving*.38);}
  }
  return [label('细胞膜',85,1315,34),label('ChR2 光敏通道',85,674,36,'#eabd86'),label('光改变离子流 → 影响膜电位',85,1410,36,'#a6dfff',seg(t,26.2,27.1))];
}
function trace(g,t,start,end,y,color=BLUE){
  const pts=[],span=7.0;for(let i=0;i<=250;i++){const x=100+i/250*770,s=t-span+i/250*span;
    let v=0;for(const q of PULSES){if(q<start||q>end)continue;const dt=s-q-.12;v+=Math.exp(-((dt/.047)**2))-.18*Math.exp(-(((dt-.10)/.08)**2));}
    pts.push([x,y-v*112]);}
  g.glowLine(pts,color,.76,2.6);g.line(100,y,870,y,ICE,.1,1);
}
function research(g,t,u){
  const c=camera(t,{d:1000-u*100,ry:.35-u*.42,rx:-.08,cy:1000});atmosphere(g,c,t);
  for(const [p,r] of [[[210,-35,0],[115,95,78]],[[194,-125,-35],[42,53,18]],[[164,-126,43],[44,57,18]],[[-45,35,0],[275,135,100]]])volume(g,c,p.map(v=>v*1.2),r.map(v=>v*1.2),ICE,.46);
  pointCloud(g,c,mouse.map(([x,y,z])=>[x*1.2,y*1.2,z*1.2]),ICE,.46,1.4);
  const brain=project([176,-66,0],c);if(brain){g.glow(brain.x,brain.y,52,BLUE,.38);beam(g,brain.x-50,560,brain.x,brain.y,BLUE,.34,33);g.glowArc(brain.x,brain.y,37,BLUE,.6,1.2);}
  const p=project([294,-48,-40],c);if(p)g.glow(p.x,p.y,6,GOLD,.7);
  neuron(g,c,t,{offset:[-220,-400,0],scale:.41,activity:.3+pulse(t,[50.2,52,54.3])*.5,channels:true,signalTimes:[50.2,52,54.3]});
  if(brain)g.glowLine([[brain.x,brain.y-70],[brain.x-32,760],[375,730]],BLUE,.22,1.7);
  return [label('选定回路 · 光刺激 · 观察行为',85,1400,38,'#c1dcea'),label('示意实验，不能替代对照与数据',85,1460,29)];
}
function eye(g,t,u){
  const c=camera(t,{d:1000-u*60,rx:-.12,ry:-.55+u*.32,cy:965});atmosphere(g,c,t);
  volume(g,c,[0,0,0],[330,330,330],ICE,.55);
  for(const [x,y,z] of sphere){const p=project([x*330,y*330,z*330],c);g.dof(p,1.8,ICE,z<.4?.41:.2,c.d,3);}
  const ring=[];for(let i=0;i<=100;i++){const a=i/100*TAU;const p=project([Math.cos(a)*139,Math.sin(a)*139,-320],c);if(p)ring.push([p.x,p.y]);}g.glowLine(ring,BLUE,.66,3);
  for(let j=0;j<38;j++){const a=j/38*TAU,pts=[];for(let i=0;i<=12;i++){const r=58+i/12*79;const p=project([Math.cos(a)*r,Math.sin(a)*r,-326],c);if(p)pts.push([p.x,p.y]);}g.glowLine(pts,BLUE,.3,1.3);}
  for(let i=0;i<360;i++){const r=rng(i+951),a=r()*TAU,z=.15+r()*.83,rr=Math.sqrt(1-z*z),p=project([Math.cos(a)*rr*310,Math.sin(a)*rr*310,z*310],c);if(p)g.glow(p.x,p.y,2.5,GOLD,.29+seg(t,61.3,62.3)*.4);}
  const arrival=seg(t,61.4,62.5);
  if(arrival>0){const p=project([0,0,240],c);if(p)beam(g,25,855,p.x,p.y,GOLD,.35*arrival,90);}
  const ctx=g.add(),visible=seg(t,63,64.2);
  // A limited object-recognition illustration; normal vision is not restored.
  ctx.strokeStyle=`rgba(255,182,106,${visible*.52})`;ctx.globalAlpha=1;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(452,1260);ctx.lineTo(452,1196);ctx.lineTo(471,1161);ctx.lineTo(471,1117);ctx.lineTo(518,1117);ctx.lineTo(518,1161);ctx.lineTo(539,1196);ctx.lineTo(539,1260);ctx.closePath();ctx.stroke();
  return [label('2021 · 早期单例报告',85,625,38,'#eabd86'),label('视网膜基因治疗 + 光刺激眼镜',85,1360,34,'#c7dfea'),label('部分物体辨识，仍非正常视力',85,1430,33,'#eabd86',arrival)];
}
export function drawScene(g,t,s){
  const u=seg(t,s.a,s.b);
  switch(s.id){
    case 'hook': network(g,t,u);return[label('已表达光敏蛋白的神经元',85,1390,32,'#c3d7e4')];
    case 'target': network(g,t,u,false);return[label('先表达，再用光调节',85,1375,40,'#eabd86'),label('不是拿手电照一下就能控制',85,1440,31)];
    case 'algae':{
      const c=camera(t,{d:1020,rx:.14,ry:-.2+u*.25,cy:995});atmosphere(g,c,t,GREEN);
      const k=smooth(seg(t,15.3,17.5));drawMicrobe(g,c,t,1-k);
      if(k>0)protein(g,c,t,k);
      if(t<16.8)return[label('微生物的光敏蛋白',85,1360,38,'#badfbb')];
      return[label('引入编码 → 细胞表达蛋白',85,1395,35,'#eabd86')];
    }
    case 'membrane':return membrane(g,t,u);
    case 'rhythm':{
      const c=camera(t,{d:1120-u*160,ry:-.26+u*.3,cy:940});atmosphere(g,c,t);
      const p=neuron(g,c,t,{scale:1.65,activity:.24+pulse(t)*.68,channels:true});if(p)beam(g,85,340,p.x,p.y,BLUE,.1+pulse(t)*.6,100);
      trace(g,t,32,41,1380);return[label('光脉冲',85,654,32,'#a6dfff'),label('放电节奏 · 轨迹为示意',85,1450,32)];
    }
    case 'inhibit':{
      const c=camera(t,{d:1130,ry:-.18+u*.25,cy:972});atmosphere(g,c,t,GOLD);
      const p=neuron(g,c,t,{scale:1.6,color:GOLD,activity:lerp(.62,.1,smooth(u)),channels:true,signalTimes:[41.3,42.1]});
      neuron(g,c,t,{offset:[-620,-420,500],scale:.9,activity:.18,alpha:.28,signalTimes:[43.2,45.4,47.6]});
      if(p)beam(g,80,320,p.x,p.y,GOLD,.13+pulse(t,WARM,.45)*.45,110);
      return[label('换用抑制型光敏工具',85,1360,36,'#eabd86'),label('降低特定细胞活动，其他细胞仍在工作',85,1430,31)];
    }
    case 'research':return research(g,t,u);
    case 'vision':return eye(g,t,u);
    case 'nobel':network(g,t,u,false);return[];
    case 'ending':network(g,t,u);return[];
  }
  return [];
}
