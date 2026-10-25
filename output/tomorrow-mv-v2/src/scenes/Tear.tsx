// Tear.tsx · 让昨日脸上的泪痕 and Wind.tsx's 随记忆风干了 share this close-up: rain, memories, one big tear.
// Tear: the rain thickens on 让, polaroids of earlier scenes drift past on 昨, the camera leans in on 脸, the tear rolls
// on 泪 and leaves its streak on 痕.
import React from 'react';
import {CW, CH} from '../layout';
import {TEAR, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Rain} from '../art/cast';
import {Sparkle, Moon, Sun} from '../art/props';
import {clamp, seg, lerp, easeOut, easeIn} from '../lib/math';

export const MX = 444, U = 40, FEET = CH + 70, TOP = FEET - 10 * U;
export const FACE: [number, number] = [MX, TOP + 3 * U];

// Five polaroids of the scenes so far; `fly` sends them off to the right (0..1 each)
const PHOTOS: {bg: string; icon: (s: number) => React.ReactNode}[] = [
  {bg: 'linear-gradient(#141B3D, #2D3B78)', icon: (s) => <Moon x={s * 0.55} y={s * 0.12} u={s * 0.04} />},
  {bg: 'linear-gradient(#6E4A8C, #F29A7A 70%, #FFD08A)', icon: (s) => <Sun x={s * 0.5} y={s * 0.62} r={s * 0.18} />},
  {bg: '#F3E9D2', icon: (s) => <div style={{position: 'absolute', inset: s * 0.15, backgroundImage: 'radial-gradient(#D9825C 30%, transparent 32%)', backgroundSize: `${s * 0.09}px ${s * 0.09}px`}} />},
  {bg: 'radial-gradient(#22306A, #0E132E)', icon: (s) => <div style={{position: 'absolute', left: s * 0.3, top: s * 0.3, width: s * 0.4, height: s * 0.4, borderRadius: '50%', background: '#F8F1E1'}} />},
  {bg: 'linear-gradient(#9ED6EF 60%, #82C56F 60%)', icon: (s) => <div style={{position: 'absolute', left: s * 0.62, top: s * 0.12, width: s * 0.22, height: s * 0.22, borderRadius: '50%', background: '#F59BB7'}} />},
];
export const SPOTS: [number, number, number][] = [[110, 150, -12], [770, 120, 10], [90, 430, 8], [800, 400, -9], [640, 40, 6]];
export const Polaroids: React.FC<{t: number; appear: number; fly: number[]}> = ({t, appear, fly}) => (
  <>
    {PHOTOS.map((p, i) => {
      const a = easeOut(clamp((t - appear - i * 0.09) / 0.35)), f = easeIn(clamp(fly[i] ?? 0));
      if (a <= 0 || f >= 1) return null;
      const [x0, y0, r0] = SPOTS[i], s = 118;
      const x = x0 + 8 * Math.sin(t * 1.3 + i) + f * 900, y = y0 + 10 * Math.sin(t * 1.1 + i * 2) - f * 220 + (1 - a) * 60;
      return (
        <div key={i} style={{position: 'absolute', left: x - s / 2, top: y, width: s, height: s * 1.18, background: '#FFFDF6', boxShadow: '0 8px 14px rgba(0,0,0,0.28)',
          transform: `rotate(${r0 + 6 * Math.sin(t * 1.7 + i) + f * 260}deg) scale(${a})`, opacity: a}}>
          <div style={{position: 'absolute', left: s * 0.08, top: s * 0.08, width: s * 0.84, height: s * 0.84, background: p.bg, overflow: 'hidden'}}>{p.icon(s * 0.84)}</div>
        </div>
      );
    })}
  </>
);

export const tearAt = (t: number) => {
  if (t < TEAR.face) return null;
  const y = easeIn(seg(t, TEAR.drop - 0.02, TEAR.drop + 0.42));
  return {y, streak: seg(t, TEAR.drop, TEAR.streak + 0.15)};
};

export const Tear: React.FC<{t: number}> = ({t}) => {
  const lean = easeOut(seg(t, TEAR.face - 0.05, TEAR.face + 0.35));
  const beat = Math.exp(-sincePulse(t) / 0.12);
  const splash = t - (TEAR.drop + 0.42);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #232B57 0%, #3E4E86 55%, #6E80B0 100%)', overflow: 'hidden'}}>
      <Rain t={t} w={CW} h={CH} n={70} speed={1100} slant={-0.22} opacity={lerp(0.45, 1, seg(t, TEAR.rain - 0.1, TEAR.rain + 0.3))} seed={3} />
      <Polaroids t={t} appear={TEAR.memory} fly={[]} />
      <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + 0.1 * lean})`, transformOrigin: `${FACE[0]}px ${FACE[1]}px`}}>
        <Clawd x={MX} y={FEET} u={U} eye={1} mood="sad" glint={1.4} squash={1 + 0.015 * beat} cap={null} tear={tearAt(t)} />
        {splash > 0 && splash < 0.5 && [0, 1, 2, 3, 4].map((i) => {
          const a = -Math.PI / 2 + (i - 2) * 0.5, d = 70 * easeOut(splash / 0.5);
          return <div key={i} style={{position: 'absolute', left: MX + 2.5 * U + Math.cos(a) * d - 6, top: TOP + 7.6 * U + Math.sin(a) * d + 160 * splash * splash - 6, width: 12, height: 12, borderRadius: 6, background: '#9BD3FA', opacity: 1 - splash / 0.5}} />;
        })}
      </div>
      <Sparkle x={MX + 2.5 * U} y={TOP + 2.2 * U} s={20} k={(t - TEAR.face) / 0.4} color="#E8F4FF" />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(0,0,0,0) 55%, rgba(8,12,35,0.5) 100%)'}} />
    </div>
  );
};
