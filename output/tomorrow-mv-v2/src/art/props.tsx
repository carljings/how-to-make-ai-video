// props.tsx: the small things the scenes are built from: cursor, stars, moon, sun, petals, planes, clocks, bubbles,
// sparkles, speed lines. Each takes plain numbers (position, size, phase), so a scene decides every value from t.
import React from 'react';
import {Pix, CURSOR_ROWS, HEART_ROWS} from './pixel';
import {TAU, clamp} from '../lib/math';
import {MONO} from '../lib/fonts';

const abs = (x: number, y: number, extra?: React.CSSProperties): React.CSSProperties => ({position: 'absolute', left: x, top: y, ...extra});

// The pixel arrow cursor; (x, y) is its tip. press 0..1 pushes it in a little.
export const Cursor: React.FC<{x: number; y: number; u: number; press?: number; opacity?: number}> = ({x, y, u, press = 0, opacity = 1}) => (
  <svg width={12 * u} height={19 * u} viewBox="0 0 12 19" style={abs(x, y, {overflow: 'visible', opacity, transform: `scale(${1 - 0.12 * press})`, transformOrigin: '0 0',
    filter: 'drop-shadow(3px 5px 0 rgba(0,0,0,0.22))'})}>
    <Pix rows={CURSOR_ROWS} pal={{k: '#141414', w: '#FFFFFF'}} />
  </svg>
);

// An expanding ring where the cursor taps: k 0..1 through the ripple
export const Ripple: React.FC<{x: number; y: number; k: number; r: number; color?: string; width?: number}> = ({x, y, k, r, color = '#FFF6D8', width = 5}) => {
  if (k <= 0 || k >= 1) return null;
  const rr = r * (0.25 + 0.75 * (1 - (1 - k) ** 3));
  return <div style={abs(x - rr, y - rr, {width: rr * 2, height: rr * 2, borderRadius: '50%', border: `${width * (1 - k) + 1}px solid ${color}`, opacity: 1 - k})} />;
};

// A pixel plus-shaped star; b is brightness 0..1
export const Star: React.FC<{x: number; y: number; u: number; b: number; color?: string}> = ({x, y, u, b, color = '#FFF3C4'}) => (
  <svg width={3 * u} height={3 * u} viewBox="0 0 3 3" style={abs(x - 1.5 * u, y - 1.5 * u, {opacity: 0.25 + 0.75 * b})}>
    <Pix rows={b > 0.75 ? ['.s.', 'sss', '.s.'] : ['...', '.s.', '...']} pal={{s: color}} />
  </svg>
);

export const Moon: React.FC<{x: number; y: number; u: number}> = ({x, y, u}) => (
  <svg width={9 * u} height={9 * u} viewBox="0 0 9 9" style={abs(x, y, {overflow: 'visible', filter: 'drop-shadow(0 0 10px rgba(255,241,201,0.45))'})}>
    <Pix rows={['..mmmm..', '.mmm....', 'mmm.....', 'mm......', 'mm......', 'mmm.....', '.mmm....', '..mmmm..']} pal={{m: '#FFF1C9'}} />
  </svg>
);

// A flat sun disc with optional rays turning at `spin` radians
export const Sun: React.FC<{x: number; y: number; r: number; spin?: number; rays?: number; color?: string; rayColor?: string; rayOpacity?: number}> = ({x, y, r, spin = 0, rays = 0, color = '#FFC94A', rayColor = '#FFE6A0', rayOpacity = 0.5}) => (
  <svg width={r * 6} height={r * 6} viewBox={`${-r * 3} ${-r * 3} ${r * 6} ${r * 6}`} style={abs(x - r * 3, y - r * 3, {overflow: 'visible'})}>
    {Array.from({length: rays}, (_, i) => {
      const a0 = spin + (i / rays) * TAU, a1 = a0 + (0.5 / rays) * TAU, R = r * 3;
      return <path key={i} d={`M0 0 L${Math.cos(a0) * R} ${Math.sin(a0) * R} L${Math.cos(a1) * R} ${Math.sin(a1) * R} Z`} fill={rayColor} opacity={rayOpacity} />;
    })}
    <circle r={r * 1.25} fill={color} opacity={0.25} />
    <circle r={r} fill={color} />
  </svg>
);

// A cherry petal: three pixels; rot in degrees
export const Petal: React.FC<{x: number; y: number; u: number; rot: number; color?: string; opacity?: number}> = ({x, y, u, rot, color = '#F6A5BE', opacity = 1}) => (
  <svg width={3 * u} height={3 * u} viewBox="0 0 3 3" style={abs(x - 1.5 * u, y - 1.5 * u, {transform: `rotate(${rot}deg)`, opacity})}>
    <Pix rows={['.pp', 'ppq', 'pq.']} pal={{p: color, q: '#E77F9F'}} />
  </svg>
);

export const PaperPlane: React.FC<{x: number; y: number; s: number; rot: number; opacity?: number}> = ({x, y, s, rot, opacity = 1}) => (
  <svg width={s * 2} height={s * 2} viewBox="-1 -1 2 2" style={abs(x - s, y - s, {transform: `rotate(${rot}deg)`, overflow: 'visible', opacity})}>
    <path d="M0.9 0 L-0.8 -0.55 L-0.35 0 Z" fill="#FFFFFF" />
    <path d="M0.9 0 L-0.8 0.5 L-0.35 0 Z" fill="#DCD6C8" />
  </svg>
);

// A wall clock with a city label; the hands turn with `h` (hours, any real number)
export const Clock: React.FC<{x: number; y: number; r: number; h: number; label: string}> = ({x, y, r, h, label}) => {
  const am = (h % 1) * TAU - TAU / 4, ah = (h / 12) * TAU - TAU / 4;
  return (
    <div style={abs(x - r, y - r, {width: r * 2, height: r * 2 + 34})}>
      <svg width={r * 2} height={r * 2} viewBox="-1 -1 2 2">
        <circle r={0.92} fill="#FFFDF6" stroke="#2A2F45" strokeWidth={0.12} />
        <line x1={0} y1={0} x2={Math.cos(ah) * 0.45} y2={Math.sin(ah) * 0.45} stroke="#2A2F45" strokeWidth={0.13} strokeLinecap="round" />
        <line x1={0} y1={0} x2={Math.cos(am) * 0.72} y2={Math.sin(am) * 0.72} stroke="#C8372D" strokeWidth={0.08} strokeLinecap="round" />
        <circle r={0.1} fill="#2A2F45" />
      </svg>
      <div style={{fontFamily: MONO, fontWeight: 800, fontSize: r * 0.62, color: '#5A4A38', textAlign: 'center', marginTop: 2, letterSpacing: 1}}>{label}</div>
    </div>
  );
};

// A chat bubble that pops: k 0..1 of its life (pop in, hold, fade)
export const Bubble: React.FC<{x: number; y: number; s: number; k: number; color?: string}> = ({x, y, s, k, color = '#FFFFFF'}) => {
  if (k <= 0 || k >= 1) return null;
  const sc = k < 0.15 ? (k / 0.15) * 1.15 : k < 0.25 ? 1.15 - (k - 0.15) * 1.5 : 1;
  const op = k > 0.75 ? (1 - k) / 0.25 : 1;
  return (
    <svg width={s * 2} height={s * 1.6} viewBox="0 0 20 16" style={abs(x - s, y - s * 1.6, {transform: `scale(${sc})`, transformOrigin: '30% 100%', opacity: op})}>
      <rect x={1} y={1} width={18} height={11} rx={3} fill={color} stroke="#2A2F45" strokeWidth={1.2} />
      <path d="M5 12 L4 15.5 L9 12 Z" fill={color} stroke="#2A2F45" strokeWidth={1.2} strokeLinejoin="round" />
      <rect x={4} y={11} width={6} height={1.6} fill={color} />
      {[6, 10, 14].map((cx) => <circle key={cx} cx={cx} cy={6.5} r={1.3} fill="#C8372D" />)}
    </svg>
  );
};

// A four-pointed sparkle; k 0..1 of its life
export const Sparkle: React.FC<{x: number; y: number; s: number; k: number; color?: string; rot?: number}> = ({x, y, s, k, color = '#FFE08A', rot = 0}) => {
  if (k <= 0 || k >= 1) return null;
  const sc = Math.sin(k * Math.PI);
  return (
    <svg width={s * 2} height={s * 2} viewBox="-1 -1 2 2" style={abs(x - s, y - s, {transform: `rotate(${rot + k * 90}deg) scale(${sc})`})}>
      <path d="M0 -1 Q0.12 -0.12 1 0 Q0.12 0.12 0 1 Q-0.12 0.12 -1 0 Q-0.12 -0.12 0 -1 Z" fill={color} />
    </svg>
  );
};

// Short motion strokes behind something that moves: dir in degrees (the direction of travel), k 0..1 strength
export const SpeedLines: React.FC<{x: number; y: number; len: number; dir: number; k: number; color?: string; n?: number; spread?: number}> = ({x, y, len, dir, k, color = '#5A4A38', n = 3, spread = 40}) => {
  if (k <= 0.02) return null;
  return (
    <div style={abs(x, y, {transform: `rotate(${dir}deg)`, transformOrigin: '0 0'})}>
      {Array.from({length: n}, (_, i) => {
        const off = (i - (n - 1) / 2) * spread, l = len * (i === (n - 1) / 2 ? 1 : 0.65) * k;
        return <div key={i} style={abs(-l - 18, off - 3, {width: l, height: 6, borderRadius: 3, background: color, opacity: 0.55 * clamp(k * 1.4)})} />;
      })}
    </div>
  );
};

// The 9×8 pixel heart; cell = size of one pixel
export const PixelHeart: React.FC<{x: number; y: number; cell: number; color?: string; shine?: string; opacity?: number}> = ({x, y, cell, color = '#E33F36', shine = '#FF9C8C', opacity = 1}) => (
  <svg width={9 * cell} height={8 * cell} viewBox="0 0 9 8" style={abs(x, y, {overflow: 'visible', opacity})}>
    <Pix rows={HEART_ROWS} pal={{r: color, h: shine}} />
  </svg>
);
