// Bless.tsx · 倾诉遥远的祝福: the notes fly off over a turning globe toward the far village (倾诉); on 遥远 the camera dives
// into the village postcard; on 祝 the storm parts, the notes swirl round the kitten and her bowl fills with hearts;
// on 福 she bounces and fireworks go up. (The screen-wide finale, the giant heart of postcards, is in Film.tsx.)
import React from 'react';
import {CW, CH} from '../layout';
import {BLESS, HALF, sincePulse} from '../timeline';
import {Note, Firework} from '../art/cast';
import {DOTS, sphere} from '../art/globe';
import {Village} from './News';
import {AIRMAIL} from '../art/paper';
import {clamp, seg, lerp, easeOut, easeIn, easeInOut, TAU} from '../lib/math';

const G = {cx: 444, cy: 360, R: 210, phi: 18};
const VILLAGE = {lon: 105, lat: 28};

export const Bless: React.FC<{t: number}> = ({t}) => {
  const lam = 40 + 22 * (t - BLESS.send);
  const [vx, vy] = sphere(VILLAGE.lon, VILLAGE.lat, lam, G.phi, G.cx, G.cy, G.R);
  const dive = easeInOut(seg(t, BLESS.arrive - 0.25, BLESS.arrive + 0.35));
  const clear = easeOut(seg(t, BLESS.clear - 0.15, BLESS.clear + 0.4));
  const fill = easeOut(seg(t, BLESS.clear, BLESS.boom));
  const boom = t - BLESS.boom;
  const beat = Math.exp(-sincePulse(t) / 0.1);
  const pw = lerp(40, CW - 40, dive), ph = lerp(30, CH - 40, dive), px = lerp(vx, CW / 2, dive), py = lerp(vy, CH / 2, dive);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #2A2F6E 0%, #5E5AA8 55%, #E59AA0 100%)', overflow: 'hidden'}}>
      {dive < 1 && (
        <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + 1.6 * easeIn(dive)})`, transformOrigin: `${vx}px ${vy}px`, opacity: 1 - seg(dive, 0.6, 1)}}>
          <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0}}>
            <circle cx={G.cx} cy={G.cy} r={G.R + 6} fill="#F8F1E1" stroke="#CDB78F" strokeWidth={4} />
            {DOTS.map((d, i) => { const [x, y, z] = sphere(d.lon, d.lat, lam, G.phi, G.cx, G.cy, G.R); return z > 0 ? <circle key={i} cx={x} cy={y} r={4.4 * (0.55 + 0.45 * z)} fill="#D9825C" /> : null; })}
            <circle cx={vx} cy={vy} r={12 + 4 * beat} fill="#E8433A" stroke="#FFFFFF" strokeWidth={4} />
          </svg>
          {/* notes arcing over the globe to the village */}
          {Array.from({length: 10}, (_, i) => {
            const tb = BLESS.send + i * HALF * 0.5, k = (t - tb) / 0.9; if (k < 0 || k > 1) return null;
            const x0 = -40, y0 = 120 + (i % 3) * 60, cx = (x0 + vx) / 2, cy = Math.min(y0, vy) - 200;
            const x = (1 - k) ** 2 * x0 + 2 * (1 - k) * k * cx + k * k * vx, y = (1 - k) ** 2 * y0 + 2 * (1 - k) * k * cy + k * k * vy;
            return <Note key={i} x={x} y={y} u={7} rot={20 * Math.sin(k * TAU)} color={i % 2 ? '#FFE07A' : '#FFFFFF'} opacity={1 - seg(k, 0.85, 1)} />;
          })}
        </div>
      )}
      {dive > 0 && (
        <div style={{position: 'absolute', left: px - pw / 2, top: py - ph / 2, width: pw, height: ph, background: AIRMAIL, padding: lerp(3, 12, dive), boxSizing: 'border-box', transform: `rotate(${lerp(-10, -1, dive)}deg) scale(${1 + 0.012 * beat})`, boxShadow: '0 12px 26px rgba(0,0,0,0.3)'}}>
          <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#FBF6EA'}}>
            <Village t={t} w={pw - 24} h={ph - 24} storm={1} clear={clear} bolt={-1} fill={fill} mood={t > BLESS.clear ? 'happy' : 'sad'} />
            {/* notes swirl round the kitten as they arrive */}
            {dive > 0.6 && Array.from({length: 8}, (_, i) => {
              const a = (i / 8) * TAU + t * 2.2, r = lerp(260, 120, clear) + 20 * Math.sin(t * 3 + i), k = clamp((t - BLESS.arrive - i * 0.05) / 0.3);
              return <Note key={i} x={(pw - 24) * 0.45 + Math.cos(a) * r} y={(ph - 24) * 0.66 + Math.sin(a) * r * 0.55} u={7} color={i % 2 ? '#FFE07A' : '#FFFFFF'} opacity={k * (1 - seg(t, BLESS.boom, BLESS.boom + 0.3))} />;
            })}
            {boom > -0.05 && [0, 1, 2, 3].map((i) => <Firework key={i} x={(pw - 24) * [0.25, 0.72, 0.5, 0.86][i]} y={(ph - 24) * [0.24, 0.2, 0.12, 0.34][i]} k={boom - i * 0.12} r={150 - i * 15}
              colors={[['#FFE07A', '#FF8A3A'], ['#FF7A9A', '#FFFFFF'], ['#7AE0FF', '#FFFFFF'], ['#B88CFF', '#FFE07A']][i]} seed={i * 1.7} />)}
          </div>
        </div>
      )}
      <div style={{position: 'absolute', inset: 0, background: '#FFFFFF', opacity: boom > 0 && boom < 0.12 ? 0.6 * (1 - boom / 0.12) : 0}} />
    </div>
  );
};
