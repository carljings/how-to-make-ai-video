// Legacy (60–64 s): where it all started. A pulse of light runs along a timeline from a curious question about an
// alga (2002) to neurons (2005), a retina (2021) and the Nobel Prize (2026), lighting each in turn on the beat.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx, RGB} from '../lib/gfx';
import {FPS, LEGACY, RGB as KEYS} from '../timeline';
import {seg, lerp, easeInOut, clamp} from '../lib/math';
import {C} from '../art/neuron';
import {drawDepth} from '../art/field';
import {AlgaIcon} from './Quiz';
import {SANS, MONO} from '../lib/fonts';
import {rgba} from '../ui/Text';

const GOLD: RGB = [236, 200, 120];
const LY = 1150, R = 74, NODES: {x: number; year: string; label: string; col: RGB}[] = [
  {x: 140, year: '2002', label: '绿藻追光', col: KEYS.green},
  {x: 373, year: '2005', label: '装进神经元', col: KEYS.blue},
  {x: 607, year: '2021', label: '帮助视网膜', col: KEYS.orange},
  {x: 840, year: '2026', label: '诺贝尔奖', col: GOLD},
];
// Where the pulse is: it enters from the left, then travels node to node, arriving on each beat
const pulseX = (t: number) => {
  if (t < LEGACY[0]) return lerp(-60, NODES[0].x, easeInOut(seg(t, 60.0, LEGACY[0])));
  for (let i = 0; i < LEGACY.length - 1; i++) if (t < LEGACY[i + 1]) return lerp(NODES[i].x, NODES[i + 1].x, easeInOut(seg(t, LEGACY[i] + 0.15, LEGACY[i + 1])));
  return NODES[NODES.length - 1].x;
};
const litAt = (i: number, t: number) => clamp((t - LEGACY[i]) / 0.15);

function drawLegacy(g: Gfx, t: number) {
  g.begin([4, 6, 12]);
  drawDepth(g, t, 0.1, 0.7);
  const x = pulseX(t);
  g.line(NODES[0].x, LY, NODES[NODES.length - 1].x, LY, C.dim, 0.6, 3);
  // the stretch the light has already travelled stays lit
  g.glowLine([[Math.min(NODES[0].x, x), LY], [x, LY]], C.ice, 0.9, 3);
  g.streak(x, LY, 0, 160, 18, C.white, 0.9); g.glow(x, LY, 46, C.white, 0.95, 'glow'); g.glow(x, LY, 260, C.ice, 0.25, 'halo');
  NODES.forEach((n, i) => {
    const k = litAt(i, t), age = t - LEGACY[i];
    if (k > 0) { g.glow(n.x, LY, 180, n.col, 0.45 * k, 'halo'); g.glowArc(n.x, LY, R + 6, n.col, 0.9 * k, 2.6); }
    if (age > 0 && age < 0.7) g.glowArc(n.x, LY, R + 6 + age * 300, n.col, (1 - age / 0.7) * 0.7, 2.6);
  });
  g.bloom(0.7);
  g.vignette(0.6);
  g.grain(Math.round(t * FPS), 0.12);
}

// Small line-art icons for the four milestones (the alga one is shared with the quiz)
const ink = (k: number, col: RGB) => `rgb(${[0, 1, 2].map((j) => Math.round(lerp(200, col[j], k))).join(',')})`;
const NeuronIcon: React.FC<{k: number}> = ({k}) => (
  <g stroke={ink(k, KEYS.blue)} strokeWidth={4} fill="none" strokeLinecap="round">
    <circle r={14} fill={k > 0.5 ? rgba('blue', 0.35) : 'none'} />
    {[[-40, -30], [-44, 6], [-24, 36], [12, -42], [44, 30]].map(([x, y], i) => <path key={i} d={`M ${x * 0.3} ${y * 0.3} Q ${x * 0.6} ${y * 0.4} ${x} ${y}`} />)}
    <path d="M 12 10 Q 30 20 52 44" />
  </g>
);
const EyeIcon: React.FC<{k: number}> = ({k}) => (
  <g stroke={ink(k, KEYS.orange)} strokeWidth={4} fill="none" strokeLinecap="round">
    <path d="M -48 0 Q 0 -40 48 0 Q 0 40 -48 0 Z" />
    <circle r={14} fill={k > 0.5 ? rgba('orange', 0.5) : 'none'} />
  </g>
);
const MedalIcon: React.FC<{k: number}> = ({k}) => (
  <g stroke={ink(k, GOLD)} strokeWidth={4} fill="none" strokeLinecap="round">
    <path d="M -16 -48 L -6 -14 M 16 -48 L 6 -14" />
    <circle cy={10} r={26} fill={k > 0.5 ? 'rgba(236,200,120,0.35)' : 'none'} />
    <path d="M -9 10 L -2 17 L 11 3" strokeWidth={4.5} />
  </g>
);

export const Legacy: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill>
    <Art t={t} draw={drawLegacy} />
    {NODES.map((n, i) => {
      // each milestone bumps up a little the moment the light reaches it
      const k = litAt(i, t), on = t >= LEGACY[i], bump = on ? Math.exp(-(t - LEGACY[i]) / 0.18) : 0;
      const col = `rgb(${n.col.join(',')})`, appear = clamp(seg(t, 60.0 + i * 0.12, 60.35 + i * 0.12) * 1.2);
      return (
        <div key={n.year} style={{position: 'absolute', left: n.x - 115, top: LY - 172, width: 230, height: 360, opacity: appear}}>
          <div style={{position: 'absolute', top: 0, width: '100%', textAlign: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 36, color: on ? col : 'rgba(170,186,204,0.7)', letterSpacing: 1}}>{n.year}</div>
          <svg width={230} height={170} viewBox="-115 -85 230 170" style={{position: 'absolute', top: 87, transform: `scale(${1 + 0.18 * bump})`}}>
            <circle r={R} fill="rgba(8,14,26,0.92)" />
            <g transform={`scale(${0.8 + 0.08 * k})`}>
              {i === 0 ? <AlgaIcon t={t} dim={0.75 + 0.25 * k} lit={k} /> : i === 1 ? <NeuronIcon k={k} /> : i === 2 ? <EyeIcon k={k} /> : <MedalIcon k={k} />}
            </g>
          </svg>
          <div style={{position: 'absolute', top: 266, width: '100%', textAlign: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 32, color: on ? '#eef6ff' : 'rgba(170,186,204,0.75)', whiteSpace: 'nowrap'}}>{n.label}</div>
        </div>
      );
    })}
  </AbsoluteFill>
);
