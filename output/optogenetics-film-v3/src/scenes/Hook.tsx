// Hook (0–6 s): the light on the mouse's head switches on and it runs; off, it slows; on again, it runs.
// Then the camera pushes in on the implant and dives through it into the brain.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {W, H, FPS, HOOK_LIGHT, lightOn} from '../timeline';
import {seg, lerp, easeInOut, easeIn, noise1, clamp} from '../lib/math';
import {drawMouse, drawCable, drawArena, runState} from '../art/mouse';
import {C} from '../art/neuron';
import {SpeedGauge, LightChip} from '../ui/widgets';

export const MX = 470, MY = 1120, MS = 1.15;
// Light level with a fast attack and a short tail, plus the time it last switched on
export const lightLevel = (t: number, windows: [number, number][]) => {
  let v = 0, onAt = -9;
  for (const [a, b] of windows) {
    if (t >= a) onAt = a;
    if (t >= a && t < b) v = Math.max(v, seg(t, a, a + 0.04));
    else if (t >= b) v = Math.max(v, 1 - seg(t, b, b + 0.08));
  }
  return {v, onAt};
};

function drawHook(g: Gfx, t: number) {
  g.begin([4, 7, 14]);
  const push = easeInOut(seg(t, 4.5, 5.75)), through = easeIn(seg(t, 5.55, 6.0));
  const {v: light, onAt} = lightLevel(t, HOOK_LIGHT);
  // the camera drifts a little, pushes toward the implant, then dives through it
  const fx = MX + 168 * MS, fy = MY - 142 * MS;
  const zoom = lerp(1, 1.5, push) * (1 + 9 * through * through);
  g.camera(lerp(W / 2, fx, push) + noise1(t * 0.6, 7) * 10, lerp(H / 2 - 10, fy, push) + noise1(t * 0.6, 8) * 8, zoom);
  const ground = MY + 125 * MS;
  drawArena(g, t, ground, MX - 116 * MS);
  const m = drawMouse(g, {x: MX, y: MY, s: MS, t, light});
  drawCable(g, [m.ferrule[0] + 50, 560], m.ferrule, t, light, onAt);
  // a ring of light bursts out of the implant each time the light comes on
  for (const [a] of HOOK_LIGHT) {
    const age = t - a;
    if (age >= 0 && age < 0.6) { g.glowArc(m.ferrule[0], m.ferrule[1], 40 + age * 900, C.blue, (1 - age / 0.6) * 0.8, 3); g.glow(m.ferrule[0], m.ferrule[1], 220, C.white, (1 - age / 0.6) * 0.5, 'glow'); }
  }
  g.bloom(0.75);
  g.vignette(0.65);
  if (through > 0) g.fade(1 - through * 0.6, [200, 230, 255]);
  g.grain(Math.round(t * FPS), 0.12);
}

export const Hook: React.FC<{t: number; cover?: boolean}> = ({t, cover = false}) => {
  const {v} = runState(t), {v: light} = lightLevel(t, HOOK_LIGHT), hud = 1 - seg(t, 4.4, 4.8);
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawHook} />
      <LightChip on={lightOn(t, HOOK_LIGHT) ? 1 : 0} x={720} y={cover ? 700 : 640} a={hud * clamp(light + 0.999)} />
      {!cover && <SpeedGauge v={v} on={light} x={250} y={1395} a={hud} label="奔跑速度（示意）" />}
    </AbsoluteFill>
  );
};
