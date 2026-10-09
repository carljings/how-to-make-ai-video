import { neuron, beam, halo, dot, line, round, arrow, trace, BLUE, GOLD, GREEN, WHITE, MUTED, rgba } from './gfx.js';
import { seg, smooth, TAU } from './lib.js';
import { pulse, WARM } from './timeline.js';

let labels;
const label = (value, x, y, size = 38, color = WHITE, align = 'center', weight = 500) => labels.push({ type: 'text', value, x, y, size, color, align, weight });
const badge = (value, x, y, color = BLUE) => labels.push({ type: 'tag', value, x, y, color });
const network = [[180,640],[520,565],[875,685],[260,980],[590,880],[885,1110],[390,1205],[720,1230]];

function field(c, t, strong = false) {
  network.forEach(([x,y],i) => {
    if(i)line(c,x,y,...network[(i+2)%network.length],BLUE,1,.12);
    neuron(c,x,y,18+(i%3)*5,310+i,t,.12+(strong?.2:0),BLUE);
  });
}
function hook(c, t) {
  const p = pulse(t);
  neuron(c,290,900,49,21,t,.2,BLUE);
  neuron(c,760,900,59,31,t,.38+p*.55,BLUE,true);
  beam(c,950,550,760,895,110,BLUE,.22+p*.46);
  label('普通细胞',290,650,38,MUTED);
  label('目标细胞',760,650,38,BLUE);
  badge('已表达光敏蛋白',760,714);
  trace(c,165,1240,270,45,[.23,.6],MUTED,.25);
  trace(c,625,1240,270,68,[.18,.5,.8],BLUE,.55+p*.4);
  label('活动示意',540,1322,30,MUTED);
}
function target(c,t) {
  field(c,t);const p=pulse(t);
  neuron(c,545,860,85,31,t,.38+p*.5,BLUE,true);
  beam(c,925,570,545,850,95,BLUE,.27+p*.3);
  const theta=t*.16;c.save();c.translate(545,860);c.rotate(theta);
  c.strokeStyle=rgba(BLUE,.22);c.lineWidth=2;c.setLineDash([11,17]);c.beginPath();c.ellipse(0,0,280,265,0,0,TAU);c.stroke();c.restore();
  badge('光敏蛋白',545,1248);
  label('先表达，再用光影响活动',540,1342,38,WHITE);
}
function algae(c,t,s) {
  const u=smooth(seg(t,s.a+4,s.a+8));
  c.save();c.translate(320,840);c.rotate(Math.sin(t*.38)*.035);
  const g=c.createRadialGradient(-30,-55,0,0,0,185);g.addColorStop(0,rgba(GREEN,.54));g.addColorStop(1,rgba(GREEN,.07));
  c.fillStyle=g;c.strokeStyle=rgba(GREEN,.75);c.lineWidth=4;c.beginPath();c.ellipse(0,0,137,188,.14,0,TAU);c.fill();c.stroke();
  for(let i=0;i<8;i++){c.beginPath();c.ellipse((i-4)*24,25,18,115,.05*i,0,TAU);c.strokeStyle=rgba(GREEN,.12);c.lineWidth=3;c.stroke();}
  dot(c,-56,-63,20,GOLD,.9);halo(c,-56,-63,70,GOLD,.5);
  for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*40,-165);for(let j=1;j<10;j++){const x=sign*(40+j*5)+Math.sin(t*2-j*.4)*14,y=-165-j*15;c.lineTo(x,y);}c.strokeStyle=rgba(GREEN,.65);c.lineWidth=3;c.stroke();}
  c.restore();label('绿藻中的光敏蛋白',320,1100,34,GREEN);
  arrow(c,495,835,635,835,GREEN,.7);
  gate(c,777,835,1,BLUE);badge('ChR2',777,1004);label('光敏通道',777,1074,38,BLUE);
  neuron(c,777,1225,29,31,t,.3+u*.3,BLUE,true);
  arrow(c,777,1088,777,1155,BLUE,.4+u*.4);label('表达在目标细胞膜上',500,1338,38,WHITE);
}
function gate(c,x,y,open,color=BLUE) {
  const gap=28+open*27;
  round(c,x-gap-45,y-117,58,234,24,rgba(color,.16),rgba(color,.72),4);
  round(c,x+gap-13,y-117,58,234,24,rgba(color,.16),rgba(color,.72),4);
  halo(c,x,y,150,color,.25+open*.3);
  for(let k=0;k<5;k++){line(c,x-gap-42,y-84+k*42,x-gap+9,y-84+k*42,color,3,.36);line(c,x+gap-10,y-84+k*42,x+gap+41,y-84+k*42,color,3,.36);}
}
function membrane(c,t,s) {
  const p=pulse(t),on=smooth(seg(t,s.a+1,s.a+3));
  for(let x=110;x<=970;x+=27){
    if(Math.abs(x-540)<125)continue;
    const yy=920+Math.sin(x/160)*10;
    dot(c,x,yy-38,8,BLUE,.66);dot(c,x,yy+38,8,BLUE,.66);
    line(c,x-4,yy-28,x-9,yy+17,BLUE,2,.4);line(c,x+4,yy-28,x+9,yy+17,BLUE,2,.4);
  }
  gate(c,540,920,on,BLUE);beam(c,830,560,540,900,85,BLUE,.22+p*.35);
  for(let i=0;i<9;i++){
    const u=(t*.43+i/9)%1,y=620+u*600,x=540+Math.sin(i*8.7)*19;
    dot(c,x,y,13,BLUE,.35+on*.5);
    if(u<.48||on>.8)label('+',x,y,24,WHITE);
  }
  label('细胞外',215,696,40,MUTED);label('细胞内',215,1138,40,MUTED);
  badge('ChR2',800,951);arrow(c,700,951,646,951,BLUE,.45);
  label('带正电离子',715,1162,34,BLUE);
  trace(c,176,1312,728,68,[.27,.56,.83],BLUE,.25+on*.65);
  label('膜电位变化 · 示意',540,1390,30,MUTED);
}
function rhythm(c,t,s) {
  const centers=[.1,.3,.5,.7,.9],progress=seg(t,s.a,s.b);
  label('光脉冲',126,624,39,BLUE,'left');
  label('神经活动',126,974,39,WHITE,'left');
  round(c,110,680,860,180,25,rgba('#16344c',.3),rgba(BLUE,.2));
  round(c,110,1040,860,170,25,rgba('#16344c',.23),rgba(BLUE,.17));
  for(const p of centers){
    const x=170+p*735,active=p<progress;
    round(c,x-18,712,36,118,5,rgba(BLUE,active?.85:.15));
    halo(c,x,760,70,BLUE,active?.22:0);
  }
  trace(c,170,1162,735,100,centers.filter(p=>p<progress),BLUE,.85);
  const scanX=170+progress*735;line(c,scanX,667,scanX,1212,GOLD,2,.6);
  label('同一时间线，关联光与活动',540,1300,36,WHITE);
  badge('条件合适时',540,1380,GOLD);
}
function inhibit(c,t,s) {
  const k=smooth(seg(t,s.a+1,s.a+5)),p=pulse(t,WARM,.65);
  neuron(c,300,860,50,21,t,.35,BLUE);
  neuron(c,765,860,66,31,t,.65-k*.5,GOLD,true);
  beam(c,965,560,765,850,105,GOLD,.28+p*.3);
  label('其他细胞',300,648,36,MUTED);label('抑制工具',765,648,36,GOLD);
  trace(c,126,1250,305,67,[.17,.4,.66,.9],BLUE,.6);
  trace(c,625,1250,305,67,[.17,.4,.66,.9],GOLD,.6-k*.48);
  badge('目标活动减弱',765,1350,GOLD);
}
function mouse(c,t) {
  c.save();c.translate(540,1050);c.strokeStyle=rgba(WHITE,.65);c.fillStyle=rgba('#1b354b',.72);c.lineWidth=4;
  c.beginPath();c.ellipse(-60,15,190,100,-.09,0,TAU);c.fill();c.stroke();
  c.beginPath();c.ellipse(155,-24,88,64,-.15,0,TAU);c.fill();c.stroke();
  c.beginPath();c.arc(128,-87,39,0,TAU);c.fill();c.stroke();dot(c,198,-33,8,WHITE,.9);dot(c,247,-3,6,GOLD,.8);
  c.beginPath();c.moveTo(-239,40);c.bezierCurveTo(-355,55,-336,170,-209,160);c.strokeStyle=rgba(WHITE,.47);c.stroke();
  line(c,-143,98,-172,137,WHITE,4,.7);line(c,28,98,60,128,WHITE,4,.7);
  c.restore();neuron(c,659,1000,13,61,t,.65,BLUE,true);
}
function research(c,t) {
  neuron(c,540,643,37,31,t,.6,BLUE,true);badge('目标细胞群',540,813);
  arrow(c,540,849,540,900,BLUE,.65);mouse(c,t);
  label('实验动物',540,1254,38,WHITE);label('改变目标活动，观察行为',540,1320,36,MUTED);
  badge('与对照比较',540,1376,GOLD);
}
function goggles(c,x,y) {
  c.save();c.translate(x,y);c.strokeStyle=rgba(GOLD,.65);c.lineWidth=5;
  round(c,-155,-56,130,100,32,rgba(GOLD,.05),rgba(GOLD,.65),5);round(c,25,-56,130,100,32,rgba(GOLD,.05),rgba(GOLD,.65),5);
  c.beginPath();c.moveTo(-25,-9);c.quadraticCurveTo(0,-40,25,-9);c.stroke();
  line(c,-155,-32,-204,-70,GOLD,5,.6);line(c,155,-32,204,-70,GOLD,5,.6);
  for(const x0 of [-90,90]){halo(c,x0,-10,55,GOLD,.3);dot(c,x0,-10,19,GOLD,.35);}c.restore();
}
function vision(c,t,s) {
  const k=smooth(seg(t,s.a+2,s.a+7));goggles(c,540,604);label('光刺激眼镜',540,724,38,GOLD);
  arrow(c,540,765,540,825,GOLD,.7);
  c.save();c.translate(540,960);c.strokeStyle=rgba(WHITE,.6);c.fillStyle=rgba('#14304a',.8);c.lineWidth=4;
  c.beginPath();c.ellipse(0,0,235,147,0,0,TAU);c.fill();c.stroke();
  c.beginPath();c.ellipse(-120,0,37,83,0,0,TAU);c.strokeStyle=rgba(BLUE,.58);c.stroke();
  c.beginPath();c.ellipse(0,0,218,132,0,-.7,.7);c.strokeStyle=rgba(GOLD,.4+k*.5);c.lineWidth=9;c.stroke();
  for(let i=0;i<7;i++)line(c,-175,-50+i*17,202,(i-3)*22,GOLD,2,.16+k*.2);
  c.restore();label('视网膜',813,960,38,GOLD);line(c,778,960,739,960,GOLD,2,.7);
  arrow(c,540,1130,540,1182,GOLD,.6);
  line(c,226,1320,854,1320,WHITE,4,.5);
  round(c,320,1180,94,139,16,rgba(WHITE,.04+k*.07),rgba(WHITE,.12+k*.64),3);
  line(c,516,1222,642,1222,WHITE,3,.1+k*.6);line(c,526,1222,532,1318,WHITE,3,.1+k*.6);line(c,632,1222,627,1318,WHITE,3,.1+k*.6);
  label('物体辨识 · 部分恢复',540,1390,35,WHITE);
}
function nobel(c,t,s) {
  field(c,t);halo(c,540,910,390,BLUE,.35);
  gate(c,540,900,.6+.2*Math.sin(t),BLUE);
  label('让光成为神经科学工具',540,1160,42,WHITE);
  label('Karl Deisseroth',540,1243,31,MUTED);label('Peter Hegemann · Georg Nagel',540,1300,31,MUTED);
}
function ending(c,t) {
  neuron(c,540,900,92,31,t,.45+pulse(t)*.5,BLUE,true);beam(c,880,580,540,885,125,BLUE,.36+pulse(t)*.2);
  label('光遗传学',540,1315,56,WHITE,'center',700);
}
const functions={hook,target,algae,membrane,rhythm,inhibit,research,vision,nobel,ending};
export function drawScene(id,c,t,s) { labels=[]; functions[id](c,t,s); return labels; }
