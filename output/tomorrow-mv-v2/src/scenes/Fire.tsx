// Fire.tsx · 燃烧少年的心: close-up on the summit in the snow. The chest heart catches on 燃, the flames grow on 烧,
// an aura rises on 少年, and on 心 it bursts: a ring of fire, a shockwave, sparks, and the snow around it melts.
import React from 'react';
import {CW, CH} from '../layout';
import {FIRE, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Flame} from '../art/cast';
import {Sparkle, Ripple} from '../art/props';
import {SnowFall, Aurora} from './Mountain';
import {clamp, seg, lerp, easeOut, TAU} from '../lib/math';

const MX = 444, U = 27, FEET = CH - 34, TOP = FEET - 10 * U;
export const FIRE_HEART: [number, number] = [MX, TOP + 6.1 * U];

export const Fire: React.FC<{t: number}> = ({t}) => {
  const beat = Math.exp(-sincePulse(t) / 0.1);
  const grow = clamp(seg(t, FIRE.spark - 0.05, FIRE.grow + 0.3) * 0.6 + seg(t, FIRE.boom - 0.05, FIRE.boom + 0.25) * 0.4);
  const aura = seg(t, FIRE.aura - 0.1, FIRE.aura + 0.4);
  const boom = t - FIRE.boom;
  const melt = easeOut(seg(t, FIRE.boom, FIRE.boom + 0.8));
  const n = Math.round(lerp(1, 14, grow));
  return (
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, #121A3E 0%, ${melt > 0 ? '#5A2A4A' : '#25356E'} 60%, ${melt > 0 ? '#C8553A' : '#4A5E9C'} 100%)`, overflow: 'hidden'}}>
      <Aurora t={t} o={0.6 * (1 - melt)} />
      <SnowFall t={t} t0={FIRE.spark - 3} amount={1 - melt} gust={0} />
      {boom > 0 && <div style={{position: 'absolute', left: MX - 260, top: -40, width: 520, height: CH + 40, background: 'linear-gradient(0deg, rgba(255,120,40,0.85) 0%, rgba(255,200,90,0.5) 50%, rgba(255,220,120,0) 100%)', borderRadius: '50% 50% 0 0', opacity: Math.exp(-boom / 0.9) * 0.9, transform: `scaleX(${0.6 + 0.4 * Math.exp(-boom / 0.3)})`}} />}
      {/* the aura */}
      {aura > 0 && <div style={{position: 'absolute', left: MX - 340, top: FIRE_HEART[1] - 360, width: 680, height: 680, borderRadius: 340,
        background: 'radial-gradient(circle, rgba(255,190,90,0.75) 0%, rgba(255,110,60,0.35) 40%, rgba(255,110,60,0) 70%)', opacity: aura * (0.75 + 0.25 * beat), transform: `scale(${0.8 + 0.25 * aura + 0.4 * melt})`}} />}
      {/* snow bank that melts away */}
      <div style={{position: 'absolute', left: -40, top: CH - 120 + 120 * melt, width: CW + 80, height: 200, borderRadius: '50% 50% 0 0', background: '#EEF3FF'}} />
      {/* flames ring around the heart, more as it grows */}
      {grow > 0 && Array.from({length: n}, (_, i) => {
        const a = (i / n) * TAU + t * 1.2, r = lerp(30, 170 + 60 * melt, grow) * (0.7 + 0.3 * Math.sin(i * 2.1));
        return <Flame key={i} x={FIRE_HEART[0] + Math.cos(a) * r} y={FIRE_HEART[1] + Math.sin(a) * r * 0.8 + 40} u={lerp(4, 9, grow) * (0.8 + 0.2 * Math.sin(i))} k={t + i * 0.37} />;
      })}
      {/* the heart itself flares */}
      <div style={{position: 'absolute', left: FIRE_HEART[0] - 120, top: FIRE_HEART[1] - 120, width: 240, height: 240, borderRadius: 120, background: 'radial-gradient(circle, #FFF2B0 0%, rgba(255,140,60,0.8) 35%, rgba(255,80,40,0) 70%)',
        opacity: clamp(grow * 1.4) * (0.7 + 0.3 * beat), transform: `scale(${0.6 + 0.6 * grow + (boom > 0 ? 0.8 * Math.exp(-boom / 0.2) : 0)})`}} />
      <Clawd x={MX} y={FEET} u={U} eye={1} glint={1} mood={boom > 0 && boom < 0.25 ? 'surprised' : 'normal'} squash={1 + 0.04 * beat - 0.08 * (boom > 0 ? Math.exp(-boom / 0.1) : 0)}
        cap={null} heart={1} armL={boom > 0 ? 2.5 * Math.exp(-boom / 0.6) : 0} armR={boom > 0 ? 2.5 * Math.exp(-boom / 0.6) : 0} />
      {grow > 0 && <Flame x={FIRE_HEART[0]} y={FIRE_HEART[1] + 30} u={lerp(3, 13, grow) * (1 + 0.15 * beat)} k={t * 1.3} />}
      <div style={{position: 'absolute', left: FIRE_HEART[0] - 40, top: FIRE_HEART[1] - 40, width: 80, height: 80, borderRadius: 40, background: 'radial-gradient(circle, rgba(255,250,210,0.95) 0%, rgba(255,170,80,0) 70%)', opacity: clamp(grow * 1.6) * (0.6 + 0.4 * beat)}} />
      {boom > 0 && <Ripple x={FIRE_HEART[0]} y={FIRE_HEART[1]} k={boom / 0.6} r={700} color="#FFD27A" width={18} />}
      {boom > 0 && Array.from({length: 18}, (_, i) => {
        const a = (i / 18) * TAU, d = 80 + 420 * easeOut(clamp(boom / 0.7));
        return <Sparkle key={i} x={FIRE_HEART[0] + Math.cos(a) * d} y={FIRE_HEART[1] + Math.sin(a) * d} s={16 + (i % 3) * 7} k={boom / 0.8} color={i % 2 ? '#FFE07A' : '#FF8A3A'} />;
      })}
      {Array.from({length: 10}, (_, i) => { // rising embers
        const k = ((t * 0.7 + i * 0.13) % 1); if (grow <= 0) return null;
        return <div key={'e' + i} style={{position: 'absolute', left: MX - 200 + ((i * 97) % 400) + 20 * Math.sin(t * 3 + i), top: FIRE_HEART[1] - k * 420, width: 8, height: 8, background: i % 2 ? '#FFD27A' : '#FF7A3A', opacity: (1 - k) * grow}} />;
      })}
    </div>
  );
};
