// Payoff (51–56 s): back to the mouse from the opening, now in X-ray: the light reaches a group of midbrain cells,
// signals run down the spinal cord, the mouse runs; light off, it slows; on again, it runs.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {W, H, FPS, PAY_LIGHT, lightOn} from '../timeline';
import {seg, noise1} from '../lib/math';
import {drawMouse, drawCable, drawArena, runState} from '../art/mouse';
import {C} from '../art/neuron';
import {SpeedGauge, LightChip, Callout} from '../ui/widgets';
import {lightLevel} from './Hook';
import {rgba} from '../ui/Text';

const X = 450, Y = 1110, S = 1.25;
function drawPayoff(g: Gfx, t: number) {
  g.begin([4, 7, 14]);
  const {v: light, onAt} = lightLevel(t, PAY_LIGHT);
  g.camera(W / 2 + noise1(t * 0.6, 17) * 10, H / 2 - 10 + noise1(t * 0.6, 18) * 8, 1);
  const ground = Y + 125 * S;
  drawArena(g, t, ground, X - 116 * S);
  const m = drawMouse(g, {x: X, y: Y, s: S, t, light, xray: seg(t, 51.0, 51.4)});
  drawCable(g, [m.ferrule[0] + 50, 600], m.ferrule, t, light, onAt);
  if (light > 0.01) { g.beam(m.target[0], m.target[1] - 30, m.target[0], m.target[1] + 26, C.blue, light, 4, 30); g.glow(m.target[0], m.target[1], 70, C.blue, light * 0.8, 'glow'); }
  for (const [a] of PAY_LIGHT) {
    const age = t - a;
    if (age >= 0 && age < 0.6) g.glowArc(m.target[0], m.target[1], 30 + age * 700, C.blue, (1 - age / 0.6) * 0.7, 3);
  }
  g.bloom(0.75);
  g.vignette(0.65);
  g.grain(Math.round(t * FPS), 0.12);
}

export const Payoff: React.FC<{t: number}> = ({t}) => {
  const {v} = runState(t), {v: light} = lightLevel(t, PAY_LIGHT), a = seg(t, 51.2, 51.5);
  // the midbrain target in screen space (drawMouse puts it at local (118, -40); the bob moves it a few pixels)
  const tx = X + 118 * S, ty = Y - 40 * S;
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawPayoff} />
      <LightChip on={lightOn(t, PAY_LIGHT) ? 1 : 0} x={700} y={660} a={a} />
      <SpeedGauge v={v} on={light} x={250} y={1420} a={a} label="奔跑速度（示意）" />
      <Callout x={tx} y={ty} tx={tx - 230} ty={ty - 210} text="中脑运动区" k={seg(t, 51.6, 52.1)} color={rgba('blue')} size={30} align="right" />
    </AbsoluteFill>
  );
};
