// Lyrics.tsx: the sung words, one character at a time, each landing on its syllable. A character's motion follows
// its meaning (轻 floats, 敲 slams, 沉睡 sinks, 张开 opens like an eyelid, 忙碌 shakes, 春风 blows in, 不解 tumbles…).
// Layout and looks are here; the times come from LINES in timeline.ts.
import React from 'react';
import {LINES, BARLINE, PULSE, sincePulse, WORLD, DAWN} from '../timeline';
import {SERIF, MONO} from '../lib/fonts';
import {clamp, seg, lerp, easeOut, easeIn, backOut, noise1, TAU} from '../lib/math';
import {PixelHeart, Sparkle, SpeedLines, Petal} from '../art/props';
import {heartFlight} from '../scenes/Heart';

export const COL = {navy: '#24345C', red: '#C0392B', soft: '#A38E75', gray: '#8E8070', gold: '#E39C22', green: '#4C9A58', blue: '#3B78B5', pink: '#E0628A', box: '#24407A'};
type Look = 'soft' | 'red' | 'navy' | 'gray' | 'small' | 'box' | 'heart' | 'eye' | 'round' | 'square' | 'gold' | 'green' | 'blue' | 'pink';
type Fx = 'float' | 'slam' | 'pop' | 'sink' | 'badge' | 'stretch' | 'open' | 'eye' | 'glanceL' | 'glanceR' | 'jitter' | 'stamp' | 'slow' | 'alone'
  | 'blowIn' | 'swirl' | 'tumble' | 'windIn' | 'petal' | 'wobble' | 'spark' | 'orbit' | 'final';
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
];

// How early a character shows before its syllable (so a slam lands on the beat rather than starting on it)
const LEAD: Partial<Record<Fx, number>> = {slam: 0.08, stamp: 0.07, pop: 0.04, badge: 0.04, blowIn: 0.06, windIn: 0.05, glanceL: 0.04, glanceR: 0.04, swirl: 0.04, spark: 0.03};

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
    default: break;
  }
  // every character breathes a little on each pulse once it has landed
  if (u > 0.3) { const b = Math.exp(-sincePulse(t) / 0.1); m.sx *= 1 + 0.035 * b; m.sy *= 1 + 0.035 * b; }
  return m;
}

const SHADOW = '0 6px 0 rgba(70,46,20,0.17)';
// The character itself, drawn on its badge where it has one
const Face: React.FC<{ch: string; gl: G}> = ({ch, gl}) => {
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
        <div key={k} style={{...base, transform: tf(m.dx + m.ghost![0] * k, m.dy + m.ghost![1] * k), opacity: op * (k === 1 ? 0.3 : 0.14)}}><Face ch={ch} gl={gl} /></div>
      ))}
      <div style={{...base, transform: tf(m.dx, m.dy), opacity: op}}><Face ch={ch} gl={gl} /></div>
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
const FinalHeart: React.FC<{t: number}> = ({t}) => {
  const h = heartFlight(t);
  if (!h.screen) return null;
  const s = h.cell;
  return (
    <div style={{position: 'absolute', left: h.x - 4.5 * s, top: h.y - 4 * s, width: 9 * s, height: 8 * s, transform: `rotate(${h.rot}deg)`}}>
      <div style={{position: 'absolute', left: -2 * s, top: -2 * s, width: 13 * s, height: 12 * s, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,120,100,0.45) 0%, rgba(255,120,100,0) 65%)', opacity: h.glow}} />
      <PixelHeart x={0} y={0} cell={s} />
      <div style={{position: 'absolute', inset: 0, top: -s * 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: s * 3.6, color: '#FFFFFF', opacity: h.text}}>心</div>
    </div>
  );
};

export const LyricTrack: React.FC<{t: number}> = ({t}) => {
  const nodes: React.ReactNode[] = [];
  LINES.forEach((line, li) => {
    const start = BARLINE[li], next = li + 1 < BARLINE.length ? BARLINE[li + 1] : Infinity;
    if (t < start - 0.12 || t > next + 0.1) return;
    line.syl.forEach((s, i) => {
      const gl = LAYOUT[li][i];
      if (gl.fx === 'orbit' || gl.fx === 'final') return;
      const exit = next === Infinity ? 0 : (t - (next - 0.14 + i * 0.012)) / 0.16;
      nodes.push(<Glyph key={`${li}-${i}`} ch={s.ch} gl={gl} ts={s.t} t={t} seed={li * 17 + i * 5} exit={exit} />);
    });
    nodes.push(<Extras key={`x${li}`} line={li} t={t} exit={next === Infinity ? 0 : (t - (next - 0.14)) / 0.16} />);
  });
  return <>{nodes}<FinalHeart t={t} /></>;
};
