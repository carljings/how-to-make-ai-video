// Props.tsx: the film's objects in the same sticker style as the beans: flat colour and a thick dark outline.
// Each draws around its own (x, y) and is a pure function of its props.
import React from 'react';
import {C, OUTLINE} from '../lib/palette';
import {SANS, MONO} from '../lib/fonts';
import {clamp, TAU} from '../lib/math';

const O = C.line;

// ---- a coin, face-on when spin = 0, edge-on at spin = ±π/2 ----
export const Coin: React.FC<{x: number; y: number; r?: number; spin?: number; rot?: number; opacity?: number}> = ({x, y, r = 40, spin = 0, rot = 0, opacity = 1}) => {
  const k = Math.max(0.12, Math.abs(Math.cos(spin)));
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k} 1)`} opacity={opacity}>
      <circle r={r} fill={C.gold} stroke={O} strokeWidth={Math.max(3, r * 0.14) / k ** 0.3} />
      <circle r={r * 0.72} fill="none" stroke={C.goldLo} strokeWidth={r * 0.08} />
      {k > 0.35 && <text y={r * 0.33} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={r * 0.95} fill={C.goldLo}>¥</text>}
    </g>
  );
};

// ---- the phone with a payment notification ----
export const Phone: React.FC<{x: number; y: number; w?: number; h?: number; children?: React.ReactNode}> = ({x, y, w = 420, h = 760, children}) => (
  <g transform={`translate(${x - w / 2} ${y - h / 2})`}>
    <rect x={12} y={16} width={w} height={h} rx={w * 0.15} fill={O} opacity={0.9} />
    <rect x={0} y={0} width={w} height={h} rx={w * 0.15} fill={C.ink} stroke={O} strokeWidth={OUTLINE} />
    <rect x={w * 0.05} y={w * 0.05} width={w * 0.9} height={h - w * 0.1} rx={w * 0.11} fill={C.paper} />
    <rect x={w * 0.36} y={w * 0.085} width={w * 0.28} height={w * 0.07} rx={w * 0.035} fill={C.ink} />
    {children}
  </g>
);

// A notification card: coin icon, a small title and the big amount. (x, y) is its top-left inside the phone.
export const Notice: React.FC<{x: number; y: number; w: number; title: string; amount: string; note?: string; k?: number; accent?: string}> = ({x, y, w, title, amount, note, k = 1, accent = C.green}) => {
  const h = 172;
  return (
    <g transform={`translate(${x} ${y - (1 - k) * 60})`} opacity={clamp(k * 1.6)}>
      <rect x={6} y={8} width={w} height={h} rx={30} fill={O} opacity={0.18} />
      <rect x={0} y={0} width={w} height={h} rx={30} fill="#fff" stroke={O} strokeWidth={5} />
      <Coin x={58} y={62} r={30} />
      <text x={106} y={52} fontFamily={SANS} fontWeight={700} fontSize={30} fill="#6b7280">{title}</text>
      <circle cx={w - 36} cy={42} r={13} fill={accent} />
      <path d={`M ${w - 42} 42 l 5 5 l 9 -10`} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <text x={28} y={140} fontFamily={SANS} fontWeight={900} fontSize={66} fill={C.ink} letterSpacing={-1}>{amount}</text>
      {note && <text x={w - 26} y={138} textAnchor="end" fontFamily={SANS} fontWeight={700} fontSize={26} fill="#6b7280">{note}</text>}
    </g>
  );
};

// ---- a big answer button ----
export const Choice: React.FC<{x: number; y: number; w?: number; h?: number; letter: string; label: string; fill: string; icon?: React.ReactNode; k?: number; hi?: number; press?: number; fontSize?: number}> = ({x, y, w = 400, h = 128, letter, label, fill, icon, k = 1, hi = 0, press = 0, fontSize = 50}) => {
  const s = (0.6 + 0.4 * k) * (1 + 0.06 * hi) * (1 - 0.05 * press);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={clamp(k * 2)}>
      {hi > 0.01 && <rect x={-w / 2 - 14} y={-h / 2 - 14} width={w + 28} height={h + 28} rx={h / 2 + 14} fill="none" stroke="#fff" strokeWidth={8} opacity={hi} />}
      <rect x={-w / 2 + 10} y={-h / 2 + 12 - press * 8} width={w} height={h} rx={h / 2} fill={O} />
      <rect x={-w / 2} y={-h / 2 + press * 6} width={w} height={h} rx={h / 2} fill={fill} stroke={O} strokeWidth={OUTLINE} />
      <circle cx={-w / 2 + h / 2} cy={press * 6} r={h * 0.33} fill="#fff" stroke={O} strokeWidth={5} />
      <text x={-w / 2 + h / 2} y={press * 6 + h * 0.15} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={h * 0.4} fill={C.ink}>{letter}</text>
      <text x={-w / 2 + h * 0.95} y={press * 6 + fontSize * 0.36} fontFamily={SANS} fontWeight={900} fontSize={fontSize} fill="#fff" stroke={O} strokeWidth={2} paintOrder="stroke">{label}</text>
      {icon && <g transform={`translate(${w / 2 - h * 0.45} ${press * 6})`}>{icon}</g>}
    </g>
  );
};

// ---- small icons, drawn around (0, 0), about 80 units across ----
export const BagIcon: React.FC<{s?: number}> = ({s = 1}) => (
  <g transform={`scale(${s})`}>
    <path d="M -22 -18 Q -22 -44 0 -44 Q 22 -44 22 -18" fill="none" stroke={O} strokeWidth={6} />
    <path d="M -34 -20 L 34 -20 L 40 36 L -40 36 Z" fill="#fff" stroke={O} strokeWidth={6} strokeLinejoin="round" />
  </g>
);
export const PiggyIcon: React.FC<{s?: number}> = ({s = 1}) => (
  <g transform={`scale(${s})`}>
    <ellipse cx={0} cy={4} rx={40} ry={30} fill="#FFB3C1" stroke={O} strokeWidth={6} />
    <rect x={30} y={-6} width={16} height={20} rx={6} fill="#FF8FA3" stroke={O} strokeWidth={5} />
    <path d="M -14 -24 L -6 -40 L 4 -26" fill="#FF8FA3" stroke={O} strokeWidth={5} strokeLinejoin="round" />
    <rect x={-10} y={-30} width={22} height={6} rx={3} fill={O} />
    <circle cx={16} cy={-4} r={4} fill={O} />
    <rect x={-26} y={28} width={12} height={14} rx={3} fill={O} /><rect x={12} y={28} width={12} height={14} rx={3} fill={O} />
  </g>
);
export const GiftIcon: React.FC<{s?: number}> = ({s = 1}) => (
  <g transform={`scale(${s})`}>
    <rect x={-36} y={-14} width={72} height={52} rx={6} fill={C.red} stroke={O} strokeWidth={6} />
    <rect x={-42} y={-30} width={84} height={20} rx={6} fill={C.red} stroke={O} strokeWidth={6} />
    <rect x={-8} y={-30} width={16} height={68} fill={C.gold} stroke={O} strokeWidth={4} />
    <path d="M 0 -30 Q -30 -60 -24 -36 Z M 0 -30 Q 30 -60 24 -36 Z" fill={C.gold} stroke={O} strokeWidth={4} />
  </g>
);
export const RaiseIcon: React.FC<{s?: number}> = ({s = 1}) => (
  <g transform={`scale(${s})`}>
    <rect x={-38} y={-30} width={76} height={64} rx={8} fill="#fff" stroke={O} strokeWidth={6} />
    <path d="M -24 18 L -6 0 L 6 10 L 26 -14" fill="none" stroke={C.teal} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 12 -16 L 28 -16 L 28 0" fill="none" stroke={C.teal} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
  </g>
);
export const Bolt: React.FC<{s?: number; fill?: string}> = ({s = 1, fill = C.gold}) => (
  <g transform={`scale(${s})`}>
    <path d="M 14 -70 L -32 6 L -2 6 L -16 70 L 34 -14 L 4 -14 Z" fill={fill} stroke={O} strokeWidth={7} strokeLinejoin="round" />
  </g>
);
export const Telescope: React.FC<{s?: number}> = ({s = 1}) => (
  <g transform={`scale(${s}) rotate(-28)`}>
    <rect x={-40} y={-14} width={70} height={28} rx={6} fill={C.gold} stroke={O} strokeWidth={6} />
    <rect x={22} y={-20} width={30} height={40} rx={6} fill={C.goldHi} stroke={O} strokeWidth={6} />
  </g>
);
export const WalletIcon: React.FC<{s?: number}> = ({s = 1}) => (
  <g transform={`scale(${s})`}>
    <rect x={-40} y={-26} width={80} height={56} rx={10} fill={C.orange} stroke={O} strokeWidth={6} />
    <rect x={14} y={-8} width={30} height={22} rx={6} fill={C.orangeLo} stroke={O} strokeWidth={5} />
    <circle cx={26} cy={3} r={4} fill={O} />
  </g>
);

// The hand cursor, tip of the finger at (0, 0)
export const Hand: React.FC<{x: number; y: number; s?: number; press?: number}> = ({x, y, s = 1, press = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s * (1 - 0.08 * press)}) rotate(-14)`}>
    <path d="M 0 0 C -6 -2 -10 4 -10 10 L -10 62 C -18 52 -32 52 -36 60 C -40 68 -30 80 -22 90 L -2 118 C 6 128 18 132 32 132 L 52 132 C 72 132 84 118 84 98 L 84 54 C 84 46 76 40 68 42 C 66 34 56 30 48 34 C 44 26 34 24 28 28 L 28 18 L 10 18 L 10 10 C 10 4 6 0 0 0 Z"
      fill="#fff" stroke={O} strokeWidth={6} strokeLinejoin="round" transform="translate(-4 -2)" />
    <path d="M 24 60 L 24 90 M 44 58 L 44 90 M 64 62 L 64 90" stroke={O} strokeWidth={4} strokeLinecap="round" opacity={0.5} />
  </g>
);

// A price tag that flips between two prices: flip 0 → `from`, 1 → `to` (turns over around its horizontal axis)
export const Tag: React.FC<{x: number; y: number; from: string; to: string; flip: number; s?: number; hot?: number}> = ({x, y, from, to, flip, s = 1, hot = 0}) => {
  const f = clamp(flip), ang = f * Math.PI, sy = Math.abs(Math.cos(ang)), face = f < 0.5 ? from : to;
  const fill = f < 0.5 ? '#fff' : `rgb(255,${Math.round(240 - 150 * hot)},${Math.round(230 - 160 * hot)})`;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 -66 L 0 -36" stroke={O} strokeWidth={4} />
      <g transform={`translate(0 -36) scale(1 ${Math.max(0.04, sy)}) translate(0 36)`}>
        <path d="M -62 -36 L 46 -36 L 70 0 L 46 36 L -62 36 Z" fill={fill} stroke={O} strokeWidth={6} strokeLinejoin="round" />
        <circle cx={42} cy={0} r={7} fill={C.navy} stroke={O} strokeWidth={3} />
        <text x={-12} y={17} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={46} fill={f < 0.5 ? C.ink : C.redLo}>{face}</text>
      </g>
    </g>
  );
};

// A semicircle gauge from "low" (left) to "high" (right); v = 0..1 needle position; target band in the middle
export const Gauge: React.FC<{x: number; y: number; r?: number; v: number; label: string}> = ({x, y, r = 120, v, label}) => {
  const arc = (a0: number, a1: number, rr: number) => {
    const p = (a: number) => `${(Math.cos(Math.PI + a * Math.PI) * rr).toFixed(1)} ${(Math.sin(Math.PI + a * Math.PI) * rr).toFixed(1)}`;
    return `M ${p(a0)} A ${rr} ${rr} 0 0 1 ${p(a1)}`;
  };
  const ang = Math.PI + clamp(v) * Math.PI;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={arc(0, 1, r)} fill="none" stroke={O} strokeWidth={46} strokeLinecap="round" />
      <path d={arc(0.02, 0.38, r)} fill="none" stroke={C.teal} strokeWidth={30} />
      <path d={arc(0.38, 0.62, r)} fill="none" stroke={C.green} strokeWidth={30} />
      <path d={arc(0.62, 0.98, r)} fill="none" stroke={C.red} strokeWidth={30} />
      <line x1={0} y1={0} x2={Math.cos(ang) * (r - 6)} y2={Math.sin(ang) * (r - 6)} stroke={C.cream} strokeWidth={10} strokeLinecap="round" />
      <circle r={18} fill={C.cream} stroke={O} strokeWidth={5} />
      {label && <text y={64} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={38} fill={C.cream}>{label}</text>}
    </g>
  );
};

// ---- the prize medal: a generic gold medal with a laurel wreath (not the real Nobel design) ----
export const Medal: React.FC<{x: number; y: number; r?: number; shine?: number; spin?: number}> = ({x, y, r = 170, shine = -1, spin = 0}) => {
  const k = Math.max(0.15, Math.abs(Math.cos(spin)));
  const leaves = [] as React.ReactNode[];
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
    const a = Math.PI / 2 + side * (0.35 + i * 0.27), rr = r * 0.74;
    const lx = Math.cos(a) * rr, ly = Math.sin(a) * rr, rot = (a * 180) / Math.PI + (side > 0 ? 90 : -90) + side * 35;
    leaves.push(<ellipse key={`${side}${i}`} cx={lx} cy={ly} rx={r * 0.055} ry={r * 0.12} transform={`rotate(${rot} ${lx} ${ly})`} fill={C.goldLo} />);
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${k} 1)`}>
      <circle r={r} fill={C.gold} stroke={O} strokeWidth={OUTLINE + 2} />
      <circle r={r * 0.88} fill="none" stroke={C.goldLo} strokeWidth={r * 0.035} />
      {leaves}
      <text y={-r * 0.06} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={r * 0.34} fill={C.goldLo}>2026</text>
      <text y={r * 0.28} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={r * 0.17} fill={C.goldLo} letterSpacing={r * 0.02}>经济学奖</text>
      {shine > -1 && shine < 2 && (
        <g clipPath="url(#medalClip)">
          <rect x={-r * 2 + shine * r * 3} y={-r * 1.2} width={r * 0.35} height={r * 2.4} fill="#fff" opacity={0.55} transform="rotate(25)" />
        </g>
      )}
      <defs><clipPath id="medalClip"><circle r={r} /></clipPath></defs>
    </g>
  );
};

// A generic bust silhouette for the laureates' name cards (no likeness)
export const Bust: React.FC<{x: number; y: number; s?: number; fill?: string}> = ({x, y, s = 1, fill = C.goldLo}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx={0} cy={-30} r={30} fill={fill} />
    <path d="M -56 50 Q -56 6 0 6 Q 56 6 56 50 Z" fill={fill} />
  </g>
);

// A sparkle: four-pointed star
export const Sparkle: React.FC<{x: number; y: number; r: number; rot?: number; fill?: string; opacity?: number}> = ({x, y, r, rot = 0, fill = '#fff', opacity = 1}) => (
  <path transform={`translate(${x} ${y}) rotate(${rot})`} opacity={opacity} fill={fill}
    d={`M 0 ${-r} Q ${r * 0.18} ${-r * 0.18} ${r} 0 Q ${r * 0.18} ${r * 0.18} 0 ${r} Q ${-r * 0.18} ${r * 0.18} ${-r} 0 Q ${-r * 0.18} ${-r * 0.18} 0 ${-r} Z`} />
);

export const ring = (n: number, r: number, phase = 0) => Array.from({length: n}, (_, i) => [Math.cos(phase + (i / n) * TAU) * r, Math.sin(phase + (i / n) * TAU) * r] as const);
