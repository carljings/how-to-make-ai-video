// Dawn.tsx · 慢慢张开你的眼睛: a close-up of the mascot's face at dawn. The eyes open in steps on 张、开、眼, blink on
// 睛 and look at the viewer, while the sun climbs behind its head.
import React from 'react';
import {CW, CH} from '../layout';
import {DAWN, BARLINE, LINES, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Sun, Sparkle} from '../art/props';
import {clamp, seg, lerp, easeOut, backOut} from '../lib/math';

const MX = 444, U = 40, FEET = CH + 70;
const TOP = FEET - 10 * U;
// The right eye's centre: the eye-iris transition into the world scene opens from here
export const DAWN_EYE: [number, number] = [MX + 2.5 * U, TOP + 3 * U];

const mix = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], k))).join(',')})`;
};

export const eyeAt = (t: number) => {
  const L = LINES[1].syl;
  let e = 0;
  for (const tk of [L[0].t, L[1].t]) e = Math.max(e, 0.12 * Math.exp(-(((t - tk - 0.06) / 0.06) ** 2))); // flutters on 慢、慢
  const steps: [number, number][] = [[DAWN.open1, 0.35], [DAWN.open2, 0.65], [DAWN.open3, 1]];
  let level = 0;
  for (const [tk, to] of steps) if (t >= tk - 0.02) level = lerp(level, to, clamp(backOut(clamp((t - tk + 0.02) / 0.2), 1.6), 0, 1.15));
  e = Math.max(e, level);
  for (const tb of [DAWN.blink, DAWN.blink2]) if (t > tb && t < tb + 0.16) e *= 0.08 + 0.92 * Math.abs((t - tb - 0.08) / 0.08);
  return e;
};

export const Dawn: React.FC<{t: number}> = ({t}) => {
  const p = seg(t, BARLINE[1] - 0.3, BARLINE[2]);
  const sunY = lerp(CH + 70, CH - 190, easeOut(p));
  const beat = Math.exp(-sincePulse(t) / 0.12);
  const eye = eyeAt(t);
  const bg = `linear-gradient(180deg, ${mix('#262A63', '#5A6CB8', p)} 0%, ${mix('#6E4A8C', '#E79A9A', p)} 48%, ${mix('#E9907A', '#FFD49A', p)} 78%, ${mix('#FFB878', '#FFE9B8', p)} 100%)`;
  return (
    <div style={{position: 'absolute', inset: 0, background: bg}}>
      {/* soft clouds lit from below */}
      {[[90, 120, 220], [600, 70, 260], [380, 190, 160]].map(([x, y, w], i) => (
        <div key={i} style={{position: 'absolute', left: x + 14 * t * (i % 2 ? -1 : 1) - 60, top: y, width: w, height: w * 0.28, borderRadius: w,
          background: mix('#8A6AA0', '#FFE0D0', p), opacity: 0.55}} />
      ))}
      <Sun x={MX} y={sunY} r={170} spin={t * 0.25} rays={16} color="#FFD36A" rayColor="#FFF0C0" rayOpacity={0.16 + 0.1 * p} />
      <svg width={CW} height={160} viewBox={`0 0 ${CW} 160`} style={{position: 'absolute', left: 0, top: CH - 150}}>
        <path d={`M0 90 Q 180 40 380 80 T ${CW} 60 L ${CW} 160 L 0 160 Z`} fill={mix('#3A2E66', '#E98A6E', p)} />
        <path d={`M0 120 Q 260 90 520 118 T ${CW} 104 L ${CW} 160 L 0 160 Z`} fill={mix('#2A2250', '#C9705E', p)} />
      </svg>
      <Clawd x={MX} y={FEET} u={U} eye={eye} squash={1 + 0.012 * Math.sin(t * 2.4) + 0.02 * beat} glint={1}
        blush={easeOut(seg(t, DAWN.blink, DAWN.blink + 0.3))} cap={{x: -0.6, y: 0.3, r: 5 + 2 * Math.sin(t * 1.6)}} heart={0} />
      {[0, 1, 2, 3].map((i) => {
        const k = (t - DAWN.open3 - i * 0.05) / 0.5, side = i % 2 ? 1 : -1;
        return <Sparkle key={i} x={MX + side * (190 + 40 * (i >> 1))} y={TOP + 2 * U - 40 * (i >> 1)} s={26 - 6 * (i >> 1)} k={k} color="#FFF4C8" />;
      })}
    </div>
  );
};
