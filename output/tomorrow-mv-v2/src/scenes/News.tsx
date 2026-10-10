// News.tsx · 带来远处的饥荒 / 无情的战火: the lead bird drops a letter on 带; it opens on 远 and a postcard from far away
// fills the card: a little village at dusk, a kitten by an empty bowl (饥荒). On 无情的 storm clouds roll in; on 战 a
// red bolt strikes. (No war is drawn: the storm stands for it.) Buzz.tsx continues this postcard.
import React from 'react';
import {CW, CH} from '../layout';
import {NEWS, sincePulse} from '../timeline';
import {SERIF} from '../lib/fonts';
import {Kitten, Bowl, Bird} from '../art/cast';
import {Letter} from './Spring';
import {AIRMAIL} from '../art/paper';
import {clamp, seg, lerp, easeOut, easeIn, easeInOut} from '../lib/math';

// The far-away postcard: village, kitten, bowl, storm. storm 0..1, bolt = seconds since the bolt (or <0), fill = bowl
export const Village: React.FC<{t: number; w: number; h: number; storm: number; bolt: number; fill: number; mood: 'sad' | 'happy' | 'normal'; clear?: number}> = ({t, w, h, storm, bolt, fill, mood, clear = 0}) => {
  const flash = bolt >= 0 && bolt < 0.35 ? (bolt < 0.06 ? 1 : 1 - (bolt - 0.06) / 0.29) : 0;
  const s = Math.max(0, storm - clear);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: `linear-gradient(180deg, ${s > 0.5 ? '#3B3552' : '#7A5C9A'} 0%, ${s > 0.5 ? '#5D4F66' : '#F2A07A'} 70%, ${s > 0.5 ? '#6E5E6A' : '#FFD39A'} 100%)`}}>
      {clear > 0 && <div style={{position: 'absolute', left: w * 0.5 - 220, top: -120, width: 440, height: 440, borderRadius: 220, background: 'radial-gradient(circle, rgba(255,240,190,0.9) 0%, rgba(255,240,190,0) 70%)', opacity: clear}} />}
      {/* the village: houses and a hill */}
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={`M0 ${h * 0.72} Q ${w * 0.3} ${h * 0.6} ${w * 0.55} ${h * 0.7} T ${w} ${h * 0.66} L ${w} ${h} L 0 ${h} Z`} fill={s > 0.5 ? '#3E3448' : '#6B4A6E'} />
        {[0.12, 0.24, 0.66, 0.8].map((fx, i) => {
          const x = w * fx, y = h * 0.66 + (i % 2) * 10, hw = 46 + (i % 2) * 10;
          return <g key={i}><rect x={x} y={y - hw * 0.8} width={hw} height={hw * 0.8} fill={s > 0.5 ? '#2E2638' : '#4E3556'} /><path d={`M${x - 8} ${y - hw * 0.8} L${x + hw / 2} ${y - hw * 1.35} L${x + hw + 8} ${y - hw * 0.8} Z`} fill={s > 0.5 ? '#251E2E' : '#3E2846'} />
            <rect x={x + hw * 0.36} y={y - hw * 0.55} width={hw * 0.28} height={hw * 0.26} fill={s > 0.6 ? '#4A3E52' : '#FFD27A'} /></g>;
        })}
        <path d={`M0 ${h * 0.86} Q ${w * 0.5} ${h * 0.8} ${w} ${h * 0.86} L ${w} ${h} L 0 ${h} Z`} fill={s > 0.5 ? '#4A3C52' : '#8A5E78'} />
      </svg>
      {/* storm clouds roll in from the top */}
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{position: 'absolute', left: -60 + i * (w / 5), top: lerp(-260, -60 + (i % 2) * 30, easeOut(clamp(s))) , width: w / 3, height: 170, borderRadius: 90, background: '#3A3346', opacity: clamp(s * 1.4), boxShadow: 'inset 0 -16px 0 rgba(0,0,0,0.25)'}} />)}
      {flash > 0 && (
        <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
          <path d={`M${w * 0.62} 40 L${w * 0.55} ${h * 0.32} L${w * 0.62} ${h * 0.32} L${w * 0.5} ${h * 0.62}`} fill="none" stroke="#FF4A3A" strokeWidth={14} strokeLinejoin="miter" opacity={flash} />
          <path d={`M${w * 0.62} 40 L${w * 0.55} ${h * 0.32} L${w * 0.62} ${h * 0.32} L${w * 0.5} ${h * 0.62}`} fill="none" stroke="#FFE0DA" strokeWidth={5} opacity={flash} />
        </svg>
      )}
      {flash > 0 && <div style={{position: 'absolute', inset: 0, background: '#FF3B2E', opacity: 0.3 * flash, mixBlendMode: 'screen'}} />}
      <Bowl x={w * 0.6} y={h * 0.93} u={9} fill={fill} />
      <Kitten x={w * 0.42} y={h * 0.93} u={10} mood={mood} bob={mood === 'happy' ? 1.2 * Math.abs(Math.sin(t * 7.85)) : 0} blink={mood === 'normal' && (t % 2.3) < 0.12} />
      {mood === 'sad' && storm < 0.3 && [0, 1].map((i) => <div key={i} style={{position: 'absolute', left: w * 0.42 + 70 + i * 16, top: h * 0.6 - 30 - i * 26 - 10 * Math.sin(t * 6 + i), fontSize: 26, fontWeight: 900, color: '#FFFFFF', opacity: 0.8, fontFamily: SERIF}}>~</div>)}
    </div>
  );
};

export const News: React.FC<{t: number}> = ({t}) => {
  const fall = easeIn(seg(t, NEWS.drop - 0.25, NEWS.drop + 0.12));
  const open = easeInOut(seg(t, NEWS.open - 0.05, NEWS.open + 0.45));
  const storm = easeInOut(seg(t, NEWS.cloud - 0.1, NEWS.cloud + 0.6));
  const beat = Math.exp(-sincePulse(t) / 0.12);
  const pw = lerp(150, CW - 60, open), ph = lerp(100, CH - 60, open);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #F59A6B 0%, #FFC27D 45%, #FFE3B0 100%)', overflow: 'hidden'}}>
      <Bird x={lerp(560, CW + 200, seg(t, NEWS.drop, NEWS.drop + 1))} y={lerp(120, 40, seg(t, NEWS.drop, NEWS.drop + 1))} u={8} up={Math.floor(t * 5) % 2 === 0} />
      {open < 0.99 && <Letter x={444} y={lerp(-60, 330, fall)} rot={lerp(25, 0, fall) + 4 * Math.sin(t * 8) * (1 - fall)} s={1.6 + open} open={open * 2} />}
      {open > 0 && (
        <div style={{position: 'absolute', left: 444 - pw / 2, top: 338 - ph / 2, width: pw, height: ph, background: AIRMAIL, padding: 14, boxSizing: 'border-box', boxShadow: '0 16px 30px rgba(60,30,20,0.35)',
          transform: `rotate(${lerp(-8, -1.5, open) + 1.2 * Math.sin(t * 2)}deg) scale(${1 + 0.012 * beat})`}}>
          <div style={{position: 'relative', width: '100%', height: '100%', background: '#FBF6EA', padding: 8, boxSizing: 'border-box'}}>
            <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}>
              <Village t={t} w={pw - 44} h={ph - 44} storm={storm} bolt={t - NEWS.bolt} fill={0} mood={t > NEWS.bowl - 0.05 ? 'sad' : 'normal'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
