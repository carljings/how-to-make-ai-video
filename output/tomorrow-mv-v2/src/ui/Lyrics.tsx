// Lyrics.tsx: the sung words, one character at a time, each landing on its syllable. A character's motion follows
// its meaning (轻 floats, 敲 slams, 沉睡 sinks, 张开 opens like an eyelid, 忙碌 shakes, 春风 blows in, 不解 tumbles…).
// Layout and looks are here; the times come from LINES in timeline.ts.
import React from 'react';
import {LINES, BARLINE, PULSE, sincePulse, WORLD, DAWN, CUTS, HITS, lineExit, type Cut} from '../timeline';
import {SERIF, MONO} from '../lib/fonts';
import {clamp, seg, lerp, easeOut, easeIn, backOut, noise1, TAU} from '../lib/math';
import {PixelHeart, Sparkle, SpeedLines, Petal} from '../art/props';
import {heartFlight} from '../scenes/Heart';

export const COL = {navy: '#24345C', red: '#C0392B', soft: '#A38E75', gray: '#8E8070', gold: '#E39C22', green: '#4C9A58', blue: '#3B78B5', pink: '#E0628A', box: '#24407A',
  dark: '#3A3446', orange: '#E8742A'};
type Look = 'soft' | 'red' | 'navy' | 'gray' | 'small' | 'box' | 'heart' | 'eye' | 'round' | 'square' | 'gold' | 'green' | 'blue' | 'pink'
  | 'dark' | 'orange' | 'photo' | 'wing' | 'flame' | 'ice' | 'snow' | 'note' | 'notif' | 'fu';
type Fx = 'float' | 'slam' | 'pop' | 'sink' | 'badge' | 'stretch' | 'open' | 'eye' | 'glanceL' | 'glanceR' | 'jitter' | 'stamp' | 'slow' | 'alone'
  | 'blowIn' | 'swirl' | 'tumble' | 'windIn' | 'petal' | 'wobble' | 'spark' | 'orbit' | 'final'
  | 'drop' | 'rise' | 'fly' | 'shake' | 'flicker' | 'snow' | 'bounce';
interface G {x: number; y: number; s: number; look: Look; fx: Fx}
const g = (x: number, y: number, s: number, look: Look, fx: Fx): G => ({x, y, s, look, fx});

// One entry per sung syllable, in the order of LINES
const LAYOUT: G[][] = [
  [g(120, 425, 88, 'soft', 'float'), g(212, 425, 88, 'soft', 'float'), g(372, 400, 150, 'red', 'slam'), g(540, 400, 150, 'red', 'pop'),
    g(125, 588, 118, 'navy', 'sink'), g(250, 588, 118, 'navy', 'sink'), g(352, 610, 68, 'small', 'pop'), g(490, 582, 74, 'heart', 'badge'), g(664, 582, 74, 'heart', 'badge')],
  [g(122, 405, 110, 'gray', 'stretch'), g(240, 405, 110, 'gray', 'stretch'), g(398, 398, 150, 'navy', 'open'), g(562, 398, 150, 'navy', 'open'),
    g(128, 590, 106, 'box', 'pop'), g(242, 608, 68, 'small', 'pop'), g(382, 584, 84, 'eye', 'eye'), g(566, 584, 84, 'eye', 'eye')],
  [g(118, 405, 112, 'navy', 'glanceL'), g(236, 405, 112, 'navy', 'glanceR'), g(378, 400, 124, 'red', 'jitter'), g(508, 400, 124, 'red', 'jitter'),
    g(612, 422, 68, 'small', 'pop'), g(730, 398, 92, 'round', 'stamp'), g(896, 398, 92, 'square', 'stamp'),
    g(122, 590, 110, 'navy', 'pop'), g(240, 590, 110, 'navy', 'pop'), g(472, 594, 100, 'gray', 'slow'), g(580, 594, 100, 'gray', 'slow')],
  [g(150, 470, 132, 'navy', 'alone'), g(742, 470, 132, 'navy', 'alone'), g(858, 494, 68, 'small', 'pop'),
    g(0, 0, 0, 'navy', 'orbit'), g(0, 0, 0, 'navy', 'orbit'), g(0, 0, 0, 'navy', 'orbit'), g(0, 0, 0, 'navy', 'orbit')],
  [g(140, 470, 150, 'green', 'blowIn'), g(306, 470, 150, 'blue', 'swirl'), g(462, 484, 114, 'navy', 'tumble'), g(582, 484, 114, 'navy', 'tumble'),
    g(732, 470, 132, 'pink', 'windIn'), g(882, 470, 132, 'pink', 'petal')],
  [g(125, 410, 130, 'blue', 'windIn'), g(268, 410, 130, 'blue', 'wobble'), g(432, 404, 130, 'gold', 'spark'), g(574, 404, 130, 'gold', 'spark'),
    g(686, 426, 68, 'small', 'pop'), g(0, 0, 0, 'heart', 'final')],
  // 让昨日 / 脸上的泪痕
  [g(110, 418, 96, 'soft', 'float'), g(252, 412, 88, 'photo', 'pop'), g(392, 412, 88, 'photo', 'pop'),
    g(125, 592, 118, 'navy', 'pop'), g(250, 592, 118, 'navy', 'pop'), g(352, 612, 68, 'small', 'pop'), g(480, 588, 132, 'blue', 'drop'), g(616, 592, 118, 'blue', 'slow')],
  // 随记忆风干了
  [g(118, 470, 128, 'navy', 'windIn'), g(268, 466, 96, 'photo', 'pop'), g(402, 466, 96, 'photo', 'pop'), g(560, 470, 138, 'blue', 'swirl'), g(720, 466, 138, 'gold', 'spark'), g(846, 494, 68, 'small', 'pop')],
  // 抬头寻找 / 天空的翅膀
  [g(125, 405, 150, 'navy', 'rise'), g(287, 405, 150, 'navy', 'rise'), g(445, 412, 112, 'navy', 'glanceL'), g(565, 412, 112, 'navy', 'glanceR'),
    g(128, 592, 132, 'blue', 'rise'), g(270, 592, 132, 'blue', 'rise'), g(382, 612, 68, 'small', 'pop'), g(530, 588, 90, 'wing', 'badge'), g(740, 588, 90, 'wing', 'badge')],
  // 候鸟出现 / 它的影迹
  [g(125, 408, 132, 'navy', 'fly'), g(272, 408, 132, 'navy', 'fly'), g(412, 412, 112, 'navy', 'pop'), g(532, 412, 112, 'navy', 'pop'),
    g(122, 592, 112, 'navy', 'pop'), g(228, 612, 68, 'small', 'pop'), g(355, 592, 120, 'gray', 'slow'), g(480, 592, 120, 'gray', 'slow')],
  // 带来远处的饥荒 / 无情的战火
  [g(110, 408, 112, 'navy', 'pop'), g(226, 408, 112, 'navy', 'pop'), g(338, 418, 82, 'gray', 'alone'), g(422, 418, 82, 'gray', 'alone'), g(500, 426, 62, 'small', 'pop'),
    g(618, 410, 120, 'dark', 'sink'), g(744, 410, 120, 'dark', 'sink'),
    g(125, 592, 118, 'dark', 'slam'), g(250, 592, 118, 'dark', 'slam'), g(352, 612, 68, 'small', 'pop'), g(492, 586, 150, 'red', 'shake'), g(660, 586, 150, 'flame', 'flicker')],
  // 依然存在的消息
  [g(108, 472, 108, 'gray', 'slow'), g(222, 472, 108, 'gray', 'slow'), g(352, 468, 122, 'navy', 'pop'), g(478, 468, 122, 'navy', 'pop'), g(578, 492, 68, 'small', 'pop'),
    g(704, 466, 84, 'notif', 'badge'), g(866, 466, 84, 'notif', 'badge')],
  // 玉山白雪飘零
  [g(128, 466, 150, 'ice', 'rise'), g(298, 466, 150, 'ice', 'rise'), g(462, 476, 108, 'snow', 'snow'), g(582, 476, 108, 'snow', 'snow'), g(706, 476, 108, 'snow', 'snow'), g(830, 476, 108, 'snow', 'snow')],
  // 燃烧少年的心
  [g(128, 466, 150, 'flame', 'flicker'), g(300, 466, 150, 'flame', 'flicker'), g(468, 466, 128, 'gold', 'spark'), g(608, 466, 128, 'gold', 'spark'), g(718, 492, 68, 'small', 'pop'), g(862, 466, 84, 'heart', 'badge')],
  // 使真情 / 溶化成音符
  [g(118, 408, 112, 'navy', 'pop'), g(252, 404, 132, 'pink', 'pop'), g(398, 404, 132, 'pink', 'pop'),
    g(125, 592, 124, 'orange', 'sink'), g(262, 592, 124, 'orange', 'sink'), g(374, 612, 68, 'small', 'pop'), g(512, 588, 86, 'note', 'bounce'), g(690, 588, 86, 'note', 'bounce')],
  // 倾诉遥远的祝福
  [g(110, 470, 118, 'navy', 'windIn'), g(236, 470, 118, 'navy', 'windIn'), g(356, 480, 86, 'gray', 'alone'), g(450, 480, 86, 'gray', 'alone'), g(540, 494, 66, 'small', 'pop'),
    g(668, 466, 128, 'gold', 'stamp'), g(856, 466, 96, 'fu', 'stamp')],
];

// How early a character shows before its syllable (so a slam lands on the beat rather than starting on it)
const LEAD: Partial<Record<Fx, number>> = {slam: 0.08, stamp: 0.07, pop: 0.04, badge: 0.04, blowIn: 0.06, windIn: 0.05, glanceL: 0.04, glanceR: 0.04, swirl: 0.04, spark: 0.03,
  drop: 0.1, rise: 0.05, fly: 0.08, shake: 0.08, flicker: 0.04, bounce: 0.04};

interface M {dx: number; dy: number; sx: number; sy: number; rot: number; op: number; ghost?: [number, number]}
// Motion of a character u seconds after its syllable (u < 0 during its lead-in)
function motion(fx: Fx, u: number, t: number, seed: number): M {
  const m: M = {dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, op: 1};
  const after = Math.max(0, u);
  switch (fx) {
    case 'float': { const k = clamp(u / 0.45); m.dy = 46 * (1 - easeOut(k)) + 5 * Math.sin(t * 3.1 + seed); m.rot = -7 * (1 - easeOut(k)); m.op = easeOut(clamp(u / 0.16)); break; }
    case 'slam': {
      if (u < 0) { const k = clamp((u + 0.08) / 0.08); const s = lerp(2.5, 1, easeIn(k)); m.sx = m.sy = s; m.rot = lerp(-14, 0, k); m.op = lerp(0.25, 1, k); m.ghost = [-26, -30]; }
      else { const d = Math.exp(-after / 0.07); m.sx = 1 + 0.16 * d; m.sy = 1 - 0.14 * d; m.dy = 6 * d; }
      break;
    }
    case 'pop': case 'badge': case 'spark': { const k = clamp((u + 0.04) / 0.26); const s = backOut(k, 2.2); m.sx = m.sy = Math.max(0, s); m.op = clamp((u + 0.04) / 0.06); break; }
    case 'sink': { const k = clamp(u / 0.55); m.dy = -80 * (1 - easeOut(k)); m.sy = lerp(1.18, 1, easeOut(k)); m.op = clamp(u / 0.25); break; }
    case 'stretch': { const k = easeOut(clamp(u / 0.75)); m.sx = lerp(2.1, 1, k); m.sy = lerp(0.5, 1, k); m.op = clamp(u / 0.3); m.dx = -30 * (1 - k); break; }
    case 'open': { const k = clamp(u / 0.3); m.sy = Math.max(0.03, backOut(k, 1.4)); m.sx = lerp(1.2, 1, easeOut(k)); m.op = u >= 0 ? 1 : 0; break; }
    case 'eye': { const k = clamp(u / 0.28); m.sy = Math.max(0.04, backOut(k, 1.6)); m.op = u >= 0 ? 1 : 0;
      const b = DAWN.blink2; if (t > b && t < b + 0.16) m.sy *= 0.1 + 0.9 * Math.abs((t - b - 0.08) / 0.08); break; }
    case 'glanceL': case 'glanceR': { const k = easeOut(clamp((u + 0.04) / 0.2)); m.dx = (fx === 'glanceL' ? -90 : 90) * (1 - k); m.op = k; m.rot = (fx === 'glanceL' ? -8 : 8) * (1 - k); break; }
    case 'jitter': {
      const k = clamp((u + 0.04) / 0.2); m.sx = m.sy = Math.max(0, backOut(k, 2)); m.op = clamp((u + 0.04) / 0.06);
      const busy = 1 - seg(t, WORLD.slow, WORLD.ask);
      m.dx = 6 * busy * noise1(t * 28, seed); m.dy = 5 * busy * noise1(t * 31, seed + 9); m.rot = 5 * busy * noise1(t * 24, seed + 3);
      break;
    }
    case 'stamp': {
      if (u < 0) { const k = clamp((u + 0.07) / 0.07); m.sx = m.sy = lerp(2.3, 1, easeIn(k)); m.rot = lerp(24, 0, k); m.op = lerp(0.3, 1, k); m.ghost = [10, -24]; }
      else { const d = Math.exp(-after / 0.06); m.sx = m.sy = 1 - 0.08 * d; }
      break;
    }
    case 'slow': { const k = easeOut(clamp(u / 0.6)); m.op = k * 0.95; m.dy = 16 * (1 - k); break; }
    case 'alone': { const k = easeOut(clamp(u / 0.45)); m.op = k; m.sx = m.sy = lerp(0.82, 1, k); m.dy = 6 * Math.sin(t * 2.2 + seed); break; }
    case 'blowIn': {
      const k = easeOut(clamp((u + 0.06) / 0.32)); m.dx = -300 * (1 - k); m.dy = -40 * Math.sin(k * Math.PI) * (1 - k); m.rot = -40 * (1 - k);
      m.op = clamp((u + 0.06) / 0.1); if (k < 0.7) m.ghost = [-34, 0];
      m.rot += 3 * Math.sin(t * 5 + seed); break;
    }
    case 'swirl': { const k = easeOut(clamp((u + 0.04) / 0.34)); m.rot = -360 * (1 - k) + 3 * Math.sin(t * 5 + seed); m.sx = m.sy = lerp(0.2, 1, k); m.op = clamp((u + 0.04) / 0.08); break; }
    case 'tumble': {
      const k = clamp((u + 0.0) / 0.22); m.sx = m.sy = Math.max(0, backOut(k, 2)); m.op = clamp(u / 0.06);
      m.rot = 16 * Math.sin(after * 9 + seed) * Math.exp(-after / 0.9) + 5 * noise1(t * 3, seed); m.dx = 8 * Math.sin(after * 7 + seed);
      break;
    }
    case 'windIn': {
      const k = easeOut(clamp((u + 0.05) / 0.36)); m.dx = -170 * (1 - k); m.dy = 26 * Math.sin(k * TAU) * (1 - k); m.rot = 18 * Math.sin(k * TAU) * (1 - k);
      m.op = clamp((u + 0.05) / 0.12); m.rot += 3 * Math.sin(t * 4 + seed); break;
    }
    case 'petal': { const k = easeOut(clamp(u / 0.5)); m.dy = -70 * (1 - k); m.dx = 22 * Math.sin(k * TAU) * (1 - k); m.rot = -14 * (1 - k); m.op = clamp(u / 0.2); break; }
    case 'wobble': {
      const k = clamp((u + 0.0) / 0.2); m.sx = m.sy = Math.max(0, backOut(k, 2)); m.op = clamp(u / 0.05);
      m.rot = 11 * Math.sin(after * 22) * Math.exp(-after / 0.45); m.dx = 6 * Math.sin(after * 17) * Math.exp(-after / 0.45);
      break;
    }
    case 'drop': { // a tear: falls from above, splats and settles
      if (u < 0) { const k = clamp((u + 0.1) / 0.1); m.dy = -150 * (1 - k * k); m.op = k; m.sy = 1.15; }
      else { const d = Math.exp(-after / 0.08); m.sx = 1 + 0.22 * d; m.sy = 1 - 0.2 * d; m.dy = 8 * d; }
      break;
    }
    case 'rise': { const k = clamp((u + 0.05) / 0.3); m.dy = 110 * (1 - backOut(k, 1.6)); m.op = clamp((u + 0.05) / 0.08); m.sy = lerp(1.25, 1, clamp(k * 1.5)); break; }
    case 'fly': { const k = easeOut(clamp((u + 0.08) / 0.32)); m.dx = 260 * (1 - k); m.dy = -30 * Math.sin(k * Math.PI) * (1 - k); m.rot = 14 * (1 - k); m.op = clamp((u + 0.08) / 0.1); if (k < 0.6) m.ghost = [40, 0]; break; }
    case 'shake': {
      if (u < 0) { const k = clamp((u + 0.08) / 0.08); m.sx = m.sy = lerp(2.2, 1, easeIn(k)); m.op = lerp(0.3, 1, k); m.ghost = [0, -30]; }
      else { const d = Math.exp(-after / 0.35); m.dx = 9 * d * noise1(t * 40, seed); m.dy = 7 * d * noise1(t * 43, seed + 3); m.rot = 6 * d * noise1(t * 37, seed + 7); }
      break;
    }
    case 'flicker': { const k = clamp((u + 0.04) / 0.22); m.sx = m.sy = Math.max(0, backOut(k, 2)) * (1 + 0.05 * Math.sin(t * 31 + seed)); m.op = clamp((u + 0.04) / 0.06); m.dy = -3 * Math.abs(Math.sin(t * 17 + seed)); break; }
    case 'snow': { const k = easeOut(clamp(u / 0.7)); m.dy = -80 * (1 - k) + 4 * Math.sin(t * 2.4 + seed); m.dx = 18 * Math.sin(k * Math.PI * 2 + seed) * (1 - k); m.rot = 12 * Math.sin(t * 1.8 + seed) * (1 - 0.5 * k); m.op = clamp(u / 0.25); break; }
    case 'bounce': { const k = clamp((u + 0.04) / 0.22); m.sx = m.sy = Math.max(0, backOut(k, 2.4)); m.op = clamp((u + 0.04) / 0.06); if (u > 0.25) m.dy = -14 * Math.exp(-sincePulse(t) / 0.09); break; }
    default: break;
  }
  // every character breathes a little on each pulse once it has landed
  if (u > 0.3) { const b = Math.exp(-sincePulse(t) / 0.1); m.sx *= 1 + 0.035 * b; m.sy *= 1 + 0.035 * b; }
  return m;
}

const SHADOW = '0 6px 0 rgba(70,46,20,0.17)';
// The character itself, drawn on its badge where it has one
const Face: React.FC<{ch: string; gl: G; t: number}> = ({ch, gl, t}) => {
  const s = gl.s;
  const text = (color: string, extra?: React.CSSProperties) => (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: s, lineHeight: 1, color, ...extra}}>{ch}</div>
  );
  switch (gl.look) {
    case 'box': return (<><div style={{position: 'absolute', inset: -s * 0.12, background: COL.box, transform: 'rotate(-4deg)', boxShadow: '5px 7px 0 rgba(20,30,60,0.25)'}} />{text('#FFFFFF')}</>);
    case 'heart': { const c = s * 0.24; return (<><PixelHeart x={s / 2 - 4.5 * c} y={s / 2 - 4.2 * c} cell={c} />{text('#FFFFFF', {fontSize: s * 0.92, top: -s * 0.1})}</>); }
    case 'eye': {
      const d = s * 1.9;
      return (<>
        <div style={{position: 'absolute', left: s / 2 - d / 2, top: s / 2 - d / 2, width: d, height: d, borderRadius: '50%', background: '#FFFFFF', border: `${s * 0.09}px solid ${COL.navy}`, boxSizing: 'border-box', boxShadow: '0 7px 0 rgba(30,40,70,0.2)'}} />
        <div style={{position: 'absolute', left: s * 0.72, top: -s * 0.06, width: s * 0.2, height: s * 0.2, borderRadius: '50%', background: '#FFFFFF', zIndex: 2}} />
        {text('#151515')}
      </>);
    }
    case 'round': {
      const d = s * 1.75;
      return (<>
        <svg width={d} height={d} viewBox="-50 -50 100 100" style={{position: 'absolute', left: s / 2 - d / 2, top: s / 2 - d / 2, overflow: 'visible'}}>
          <circle r={46} fill="rgba(200,55,45,0.1)" stroke="#C8372D" strokeWidth={5} />
          <circle r={37} fill="none" stroke="#C8372D" strokeWidth={2.5} />
          {[0, 1, 2].map((i) => <path key={i} d={`M42 ${-12 + i * 12} q8 -6 16 0 t16 0 t16 0`} fill="none" stroke="#C8372D" strokeWidth={3.2} opacity={0.85} />)}
        </svg>
        {text('#C8372D', {textShadow: 'none'})}
      </>);
    }
    case 'square': {
      const d = s * 1.6;
      return (<>
        <div style={{position: 'absolute', left: s / 2 - d / 2, top: s / 2 - d / 2, width: d, height: d, border: `${s * 0.06}px solid ${COL.box}`, borderRadius: 10, boxSizing: 'border-box', background: 'rgba(35,64,122,0.08)', transform: 'rotate(-5deg)'}}>
          <div style={{position: 'absolute', inset: s * 0.08, border: `${s * 0.025}px dashed ${COL.box}`, borderRadius: 6}} />
        </div>
        {text(COL.box, {textShadow: 'none', transform: 'rotate(-5deg)'})}
      </>);
    }
    case 'small': return text('#6E5A44', {fontSize: s, textShadow: SHADOW});
    case 'photo': return (<>
      <div style={{position: 'absolute', left: -s * 0.16, top: -s * 0.14, width: s * 1.32, height: s * 1.5, background: '#FFFDF6', boxShadow: '0 8px 14px rgba(40,30,20,0.25)', transform: 'rotate(-6deg)'}}>
        <div style={{position: 'absolute', left: s * 0.1, top: s * 0.1, width: s * 1.12, height: s * 1.05, background: 'linear-gradient(#DDE7F6, #B9C9E4)'}} /></div>
      {text('#3E4A6A', {transform: 'rotate(-6deg)', top: -s * 0.08})}</>);
    case 'wing': {
      const f = 18 * Math.sin(t * 23.5);
      const wing = (side: number) => (
        <svg width={s * 0.95} height={s * 0.8} viewBox="0 0 10 8" style={{position: 'absolute', left: side < 0 ? -s * 0.82 : s * 0.87, top: s * 0.02, transform: `scaleX(${side}) rotate(${-f}deg)`, transformOrigin: side < 0 ? '100% 80%' : '0% 80%', overflow: 'visible'}}>
          <path d="M0 7 C 2 2, 6 0, 10 1 C 8 2, 9 3, 7 3.5 C 8.5 4, 7.5 5, 5.5 5 C 6.5 6, 4 6.6, 0 7 Z" fill="#FFFFFF" stroke="#9DB6D8" strokeWidth={0.5} />
        </svg>
      );
      return (<>{wing(-1)}{wing(1)}<div style={{position: 'absolute', left: -s * 0.12, top: -s * 0.12, width: s * 1.24, height: s * 1.24, borderRadius: '50%', background: '#FFFFFF', border: `${s * 0.07}px solid ${COL.blue}`, boxSizing: 'border-box', boxShadow: '0 6px 0 rgba(30,60,120,0.2)'}} />{text(COL.blue)}</>);
    }
    case 'flame': return text('#FF7A2A', {WebkitTextStroke: `${s * 0.025}px #9A2A10`, textShadow: `0 0 ${s * 0.18}px rgba(255,190,60,${0.6 + 0.3 * Math.sin(t * 19)}), 0 6px 0 rgba(120,30,10,0.35)`});
    case 'ice': return text('#CFEAFF', {WebkitTextStroke: `${s * 0.03}px #2E5A9A`, textShadow: '0 6px 0 rgba(30,60,120,0.3), 0 0 18px rgba(200,235,255,0.8)'});
    case 'snow': return text('#FFFFFF', {WebkitTextStroke: `${s * 0.03}px #6E8FC0`, textShadow: '0 5px 0 rgba(40,70,120,0.25)'});
    case 'note': return (<>
      <div style={{position: 'absolute', left: -s * 0.14, top: -s * 0.14, width: s * 1.28, height: s * 1.28, borderRadius: '50%', background: COL.navy, boxShadow: '0 6px 0 rgba(20,30,60,0.3)'}} />
      <svg width={s * 0.45} height={s * 0.63} viewBox="0 0 5 7" style={{position: 'absolute', left: s * 0.86, top: -s * 0.36}}><path d="M2 0h2v1h1v2h-1v-1h-2v4h-2v-2h1v-1h1z" fill="#FFD45A" /></svg>
      {text('#FFFFFF', {textShadow: 'none'})}</>);
    case 'notif': return (<>
      <div style={{position: 'absolute', left: -s * 0.16, top: -s * 0.16, width: s * 1.32, height: s * 1.32, borderRadius: '50%', background: '#E8433A', border: `${s * 0.07}px solid #FFFFFF`, boxSizing: 'border-box', boxShadow: '0 6px 0 rgba(120,20,20,0.3)'}} />
      {text('#FFFFFF', {textShadow: 'none'})}</>);
    case 'fu': return (<>
      <div style={{position: 'absolute', left: -s * 0.12, top: -s * 0.12, width: s * 1.24, height: s * 1.24, background: '#D7382F', border: `${s * 0.06}px solid #FFD45A`, boxSizing: 'border-box', transform: 'rotate(45deg)', boxShadow: '0 8px 0 rgba(120,20,20,0.3)'}} />
      {text('#FFD45A', {textShadow: '0 3px 0 rgba(120,40,0,0.5)', fontSize: s * 0.92})}</>);
    case 'gold': return text(COL.gold, {WebkitTextStroke: `${s * 0.025}px #8A5410`, textShadow: '0 6px 0 rgba(120,70,10,0.3)'});
    default: return text(COL[gl.look as keyof typeof COL] ?? COL.navy, {textShadow: SHADOW});
  }
};

const Glyph: React.FC<{ch: string; gl: G; ts: number; t: number; seed: number; exit: number}> = ({ch, gl, ts, t, seed, exit}) => {
  const lead = LEAD[gl.fx] ?? 0;
  const u = t - ts;
  if (u < -lead) return null;
  const m = motion(gl.fx, u, t, seed);
  const e = easeIn(clamp(exit));
  const op = m.op * (1 - e);
  if (op <= 0.003) return null;
  const box = gl.s;
  const tf = (dx: number, dy: number) => `translate(${dx}px, ${dy - 40 * e}px) rotate(${m.rot}deg) scale(${m.sx * (1 - 0.25 * e)}, ${m.sy * (1 - 0.25 * e)})`;
  const base: React.CSSProperties = {position: 'absolute', left: gl.x - box / 2, top: gl.y - box / 2, width: box, height: box};
  return (
    <>
      {m.ghost && [2, 1].map((k) => (
        <div key={k} style={{...base, transform: tf(m.dx + m.ghost![0] * k, m.dy + m.ghost![1] * k), opacity: op * (k === 1 ? 0.3 : 0.14)}}><Face ch={ch} gl={gl} t={t} /></div>
      ))}
      <div style={{...base, transform: tf(m.dx, m.dy), opacity: op}}><Face ch={ch} gl={gl} t={t} /></div>
    </>
  );
};

// ---- per-line extras: knock marks, "!", z's, "？", the dotted distance, wind and petals ----
const Extras: React.FC<{line: number; t: number; exit: number}> = ({line, t, exit}) => {
  const L = LINES[line].syl, fade = 1 - clamp(exit);
  const out: React.ReactNode[] = [];
  if (line === 0) {
    const u = t - L[2].t; // 敲: impact strokes
    if (u > 0 && u < 0.35) out.push(<SpeedLines key="k" x={296} y={318} len={70} dir={-135} k={1 - u / 0.35} color="#C0392B" n={3} spread={26} />);
    const v = t - L[3].t; // 醒: a "!" that pops and wiggles
    if (v > -0.02) { const k = clamp((v + 0.02) / 0.22); out.push(<div key="!" style={{position: 'absolute', left: 618, top: 284, fontFamily: SERIF, fontWeight: 900, fontSize: 110, color: COL.gold, WebkitTextStroke: '3px #8A5410',
      transform: `scale(${Math.max(0, backOut(k, 2.6))}) rotate(${14 + 8 * Math.sin(t * 9)}deg)`, opacity: fade}}>!</div>); }
    const w = t - L[4].t; // 沉睡: z's drifting up
    if (w > 0) for (let i = 0; i < 3; i++) { const p = ((w * 0.8 + i / 3) % 1); out.push(<div key={'z' + i} style={{position: 'absolute', left: 318 + p * 60 + i * 6, top: 560 - p * 120, fontFamily: MONO, fontWeight: 800, fontSize: 30 + p * 26, color: COL.navy,
      opacity: Math.sin(p * Math.PI) * 0.7 * fade * clamp(w / 0.3)}}>z</div>); }
  }
  if (line === 1) for (const i of [6, 7]) { const u = t - L[i].t; for (let j = 0; j < 2; j++) out.push(<Sparkle key={`s${i}${j}`} x={LAYOUT[1][i].x + (j ? 70 : -78)} y={LAYOUT[1][i].y - 70 + j * 30} s={22} k={(u - j * 0.06) / 0.45} color="#FFD45A" />); }
  if (line === 2) {
    const busy = 1 - seg(t, WORLD.slow, WORLD.ask), flick = Math.floor(t * 15) % 2 ? 7 : -7;
    for (const i of [2, 3]) { // 忙碌: manga "shaking" marks flicker over each character while the world is busy
      const u = t - L[i].t, gl = LAYOUT[2][i]; if (u <= 0) continue;
      for (const a0 of [-48, 0, 48]) { const a = a0 + flick, r = gl.s * 0.66, ra = (a * Math.PI) / 180;
        out.push(<div key={`m${i}${a0}`} style={{position: 'absolute', left: gl.x + Math.sin(ra) * r - 4, top: gl.y - Math.cos(ra) * r - 14, width: 8, height: 28, borderRadius: 4, background: COL.red,
          transform: `rotate(${a}deg)`, opacity: busy * fade * clamp(u / 0.08)}} />); }
    }
    const q = t - L[8].t; // 否: a bouncing "？"
    if (q > -0.03) { const k = clamp((q + 0.03) / 0.22), b = Math.abs(Math.sin((t - L[8].t) * Math.PI / PULSE)); out.push(<div key="?" style={{position: 'absolute', left: 312, top: 520 - 22 * b * clamp(q / 0.3),
      fontFamily: SERIF, fontWeight: 900, fontSize: 116, lineHeight: 1, color: COL.gold, WebkitTextStroke: '3px #8A5410', transform: `scale(${Math.max(0, backOut(k, 2.4))}) rotate(${10 * Math.sin(t * 4)}deg)`, opacity: fade}}>？</div>); }
  }
  if (line === 3) {
    const u = t - L[1].t; // 独: a dotted line measures the distance from 孤
    if (u > -0.1) for (let i = 0; i < 9; i++) { const k = clamp((u + 0.1 - i * 0.022) / 0.08); out.push(<div key={i} style={{position: 'absolute', left: 258 + i * 46, top: 474, width: 12, height: 12, borderRadius: 6, background: COL.gray, opacity: k * 0.7 * fade, transform: `scale(${k})`}} />); }
  }
  if (line === 4) {
    // petals and wind strokes blowing through the lyrics, strongest on 春 and 风
    for (let i = 0; i < 12; i++) {
      const t0 = L[0].t - 0.3 + i * 0.22, p = (t - t0) / 1.6; if (p < 0 || p > 1) continue;
      out.push(<Petal key={'p' + i} x={-40 + p * 1180} y={360 + ((i * 53) % 230) + 40 * Math.sin(p * 6 + i)} u={7 + (i % 3) * 2} rot={p * 540 + i * 40} opacity={fade} />);
    }
    for (const [j, i] of [[0, 0], [1, 1], [2, 4]]) { // wind swooshes on 春, 风 and the second 风
      const u = t - L[i].t; if (u <= -0.05 || u >= 0.55) continue;
      const k = clamp((u + 0.05) / 0.6), x = -260 + k * 1300, y = 352 + j * 92;
      out.push(<svg key={'w' + j} width={300} height={60} viewBox="0 0 300 60" style={{position: 'absolute', left: x, top: y, opacity: Math.sin(k * Math.PI) * 0.85 * fade, overflow: 'visible'}}>
        <path d="M0 40 C 60 10, 110 10, 150 30 S 240 52, 300 20" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" strokeDasharray="300" strokeDashoffset={-300 * clamp(k * 1.6 - 0.6)} />
        <path d="M40 54 C 90 36, 140 38, 190 48" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      </svg>);
    }
  }
  if (line === 5) {
    const u = t - L[0].t; // 吹: a swirl of wind
    if (u > 0 && u < 0.9) { const k = u / 0.9; out.push(<svg key="sw" width={300} height={200} viewBox="0 0 300 200" style={{position: 'absolute', left: 30, top: 300, opacity: Math.sin(k * Math.PI) * fade, overflow: 'visible'}}>
      <path d="M10 120 C 80 40, 200 40, 220 100 C 235 150, 170 170, 150 130 C 135 100, 180 80, 200 105" fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeDasharray="700" strokeDashoffset={700 * (1 - easeOut(clamp(k * 1.8)))} /></svg>); }
    for (const i of [2, 3]) { const v = t - L[i].t; for (let j = 0; j < 3; j++) out.push(<Sparkle key={`g${i}${j}`} x={LAYOUT[5][i].x + [-70, 66, 10][j]} y={LAYOUT[5][i].y + [-70, -40, 76][j]} s={[24, 18, 16][j]} k={(v - j * 0.07) / 0.5} color="#FFD45A" />); }
  }
  return <>{out}</>;
};

// The last word, 心, is the heart that flew up out of the postcard; it beats on the last three pulses
const FinalHeart: React.FC<{t: number; exit: number}> = ({t, exit}) => {
  const h = heartFlight(t);
  if (!h.screen) return null;
  const e = easeIn(clamp(exit));
  if (e >= 1) return null;
  const s = h.cell;
  return (
    <div style={{position: 'absolute', left: h.x - 4.5 * s, top: h.y - 4 * s, width: 9 * s, height: 8 * s, transform: `rotate(${h.rot}deg) translateY(${-40 * e}px) scale(${1 - 0.3 * e})`, opacity: 1 - e}}>
      <div style={{position: 'absolute', left: -2 * s, top: -2 * s, width: 13 * s, height: 12 * s, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,120,100,0.45) 0%, rgba(255,120,100,0) 65%)', opacity: h.glow}} />
      <PixelHeart x={0} y={0} cell={s} />
      <div style={{position: 'absolute', inset: 0, top: -s * 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: s * 3.6, color: '#FFFFFF', opacity: h.text}}>心</div>
    </div>
  );
};

// Confetti from an accented word as it lands: pixel squares in the word's colours
const BURST_COLORS = ['#E8433A', '#FFD45A', '#3B78B5', '#FFFFFF', '#F28CA0'];
const Burst: React.FC<{x: number; y: number; k: number; power: number; seed: number}> = ({x, y, k, power, seed}) => {
  if (k <= 0 || k >= 1) return null;
  const n = Math.round(10 + 10 * power);
  return <>{Array.from({length: n}, (_, i) => {
    const a = (i / n) * TAU + seed, sp = (0.6 + 0.4 * (((i * 53 + seed * 7) % 10) / 10)) * (140 + 160 * power);
    const d = sp * easeOut(k), s = 12 * (1 - k * 0.6);
    return <div key={i} style={{position: 'absolute', left: x + Math.cos(a) * d - s / 2, top: y + Math.sin(a) * d + 120 * k * k - s / 2, width: s, height: s, background: BURST_COLORS[i % 5],
      transform: `rotate(${k * 360 + i * 30}deg)`, opacity: 1 - k * k}} />;
  })}</>;
};

// All the words of a cut at film time f. Each bar's group of words lives in its own song time (film time + the
// playlist offset), enters on its first syllable and leaves just before the next entry starts.
export const LyricTrack: React.FC<{f: number; cut: Cut}> = ({f, cut}) => {
  const E = CUTS[cut].entries, nodes: React.ReactNode[] = [];
  E.forEach((e, idx) => {
    const li = e.bar, t = f + e.offset, next = E[idx + 1];
    const start = BARLINE[li] - 0.12;
    const exitAt = !next ? Infinity : next.bar === li + 1 ? lineExit(li) : BARLINE[li + 1] - 0.14;
    if (t < start - 0.2 || t > exitAt + 0.3) return;
    LINES[li].syl.forEach((s, i) => {
      const gl = LAYOUT[li][i];
      if (gl.fx === 'orbit' || gl.fx === 'final') return;
      const exit = (t - (exitAt + i * 0.012)) / 0.16;
      nodes.push(<Glyph key={`${li}-${i}`} ch={s.ch} gl={gl} ts={s.t} t={t} seed={li * 17 + i * 5} exit={exit} />);
    });
    if (li <= 5) nodes.push(<Extras key={`x${li}`} line={li} t={t} exit={(t - exitAt) / 0.16} />);
    if (li === 5) nodes.push(<FinalHeart key="fh" t={t} exit={(t - exitAt) / 0.16} />);
    for (const [hb, hi, power] of HITS) {
      if (hb !== li) continue;
      const gl = LAYOUT[li][hi];
      if (!gl || gl.fx === 'orbit' || gl.fx === 'final') continue;
      nodes.push(<Burst key={`b${li}-${hi}`} x={gl.x} y={gl.y} k={(t - LINES[li].syl[hi].t) / 0.7} power={power} seed={li + hi} />);
    }
  });
  return <>{nodes}</>;
};
