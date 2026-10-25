// Hud.tsx: the small type that frames the film: the header line at the top and the mascot's status pill in the
// corner of the postcard (like a terminal status line).
import React from 'react';
import {MONO, SANS} from '../lib/fonts';
import {HEADER_Y, CH} from '../layout';
import {SCENES, BARLINE, PULSE, sincePulse, pulseAt} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Pix, MINI_HEART} from '../art/pixel';
import {clamp, seg} from '../lib/math';

export const Header: React.FC = () => (
  <div style={{position: 'absolute', left: 70, top: HEADER_Y, height: 44, display: 'flex', alignItems: 'center'}}>
    <div style={{position: 'relative', width: 62, height: 44}}><Clawd x={26} y={38} u={3} eye={1} cap={null} /></div>
    <div style={{fontFamily: MONO, fontWeight: 800, fontSize: 28, letterSpacing: 5, color: '#7A6247'}}>CLAUDE MV</div>
    <div style={{width: 8, height: 8, borderRadius: 4, background: '#C8372D', margin: '0 18px'}} />
    <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: '#7A6247'}}>明天会更好</div>
  </div>
);

// Claude Code-style "thinking" spinner, drawn (the terminal glyphs are not in the shipped fonts)
const Spinner: React.FC<{k: number}> = ({k}) => {
  const n = [4, 6, 6, 8, 8, 6][k % 6], r = [6, 8, 10, 12, 10, 8][k % 6];
  return (
    <svg width={30} height={30} viewBox="-15 -15 30 30" style={{marginRight: 10}}>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + k * 0.4;
        return <line key={i} x1={0} y1={0} x2={Math.cos(a) * r} y2={Math.sin(a) * r} stroke="#E9A27E" strokeWidth={3.4} strokeLinecap="round" />;
      })}
    </svg>
  );
};

// The pill sits inside the card content area (bottom-left). Its text changes on each downbeat.
export const Status: React.FC<{t: number}> = ({t}) => {
  const i = Math.max(0, SCENES.findIndex((s) => t >= s.a && t < s.b));
  const scene = SCENES[t >= SCENES[SCENES.length - 1].a ? SCENES.length - 1 : i];
  const pop = 1 + 0.12 * Math.exp(-Math.max(0, t - scene.a) / 0.08) * (scene.a > 0 ? 1 : 0);
  const dot = 0.45 + 0.55 * Math.exp(-sincePulse(t) / 0.12);
  let body: React.ReactNode = scene.status;
  if (scene.id === 'dawn') {
    const p = clamp(seg(t, BARLINE[1], BARLINE[2] - 0.3));
    const n = Math.round(p * 10);
    body = <>{'waking up '}<span style={{color: '#7BD88F', letterSpacing: -2}}>{'█'.repeat(n)}</span><span style={{color: '#4A5068', letterSpacing: -2}}>{'█'.repeat(10 - n)}</span>{` ${String(Math.round(p * 100)).padStart(3, ' ')}%`}</>;
  } else if (scene.id === 'planet') {
    body = <><Spinner k={Math.max(0, pulseAt(t * 1) * 2 + (sincePulse(t) > PULSE / 2 ? 1 : 0))} />thinking</>;
  } else if (scene.id === 'heart') {
    body = <><svg width={30} height={30} viewBox="0 0 5 5" style={{marginRight: 10}}><Pix rows={MINI_HEART} pal={{r: '#FF6B5E'}} /></svg>beating</>;
  }
  return (
    <div style={{position: 'absolute', left: 18, top: CH - 64, height: 46, padding: '0 20px 0 16px', borderRadius: 23, background: 'rgba(24,26,40,0.84)',
      display: 'flex', alignItems: 'center', fontFamily: MONO, fontWeight: 500, fontSize: 23, color: '#F4EBD9', whiteSpace: 'pre',
      transform: `scale(${pop})`, transformOrigin: '0% 100%', boxShadow: '0 4px 10px rgba(0,0,0,0.18)'}}>
      <div style={{width: 12, height: 12, borderRadius: 6, background: '#5FD68A', marginRight: 12, opacity: dot, boxShadow: `0 0 ${8 * dot}px #5FD68A`}} />
      <span style={{color: '#A9A3B8', marginRight: 10}}>status:</span>{body}
    </div>
  );
};
