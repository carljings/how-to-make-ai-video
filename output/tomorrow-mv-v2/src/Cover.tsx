// Cover.tsx: Douyin covers in three shapes from one design: 9:16 (matches the video), 3:4 (profile grid, vertical
// cover slot) and 4:3 (landscape cover slot). Made to read at thumbnail size: one moment (the winged pixel AI flying
// with the V of migrating birds), the song's title huge, and a one-line hook.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Paper, BackCards, Postcard} from './art/paper';
import {Birds} from './scenes/Birds';
import {Clawd} from './art/Clawd';
import {PixelHeart, Sparkle} from './art/props';
import {COL} from './ui/Lyrics';
import {SERIF, SANS, MONO} from './lib/fonts';
import {TILT} from './layout';
import './lib/fonts';

const T = 31.75; // the V of birds is complete and the winged mascot has joined it
const SHADOW = '0 8px 0 rgba(70,46,20,0.18)';

// 明天 · 会 · 更 · 好 (in the pixel heart, like 心 and 灵 in the film)
const Title: React.FC<{s: number}> = ({s}) => (
  <div style={{display: 'flex', alignItems: 'center', whiteSpace: 'nowrap'}}>
    <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: s, lineHeight: 1, color: COL.navy, textShadow: SHADOW}}>明天</span>
    <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: s * 0.5, lineHeight: 1, color: '#6E5A44', margin: `0 ${s * 0.04}px`, alignSelf: 'flex-end', paddingBottom: s * 0.06}}>会</span>
    <span style={{fontFamily: SERIF, fontWeight: 900, fontSize: s, lineHeight: 1, color: COL.red, textShadow: SHADOW}}>更</span>
    <div style={{position: 'relative', width: s * 1.3, height: s * 1.16, marginLeft: s * 0.06}}>
      <PixelHeart x={0} y={0} cell={(s * 1.3) / 9} />
      <div style={{position: 'absolute', inset: 0, top: -s * 0.12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: s * 0.74, color: '#FFFFFF'}}>好</div>
    </div>
  </div>
);
const Hook: React.FC<{s: number}> = ({s}) => (
  <div style={{fontFamily: SANS, fontWeight: 700, fontSize: s, color: '#5E4A36', letterSpacing: s * 0.06, whiteSpace: 'nowrap'}}>
    一只 AI，<span style={{color: COL.red}}>飞去送祝福</span>
  </div>
);
const Kicker: React.FC<{s: number}> = ({s}) => (
  <div style={{display: 'flex', alignItems: 'center'}}>
    <div style={{position: 'relative', width: s * 2.3, height: s * 1.5}}><Clawd x={s * 0.95} y={s * 1.32} u={s / 9} eye={1} cap={null} /></div>
    <div style={{fontFamily: MONO, fontWeight: 800, fontSize: s, letterSpacing: s * 0.18, color: '#7A6247'}}>CLAUDE MV</div>
  </div>
);
// The postcard with the dawn close-up, as it sits in the film; dx, dy, k move and scale it
const Card: React.FC<{dx: number; dy: number; k: number}> = ({dx, dy, k}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: `translate(${dx}px, ${dy}px) scale(${k})`, transformOrigin: '0 0'}}>
    <BackCards />
    <Postcard tilt={TILT[1]} scale={1}><Birds t={T} /></Postcard>
  </div>
);
const Sparkles: React.FC<{pts: [number, number, number][]}> = ({pts}) => <>{pts.map(([x, y, s], i) => <Sparkle key={i} x={x} y={y} s={s} k={0.5} color={i % 2 ? '#FFD45A' : '#F2A65A'} rot={i * 20} />)}</>;

export const Cover: React.FC = () => (
  <AbsoluteFill style={{overflow: 'hidden'}}>
    <Paper />
    <div style={{position: 'absolute', left: 64, top: 200}}><Kicker s={34} /></div>
    <div style={{position: 'absolute', left: 58, top: 300}}><Title s={196} /></div>
    <div style={{position: 'absolute', left: 70, top: 560}}><Hook s={60} /></div>
    <Card dx={0} dy={10} k={1} />
    <Sparkles pts={[[990, 300, 34], [1020, 560, 22], [40, 640, 26], [960, 690, 20]]} />
  </AbsoluteFill>
);
// 3:4: the same design moved up, so the title, hook and card all sit inside the frame
export const Cover34: React.FC = () => (
  <AbsoluteFill style={{overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: 0, top: -150, width: 1080, height: 1920}}><Cover /></div>
  </AbsoluteFill>
);
// 4:3: title and hook on the left, the card on the right
export const Cover43: React.FC = () => (
  <AbsoluteFill style={{overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: 1440, height: 1080, transform: 'scale(1.334)', transformOrigin: '0 0'}}><Paper /></div>
    <div style={{position: 'absolute', left: 60, top: 150}}><Kicker s={30} /></div>
    <div style={{position: 'absolute', left: 52, top: 250}}><Title s={108} /></div>
    <div style={{position: 'absolute', left: 64, top: 430}}><Hook s={44} /></div>
    <div style={{position: 'absolute', left: 64, top: 520, fontFamily: SERIF, fontWeight: 900, fontSize: 62, lineHeight: 1.35, color: COL.navy, textShadow: SHADOW}}>
      抬头寻找<br /><span style={{color: COL.red}}>天空的翅膀</span>
    </div>
    <Card dx={600} dy={-316} k={0.8} />
    <Sparkles pts={[[540, 220, 28], [1380, 120, 24], [520, 860, 22]]} />
  </AbsoluteFill>
);
