// Planet.tsx · 孤独的转个不停: the rolled-up map becomes a small planet in the dark. The mascot walks alone on top
// while it spins; the sun and moon race round it; 转、个、不、停 join a ring that keeps turning, and on 停 the whole
// thing jolts as if braking, then carries on.
import React from 'react';
import {CW, CH} from '../layout';
import {PLANET, BARLINE, HALF, pulseAt, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Star, Sun} from '../art/props';
import {DOTS, sphere} from '../art/globe';
import {GLOBE0, jumpFeet} from './World';
import {LINES} from '../timeline';
import {SERIF} from '../lib/fonts';
import {clamp, seg, lerp, easeOut, easeInOut, backOut, smooth, rng, TAU} from '../lib/math';

const A = BARLINE[3];
const STARS = (() => { const r = rng(33); return Array.from({length: 40}, () => ({x: r() * CW, y: r() * CH, ph: r() * TAU, u: r() < 0.3 ? 5 : 3.5})); })();
export const planetAt = (t: number) => {
  const k = easeInOut(seg(t, A, A + 0.4));
  const x = t - A;
  let spin = x <= 0 ? 0 : x < 0.3 ? (80 * x * x) / 0.6 : 80 * (x - 0.15); // degrees, easing into 80°/s
  spin -= 14 * smooth(seg(t, PLANET.brake, PLANET.brake + 0.14)); // 停: the jolt
  return {cx: 444, cy: lerp(GLOBE0.cy, 372, k), R: lerp(GLOBE0.R, 150, k), lam: GLOBE0.lam + spin};
};

export const Planet: React.FC<{t: number}> = ({t}) => {
  const P = planetAt(t);
  const night = seg(t, A, A + 0.32);
  const th = (TAU * (t - A)) / 1.6 + 0.6; // sun and moon: once round every four pulses
  const orbit = (a: number): [number, number, number] => {
    const ox = Math.cos(a) * 215, oy = Math.sin(a) * 52, c = Math.cos(-0.18), s = Math.sin(-0.18);
    return [P.cx + ox * c - oy * s, P.cy + 10 + ox * s + oy * c, Math.sin(a)];
  };
  const sun = orbit(th), moon = orbit(th + Math.PI);
  const body = (o: [number, number, number], kind: 'sun' | 'moon') => kind === 'sun'
    ? <Sun key="s" x={o[0]} y={o[1]} r={26} color="#FFC94A" />
    : <div key="m" style={{position: 'absolute', left: o[0] - 20, top: o[1] - 20, width: 40, height: 40, borderRadius: 20, background: '#FFF1C9', boxShadow: 'inset -10px -4px 0 #D9C9A0'}} />;
  // the mascot keeps walking on top (legs swap every half-pulse); 停 makes it stumble
  const feet = t < A + 0.25 ? jumpFeet(t, P.cy - P.R + 4) : P.cy - P.R + 4;
  const stumble = Math.exp(-Math.max(0, t - PLANET.brake) / 0.12) * (t > PLANET.brake ? 1 : 0);
  const walk = t > A + 0.25 ? Math.floor((t - A) / HALF) : null;
  // the text ring: each character pops in when sung, the ring turns clockwise, and brakes on 停
  const L = LINES[3].syl, ring = 232;
  let rho = 46 * Math.max(0, t - L[3].t);
  rho -= 12 * smooth(seg(t, PLANET.brake, PLANET.brake + 0.12));
  const lightA = Math.atan2(sun[1] - P.cy, sun[0] - P.cx);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3E9D2'}}>
      <div style={{position: 'absolute', inset: 0, clipPath: `circle(${lerp(GLOBE0.R + 4, 900, easeOut(night))}px at ${P.cx}px ${P.cy}px)`, background: 'radial-gradient(ellipse 90% 80% at 50% 50%, #22306A 0%, #151C40 60%, #0E132E 100%)'}}>
        {STARS.map((s, i) => <Star key={i} x={s.x} y={s.y} u={s.u} b={Math.max(0.5 + 0.5 * Math.sin(t * 2 + s.ph), pulseAt(t) % 3 === i % 3 ? Math.exp(-sincePulse(t) / 0.15) : 0)} />)}
      </div>
      {/* orbit ring for the words, behind everything */}
      <div style={{position: 'absolute', left: P.cx - ring, top: P.cy - ring, width: ring * 2, height: ring * 2, borderRadius: '50%', border: '3px dashed rgba(255,236,190,0.35)', opacity: seg(t, L[3].t - 0.3, L[3].t)}} />
      {sun[2] < 0 && body(sun, 'sun')}{moon[2] < 0 && body(moon, 'moon')}
      <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <radialGradient id="shade" cx={0.5 - 0.45 * Math.cos(lightA)} cy={0.5 - 0.45 * Math.sin(lightA)} r={0.9}>
            <stop offset="0.35" stopColor="#0E132E" stopOpacity={0.3} /><stop offset="0.75" stopColor="#0E132E" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={P.cx} cy={P.cy} r={P.R + 6} fill="#F8F1E1" stroke="#CDB78F" strokeWidth={4} />
        {DOTS.map((d, i) => {
          const [x, y, z] = sphere(d.lon, d.lat, P.lam, GLOBE0.phi, P.cx, P.cy, P.R);
          return z > 0 ? <circle key={i} cx={x} cy={y} r={4.6 * (0.55 + 0.45 * z) * (P.R / GLOBE0.R) ** 0.5} fill={i % 9 === 0 ? '#2F4C8A' : '#D9825C'} /> : null;
        })}
        <circle cx={P.cx} cy={P.cy} r={P.R + 6} fill="url(#shade)" opacity={night} />
      </svg>
      {[3, 4, 5, 6].map((i, j) => {
        const u = t - L[i].t; if (u < -0.04) return null;
        const a = ((-90 + j * 90 + rho) * Math.PI) / 180, x = P.cx + Math.cos(a) * ring, y = P.cy + Math.sin(a) * ring;
        const pop = Math.max(0, backOut(clamp((u + 0.04) / 0.24), 2.2));
        const brake = i === 6 ? 1 + 0.25 * Math.exp(-Math.max(0, u) / 0.08) : 1;
        return (
          <div key={i} style={{position: 'absolute', left: x - 58, top: y - 58, width: 116, height: 116, borderRadius: 58, background: '#24345C', border: '5px solid #E8B95A', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${pop * brake}, ${pop / brake})`, boxShadow: '0 0 24px rgba(255,214,140,0.45)'}}>
            <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 70, lineHeight: 1, color: '#FFF4D8', marginTop: -4}}>{L[i].ch}</div>
          </div>
        );
      })}
      <Clawd x={P.cx} y={feet} u={9} eye={1} gaze={0.7} walk={walk} lift={0.35 * Math.exp(-sincePulse(t * 1) / 0.08) * (walk === null ? 0 : 1)}
        tilt={-14 * stumble + (t < A + 0.25 ? 0 : 3)} cap={{x: 0, y: 0, r: -8 - 10 * stumble}} heart={0.6} mood={t < A + 0.25 ? 'surprised' : 'normal'} />
      {sun[2] >= 0 && body(sun, 'sun')}{moon[2] >= 0 && body(moon, 'moon')}
      {/* "the lonely one": a soft vignette closes in while 孤独 is sung */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 50% 40%, rgba(0,0,0,0) 50%, rgba(5,8,25,0.55) 100%)', opacity: easeOut(seg(t, L[0].t, L[1].t + 0.3)) * night}} />
    </div>
  );
};
