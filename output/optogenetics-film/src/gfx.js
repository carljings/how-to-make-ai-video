import { rng, TAU, clamp } from './lib.js';
export const BLUE = '#80ddff', CYAN = '#49bced', GOLD = '#ffc77e', GREEN = '#9edd89', WHITE = '#edf5fb', MUTED = '#9daebe';
export const FONT = '"Noto Film", "Inter", sans-serif';
export let textBoxes = [];
export const clearBoxes = () => { textBoxes = []; };
export const rgba = (hex, alpha) => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${clamp(alpha)})`;
};
export function line(c, x1, y1, x2, y2, color = BLUE, width = 2, alpha = 1) {
  c.save(); c.strokeStyle = rgba(color, alpha); c.lineWidth = width; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
}
export function dot(c, x, y, r, color = BLUE, alpha = 1) {
  c.save(); c.fillStyle = rgba(color, alpha); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
}
export function halo(c, x, y, r, color = BLUE, alpha = 1) {
  c.save(); const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha * 0.5)); g.addColorStop(0.25, rgba(color, alpha * 0.18)); g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
}
export function text(c, value, x, y, size = 40, color = WHITE, align = 'center', weight = 500) {
  c.save(); c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color;
  const m = c.measureText(value), left = align === 'center' ? x - m.width / 2 : align === 'right' ? x - m.width : x;
  textBoxes.push({ text: value, x: left, y: y - size * 0.65, w: m.width, h: size * 1.3, size });
  c.fillText(value, x, y); c.restore();
}
export function round(c, x, y, w, h, r, fill, stroke = null, width = 2) {
  c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); } c.restore();
}
export function tag(c, value, x, y, color = BLUE, size = 32) {
  c.save(); c.font = `500 ${size}px ${FONT}`; const w = c.measureText(value).width + 42; c.restore();
  round(c, x - w / 2, y - 30, w, 60, 30, rgba('#102539', 0.9), rgba(color, 0.45));
  text(c, value, x, y, size, color);
}
export function arrow(c, x1, y1, x2, y2, color = BLUE, alpha = 0.65) {
  line(c, x1, y1, x2, y2, color, 3, alpha); const a = Math.atan2(y2 - y1, x2 - x1), n = 15;
  line(c, x2, y2, x2 - Math.cos(a - 0.5) * n, y2 - Math.sin(a - 0.5) * n, color, 3, alpha);
  line(c, x2, y2, x2 - Math.cos(a + 0.5) * n, y2 - Math.sin(a + 0.5) * n, color, 3, alpha);
}
const shapes = new Map();
function shape(seed) {
  if (shapes.has(seed)) return shapes.get(seed);
  const R = rng(seed), branches = [];
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8 + (R() - 0.5) * 0.3, len = 2.6 + R() * 1.4;
    const p = [Math.cos(a) * 0.75, Math.sin(a) * 0.75, Math.cos(a + .2) * 1.5, Math.sin(a + .2) * 1.5, Math.cos(a - .1) * len * .7, Math.sin(a - .1) * len * .7, Math.cos(a) * len, Math.sin(a) * len];
    branches.push(p);
    for (let k = 0; k < 3; k++) {
      const b = a + (k - 1) * .45, s = .53 + k * .16, qx = Math.cos(a) * len * s, qy = Math.sin(a) * len * s, l = .7 + R() * .7;
      branches.push([qx,qy,qx + Math.cos(b) * l * .3,qy + Math.sin(b) * l * .3,qx + Math.cos(b) * l * .7,qy + Math.sin(b) * l * .7,qx + Math.cos(b) * l,qy + Math.sin(b) * l]);
    }
  }
  const v = { branches, spots: Array.from({ length: 7 }, (_, i) => i * TAU / 7 + .2) }; shapes.set(seed, v); return v;
}
function bezier(p, u) {
  const v = 1 - u;
  return [v*v*v*p[0] + 3*v*v*u*p[2] + 3*v*u*u*p[4] + u*u*u*p[6], v*v*v*p[1] + 3*v*v*u*p[3] + 3*v*u*u*p[5] + u*u*u*p[7]];
}
export function neuron(c, x, y, r, seed, t, activity = .3, color = BLUE, channels = false) {
  const s = shape(seed); c.save(); c.translate(x, y); c.scale(r, r);
  s.branches.forEach((p, i) => {
    c.beginPath(); c.moveTo(p[0], p[1]); c.bezierCurveTo(...p.slice(2)); c.lineCap = 'round';
    c.strokeStyle = rgba(color, .16 + activity * .35); c.lineWidth = i % 4 === 0 ? .075 : .032; c.stroke();
    const u = 1 - ((t * (.48 + (i % 3) * .03) + i * .173) % 1), q = bezier(p, u);
    dot(c, q[0], q[1], .035 + activity * .02, color, .15 + activity * .7);
  });
  // A single axon extends from the cell body; the branches are a stylized dendritic arbor.
  c.beginPath(); c.moveTo(0,.8); c.bezierCurveTo(.35,2.0,-.2,3.1,.55,4.5); c.strokeStyle = rgba(color,.3 + activity*.5); c.lineWidth = .065; c.stroke();
  const u = (t * .8) % 1; dot(c, .55*u, .9 + 3.6*u, .065, color, activity);
  const g = c.createRadialGradient(-.25,-.25,0,0,0,1.05);
  g.addColorStop(0,rgba(color,.44 + activity*.4)); g.addColorStop(.6,rgba(color,.16 + activity*.23)); g.addColorStop(1,rgba(color,.08));
  c.fillStyle = g; c.beginPath(); c.ellipse(0,0,1,.84,.18,0,TAU); c.fill(); c.strokeStyle = rgba(color,.5 + activity*.3); c.lineWidth = .04; c.stroke();
  dot(c, -.1,.04,.27,'#172e43',.9); dot(c, -.13,-.04,.11,color,.65 + activity*.25);
  if (channels) s.spots.forEach(a => { dot(c,Math.cos(a)*.87,Math.sin(a)*.72,.09,color,.85); });
  c.restore(); halo(c,x,y,r*3.3,color,activity*.3);
}
export function beam(c, x1, y1, x2, y2, spread, color, alpha) {
  const a = Math.atan2(y2-y1,x2-x1), nx = -Math.sin(a)*spread, ny = Math.cos(a)*spread;
  c.save(); const g = c.createLinearGradient(x1,y1,x2,y2); g.addColorStop(0,rgba(color,alpha*.65)); g.addColorStop(1,rgba(color,0));
  c.fillStyle = g; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2+nx,y2+ny); c.lineTo(x2-nx,y2-ny); c.closePath(); c.fill();
  line(c,x1,y1,x2,y2,color,2,alpha*.4); halo(c,x1,y1,70,color,alpha); c.restore();
}
export const spike = (u, center) => Math.exp(-(((u-center)/.009)**2)) - .2*Math.exp(-(((u-center-.021)/.019)**2));
export function trace(c, x, y, w, h, centers, color = BLUE, amplitude = 1) {
  line(c,x,y,x+w,y,MUTED,1,.35); c.save(); c.strokeStyle = rgba(color,.95); c.lineWidth = 3.5; c.lineJoin='round'; c.beginPath();
  for(let i=0;i<=240;i++){const u=i/240,v=centers.reduce((s,p)=>s+spike(u,p),0)*amplitude; const xx=x+u*w,yy=y-h*v; if(i)c.lineTo(xx,yy);else c.moveTo(xx,yy);} c.stroke(); c.restore();
}
