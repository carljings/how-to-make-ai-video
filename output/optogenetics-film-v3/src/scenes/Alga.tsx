// Alga (22.4–30 s): the answer swims toward the light; a magnifier on its eyespot shows channels opening in light.
// The camera then dives into the magnifier, straight into the next scene's membrane.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {FPS, MAGNIFY, ALGA_OPEN} from '../timeline';
import {seg, lerp, easeIn, easeOut, smooth} from '../lib/math';
import {C} from '../art/neuron';
import {algaAt, drawAlga, drawInset, drawMicroscope} from '../art/alga';
import {Callout} from '../ui/widgets';
import {SANS} from '../lib/fonts';
import {rgba} from '../ui/Text';

const INSET: [number, number] = [292, 1236], IR = 190, DIVE: [number, number] = [29.5, 30.0];

function drawScene(g: Gfx, t: number) {
  g.begin([2, 12, 10]);
  const dive = easeIn(seg(t, DIVE[0], DIVE[1]));
  g.camera(lerp(540, INSET[0], dive), lerp(960, INSET[1], dive), 1 + 12 * dive * dive);
  drawMicroscope(g, t, 1 - dive);
  const {x, y, ang} = algaAt(t);
  const {eye} = drawAlga(g, x, y, 1, t, ang, 1 - dive * 0.8);
  const mk = seg(t, MAGNIFY, MAGNIFY + 0.4), open = smooth(seg(t, ALGA_OPEN, ALGA_OPEN + 0.4));
  if (mk > 0) {
    // leader lines from the eyespot to the magnifier's rim
    const dx = eye[0] - INSET[0], dy = eye[1] - INSET[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    for (const s of [-1, 1]) g.line(eye[0], eye[1], INSET[0] + (ux * 0.7 + nx * s * 0.7) * IR * easeOut(mk), INSET[1] + (uy * 0.7 + ny * s * 0.7) * IR * easeOut(mk), C.ice, 0.5 * easeOut(mk), 1.4);
    g.glowArc(eye[0], eye[1], 30, C.ice, easeOut(mk) * 0.8, 1.6);
    drawInset(g, t, INSET[0], INSET[1], IR, mk, open, ALGA_OPEN + 0.25);
  }
  g.bloom(0.65);
  g.vignette(0.75);
  g.grain(Math.round(t * FPS), 0.12);
}

export const Alga: React.FC<{t: number}> = ({t}) => {
  const {x, y, ang} = algaAt(t), out = 1 - seg(t, DIVE[0] - 0.2, DIVE[0]);
  const fl: [number, number] = [x + Math.cos(ang) * 260, y + Math.sin(ang) * 260];
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawScene} />
      <Callout x={fl[0]} y={fl[1]} tx={fl[0] - 200} ty={fl[1] - 60} align="right" text="鞭毛" k={seg(t, 22.8, 23.2) * (1 - seg(t, 24.0, 24.2))} color={rgba('green')} size={28} />
      <Callout x={INSET[0] - 110} y={INSET[1] - 46} tx={92} ty={INSET[1] - 236} text="见光就开的通道" k={seg(t, ALGA_OPEN + 0.3, ALGA_OPEN + 0.8) * out} color={rgba('blue')} size={26} />
      {/* scale bar: the cell is about 10 micrometres long */}
      <div style={{position: 'absolute', left: 80, top: 1440, opacity: seg(t, 22.6, 23.0) * out}}>
        <div style={{width: 280, height: 6, background: 'rgba(220,240,230,0.85)', borderRadius: 3}} />
        <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 24, color: 'rgba(220,240,230,0.85)', marginTop: 8, letterSpacing: 1}}>约 10 微米</div>
      </div>
    </AbsoluteFill>
  );
};
