import { rng,TAU,clamp,lerp } from './lib.js';
import { PULSES } from './timeline.js';

export const BLUE=[74,182,255], ICE=[184,231,255], GOLD=[255,174,81], GREEN=[128,213,134];
const R=rng(200517);
export const dust=Array.from({length:360},()=>({x:(R()-.5)*2100,y:(R()-.5)*2400,z:(R()-.5)*1900,r:.7+R()*2,p:R()*TAU}));

export function camera(t,options={}) {
  return {d:options.d||1250,f:820,rx:options.rx??(.08+Math.sin(t*.08)*.07),ry:options.ry??(-.12+t*.008),
    rz:options.rz||0,x:options.x||0,y:options.y||0,cx:options.cx||540,cy:options.cy||960};
}
export function project(p,c) {
  let [x,y,z]=p; x-=c.x;y-=c.y;
  const xx=x*Math.cos(c.ry)+z*Math.sin(c.ry);z=-x*Math.sin(c.ry)+z*Math.cos(c.ry);x=xx;
  const yy=y*Math.cos(c.rx)-z*Math.sin(c.rx);z=y*Math.sin(c.rx)+z*Math.cos(c.rx);y=yy;
  const xr=x*Math.cos(c.rz)-y*Math.sin(c.rz);y=x*Math.sin(c.rz)+y*Math.cos(c.rz);x=xr;
  z+=c.d;if(z<100)return null;const s=c.f/z;
  return {x:c.cx+x*s,y:c.cy+y*s,z,s};
}
export function atmosphere(g,c,t,color=BLUE,alpha=1) {
  for(const p of dust){const q=project([p.x+Math.sin(t*.1+p.p)*14,p.y,p.z],c);g.dof(q,p.r,color,(.22+.1*Math.sin(p.p+t*.1))*alpha,c.d,18);}
  g.glow(620,920,850,color,.055*alpha,'halo');
}
function surface(n) {
  return Array.from({length:n},(_,i)=>{
    const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),a=i*2.39996323;
    return [Math.cos(a)*r,y,Math.sin(a)*r];
  });
}
export const sphere=surface(700);
export function organism(seed=4) {
  const r=rng(seed),branches=[];
  for(let i=0;i<9;i++){
    const a=TAU*i/9+(r()-.5)*.25,L=300+r()*230,z=(r()-.5)*240;
    const path=[];for(let j=0;j<=18;j++){const u=j/18,v=80+L*u,turn=a+Math.sin(u*3.3+i)*.11;
      path.push([Math.cos(turn)*v,Math.sin(turn)*v*.9,z*u+Math.sin(u*3)*30]);}
    branches.push({path,width:9,seed:r()});
    for(let k=0;k<3;k++){
      const at=5+k*4,base=path[at],b=a+(k%2?1:-1)*(.5+r()*.55),len=100+r()*150,child=[];
      for(let j=0;j<=12;j++){const u=j/12;child.push([base[0]+Math.cos(b+.13*Math.sin(u*5))*len*u,base[1]+Math.sin(b)*len*u,base[2]+(r()-.5)*4+(k-1)*u*80]);}
      branches.push({path:child,width:3.7,seed:r()});
    }
  }
  const axon=[];for(let j=0;j<=35;j++){const u=j/35;axon.push([Math.sin(u*6)*38+u*80,72+u*650,u*50]);}
  branches.push({path:axon,width:6.5,seed:.4});
  return {branches,skin:surface(850).map(p=>{const r=88*(1+.09*Math.sin(p[0]*8+p[2]*3));return[p[0]*r,p[1]*r*.87,p[2]*r*.78];})};
}
export const cells=[organism(17),organism(71),organism(119)];
function interp(path,u){const n=clamp(u)*(path.length-1),i=Math.min(path.length-2,Math.floor(n)),f=n-i;return path[i].map((x,k)=>lerp(x,path[i+1][k],f));}
export function neuron(g,c,t,{offset=[0,0,0],scale=1,color=BLUE,activity=.2,channels=false,model=0,alpha=1,signalTimes=PULSES}={}) {
  const shape=cells[model%cells.length],ctx=g.ctx;
  const transform=p=>p.map((x,i)=>x*scale+offset[i]);
  const center=project(offset,c);if(!center)return;
  for(const b of shape.branches){
    const pts=b.path.map(p=>project(transform(p),c)).filter(Boolean).map(p=>[p.x,p.y]);
    g.glowLine(pts,color,(.11+activity*.22)*alpha,b.width*scale*center.s*.65);
    for(const q of signalTimes){
      const u=(t-q)/.95-b.seed*.23;if(u<0||u>1)continue;
      const p=project(transform(interp(b.path,u)),c),prev=project(transform(interp(b.path,clamp(u-.08))),c);
      if(p&&prev)g.streak(p.x,p.y,Math.atan2(p.y-prev.y,p.x-prev.x),Math.hypot(p.x-prev.x,p.y-prev.y),Math.max(3,scale*center.s*7),color,activity*alpha);
    }
  }
  g.normal();ctx.globalAlpha=alpha;
  const r=88*scale*center.s,grad=ctx.createRadialGradient(center.x-r*.35,center.y-r*.35,r*.05,center.x,center.y,r*1.15);
  grad.addColorStop(0,`rgba(${color.join(',')},${.33+activity*.32})`);grad.addColorStop(.45,`rgba(${color.join(',')},.2)`);grad.addColorStop(.88,'rgba(11,24,44,.97)');grad.addColorStop(1,'rgba(28,62,85,.75)');
  ctx.fillStyle=grad;ctx.beginPath();
  for(let i=0;i<=64;i++){const a=i/64*TAU,rr=r*(1+.08*Math.sin(a*5)+.04*Math.cos(a*3));const x=center.x+Math.cos(a)*rr,y=center.y+Math.sin(a)*rr*.87;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();g.add();
  for(const p of shape.skin){const q=project(transform(p),c);g.dof(q,1.25*scale,color,(.13+activity*.26)*alpha,c.d,4);}
  g.glow(center.x-r*.08,center.y+r*.04,r*.55,color,(.08+activity*.22)*alpha,'halo');
  g.glowArc(center.x-r*.08,center.y+r*.04,r*.32,ICE,.16*alpha,1.2);
  if(channels){for(let i=0;i<17;i++){const a=i*2.399963,yy=1-2*(i+.5)/17,rr=Math.sqrt(1-yy*yy),q=project(transform([Math.cos(a)*rr*92,yy*80,Math.sin(a)*rr*74]),c);if(q)g.glow(q.x,q.y,Math.max(3,scale*q.s*8),GOLD,.7*alpha);}}
  g.glow(center.x-r*.25,center.y-r*.4,r*1.8,color,activity*.14*alpha,'halo');
  return center;
}
export function beam(g,x1,y1,x2,y2,color,a=.4,width=80){
  const ctx=g.add(),ang=Math.atan2(y2-y1,x2-x1),nx=-Math.sin(ang)*width,ny=Math.cos(ang)*width;
  const grad=ctx.createLinearGradient(x1,y1,x2,y2);grad.addColorStop(0,`rgba(${color.join(',')},${a*.45})`);grad.addColorStop(1,`rgba(${color.join(',')},${a*.03})`);
  ctx.globalAlpha=1;ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2+nx,y2+ny);ctx.lineTo(x2-nx,y2-ny);ctx.closePath();ctx.fill();
  g.streak(x2,y2,ang,Math.hypot(x2-x1,y2-y1),2,color,a*.6);g.glow(x1,y1,26,color,a);g.glow(x2,y2,100,color,a*.1,'halo');
}
export function pointCloud(g,c,points,color=BLUE,alpha=1,size=1.3){for(const p of points)g.dof(project(p,c),size,color,alpha,c.d,8);}

// A softly lit translucent volume supports readable silhouettes behind the surface points.
export function volume(g,c,center,radii,color=BLUE,alpha=.65){
  const p=project(center,c);if(!p)return;const rx=radii[0]*p.s,ry=radii[1]*p.s,ctx=g.normal();
  const grad=ctx.createRadialGradient(p.x-rx*.4,p.y-ry*.35,3,p.x,p.y,Math.max(rx,ry)*1.15);
  grad.addColorStop(0,`rgba(${color.join(',')},.28)`);grad.addColorStop(.4,`rgba(${color.join(',')},.11)`);grad.addColorStop(1,'rgba(7,16,26,.88)');
  ctx.globalAlpha=alpha;ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,c.rz,0,TAU);ctx.fill();g.add();
}
