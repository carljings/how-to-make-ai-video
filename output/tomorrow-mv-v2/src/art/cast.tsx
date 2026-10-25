// cast.tsx: the new characters and props of verse 2: migrating birds, the far-away kitten and her bowl, music notes,
// pixel flames, snowflakes, rain, and the mini postcards of the finale. Plain numbers in, so scenes decide all motion.
import React from 'react';
import {Pix} from './pixel';
import {TAU} from '../lib/math';

const abs = (x: number, y: number, extra?: React.CSSProperties): React.CSSProperties => ({position: 'absolute', left: x, top: y, ...extra});

// A migrating bird, 10×5 pixels, two wing frames; (x, y) is its centre; dir −1 faces left
const BIRD_UP = ['n......n..', 'nn....nn..', '.nnnnnnneo', '..nwwwnn..', '...nnn....'];
const BIRD_DOWN = ['..........', '..........', '.nnnnnnneo', 'nnnwwwnnn.', 'n..nnn..n.'];
export const Bird: React.FC<{x: number; y: number; u: number; up: boolean; dir?: number; color?: string; opacity?: number}> = ({x, y, u, up, dir = 1, color = '#2C3E70', opacity = 1}) => (
  <svg width={10 * u} height={5 * u} viewBox="0 0 10 5" style={abs(x - 5 * u, y - 2.5 * u, {transform: `scaleX(${dir})`, opacity})}>
    <Pix rows={up ? BIRD_UP : BIRD_DOWN} pal={{n: color, w: '#FFFFFF', e: '#FFFFFF', o: '#F2A23A'}} />
  </svg>
);

// The kitten: an orange tabby sitting by her bowl. mood 'sad' droops her ears and eyes; 'happy' gives ^ ^ and pink cheeks.
const KITTEN = [
  '.o........o.',
  '.oo......oo.',
  '.oododdodoo.',
  '.oooooooooo.',
  '.oooooooooo.',
  '.oooooooooo.',
  '..oooppooo..',
  '...oooooo...',
  '..oooooooo..',
  '.oooowwoooot',
  '.oooowwooo.t',
  '.oooowwoooot',
  '..oo....oo..',
];
export const Kitten: React.FC<{x: number; y: number; u: number; mood: 'sad' | 'happy' | 'normal'; bob?: number; blink?: boolean}> = ({x, y, u, mood, bob = 0, blink = false}) => {
  const eyes = mood === 'happy'
    ? <g fill="#2A2A2A"><rect x={2.5} y={4} width={0.5} height={0.5} /><rect x={3} y={3.5} width={0.5} height={0.5} /><rect x={3.5} y={4} width={0.5} height={0.5} />
      <rect x={7.5} y={4} width={0.5} height={0.5} /><rect x={8} y={3.5} width={0.5} height={0.5} /><rect x={8.5} y={4} width={0.5} height={0.5} /></g>
    : blink ? <g fill="#2A2A2A"><rect x={2.4} y={4.2} width={1.6} height={0.35} /><rect x={7.4} y={4.2} width={1.6} height={0.35} /></g>
    : <g fill="#2A2A2A"><rect x={2.7} y={3.4} width={1.1} height={1.4} /><rect x={7.7} y={3.4} width={1.1} height={1.4} />
      <rect x={2.8} y={3.5} width={0.4} height={0.4} fill="#FFFFFF" /><rect x={7.8} y={3.5} width={0.4} height={0.4} fill="#FFFFFF" /></g>;
  return (
    // (x, y) is where her feet touch the ground
    <svg width={12 * u} height={13 * u} viewBox="0 0 12 13" style={abs(x - 6 * u, y - 13 * u - bob * u, {overflow: 'visible'})}>
      <g transform={mood === 'sad' ? 'translate(0 0.3)' : undefined}>
        <Pix rows={KITTEN} pal={{o: '#F2A65A', d: '#D9823A', p: '#F28CA0', w: '#FFF1DC', t: '#D9823A'}} />
        {eyes}
        {mood === 'sad' && <g fill="#2A2A2A"><rect x={2.2} y={2.7} width={1.6} height={0.35} transform="rotate(-15 3 2.9)" /><rect x={7.2} y={2.7} width={1.6} height={0.35} transform="rotate(15 8 2.9)" /></g>}
        {mood === 'happy' && <g fill="#F48FA3" opacity={0.85}><rect x={1.4} y={5.2} width={1.2} height={0.5} /><rect x={8.9} y={5.2} width={1.2} height={0.5} /></g>}
      </g>
    </svg>
  );
};
// Her bowl; fill 0..1 piles little hearts in it
export const Bowl: React.FC<{x: number; y: number; u: number; fill: number}> = ({x, y, u, fill}) => (
  <svg width={10 * u} height={8 * u} viewBox="0 -4 10 8" style={abs(x - 5 * u, y - 8 * u, {overflow: 'visible'})}>
    {Array.from({length: Math.round(fill * 7)}, (_, i) => (
      <g key={i} transform={`translate(${[3, 5, 7, 4, 6, 5, 2.4][i]} ${[-0.2, -0.4, -0.2, -1.3, -1.3, -2.4, -0.9][i]}) scale(0.32)`}>
        <Pix rows={['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..']} pal={{r: i % 2 ? '#FF6B7A' : '#E8433A'}} x={-2.5} y={-2.5} />
      </g>
    ))}
    <Pix rows={['bbbbbbbbbb', '.bbbbbbbb.', '..bbbbbb..', '...cccc...']} pal={{b: '#3E78C9', c: '#2B5A99'}} y={0} />
    <rect x={0} y={0} width={10} height={0.4} fill="#7FB1EE" />
  </svg>
);

// An eighth note, 5×7 pixels
export const Note: React.FC<{x: number; y: number; u: number; color?: string; rot?: number; opacity?: number}> = ({x, y, u, color = '#24345C', rot = 0, opacity = 1}) => (
  <svg width={5 * u} height={7 * u} viewBox="0 0 5 7" style={abs(x - 2.5 * u, y - 3.5 * u, {transform: `rotate(${rot}deg)`, opacity})}>
    <Pix rows={['..nn.', '..n.n', '..n..', '..n..', 'nnn..', 'nnn..', '.n...']} pal={{n: color}} />
  </svg>
);

// A pixel flame; k flickers it (any real number), s is its height in pixels-units
const FLAME = ['...r...', '..rr...', '..rorr.', '.rooor.', '.royor.', 'rooyyor', 'royyyor', 'royyyor', '.ryyyr.'];
const FLAME2 = ['....r..', '...rr..', '.rror..', '.rooor.', '.royor.', 'royyoor', 'royyyor', 'royyyor', '.ryyyr.'];
export const Flame: React.FC<{x: number; y: number; u: number; k: number; opacity?: number}> = ({x, y, u, k, opacity = 1}) => (
  // (x, y) is the base of the flame
  <svg width={7 * u} height={9 * u} viewBox="0 0 7 9" style={abs(x - 3.5 * u, y - 9 * u, {opacity, transform: `scaleY(${1 + 0.12 * Math.sin(k * 9)})`, transformOrigin: '50% 100%'})}>
    <Pix rows={Math.floor(k * 6) % 2 ? FLAME : FLAME2} pal={{r: '#E8433A', o: '#FF8A2A', y: '#FFE07A'}} />
  </svg>
);

export const Snowflake: React.FC<{x: number; y: number; u: number; rot: number; opacity?: number}> = ({x, y, u, rot, opacity = 1}) => (
  <svg width={5 * u} height={5 * u} viewBox="0 0 5 5" style={abs(x - 2.5 * u, y - 2.5 * u, {transform: `rotate(${rot}deg)`, opacity})}>
    <Pix rows={['..w..', '.w.w.', 'w.w.w', '.w.w.', '..w..']} pal={{w: '#FFFFFF'}} />
  </svg>
);

// Rain: deterministic streaks; slant in px per px of fall
export const Rain: React.FC<{t: number; w: number; h: number; n: number; speed: number; slant: number; opacity: number; seed?: number}> = ({t, w, h, n, speed, slant, opacity, seed = 1}) => (
  <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, opacity}}>
    {Array.from({length: n}, (_, i) => {
      const r1 = ((i * 7919 + seed * 104729) % 1000) / 1000, r2 = ((i * 6271 + seed * 7) % 1000) / 1000;
      const len = 26 + r2 * 30, y = ((r1 * (h + 200) + t * speed * (0.8 + r2 * 0.4)) % (h + 200)) - 100, x = ((r2 * (w + 300) - y * slant) % (w + 300) + w + 300) % (w + 300) - 150;
      return <line key={i} x1={x} y1={y} x2={x + slant * len} y2={y + len} stroke="#CFE3FF" strokeWidth={3} strokeLinecap="round" opacity={0.5 + 0.5 * r2} />;
    })}
  </svg>
);

// A firework: k = seconds since launch; bursts at 0 and falls; deterministic per seed
export const Firework: React.FC<{x: number; y: number; k: number; r: number; colors: string[]; seed: number}> = ({x, y, k, r, colors, seed}) => {
  if (k < 0 || k > 1.4) return null;
  const n = 26, out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + seed, sp = 0.75 + 0.25 * (((i * 37 + seed * 11) % 10) / 10);
    const d = r * sp * (1 - Math.exp(-k * 3.2)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + 60 * k * k;
    const op = k < 1 ? 1 : 1 - (k - 1) / 0.4, s = 14 * (1 - 0.4 * k);
    out.push(<div key={i} style={abs(px - s / 2, py - s / 2, {width: s, height: s, background: colors[i % colors.length], opacity: op, boxShadow: `0 0 ${10 * (1 - k * 0.5)}px ${colors[i % colors.length]}`})} />);
  }
  return <>{k < 0.25 && <div style={abs(x - 40, y - 40, {width: 80, height: 80, borderRadius: 40, background: 'radial-gradient(circle, #FFFFFF 0%, rgba(255,240,200,0) 70%)', opacity: 1 - k / 0.25})} />}{out}</>;
};
