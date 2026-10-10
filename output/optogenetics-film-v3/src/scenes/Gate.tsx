// Gate (30–36 s): the channel in the membrane, shut; a beam of blue light opens it, positive ions pour in,
// and an oscilloscope shows the membrane voltage climbing to threshold and the cell firing.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {FPS, GATE_LIGHT, GATE_OPEN, THRESHOLD, GATE_SPIKES} from '../timeline';
import {seg, smooth, lerp} from '../lib/math';
import {C} from '../art/neuron';
import {drawMembrane} from '../art/membrane';
import {SANS, MONO} from '../lib/fonts';
import {rgba} from '../ui/Text';

const MY = 1000;
function drawGate(g: Gfx, t: number) {
  g.begin([3, 6, 14]);
  const light = smooth(seg(t, GATE_LIGHT, GATE_LIGHT + 0.12)), open = smooth(seg(t, GATE_OPEN, GATE_OPEN + 0.3));
  // outside is a touch warmer, inside cooler, so the two compartments read as different places
  g.screen();
  const bg = g.ctx.createLinearGradient(0, 700, 0, 1350);
  bg.addColorStop(0, 'rgba(30,40,70,0.0)'); bg.addColorStop(0.45, 'rgba(30,44,80,0.35)'); bg.addColorStop(0.55, 'rgba(20,50,80,0.35)'); bg.addColorStop(1, 'rgba(10,30,60,0)');
  g.ctx.globalAlpha = 1; g.ctx.fillStyle = bg; g.ctx.fillRect(0, 700, 1080, 650);
  g.apply();
  if (light > 0.01) {
    g.beam(540, 600, 540, MY - 60, C.blue, light * (0.85 + 0.15 * Math.sin(t * 30)), 40, 120);
    const age = t - GATE_LIGHT;
    if (age < 0.7) { g.glowArc(540, MY - 60, 40 + age * 900, C.blue, (1 - age / 0.7) * 0.7, 3); }
  }
  drawMembrane(g, t, {y: MY, open, light, flowStart: GATE_OPEN + 0.1});
  // each time the cell fires, a wave of light runs both ways along the membrane
  for (const s of GATE_SPIKES) {
    const age = t - s;
    if (age < 0 || age > 0.8) continue;
    for (const dir of [-1, 1]) g.glow(540 + dir * age * 1100, MY, 120, C.blue, (1 - age / 0.8) * 0.8, 'glow');
    g.glow(540, MY, 500, C.blue, (1 - age / 0.8) * 0.25, 'halo');
  }
  g.bloom(0.7);
  g.vignette(0.6);
  g.grain(Math.round(t * FPS), 0.12);
}

// Membrane voltage, normalised: 0.15 at rest, threshold 0.55, spikes to 1.0 (illustrative, not a measurement)
const REST = 0.15, THR = 0.55;
const voltage = (x: number) => {
  let v = REST + (THR + 0.02 - REST) * smooth(seg(x, GATE_OPEN + 0.15, THRESHOLD + 0.1));
  for (const s of GATE_SPIKES) {
    const d = x - s;
    if (d < 0 || d > 0.6) continue;
    v = d < 0.025 ? lerp(v, 1, d / 0.025) : d < 0.08 ? lerp(1, 0.08, (d - 0.025) / 0.055) : lerp(0.08, v, smooth((d - 0.08) / 0.45));
  }
  return v;
};
const Scope: React.FC<{t: number}> = ({t}) => {
  const Wd = 880, Hd = 180, span = 3, X = (time: number) => Wd - ((t - time) / span) * Wd, Y = (v: number) => Hd - v * (Hd - 20) - 10;
  const pts: string[] = [];
  for (let i = 0; i <= 440; i++) { const time = t - span + (i / 440) * span; pts.push(`${X(time).toFixed(1)},${Y(voltage(time)).toFixed(1)}`); }
  const a = seg(t, 30.1, 30.5), fired = GATE_SPIKES.filter((s) => s <= t).length;
  return (
    <div style={{position: 'absolute', left: 100, top: 1270, width: Wd, height: Hd + 60, opacity: a}}>
      <svg width={Wd} height={Hd} style={{position: 'absolute', top: 30, overflow: 'visible'}}>
        <rect x={0} y={0} width={Wd} height={Hd} rx={14} fill="rgba(6,12,22,0.75)" stroke="rgba(120,160,200,0.3)" strokeWidth={2} />
        {Array.from({length: 11}, (_, i) => <line key={i} x1={(i * Wd) / 10} y1={0} x2={(i * Wd) / 10} y2={Hd} stroke="rgba(120,160,200,0.08)" />)}
        <line x1={0} y1={Y(THR)} x2={Wd} y2={Y(THR)} stroke={rgba('amber', 0.7)} strokeWidth={2} strokeDasharray="10 8" />
        <polyline points={pts.join(' ')} fill="none" stroke={rgba('blue')} strokeWidth={4} strokeLinejoin="round" style={{filter: `drop-shadow(0 0 6px ${rgba('blue')})`}} />
        <circle cx={Wd} cy={Y(voltage(t))} r={8} fill="#eaf6ff" />
        <text x={14} y={Y(REST) - 12} fill="rgba(180,196,212,0.85)" fontFamily={SANS} fontSize={22}>静息</text>
        <text x={14} y={Y(THR) - 10} fill={rgba('amber', 0.9)} fontFamily={SANS} fontSize={22}>阈值</text>
      </svg>
      <div style={{position: 'absolute', left: 0, top: -6, fontFamily: SANS, fontWeight: 700, fontSize: 24, color: '#cfe0ee', letterSpacing: 2}}>膜电位（示意）</div>
      <div style={{position: 'absolute', right: 0, top: -6, fontFamily: MONO, fontWeight: 700, fontSize: 24, color: fired ? rgba('blue') : 'rgba(170,186,204,0.6)', letterSpacing: 1}}>放电 ×{fired}</div>
    </div>
  );
};

export const Gate: React.FC<{t: number}> = ({t}) => {
  const lab = seg(t, 30.2, 30.6);
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawGate} />
      <div style={{position: 'absolute', left: 80, top: 700, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: '#d6e4f0', opacity: lab, letterSpacing: 3}}>细胞外</div>
      <div style={{position: 'absolute', left: 80, top: 1170, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: '#d6e4f0', opacity: lab, letterSpacing: 3}}>细胞内</div>
      <div style={{position: 'absolute', left: 640, top: 1066, fontFamily: SANS, fontWeight: 700, fontSize: 26, color: rgba('ice'), opacity: lab, letterSpacing: 2}}>光控闸门</div>
      <Scope t={t} />
    </AbsoluteFill>
  );
};
