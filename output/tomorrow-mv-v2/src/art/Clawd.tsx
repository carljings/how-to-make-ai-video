// Clawd.tsx: the pixel mascot, after the creature in Claude Code's logo (and the reference MV): a 12×8 body,
// 2×2 arms, four legs in columns 1, 3, 8 and 10, and 1×2 eyes. Units are "pixels" of the sprite; u sets their size
// on screen. The sprite is anchored at its feet, so (x, y) is the point it stands on.
import React from 'react';
import {Pix, MINI_HEART} from './pixel';
import {lerp, clamp} from '../lib/math';

export const CLAY = '#D97757';
export const INK = '#1C1A1F';
const CAP_ROWS = [
  '...............ww.',
  '..............wwwg',
  '............nnwgg.',
  '.........lllnn....',
  '......nnnnnnn.....',
  '...lllllllll......',
  '.cccccccccccc.....',
];
const WING_ROWS = [
  '........ww',
  '.....wwwwb',
  '...wwwwwbo',
  '.wwwwwbbo.',
  'wwwwbbo...',
  'wwbbo.....',
  'wbo.......',
];
const CAP_PAL = {n: '#2C4380', l: '#9DBBEA', c: '#F6EDD8', w: '#FFFFFF', g: '#CFD6E6'};

export interface ClawdProps {
  x: number; y: number; u: number;
  eye?: number;                          // 0 closed … 1 open
  mood?: 'normal' | 'happy' | 'surprised' | 'sad';
  gaze?: number; look?: number;          // eyes: −1 left … 1 right; −1 up … 1 down
  squash?: number;                       // >1 squashed (wider and shorter), <1 stretched
  tilt?: number;                         // degrees, around the bottom of the body
  lift?: number;                         // units the whole body rises (a hop)
  walk?: number | null;                  // walking: the legs swap on each whole number
  cap?: {x: number; y: number; r: number} | null; // nightcap offset (units) and rotation (deg); null = none
  heart?: number;                        // chest heart: 0 hidden … 1 lit and glowing
  blush?: number;
  armL?: number; armR?: number;          // arm raise in units (0 rest … 3 up)
  glint?: number;                        // white catch-lights in open eyes (0..1)
  wings?: {flap: number; k: number} | null; // pixel wings: flap angle (deg) and how far they have popped out (0..1)
  scarf?: boolean;
  tear?: {y: number; streak: number} | null; // a tear from the right eye: 0..1 down the cheek, and its streak
  opacity?: number;
}

export const Clawd: React.FC<ClawdProps> = (p) => {
  const {x, y, u, eye = 1, mood = 'normal', gaze = 0, look = 0, squash = 1, tilt = 0, lift = 0, walk = null, cap = {x: 0, y: 0, r: 0},
    heart = 0, blush = 0, armL = 0, armR = 0, glint = 0, wings = null, scarf = false, tear = null, opacity = 1} = p;
  // viewBox in sprite units: x −4..18, y −8..11 (room for the cap and its pom-pom)
  const VX = -4, VY = -8, VW = 22, VH = 19;
  const sx = squash, sy = 1 / squash;
  const ex = gaze * 0.5, ey = look * 0.4;
  const legs = [1, 3, 8, 10].map((lx, i) => {
    const short = walk !== null && ((Math.floor(walk) + (i % 2)) % 2 === 0);
    return <rect key={lx} x={lx} y={8} width={1} height={short ? 1.1 : 2} fill={CLAY} />;
  });
  const eyes = [3, 8].map((cx) => {
    if (mood === 'happy') {
      // ^ ^ : three half-unit squares in a caret
      const bx = cx - 0.25 + ex, by = 2.6 + ey;
      return (
        <g key={cx} fill={INK}>
          <rect x={bx + 0.5} y={by} width={0.5} height={0.5} />
          <rect x={bx} y={by + 0.5} width={0.5} height={0.5} />
          <rect x={bx + 1} y={by + 0.5} width={0.5} height={0.5} />
        </g>
      );
    }
    const e = clamp(eye), big = mood === 'surprised' ? 1 : 0;
    const brow = mood === 'sad' ? <rect x={cx - 0.35} y={1.2 + ey} width={1.7} height={0.42} fill={INK} transform={`rotate(${cx < 6 ? -18 : 18} ${cx + 0.5} 1.4)`} /> : null;
    const w = lerp(1.6, 1 + big * 0.3, e), top = lerp(3.45, 2 - big * 0.3, e), bot = lerp(3.75, 4 + big * 0.2, e);
    return (
      <g key={cx}>
        {brow}
        <rect x={cx + 0.5 - w / 2 + ex} y={top + ey} width={w} height={bot - top} fill={INK} />
        {glint > 0 && e > 0.7 && <rect x={cx + 0.5 - w / 2 + ex + 0.12} y={top + ey + 0.15} width={0.36} height={0.36} fill="#FFFFFF" opacity={glint * (e - 0.7) / 0.3} />}
      </g>
    );
  });
  return (
    <svg
      width={VW * u} height={VH * u} viewBox={`${VX} ${VY} ${VW} ${VH}`}
      style={{position: 'absolute', left: x - (6 - VX) * u, top: y - (10 - VY) * u, overflow: 'visible', opacity}}
    >
      <g transform={`translate(6 ${10 - lift}) scale(${sx} ${sy}) translate(-6 -10) rotate(${tilt} 6 8)`} shapeRendering="crispEdges">
        {wings && wings.k > 0 && [0, 1].map((side) => (
          <g key={side} transform={`translate(${side ? 12.2 : -0.2} 3.2) scale(${(side ? 1 : -1) * wings.k} ${wings.k}) rotate(${-wings.flap})`}>
            <Pix rows={WING_ROWS} pal={{w: '#FFFFFF', b: '#CFE0F5', o: '#9DB6D8'}} x={0} y={-4.2} u={0.78} />
          </g>
        ))}
        {legs}
        <rect x={-2} y={4 - armL} width={2} height={2} fill={CLAY} />
        <rect x={12} y={4 - armR} width={2} height={2} fill={CLAY} />
        <rect x={0} y={0} width={12} height={8} fill={CLAY} />
        {heart > 0 && (
          <g>
            <circle cx={6} cy={6.1} r={2.6} fill="#FF8A6B" opacity={0.35 * heart} shapeRendering="auto" />
            <Pix rows={MINI_HEART} pal={{r: heart > 0.5 ? '#E8433A' : '#B8503E'}} x={6 - 1.05} y={6.1 - 1.05} u={0.42} opacity={clamp(heart * 1.5)} />
          </g>
        )}
        {blush > 0 && (
          <g fill="#F2938A" opacity={0.8 * blush}>
            <rect x={1.6} y={4.7} width={1.2} height={0.5} />
            <rect x={9.2} y={4.7} width={1.2} height={0.5} />
          </g>
        )}
        {eyes}
        {tear && (
          <g shapeRendering="auto">
            <rect x={8.3} y={4} width={0.42} height={Math.max(0, 3.6 * tear.y)} fill="#8CC8F2" opacity={0.75 * tear.streak} />
            {tear.y < 1 && <path d={`M8.5 ${4.2 + 3.6 * tear.y - 0.7} q0.55 0.75 0.55 1.05 a0.55 0.55 0 1 1 -1.1 0 q0 -0.3 0.55 -1.05 z`} fill="#7FC4F5" stroke="#FFFFFF" strokeWidth={0.12} />}
          </g>
        )}
        {scarf && (
          <g>
            <rect x={-0.3} y={5.1} width={12.6} height={1.3} fill="#D7382F" />
            <rect x={-0.3} y={5.55} width={12.6} height={0.3} fill="#F2E3C6" />
            <rect x={8.6} y={6.3} width={1.4} height={2.6} fill="#D7382F" transform="rotate(-8 9.3 6.3)" />
          </g>
        )}
        {cap && (
          <g transform={`translate(${cap.x} ${cap.y}) rotate(${cap.r} 6.5 0.5)`}>
            <Pix rows={CAP_ROWS} pal={CAP_PAL} x={0} y={-6} u={1} />
          </g>
        )}
      </g>
    </svg>
  );
};

// The nightcap on its own, for when the wind takes it (same drawing as on the head)
export const Nightcap: React.FC<{x: number; y: number; u: number; r: number}> = ({x, y, u, r}) => (
  <svg width={20 * u} height={10 * u} viewBox="-1 -7 20 10" style={{position: 'absolute', left: x - 7.5 * u, top: y - 6.5 * u, overflow: 'visible'}}>
    <g transform={`rotate(${r} 6.5 0.5)`}><Pix rows={CAP_ROWS} pal={CAP_PAL} x={0} y={-6} u={1} /></g>
  </svg>
);
