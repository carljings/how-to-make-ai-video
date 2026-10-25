// Wind.tsx · 随记忆风干了: the same close-up. A gust on 随 turns the rain sideways; the polaroids fly off on 记、忆、风;
// the tear streak dries into sparkles on 干; the sun comes out and the mascot smiles on 了. Then the bass drops out:
// the light closes in to a spotlight and it takes a breath before the drop.
import React from 'react';
import {CW, CH} from '../layout';
import {WIND, BARLINE, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Rain} from '../art/cast';
import {Sparkle, Sun} from '../art/props';
import {Polaroids, MX, U, FEET, TOP} from './Tear';
import {clamp, seg, lerp, easeOut, easeInOut} from '../lib/math';
import {MONO} from '../lib/fonts';

const mix = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], k))).join(',')})`;
};

export const Wind: React.FC<{t: number}> = ({t}) => {
  const warm = easeInOut(seg(t, WIND.gust, WIND.sun + 0.4));
  const hush = easeInOut(seg(t, WIND.hush, BARLINE[8]));
  const beat = Math.exp(-sincePulse(t) / 0.12);
  const fly = WIND.fly.map((tf) => (t - tf + 0.05) / 0.7);
  const dry = seg(t, WIND.dry - 0.05, WIND.dry + 0.35);
  const mood = t > WIND.sun - 0.05 ? 'happy' : t > WIND.dry ? 'normal' : 'sad';
  const bg = `linear-gradient(180deg, ${mix('#232B57', '#5A8FD8', warm)} 0%, ${mix('#3E4E86', '#FFC88A', warm)} 60%, ${mix('#6E80B0', '#FFE6B8', warm)} 100%)`;
  return (
    <div style={{position: 'absolute', inset: 0, background: bg, overflow: 'hidden'}}>
      <Sun x={CW - 150} y={lerp(CH + 160, 170, easeOut(seg(t, WIND.sun - 0.2, WIND.sun + 0.6)))} r={90} spin={t * 0.4} rays={14} color="#FFD45A" rayColor="#FFF1C2" rayOpacity={0.35} />
      <Rain t={t} w={CW} h={CH} n={70} speed={1100} slant={lerp(-0.22, -2.2, easeOut(seg(t, WIND.gust, WIND.gust + 0.4)))} opacity={1 - seg(t, WIND.fly[1], WIND.fly[2] + 0.3)} seed={3} />
      <Polaroids t={t} appear={-10} fly={fly} />
      {[WIND.gust, WIND.fly[2]].map((tg, j) => Array.from({length: 4}, (_, i) => {
        const k = (t - tg - i * 0.05) / 0.55; if (k < 0 || k > 1) return null;
        return <div key={`${j}${i}`} style={{position: 'absolute', left: -300 + k * 1400, top: 90 + i * 140 + 30 * j, width: 260, height: 7, borderRadius: 4, background: '#FFFFFF', opacity: 0.75 * Math.sin(k * Math.PI)}} />;
      }))}
      <div style={{position: 'absolute', inset: 0, transform: `scale(${1.1 + 0.04 * hush})`, transformOrigin: `${MX}px ${TOP + 3 * U}px`}}>
        <Clawd x={MX} y={FEET} u={U} eye={1 - 0.85 * seg(t, BARLINE[8] - 0.3, BARLINE[8] - 0.05)} mood={mood} glint={1.2} squash={1 + 0.015 * beat + 0.09 * hush}
          blush={easeOut(seg(t, WIND.sun, WIND.sun + 0.3))} cap={null} tear={dry < 1 ? {y: 1, streak: 1 - dry} : null} />
        {[0, 1, 2, 3, 4].map((i) => <Sparkle key={i} x={MX + 2.5 * U + (i % 2 ? 14 : -10)} y={TOP + (4.2 + i * 0.7) * U} s={16 + (i % 3) * 5} k={(t - WIND.dry - i * 0.05) / 0.45} color="#FFFFFF" />)}
      </div>
      {/* the bass drops out: the light closes to a spotlight */}
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at ${MX}px ${TOP + 3.5 * U}px, rgba(0,0,0,0) ${lerp(900, 230, hush)}px, rgba(10,8,25,${0.82 * hush}) ${lerp(1000, 330, hush)}px)`}} />
      {clamp(hush) > 0.5 && <div style={{position: 'absolute', left: MX - 60, top: TOP - 120, fontFamily: MONO, fontSize: 56, fontWeight: 800, color: '#FFFFFF', opacity: (hush - 0.5) * 2, letterSpacing: 10}}>{'...'.slice(0, 1 + Math.floor((t - WIND.hush) / 0.18) % 3)}</div>}
    </div>
  );
};
