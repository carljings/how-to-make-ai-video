// Mountain.tsx · 玉山白雪飘零: a huge snowy peak rises on 玉 under a night sky with an aurora; on 山 the tiny mascot
// (red scarf) stands on the summit; snow starts on 白雪, a gust blows it sideways on 飘, and one flake lands on its
// nose on 零. Fire.tsx is the close-up on the same summit.
import React from 'react';
import {CW, CH} from '../layout';
import {MOUNTAIN, BARLINE, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Snowflake} from '../art/cast';
import {Star, Sparkle} from '../art/props';
import {clamp, seg, lerp, easeOut, easeInOut, rng, TAU} from '../lib/math';

const STARS = (() => { const r = rng(77); return Array.from({length: 36}, () => ({x: r() * CW, y: r() * 300, ph: r() * TAU})); })();
const FLAKES = (() => { const r = rng(78); return Array.from({length: 55}, () => ({x0: r() * (CW + 300) - 150, y0: r(), sp: 60 + r() * 70, ph: r() * TAU, u: 2.6 + r() * 2.6})); })();
export const SnowFall: React.FC<{t: number; t0: number; amount: number; gust: number}> = ({t, t0, amount, gust}) => (
  <>
    {FLAKES.map((f, i) => {
      if (i / FLAKES.length > amount) return null;
      const dt = t - t0, y = ((f.y0 * (CH + 80) + dt * f.sp) % (CH + 80)) - 40, x = ((f.x0 + 30 * Math.sin(dt * 1.4 + f.ph) + gust * 180 * (0.6 + f.y0)) % (CW + 300) + CW + 300) % (CW + 300) - 150;
      return <Snowflake key={i} x={x} y={y} u={f.u} rot={dt * 60 + f.ph * 20} opacity={0.9} />;
    })}
  </>
);
export const Aurora: React.FC<{t: number; o: number}> = ({t, o}) => (
  <svg width={CW} height={360} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
    {[0, 1, 2].map((i) => {
      const pts = Array.from({length: 12}, (_, k) => `${(k / 11) * CW},${90 + i * 46 + 34 * Math.sin(k * 0.8 + t * 0.9 + i)}`).join(' L');
      return <path key={i} d={`M${pts}`} fill="none" stroke={['#5FF2B8', '#5FD6F2', '#B48CF2'][i]} strokeWidth={30 - i * 6} strokeLinecap="round" opacity={0.28} />;
    })}
  </svg>
);
export const Peak: React.FC<{y: number; w?: number}> = ({y, w = CW}) => (
  // the summit sits at (w / 2, y)
  <svg width={w} height={CH + 400} style={{position: 'absolute', left: 0, top: y - 10}}>
    <path d={`M${w / 2} 10 L${w / 2 + 120} 170 L${w / 2 + 200} 150 L${w + 120} ${CH + 300} L-120 ${CH + 300} L${w / 2 - 230} 210 L${w / 2 - 160} 190 Z`} fill="#4E6A9E" />
    <path d={`M${w / 2} 10 L${w / 2 + 120} 170 L${w / 2 + 200} 150 L${w + 120} ${CH + 300} L${w / 2 + 40} ${CH + 300} L${w / 2 + 20} 300 Z`} fill="#3B5384" />
    <path d={`M${w / 2} 10 L${w / 2 + 120} 170 L${w / 2 + 70} 160 L${w / 2 + 40} 200 L${w / 2} 170 L${w / 2 - 50} 215 L${w / 2 - 90} 190 L${w / 2 - 160} 190 Z`} fill="#F4F8FF" />
    <path d={`M${w / 2} 10 L${w / 2 + 120} 170 L${w / 2 + 70} 160 L${w / 2 + 40} 200 L${w / 2 + 10} 175 Z`} fill="#D2DEF2" />
  </svg>
);

export const Mountain: React.FC<{t: number}> = ({t}) => {
  const rise = easeOut(seg(t, MOUNTAIN.rise - 0.35, MOUNTAIN.rise + 0.5));
  const pull = easeInOut(seg(t, BARLINE[12], BARLINE[13]));
  const appear = easeOut(seg(t, MOUNTAIN.summit - 0.05, MOUNTAIN.summit + 0.3));
  const snow = seg(t, MOUNTAIN.snow - 0.1, MOUNTAIN.snow + 0.6);
  const gust = easeInOut(seg(t, MOUNTAIN.gust - 0.05, MOUNTAIN.gust + 0.5));
  const beat = Math.exp(-sincePulse(t) / 0.12);
  const peakY = lerp(CH + 60, 210, rise);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0D1433 0%, #1E2C63 55%, #3A4F8E 100%)', overflow: 'hidden'}}>
      {STARS.map((s, i) => <Star key={i} x={s.x} y={s.y} u={4} b={0.5 + 0.5 * Math.sin(t * 1.8 + s.ph)} />)}
      <Aurora t={t} o={0.4 + 0.6 * rise} />
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1.18, 1, pull)})`, transformOrigin: '50% 40%'}}>
        <Peak y={peakY} />
        {appear > 0 && <Clawd x={444} y={peakY + 14} u={5} eye={1} mood={t > MOUNTAIN.flake ? 'surprised' : 'normal'} squash={1 + 0.06 * beat} cap={null} heart={0.6} scarf opacity={appear} />}
        <Sparkle x={444 + 18} y={peakY - 30} s={18} k={(t - MOUNTAIN.flake) / 0.5} color="#FFFFFF" />
      </div>
      <SnowFall t={t} t0={MOUNTAIN.snow} amount={clamp(snow)} gust={gust} />
      <div style={{position: 'absolute', left: 0, top: CH - 70, width: CW, height: 70, background: 'linear-gradient(rgba(255,255,255,0), rgba(230,238,255,0.6))'}} />
    </div>
  );
};
