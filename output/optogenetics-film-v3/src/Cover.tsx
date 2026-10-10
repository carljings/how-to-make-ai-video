// Cover.tsx: Douyin covers in three shapes, all from one piece of art: 9:16 (matches the video), 3:4 (profile grid,
// vertical cover slot) and 4:3 (landscape cover slot). Made to read at thumbnail size: one subject (the glowing mouse),
// one hook in huge type, a gold Nobel seal, an arrow to "the secret", and a one-line promise.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from './ui/Art';
import type {Gfx} from './lib/gfx';
import {W, H} from './timeline';
import {TAU} from './lib/math';
import {C} from './art/neuron';
import {drawMouse, drawCable, drawArena} from './art/mouse';
import {SANS, MONO} from './lib/fonts';
import {rgba} from './ui/Text';
import './lib/fonts';

// The art is drawn once on a 1080×1920 canvas; each layout shows the part it needs.
const MX = 500, MY = 1180, MS = 1.45, T = 1.25; // T: a moment in the hook where the mouse is in full stride, light on
export const IMPLANT: [number, number] = [MX + 168 * MS, MY - 142 * MS];
function drawCover(g: Gfx) {
  g.begin([4, 8, 18]);
  // a big blue bloom behind the mouse, plus soft rays from the implant
  g.glow(MX + 120, MY - 120, 900, [30, 90, 170], 0.5, 'halo');
  const ground = MY + 125 * MS;
  drawArena(g, T, ground, MX - 116 * MS);
  const m = drawMouse(g, {x: MX, y: MY, s: MS, t: T, light: 1});
  drawCable(g, [m.ferrule[0] + 60, 560], m.ferrule, T, 1, -9);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU, r1 = 70, r2 = 210 + (i % 3) * 70;
    g.line(m.ferrule[0] + Math.cos(a) * r1, m.ferrule[1] + Math.sin(a) * r1, m.ferrule[0] + Math.cos(a) * r2, m.ferrule[1] + Math.sin(a) * r2, C.ice, 0.35, 3);
  }
  g.glow(m.ferrule[0], m.ferrule[1], 120, C.white, 0.8, 'glow'); g.glow(m.ferrule[0], m.ferrule[1], 420, C.blue, 0.45, 'halo');
  g.glowArc(m.ferrule[0], m.ferrule[1], 150, C.blue, 0.6, 3);
  g.bloom(0.9);
  g.vignette(0.55);
  g.grain(7, 0.1);
}
const CoverArt: React.FC<{dx?: number; dy?: number}> = ({dx = 0, dy = 0}) => (
  <div style={{position: 'absolute', left: dx, top: dy, width: W, height: H}}><Art t={0} draw={drawCover} /></div>
);

const Hook: React.FC<{size: number; lines: [string, string][]}> = ({size, lines}) => (
  <>
    {lines.map(([text, key], li) => (
      <div key={li} style={{fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: `${size * 1.08}px`, color: '#ffffff', whiteSpace: 'nowrap',
        textShadow: '0 6px 30px rgba(0,0,0,0.85)'}}>
        {[...text].map((c, i) => (
          <span key={i} style={c === key ? {color: rgba('blue'), textShadow: `0 0 ${size * 0.2}px ${rgba('blue', 0.95)}, 0 6px 30px rgba(0,0,0,0.85)`} : undefined}>{c}</span>
        ))}
      </div>
    ))}
  </>
);
const Seal: React.FC<{r: number}> = ({r}) => (
  <div style={{width: r * 2, height: r * 2, borderRadius: r, border: `${r * 0.06}px solid rgb(236,200,120)`, background: 'radial-gradient(circle, rgba(70,52,16,0.95) 0%, rgba(30,22,8,0.95) 70%)',
    boxShadow: `0 0 ${r * 0.5}px rgba(236,200,120,0.55), inset 0 0 ${r * 0.3}px rgba(236,200,120,0.4)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-10deg)'}}>
    <div style={{fontFamily: MONO, fontWeight: 700, fontSize: r * 0.42, color: 'rgb(255,226,150)', lineHeight: 1}}>2026</div>
    <div style={{fontFamily: SANS, fontWeight: 900, fontSize: r * 0.33, color: 'rgb(255,226,150)', marginTop: r * 0.06, letterSpacing: 2}}>诺贝尔奖</div>
  </div>
);
// "The secret is here", with a curved arrow ending at the implant
const Secret: React.FC<{x: number; y: number; to: [number, number]; size: number}> = ({x, y, to, size}) => (
  <>
    <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
      <defs><marker id="head" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="rgb(255,214,102)" /></marker></defs>
      <path d={`M ${x + size * 2.4} ${y + size * 0.9} Q ${to[0] + 120} ${y + size * 1.4} ${to[0] + 34} ${to[1] - 50}`} fill="none" stroke="rgb(255,214,102)" strokeWidth={size * 0.12} strokeLinecap="round" markerEnd="url(#head)" style={{filter: 'drop-shadow(0 0 8px rgba(255,214,102,0.7))'}} />
    </svg>
    <div style={{position: 'absolute', left: x, top: y, fontFamily: SANS, fontWeight: 900, fontSize: size, color: 'rgb(255,214,102)', textShadow: '0 0 18px rgba(255,214,102,0.6), 0 4px 16px rgba(0,0,0,0.8)', whiteSpace: 'nowrap'}}>秘密在这里</div>
  </>
);
const Promise_: React.FC<{size: number}> = ({size}) => (
  <div style={{display: 'inline-block', padding: `${size * 0.35}px ${size * 0.8}px`, borderRadius: size, background: 'rgba(20,60,110,0.7)', border: `2px solid ${rgba('blue', 0.8)}`,
    fontFamily: SANS, fontWeight: 700, fontSize: size, color: '#eef6ff', letterSpacing: 2, whiteSpace: 'nowrap', boxShadow: `0 0 30px ${rgba('blue', 0.35)}`}}>大脑里的“光开关” · 1分钟看懂</div>
);
const HOOK: [string, string][] = [['灯一亮', '亮'], ['它就跑？', '跑']];

// 9:16, 1080×1920: the main cover, the same shape as the video
export const Cover: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#04080f'}}>
    <CoverArt />
    <div style={{position: 'absolute', left: 64, top: 280}}><Hook size={220} lines={HOOK} /></div>
    <div style={{position: 'absolute', left: 760, top: 250}}><Seal r={128} /></div>
    <Secret x={330} y={820} to={IMPLANT} size={54} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 1520, textAlign: 'center'}}><Promise_ size={42} /></div>
  </AbsoluteFill>
);
// 3:4, 1080×1440: profile grid / vertical cover slot
export const Cover34: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#04080f'}}>
    <CoverArt dy={-300} />
    <div style={{position: 'absolute', left: 64, top: 60}}><Hook size={196} lines={HOOK} /></div>
    <div style={{position: 'absolute', left: 790, top: 40}}><Seal r={112} /></div>
    <Secret x={330} y={520} to={[IMPLANT[0], IMPLANT[1] - 300]} size={50} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 1300, textAlign: 'center'}}><Promise_ size={40} /></div>
  </AbsoluteFill>
);
// 4:3, 1440×1080: landscape cover slot, text on the left, mouse on the right
export const Cover43: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#04080f'}}>
    <CoverArt dx={380} dy={-600} />
    <div style={{position: 'absolute', left: 0, top: 0, width: 760, height: 1080, background: 'linear-gradient(90deg, rgba(4,8,15,0.92) 55%, rgba(4,8,15,0) 100%)'}} />
    <div style={{position: 'absolute', left: 70, top: 90}}><Seal r={92} /></div>
    <div style={{position: 'absolute', left: 70, top: 300}}><Hook size={176} lines={HOOK} /></div>
    <div style={{position: 'absolute', left: 70, top: 730}}><Promise_ size={38} /></div>
    <Secret x={1060} y={180} to={[IMPLANT[0] + 380, IMPLANT[1] - 600]} size={44} />
  </AbsoluteFill>
);
