// Brain (6–18 s): the title over one neuron firing on the beat; pull back into a field of neurons with a rolling
// "860亿" counter; a scan line; the electrode lights a whole patch at once; then only "this type" locks on.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {FPS, TITLE_FIRE, COUNT, SCAN, ELECTRODE_IN, ZAP, ELECTRODE_OUT, LOCK, pulse} from '../timeline';
import {seg, lerp, easeInOut, easeOut, smooth, rng, TAU} from '../lib/math';
import {C, HERO, drawNeuron, drawSpike, fiber} from '../art/neuron';
import {TARGETS, LOCK_TIMES, FIELD_CX, FIELD_CY, FIELD_CAM, FIELD_ZOOM, drawField, drawDepth, toScreen, type Cell} from '../art/field';
import {Counter, Callout} from '../ui/widgets';
import {SANS} from '../lib/fonts';
import {X0, rgba} from '../ui/Text';

const TIP: [number, number] = [610, 1120], FROM: [number, number] = [1200, 470];
const camAt = (t: number) => {
  const k = easeInOut(seg(t, 10, 11.7));
  const zoom = Math.exp(lerp(Math.log(1 + 0.05 * seg(t, 6, 10)), Math.log(FIELD_ZOOM), k)) * (1 - 0.04 * seg(t, 11.7, 18));
  return {zoom, cx: lerp(FIELD_CX, FIELD_CAM[0], k), cy: lerp(1010, FIELD_CAM[1], k), pull: k};
};
const lockAt = (i: number) => LOCK_TIMES[i];
const lockK = (c: Cell, t: number) => { const i = TARGETS.indexOf(c); return i < 0 ? 0 : smooth(seg(t, lockAt(i), lockAt(i) + 0.15)); };

function drawBrain(g: Gfx, t: number) {
  g.begin([3, 6, 13]);
  const {zoom, cx, cy, pull} = camAt(t);
  g.camera(cx, cy, zoom);
  drawDepth(g, t, pull, 1);
  const dim = smooth(seg(t, LOCK, LOCK + 0.4)) * (1 - seg(t, 17.8, 18));
  const zapK = pulse(t, [ZAP], 0.35);
  const scanY = t >= SCAN[0] && t < SCAN[1] ? lerp(640, 1500, easeInOut(seg(t, SCAN[0] + 0.1, SCAN[1] - 0.1))) : null;
  drawField(g, t, {a: seg(t, 9.9, 10.9), dim, zap: zapK > 0.01 ? {x: TIP[0], y: TIP[1], r: 400, k: zapK} : null, lock: (c) => lockK(c, t), scanY});
  // the hero neuron: fires on the beat under the title, then shrinks to the size of its neighbours
  const hs = lerp(1, 0.35, easeInOut(seg(t, 10, 11.7))), f = pulse(t, TITLE_FIRE, 0.3) * (1 - seg(t, 9.8, 10.2));
  const heroLock = smooth(seg(t, LOCK + 0.1, LOCK + 0.3));
  if (t < 10.4) fiber(g, FIELD_CX, 840 - (1 - zoom) * 400, FIELD_CY - 76, C.blue, f, [FIELD_CX, FIELD_CY - 10], 56, 1 - seg(t, 10, 10.4));
  drawNeuron(g, HERO, FIELD_CX, FIELD_CY, hs, {soma: Math.max(0.12 + f * 0.88, heroLock * 0.8), lw: 1 / Math.max(zoom, 0.35)});
  for (const p of TITLE_FIRE) {
    const k = (t - p) / 0.8;
    if (k > 0 && k < 1) g.glowArc(FIELD_CX, FIELD_CY, 36 + k * 340, C.blue, (1 - k) * 0.8, 2.6);
    drawSpike(g, HERO, FIELD_CX, FIELD_CY, hs, (t - p - 0.05) / 0.6, C.blue, 1);
  }
  // the electrode: slides in, discharges into everything around its tip, slides out
  g.screen();
  if (scanY !== null) {
    const sk = Math.min(seg(t, SCAN[0], SCAN[0] + 0.15), 1 - seg(t, SCAN[1] - 0.15, SCAN[1]));
    const band = g.ctx.createLinearGradient(0, scanY - 120, 0, scanY);
    band.addColorStop(0, 'rgba(74,182,255,0)'); band.addColorStop(1, `rgba(74,182,255,${0.22 * sk})`);
    g.ctx.globalAlpha = 1; g.ctx.fillStyle = band; g.ctx.fillRect(0, scanY - 120, 1080, 120);
    g.line(0, scanY, 1080, scanY, C.ice, 0.9 * sk, 3); g.line(0, scanY, 1080, scanY, C.blue, 0.4 * sk, 14);
  }
  const reach = easeOut(seg(t, ELECTRODE_IN, ELECTRODE_IN + 0.32)) * (1 - easeInOut(seg(t, ELECTRODE_OUT, ELECTRODE_OUT + 0.35)));
  if (reach > 0.005) {
    const tx = lerp(FROM[0], TIP[0], reach), ty = lerp(FROM[1], TIP[1], reach), ang = Math.atan2(TIP[1] - FROM[1], TIP[0] - FROM[0]);
    const nx = -Math.sin(ang), ny = Math.cos(ang), bx = tx - Math.cos(ang) * 90, by = ty - Math.sin(ang) * 90;
    const gr = g.ctx.createLinearGradient(bx + nx * 9, by + ny * 9, bx - nx * 9, by - ny * 9);
    gr.addColorStop(0, '#2a3442'); gr.addColorStop(0.45, '#c9d4e0'); gr.addColorStop(1, '#2a3442');
    g.fill((c) => { c.moveTo(FROM[0] + 60 + nx * 10, FROM[1] - 50 + ny * 10); c.lineTo(bx + nx * 9, by + ny * 9); c.lineTo(bx - nx * 9, by - ny * 9); c.lineTo(FROM[0] + 60 - nx * 10, FROM[1] - 50 - ny * 10); }, gr);
    g.fill((c) => { c.moveTo(bx + nx * 6, by + ny * 6); c.lineTo(tx, ty); c.lineTo(bx - nx * 6, by - ny * 6); }, '#e8eef6');
    g.glow(tx, ty, 16, C.white, 0.7 + zapK * 0.3, 'glow');
    if (zapK > 0.02) {
      g.glow(tx, ty, 200, C.white, zapK * 0.9, 'glow'); g.glow(tx, ty, 640, C.white, zapK * 0.3, 'halo');
      const age = t - ZAP; if (age < 0.7) g.glowArc(tx, ty, 30 + age * 1000, C.white, (1 - age / 0.7) * 0.7, 3);
      // lightning: jagged arcs to nearby cells, re-drawn every other frame
      if (t - ZAP < 0.4) {
        const AR = rng(Math.floor(t * 15) + 7);
        for (let k = 0; k < 7; k++) {
          const a = AR() * TAU, L = 140 + AR() * 260, pts: [number, number][] = [[tx, ty]];
          for (let j = 1; j <= 6; j++) pts.push([tx + Math.cos(a) * L * (j / 6) + (AR() - 0.5) * 40, ty + Math.sin(a) * L * (j / 6) + (AR() - 0.5) * 40]);
          g.glowLine(pts, C.white, zapK, 2.2);
        }
      }
    }
  }
  // targets lock on: corner brackets close in around each cell of "this type"
  if (dim > 0.01) for (const [i, c] of TARGETS.entries()) {
    const k = seg(t, lockAt(i), lockAt(i) + 0.22);
    if (k <= 0) continue;
    const [sx, sy] = toScreen(c.x, c.y, [cx, cy], zoom), r = lerp(70, 30, easeOut(k)), L = 12, al = dim * (0.5 + 0.5 * k);
    for (const [ux, uy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.glowLine([[sx + ux * r, sy + uy * (r - L)], [sx + ux * r, sy + uy * r], [sx + ux * (r - L), sy + uy * r]], C.blue, al, 2);
  }
  g.apply();
  g.bloom(0.7);
  g.vignette(0.6);
  // the zap and the cut into the quiz shake the picture apart for a moment
  g.glitch(Math.max(t >= ZAP && t < ZAP + 0.35 ? 1 - (t - ZAP) / 0.35 : 0, seg(t, 17.85, 18)), Math.round(t * FPS));
  g.grain(Math.round(t * FPS), 0.12);
}

export const Brain: React.FC<{t: number}> = ({t}) => {
  const ck = seg(t, COUNT[0], COUNT[0] + 0.25) * (1 - seg(t, 12.25, 12.5));
  const [hx, hy] = toScreen(TARGETS[0].x, TARGETS[0].y);
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawBrain} />
      {ck > 0.01 && (
        <div style={{position: 'absolute', left: X0, top: 470, opacity: ck, transform: `translateY(${(1 - ck) * 20}px)`, display: 'flex', alignItems: 'baseline', gap: 10, whiteSpace: 'nowrap'}}>
          <span style={{fontFamily: SANS, fontWeight: 700, fontSize: 48, color: '#cfe0ee'}}>约</span>
          <span style={{textShadow: `0 0 30px ${rgba('ice', 0.7)}`}}><Counter value={860} t={t} a={COUNT[0]} b={COUNT[1]} size={190} color="#eaf6ff" /></span>
          <span style={{fontFamily: SANS, fontWeight: 900, fontSize: 130, color: rgba('ice'), textShadow: `0 0 30px ${rgba('ice', 0.7)}`}}>亿</span>
          <span style={{fontFamily: SANS, fontWeight: 700, fontSize: 48, color: '#cfe0ee'}}>个神经元</span>
        </div>
      )}
      <Callout x={TIP[0] + 150} y={TIP[1] - 160} tx={820} ty={760} text="电极" k={seg(t, ELECTRODE_IN + 0.3, ELECTRODE_IN + 0.7) * (1 - seg(t, ELECTRODE_OUT - 0.2, ELECTRODE_OUT))} color="#d8e2ec" size={30} />
      <Callout x={hx} y={hy} tx={hx < 540 ? hx + 30 : hx - 260} ty={hy + 110} text="同一类细胞（示意）" k={seg(t, LOCK + 0.5, LOCK + 1.0) * (1 - seg(t, 17.8, 18))} color={rgba('blue')} size={26} />
    </AbsoluteFill>
  );
};
