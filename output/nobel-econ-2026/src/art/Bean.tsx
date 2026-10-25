// Bean.tsx: the film's little people ("豆豆人"), drawn in SVG. "你" is the white one.
// Local units: the bean stands on (0, 0) and is 200 tall; `s` scales it. Everything is a pure function of its props.
import React from 'react';
import {C, OUTLINE} from '../lib/palette';
import {clamp} from '../lib/math';

export type Mood = 'smile' | 'o' | 'flat' | 'grin' | 'worry';
export type Prop = 'telescope' | 'wallet' | 'phone' | 'question' | 'think' | null;

export interface BeanProps {
  x: number; y: number; s?: number; color?: string; mood?: Mood;
  look?: [number, number];   // pupil direction, -1..1
  blink?: number;            // 0 open … 1 closed
  squash?: number;           // -1..1: positive = squashed down, negative = stretched up
  tilt?: number;             // degrees
  prop?: Prop; propK?: number; // prop and how far it has appeared (0..1)
  label?: string; labelK?: number;
  outline?: string;
}

export const Bean: React.FC<BeanProps> = ({x, y, s = 1, color = C.white, mood = 'smile', look = [0, 0], blink = 0, squash = 0, tilt = 0, prop = null, propK = 1, label, labelK = 1, outline = C.line}) => {
  const sx = 1 + squash * 0.08, sy = 1 - squash * 0.08;
  const eyeY = -128, ey = clamp(1 - blink, 0.08, 1);
  const px = look[0] * 6, py = look[1] * 6;
  const mouth = {
    smile: <path d="M -13 -96 Q 0 -82 13 -96" fill="none" stroke={outline} strokeWidth={5} strokeLinecap="round" />,
    grin: <path d="M -16 -98 Q 0 -74 16 -98 Z" fill={outline} stroke={outline} strokeWidth={4} strokeLinejoin="round" />,
    o: <ellipse cx={0} cy={-92} rx={7} ry={9} fill={outline} />,
    flat: <path d="M -11 -93 L 11 -93" stroke={outline} strokeWidth={5} strokeLinecap="round" />,
    worry: <path d="M -12 -88 Q 0 -99 12 -88" fill="none" stroke={outline} strokeWidth={5} strokeLinecap="round" />,
  }[mood];
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${tilt}) scale(${sx} ${sy})`}>
      {/* feet */}
      <ellipse cx={-26} cy={-4} rx={20} ry={11} fill={outline} />
      <ellipse cx={26} cy={-4} rx={20} ry={11} fill={outline} />
      {/* body */}
      <rect x={-62} y={-206} width={124} height={200} rx={62} fill={color} stroke={outline} strokeWidth={OUTLINE} />
      {/* a soft highlight on the left */}
      <path d="M -40 -170 Q -50 -120 -42 -80" fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={9} strokeLinecap="round" />
      {/* cheeks */}
      <ellipse cx={-38} cy={-104} rx={11} ry={6.5} fill={C.blush} opacity={0.75} />
      <ellipse cx={38} cy={-104} rx={11} ry={6.5} fill={C.blush} opacity={0.75} />
      {/* eyes */}
      {[-22, 22].map((ex) => (
        <g key={ex} transform={`translate(${ex} ${eyeY}) scale(1 ${ey})`}>
          <ellipse cx={0} cy={0} rx={15} ry={18} fill="#fff" stroke={outline} strokeWidth={4} />
          <circle cx={px} cy={py + 2} r={7.5} fill={outline} />
          <circle cx={px + 3} cy={py - 2} r={2.4} fill="#fff" />
        </g>
      ))}
      {mouth}
      {prop && <BeanProp prop={prop} k={propK} outline={outline} />}
      {label && labelK > 0 && (
        <g transform={`translate(0 ${-262 - (1 - labelK) * 20})`} opacity={labelK}>
          <rect x={-46} y={-34} width={92} height={56} rx={14} fill={C.ink} />
          <path d="M -10 22 L 0 34 L 10 22 Z" fill={C.ink} />
          <text x={0} y={8} textAnchor="middle" fontFamily='"Noto Sans SC", sans-serif' fontWeight={900} fontSize={36} fill="#fff">{label}</text>
        </g>
      )}
    </g>
  );
};

const BeanProp: React.FC<{prop: Prop; k: number; outline: string}> = ({prop, k, outline}) => {
  const K = clamp(k);
  if (prop === 'telescope') {
    // held at the right eye, pointing up and ahead
    return (
      <g transform={`translate(34 -132) rotate(${-28 + (1 - K) * 40}) scale(${K})`}>
        <rect x={0} y={-15} width={86} height={30} rx={6} fill={C.gold} stroke={outline} strokeWidth={5} />
        <rect x={74} y={-21} width={36} height={42} rx={7} fill={C.goldHi} stroke={outline} strokeWidth={5} />
        <rect x={22} y={-15} width={10} height={30} fill={outline} opacity={0.25} />
      </g>
    );
  }
  if (prop === 'wallet') {
    // an open, empty wallet held in front, with two moths escaping
    const m = K;
    return (
      <g transform={`translate(0 -52) scale(${K})`}>
        <rect x={-50} y={-32} width={100} height={62} rx={10} fill={C.orangeLo} stroke={outline} strokeWidth={5} />
        <path d="M -50 -32 L -38 -58 L 38 -58 L 50 -32" fill={C.orange} stroke={outline} strokeWidth={5} strokeLinejoin="round" />
        {[[-18, 1], [20, -1]].map(([dx, d], i) => (
          <g key={i} transform={`translate(${dx + d * 30 * m} ${-70 - 60 * m})`} opacity={clamp(m * 1.5)}>
            <ellipse cx={-7} cy={0} rx={9} ry={6} fill="#d8d0c0" stroke={outline} strokeWidth={2.5} />
            <ellipse cx={7} cy={0} rx={9} ry={6} fill="#d8d0c0" stroke={outline} strokeWidth={2.5} />
          </g>
        ))}
      </g>
    );
  }
  if (prop === 'phone') {
    return (
      <g transform={`translate(52 -70) rotate(-12) scale(${K})`}>
        <rect x={-20} y={-36} width={40} height={70} rx={8} fill={C.ink} stroke={outline} strokeWidth={4} />
        <rect x={-14} y={-28} width={28} height={50} rx={3} fill={C.teal} />
      </g>
    );
  }
  if (prop === 'question' || prop === 'think') {
    const txt = prop === 'question' ? '?' : '…';
    return (
      <g transform={`translate(70 -250) scale(${K})`} opacity={K}>
        <circle cx={0} cy={0} r={34} fill="#fff" stroke={outline} strokeWidth={5} />
        <circle cx={-26} cy={36} r={9} fill="#fff" stroke={outline} strokeWidth={4} />
        <text x={0} y={14} textAnchor="middle" fontFamily='"Noto Sans SC", sans-serif' fontWeight={900} fontSize={44} fill={C.ink}>{txt}</text>
      </g>
    );
  }
  return null;
};

// Blink twice every few seconds at fixed, seeded moments: 0 open … 1 closed
export const blinkAt = (t: number, seed = 0) => {
  const period = 3.1 + (seed % 5) * 0.37, ph = (t + seed * 0.71) % period;
  const d = Math.abs(ph - period + 0.12);
  return d < 0.07 ? 1 - d / 0.07 : 0;
};
