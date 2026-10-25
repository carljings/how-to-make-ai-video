// World.tsx: the two backgrounds and the scene transitions.
// Yellow world: the everyday question (hook, twist, end). Navy world: the prize and the ideas behind it.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../lib/palette';
import {clamp, seg, easeInOut, easeOut, rng} from '../lib/math';
import {CUT_KIND, TRANSITION, type CutKind, type SceneId} from '../timeline';

export const YellowBg: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: `radial-gradient(120% 70% at 50% 42%, ${C.yellowHi} 0%, ${C.yellow} 55%, ${C.yellowLo} 100%)`}}>
    <svg width={1080} height={1920} style={{position: 'absolute', opacity: 0.16}}>
      <defs>
        <pattern id="dots" width={36} height={36} patternUnits="userSpaceOnUse" patternTransform={`translate(${(t * 12) % 36} ${(t * 6) % 36}) rotate(20)`}>
          <circle cx={18} cy={18} r={4} fill={C.ink} />
        </pattern>
      </defs>
      <rect width={1080} height={1920} fill="url(#dots)" />
    </svg>
    {/* sunburst rays behind the centre, turning slowly */}
    <svg width={1080} height={1920} style={{position: 'absolute', opacity: 0.22}}>
      <g transform={`translate(540 900) rotate(${t * 6})`}>
        {Array.from({length: 18}, (_, i) => <path key={i} d="M 0 0 L -90 -1500 L 90 -1500 Z" fill="#fff" transform={`rotate(${i * 20})`} />)}
      </g>
    </svg>
  </AbsoluteFill>
);

// Navy: radial gradient, a faint dotted grid and slow gold and teal motes for depth
const MOTES = (() => { const R = rng(7); return Array.from({length: 26}, () => ({x: R() * 1080, y: R() * 1920, r: 3 + R() * 7, v: 6 + R() * 16, c: R() < 0.6 ? C.gold : C.teal, a: 0.08 + R() * 0.16})); })();
// A quiet night skyline along the bottom: dark blocks with a few warm windows, drifting slowly
const CITY = (() => {
  const R = rng(19), out: {x: number; w: number; h: number; win: [number, number, number][]}[] = [];
  for (let x = -40; x < 1180;) {
    const w = 60 + R() * 110, h = 140 + R() * 300, win: [number, number, number][] = [];
    for (let wy = 26; wy < h - 20; wy += 34) for (let wx = 14; wx < w - 18; wx += 26) if (R() < 0.18) win.push([wx, wy, R()]);
    out.push({x, w, h, win}); x += w + 6 + R() * 18;
  }
  return out;
})();
const Skyline: React.FC<{t: number}> = ({t}) => (
  <svg width={1080} height={1920} style={{position: 'absolute'}}>
    <defs><linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.navyHi} stopOpacity={0} /><stop offset="1" stopColor={C.navyHi} stopOpacity={0.5} /></linearGradient></defs>
    <rect x={0} y={1250} width={1080} height={670} fill="url(#haze)" />
    <g transform={`translate(${-(t * 4) % 60} 0)`}>
      {CITY.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${1920 - b.h - 150})`}>
          <rect width={b.w} height={b.h + 150} fill="#0E1A31" />
          <rect width={b.w} height={4} fill="#22365C" />
          {b.win.map(([wx, wy, ph], j) => <rect key={j} x={wx} y={wy} width={10} height={14} rx={2} fill={C.gold} opacity={0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.8 + ph * 20))} />)}
        </g>
      ))}
    </g>
  </svg>
);

export const NavyBg: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: `radial-gradient(110% 75% at 50% 45%, ${C.navyHi} 0%, ${C.navy} 55%, ${C.navyLo} 100%)`}}>
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      <defs>
        <pattern id="grid" width={60} height={60} patternUnits="userSpaceOnUse"><circle cx={30} cy={30} r={2.2} fill={C.cream} opacity={0.09} /></pattern>
      </defs>
      <rect width={1080} height={1920} fill="url(#grid)" />
      {MOTES.map((m, i) => <circle key={i} cx={m.x} cy={((m.y - t * m.v) % 1920 + 1920) % 1920} r={m.r} fill={m.c} opacity={m.a} />)}
    </svg>
    <Skyline t={t} />
  </AbsoluteFill>
);

// ---- transitions ----
// The incoming scene's style during [a, a + TRANSITION] and the outgoing scene's style during [b, b + TRANSITION].
export function enterStyle(kind: CutKind | undefined, p: number): React.CSSProperties {
  const e = easeInOut(clamp(p)), o = easeOut(clamp(p));
  switch (kind) {
    case 'curtain': return {clipPath: `inset(0 0 ${(1 - e) * 100}% 0)`};
    case 'wipe': return {clipPath: `inset(${(1 - e) * 100}% 0 0 0)`};
    case 'whip': return {transform: `translateX(${(1 - e) * 1080}px)`};
    case 'rise': return {transform: `translateY(${(1 - e) * 1920}px)`};
    case 'zoom': return {transform: `scale(${1.35 - 0.35 * o})`, opacity: clamp(p * 3)};
    case 'iris': return {clipPath: `circle(${e * 1150}px at 50% 52%)`};
    default: return {};
  }
}
export function exitStyle(kind: CutKind | undefined, p: number): React.CSSProperties | null {
  const e = easeInOut(clamp(p));
  switch (kind) {
    case 'whip': return {transform: `translateX(${-e * 1080}px)`};
    case 'rise': return {transform: `translateY(${-e * 1920}px)`};
    case 'zoom': return {transform: `scale(${1 - 0.12 * e})`, opacity: 1 - e};
    case 'freeze': case 'flash': return p > 0 ? null : {};
    default: return {}; // clip reveals: the old scene stays underneath until it is covered
  }
}
export const sceneStyle = (id: SceneId, next: SceneId | undefined, t: number, a: number, b: number): React.CSSProperties | null => {
  if (t < a) return null;
  if (t >= b) {
    if (t >= b + TRANSITION) return null;
    return exitStyle(next ? CUT_KIND[next] : undefined, (t - b) / TRANSITION);
  }
  if (t < a + TRANSITION) return enterStyle(CUT_KIND[id], (t - a) / TRANSITION);
  return {};
};

// Speed lines for the whip: bright streaks that cross the frame with the move
export const WhipStreaks: React.FC<{t: number; at: number}> = ({t, at}) => {
  const p = seg(t, at, at + TRANSITION);
  if (p <= 0 || p >= 1) return null;
  const R = rng(Math.round(at * 100)), a = Math.sin(p * Math.PI);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      {Array.from({length: 22}, (_, i) => {
        const y = R() * 1920, len = 300 + R() * 700, x = 1080 - (p * 1.6 - 0.3) * (1080 + len) + R() * 200;
        return <rect key={i} x={x} y={y} width={len} height={3 + R() * 7} rx={3} fill={R() < 0.5 ? '#fff' : C.gold} opacity={a * (0.25 + R() * 0.4)} />;
      })}
    </svg>
  );
};

// A white flash over everything: [time, strength]
export const Flash: React.FC<{t: number; hits: [number, number][]}> = ({t, hits}) => {
  let v = 0;
  for (const [h, s] of hits) if (t >= h && t < h + 0.4) v = Math.max(v, s * Math.exp(-(t - h) / 0.09));
  return v > 0.01 ? <AbsoluteFill style={{background: '#fff', opacity: v}} /> : null;
};
