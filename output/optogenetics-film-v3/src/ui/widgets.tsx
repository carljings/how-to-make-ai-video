// widgets.tsx: small motion-graphics pieces drawn as SVG/DOM above the art: gauge, light indicator, labels, counter.
import React from 'react';
import {clamp, easeOut, expoOut, seg} from '../lib/math';
import {SANS, MONO} from '../lib/fonts';
import {rgba} from './Text';
import type {Key} from '../timeline';

// Semicircular speed gauge (illustrative): v in 0..1
export const SpeedGauge: React.FC<{v: number; on: number; x: number; y: number; a?: number; label?: string}> = ({v, on, x, y, a = 1, label = '奔跑速度'}) => {
  if (a <= 0.01) return null;
  const R = 104, arc = (k: number) => {
    const ang = Math.PI + Math.PI * k;
    return [R * Math.cos(ang), R * Math.sin(ang)];
  };
  const [ex, ey] = arc(clamp(v));
  const col = on > 0.5 ? rgba('blue') : 'rgba(170,190,210,0.9)';
  return (
    <div style={{position: 'absolute', left: x - 140, top: y - 130, width: 280, height: 200, opacity: a}}>
      <svg width={280} height={200} viewBox="-140 -130 280 200" style={{overflow: 'visible'}}>
        <path d={`M ${-R} 0 A ${R} ${R} 0 0 1 ${R} 0`} fill="none" stroke="rgba(150,170,190,0.22)" strokeWidth={12} strokeLinecap="round" />
        <path d={`M ${-R} 0 A ${R} ${R} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`} fill="none" stroke={col} strokeWidth={12} strokeLinecap="round" style={{filter: on > 0.5 ? `drop-shadow(0 0 8px ${rgba('blue')})` : undefined}} />
        {Array.from({length: 9}, (_, i) => { const [tx, ty] = arc(i / 8); return <line key={i} x1={tx * 0.8} y1={ty * 0.8} x2={tx * 0.72} y2={ty * 0.72} stroke="rgba(190,210,230,0.5)" strokeWidth={2} />; })}
        <line x1={0} y1={0} x2={ex * 0.86} y2={ey * 0.86} stroke="#f4f8ff" strokeWidth={4} strokeLinecap="round" />
        <circle r={9} fill="#f4f8ff" />
        <text x={-R} y={38} fill="rgba(170,186,204,0.8)" fontFamily={SANS} fontSize={20} textAnchor="middle">慢</text>
        <text x={R} y={38} fill="rgba(170,186,204,0.8)" fontFamily={SANS} fontSize={20} textAnchor="middle">快</text>
        <text x={0} y={64} fill="#dbe7f2" fontFamily={SANS} fontWeight={700} fontSize={24} textAnchor="middle" letterSpacing={2}>{label}</text>
      </svg>
    </div>
  );
};

// "光：开 / 关" pill next to the fibre
export const LightChip: React.FC<{on: number; x: number; y: number; a?: number; color?: Key; onText?: string}> = ({on, x, y, a = 1, color = 'blue', onText = '开'}) => {
  if (a <= 0.01) return null;
  const lit = on > 0.5;
  return (
    <div style={{position: 'absolute', left: x, top: y - 24, height: 48, padding: '0 20px 0 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 24,
      border: `2px solid ${lit ? rgba(color, 0.9) : 'rgba(150,170,190,0.45)'}`, background: lit ? rgba(color, 0.16) : 'rgba(10,16,26,0.6)', opacity: a,
      boxShadow: lit ? `0 0 24px ${rgba(color, 0.45)}` : undefined}}>
      <div style={{width: 16, height: 16, borderRadius: 8, background: lit ? rgba(color) : 'transparent', border: `2px solid ${lit ? rgba(color) : 'rgba(170,186,204,0.8)'}`, boxShadow: lit ? `0 0 12px ${rgba(color)}` : undefined}} />
      <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 26, color: lit ? '#eaf6ff' : 'rgba(190,204,218,0.85)', letterSpacing: 2}}>光：{lit ? onText : '关'}</div>
    </div>
  );
};

// A label with a leader line that draws itself from the point to the text
export const Callout: React.FC<{x: number; y: number; tx: number; ty: number; text: string; k: number; color?: string; size?: number; mono?: boolean; align?: 'left' | 'right'}> = ({x, y, tx, ty, text, k, color = '#9fb4c6', size = 24, mono = false, align = 'left'}) => {
  if (k <= 0.01) return null;
  const d = easeOut(clamp(k * 1.6)), lx = x + (tx - x) * d, ly = y + (ty - y) * d, tk = clamp(k * 2 - 0.8);
  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <circle cx={x} cy={y} r={5} fill={color} opacity={d} />
        <line x1={x} y1={y} x2={lx} y2={ly} stroke={color} strokeWidth={1.6} opacity={0.8 * d} />
      </svg>
      <div style={{position: 'absolute', top: ty - size * 0.7, ...(align === 'left' ? {left: tx + 10} : {right: 1080 - tx + 10}), fontFamily: mono ? MONO : SANS, fontSize: size, fontWeight: 700,
        color, opacity: tk, whiteSpace: 'nowrap', letterSpacing: 1, transform: `translateY(${(1 - tk) * 8}px)`}}>{text}</div>
    </>
  );
};

// Slot-machine counter: each digit is a strip of 0–9 that rolls to its value
export const Counter: React.FC<{value: number; t: number; a: number; b: number; size: number; color: string}> = ({value, t, a, b, size, color}) => {
  const digits = String(value).split('').map(Number), k = expoOut(seg(t, a, b));
  return (
    <span style={{display: 'inline-flex', height: size * 1.1, overflow: 'hidden', fontFamily: MONO, fontWeight: 700, fontSize: size, lineHeight: `${size * 1.1}px`, color}}>
      {digits.map((d, i) => {
        // every column spins at least once more than the one to its right, then lands on its digit
        const turns = (digits.length - i) * 10 + d, pos = (turns * clamp(k * (1 + i * 0.08))) % 10;
        return (
          <span key={i} style={{display: 'inline-block', width: size * 0.62, position: 'relative'}}>
            <span style={{position: 'absolute', left: 0, top: -pos * size * 1.1, display: 'flex', flexDirection: 'column'}}>
              {Array.from({length: 11}, (_, j) => <span key={j} style={{height: size * 1.1, textAlign: 'center'}}>{j % 10}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
};
