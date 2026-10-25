import { lerp, rot, FACE_NORMAL, FACE_COLOR, mulMV } from './cubes.js';

export function makeDrawing(ctx, C) {
function text(str, x, y, size = 48, color = C.ink, align = 'left', max = 920, font = 'MovieSans', weight = 700) {
  ctx.save(); ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${size}px ${font}`;
  const width = ctx.measureText(str).width;
  if (width > max) { size *= max / width; ctx.font = `${weight} ${size}px ${font}`; }
  ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.restore();
}
function line(x1, y1, x2, y2, color, width = 2) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function disc(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function rr(x, y, w, h, r, fill, stroke) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } }
function roundedPoly(points, factor = .07) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const prev = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
    const a = [lerp(p[0], prev[0], factor), lerp(p[1], prev[1], factor)], b = [lerp(p[0], next[0], factor), lerp(p[1], next[1], factor)];
    if (!i) ctx.moveTo(...a); else ctx.lineTo(...a);
    ctx.quadraticCurveTo(p[0], p[1], b[0], b[1]);
  }); ctx.closePath();
}
const colorRGB = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function shade(color, light, muted = 0, sepia = 0) {
  const rgb = colorRGB(color), gray = rgb[0] * .21 + rgb[1] * .72 + rgb[2] * .07;
  const target = [205, 197, 174];
  return `rgb(${rgb.map((v, i) => Math.round(lerp(lerp(v, gray * .53 + 24, muted), target[i], sepia) * light)).join(',')})`;
}
function camera(v, yaw, pitch) { return rot(rot(v, 1, yaw), 0, pitch); }

function cube(sample, options = {}) {
  const { x = 540, y = 890, size = 152, yaw = -.62, pitch = .47, explode = 0, focus = null, centersGray = false, sepia = 0, alpha = 1, layout = null } = options;
  ctx.save(); ctx.globalAlpha *= alpha;
  const project = (v) => { const p = camera(v, yaw, pitch), f = 11 / (11 - p[2]); return [x + p[0] * size * f, y - p[1] * size * f, p[2]]; };
  const faces = [];
  for (const c of sample.state) {
    const moving = sample.spec && sample.spec.layers.includes(c.pos[sample.spec.axis]);
    const world = (v) => moving ? rot(v, sample.spec.axis, sample.angle) : v;
    const ex = 1 + explode * (c.piece.type === 'center' ? 0 : c.piece.type === 'corner' ? .8 : .48);
    const rawCenter = world(c.pos.map((v) => v * 1.035 * ex));
    const center = layout ? layout(c, rawCenter) : rawCenter;
    for (const [face, normal] of Object.entries(FACE_NORMAL)) {
      const n = world(mulMV(c.rot, normal)), cn = camera(n, yaw, pitch);
      if (cn[2] < .015) continue;
      const u = normal[0] ? [0, 1, 0] : [1, 0, 0], v = normal[2] ? [0, 1, 0] : [0, 0, 1];
      const wu = world(mulMV(c.rot, u)), wv = world(mulMV(c.rot, v));
      const points = (half, offset) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => project(center.map((z, i) => z + n[i] * offset + wu[i] * a * half + wv[i] * b * half)));
      const body = points(.485, .488), sticker = c.piece.faces.includes(face) ? points(.414, .495) : null;
      const light = .58 + .26 * cn[2] + .16 * Math.max(0, cn[1]);
      const unimportant = focus && !focus.has(c.piece.key) && c.piece.type !== 'center';
      const color = centersGray && c.piece.type === 'center' ? '#7c8c93' : FACE_COLOR[face];
      faces.push({ body, sticker, z: body.reduce((a, p) => a + p[2], 0) / 4, color: shade(color, light, unimportant ? .93 : 0, sepia), focus: focus?.has(c.piece.key), type: c.piece.type });
    }
  }
  faces.sort((a, b) => a.z - b.z);
  for (const f of faces) {
    roundedPoly(f.body, .11); ctx.fillStyle = '#080d12'; ctx.fill(); ctx.strokeStyle = '#52616c'; ctx.lineWidth = 1.15; ctx.stroke();
    if (!f.sticker) continue;
    roundedPoly(f.sticker, .12); ctx.fillStyle = f.color; ctx.fill();
    ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(f.sticker[0][0], f.sticker[0][1], f.sticker[2][0], f.sticker[2][1]);
    g.addColorStop(0, '#ffffff3a'); g.addColorStop(.32, '#ffffff08'); g.addColorStop(1, '#00000036');
    ctx.fillStyle = g; ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8); ctx.restore();
    if (f.focus) { roundedPoly(f.sticker, .12); ctx.strokeStyle = '#f9dea38a'; ctx.lineWidth = 2.3; ctx.stroke(); }
  }
  ctx.restore();
}

return { text, line, disc, rr, roundedPoly, cube, camera };
}

