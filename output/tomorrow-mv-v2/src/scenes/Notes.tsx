// Notes.tsx · 使真情溶化成音符: warm light; the burning heart glows on 使, notes start spilling out on 真情, the heart
// melts into them on 溶化, and on 音符 a five-line staff sweeps across and the notes snap onto it, bouncing on the beat.
import React from 'react';
import {CW, CH} from '../layout';
import {NOTES, HALF, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Note, Flame} from '../art/cast';
import {Sparkle} from '../art/props';
import {clamp, seg, lerp, easeOut, easeInOut, TAU} from '../lib/math';

const MX = 444, U = 20, FEET = CH - 40, TOP = FEET - 10 * U;
const HEART: [number, number] = [MX, TOP + 6.1 * U];
export const STAFF_Y = 150, STAFF_GAP = 22;
// Where each of the 9 notes sits on the staff (x, staff step), and the half-pulse it leaves the heart
export const NOTE_SLOTS: [number, number][] = [[110, 2], [195, 4], [280, 3], [365, 6], [450, 5], [535, 7], [620, 4], [705, 6], [790, 8]];
export const notePos = (t: number, i: number) => {
  const born = NOTES.spill + i * HALF * 0.9, k = t - born;
  if (k < 0) return null;
  const snap = easeInOut(seg(t, NOTES.staff - 0.1 + i * 0.03, NOTES.staff + 0.35 + i * 0.03));
  const a = k * 2.4 + i, r = 60 + k * 70;
  const fx = HEART[0] + Math.cos(a) * r, fy = HEART[1] - 40 - k * 120 + Math.sin(a) * r * 0.4;
  const [sx, step] = NOTE_SLOTS[i], sy = STAFF_Y + 4 * STAFF_GAP - step * (STAFF_GAP / 2) - 22;
  const bounce = t > NOTES.last ? 10 * Math.exp(-sincePulse(t) / 0.1) : 0;
  return {x: lerp(fx, sx, snap), y: lerp(fy, sy, snap) - bounce, rot: lerp(20 * Math.sin(a), 0, snap), op: clamp(k / 0.15)};
};

export const Notes: React.FC<{t: number}> = ({t}) => {
  const beat = Math.exp(-sincePulse(t) / 0.1);
  const glow = seg(t, NOTES.glow - 0.1, NOTES.glow + 0.3);
  const melt = easeOut(seg(t, NOTES.melt - 0.05, NOTES.melt + 0.6));
  const staff = easeInOut(seg(t, NOTES.staff - 0.25, NOTES.staff + 0.15));
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #F2A07A 0%, #FFC48A 45%, #FFE7BE 100%)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: MX - 330, top: HEART[1] - 330, width: 660, height: 660, borderRadius: 330, background: 'radial-gradient(circle, rgba(255,250,220,0.9) 0%, rgba(255,230,170,0.3) 40%, rgba(255,230,170,0) 70%)', opacity: 0.5 + 0.5 * glow}} />
      {/* the staff */}
      <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0}}>
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={60} y1={STAFF_Y + i * STAFF_GAP} x2={60 + (CW - 120) * staff} y2={STAFF_Y + i * STAFF_GAP} stroke="#7A4B3A" strokeWidth={4} strokeLinecap="round" opacity={0.85} />)}
      </svg>
      {/* flames fading into notes */}
      {Array.from({length: 8}, (_, i) => {
        const a = (i / 8) * TAU + t, r = 70 * (1 - melt) + 20;
        return <Flame key={i} x={HEART[0] + Math.cos(a) * r} y={HEART[1] + Math.sin(a) * r * 0.7 + 30} u={6 * (1 - melt) + 0.5} k={t + i * 0.3} opacity={1 - melt} />;
      })}
      <Clawd x={MX} y={FEET} u={U} eye={1} glint={1} mood={t > NOTES.staff ? 'happy' : 'normal'} look={-1} squash={1 + 0.05 * beat} cap={null} heart={1 - 0.6 * melt} blush={melt} />
      {/* the melting heart drips */}
      {melt > 0 && melt < 1 && [0, 1, 2].map((i) => <div key={i} style={{position: 'absolute', left: HEART[0] - 18 + i * 16, top: HEART[1] + 14 + 40 * melt * (1 + i * 0.4), width: 10, height: 16, borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%', background: '#E8433A', opacity: 1 - melt}} />)}
      {NOTE_SLOTS.map((_, i) => { const p = notePos(t, i); return p ? <Note key={i} x={p.x} y={p.y} u={8} rot={p.rot} opacity={p.op} color={i % 3 === 0 ? '#C0392B' : '#24345C'} /> : null; })}
      {t > NOTES.last && NOTE_SLOTS.map(([x], i) => <Sparkle key={'s' + i} x={x + 20} y={STAFF_Y - 20} s={14} k={(t - NOTES.last - i * 0.03) / 0.5} color="#FFFFFF" />)}
    </div>
  );
};
