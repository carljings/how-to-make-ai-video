// Birds.tsx · 候鸟出现它的影迹: above the clouds at golden hour. Birds arrive one per syllable and fall into a V; on 迹
// the winged mascot joins at the tail. Their shadows (影迹) sweep across the cloud sea below.
import React from 'react';
import {CW} from '../layout';
import {BIRDS, BARLINE, HALF, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Bird} from '../art/cast';
import {CloudSea} from './Wings';
import {clamp, seg, lerp, easeOut, TAU} from '../lib/math';

// V formation pointing right: lead at the front, then alternating above/below
export const SLOTS: [number, number][] = [[690, 250], [612, 196], [612, 304], [534, 142], [534, 358], [456, 88], [456, 412]];
export const birdAt = (t: number, i: number) => {
  const ta = BIRDS.arrive[i], k = easeOut(clamp((t - ta + 0.12) / 0.45));
  const [sx, sy] = SLOTS[i];
  return {x: lerp(CW + 120, sx, k) + 6 * Math.sin(t * 3 + i), y: lerp(sy + 90, sy, k) + 8 * Math.sin(t * 4.2 + i * 1.3), k, up: Math.floor((t - BARLINE[9]) / (HALF / 1)) % 2 === (i % 2)};
};

export const Birds: React.FC<{t: number}> = ({t}) => {
  const n = BIRDS.arrive.filter((ta) => t >= ta).length;
  const join = easeOut(clamp((t - BIRDS.arrive[7] + 0.1) / 0.5));
  const shadow = seg(t, BIRDS.shadow - 0.1, BIRDS.shadow + 0.4);
  const beat = Math.exp(-sincePulse(t) / 0.12);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #F59A6B 0%, #FFC27D 45%, #FFE3B0 100%)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: CW - 260, top: 380, width: 360, height: 360, borderRadius: 180, background: 'radial-gradient(circle, #FFF4C8 0%, #FFD27A 40%, rgba(255,210,122,0) 70%)'}} />
      <CloudSea y={520} t={t} drift={260} tint="#FFF3E2" />
      {/* shadows on the cloud sea */}
      {shadow > 0 && SLOTS.slice(0, n).map(([sx], i) => <div key={i} style={{position: 'absolute', left: sx - 34 + 30 * Math.sin(t * 2 + i), top: 585 + (i % 3) * 18, width: 68, height: 14, borderRadius: 7, background: 'rgba(120,80,60,0.25)', opacity: shadow}} />)}
      {SLOTS.map((_, i) => {
        const b = birdAt(t, i);
        return b.k > 0 ? <Bird key={i} x={b.x} y={b.y} u={7.5} up={b.up} /> : null;
      })}
      {join > 0 && <Clawd x={lerp(-80, 330, join)} y={lerp(560, 300, join) + 10 * Math.sin(t * 4)} u={7} eye={1} mood="happy" squash={1 + 0.04 * beat} cap={null} heart={0.7}
        wings={{flap: 26 * Math.sin(t * TAU * 3.75), k: 1}} tilt={-6} />}
    </div>
  );
};
