// Film.tsx: one film = a playlist of song bars (CUTS in timeline.ts). The paper, header and lyrics sit around one
// postcard; each scene inside the card is a <Sequence> (named in Remotion Studio) drawn from its own song time. Hits
// punch and shake the frame, drops flash white, and on 福 every postcard flies into one giant heart, which opens into a
// heart-shaped window onto the film's own first frame, so the loop on Douyin is seamless.
import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {W, H, FPS, SCENES, CUTS, TRANSITION, HITS, LINES, BLESS, sincePulse, entryAt, type Cut, type CutKind, type Entry} from './timeline';
import {CW, CH, CARD, TILT} from './layout';
import {Paper, BackCards, Postcard, AIRMAIL} from './art/paper';
import {Header, Status} from './ui/Hud';
import {LyricTrack} from './ui/Lyrics';
import {SCENE_COMPONENTS} from './scenes';
import {NIGHT_FACE} from './scenes/Night';
import {DAWN_EYE} from './scenes/Dawn';
import {HEART_OUTLINE} from './art/pixel';
import {Petal, PixelHeart, Moon, Sun} from './art/props';
import {Bird, Flame, Note, Firework} from './art/cast';
import {clamp, seg, lerp, easeIn, easeOut, easeInOut, springAt, noise1} from './lib/math';
import {MONO} from './lib/fonts';
import './lib/fonts';

const DAWN_FACE: [number, number] = [444, DAWN_EYE[1]];
const POINTS: Record<string, [[number, number], [number, number]]> = {
  'night>dawn': [NIGHT_FACE, DAWN_FACE], 'birds>news': [[690, 250], [444, 338]], 'mountain>fire': [[444, 214], [444, 420]],
};
const key = (a: Entry, b: Entry) => `${SCENES[a.bar].id}>${SCENES[b.bar].id}`;
const trOf = (a: Entry, b: Entry) => TRANSITION[key(a, b)] ?? {kind: 'cut' as CutKind, pre: 0, post: 0};

// Hits in film time for a cut: [film time, strength]
const hitsOf = (cut: Cut): [number, number][] => HITS.flatMap(([bar, i, s]) => {
  const e = CUTS[cut].entries.find((x) => x.bar === bar);
  return e ? [[LINES[bar].syl[i].t - e.offset, s] as [number, number]] : [];
});
const HIT_CACHE: Record<Cut, [number, number][]> = {full: hitsOf('full'), short: hitsOf('short')};
// Drops: boundaries whose transition is a drop
const dropsOf = (cut: Cut) => CUTS[cut].entries.slice(1).filter((e, i) => trOf(CUTS[cut].entries[i], e).kind === 'drop').map((e) => e.filmA);
const DROPS: Record<Cut, number[]> = {full: dropsOf('full'), short: dropsOf('short')};

export function camera(cut: Cut, f: number): {x: number; y: number; r: number; s: number} {
  let x = 0, y = 0, r = 0, s = 1;
  HIT_CACHE[cut].forEach(([at, p], i) => {
    const u = f - at;
    if (u < 0 || u > 0.6) return;
    const d = p * Math.exp(-u / 0.11);
    x += 14 * d * noise1(u * 38, i * 3 + 1); y += 12 * d * noise1(u * 41, i * 3 + 2); r += 0.7 * d * noise1(u * 33, i * 3 + 3);
    s += 0.035 * p * Math.exp(-u / 0.12);
  });
  for (const at of DROPS[cut]) { const u = f - at; if (u >= 0 && u < 0.6) s += 0.07 * Math.exp(-u / 0.14); }
  return {x, y, r, s};
}

// How a scene looks while it leaves (out) or arrives (in) through a transition at progress k (0..1); null = hidden
function cutStyle(kind: CutKind, dir: 'in' | 'out', k: number, pts?: [[number, number], [number, number]]): React.CSSProperties | null {
  const [po, pn] = pts ?? [[CW / 2, CH / 2], [CW / 2, CH / 2]];
  switch (kind) {
    case 'pushIn': case 'zoomTo': return dir === 'out'
      ? (k > 0.9 ? null : {transform: `scale(${1 + 2.7 * easeIn(clamp(k / 0.8))})`, transformOrigin: `${po[0]}px ${po[1]}px`, opacity: 1 - seg(k, 0.55, 0.9)})
      : (k < 0.45 ? null : {transform: `scale(${lerp(0.72, 1, easeOut(seg(k, 0.45, 1)))})`, transformOrigin: `${pn[0]}px ${pn[1]}px`, opacity: seg(k, 0.45, 0.75)});
    case 'eyeIris': {
      if (dir === 'out') return k > 0.97 ? null : {transform: `scale(${1 + 5.5 * easeIn(clamp(k / 0.5))})`, transformOrigin: `${DAWN_EYE[0]}px ${DAWN_EYE[1]}px`};
      const r = 1050 * easeOut(seg(k, 0.38, 1));
      return r <= 0.5 ? null : {clipPath: `circle(${r}px at ${DAWN_EYE[0]}px ${DAWN_EYE[1]}px)`, transform: `scale(${lerp(1.5, 1, easeOut(seg(k, 0.38, 1)))})`, transformOrigin: `${DAWN_EYE[0]}px ${DAWN_EYE[1]}px`};
    }
    case 'windWipe': {
      if (dir === 'out') return {};
      const X = lerp(-90, CW + 90, easeInOut(k));
      if (X <= -60) return null;
      const pts2 = ['0px 0px'];
      for (let y = 0; y <= CH; y += 26) pts2.push(`${(X + 34 * Math.sin(y / 60 + k * 9)).toFixed(1)}px ${y}px`);
      pts2.push(`0px ${CH}px`);
      return {clipPath: `polygon(${pts2.join(', ')})`};
    }
    case 'drip': {
      if (dir === 'out') return {};
      const Y = lerp(-80, CH + 120, easeInOut(k));
      if (Y <= -60) return null;
      const pts2 = ['0px 0px', `${CW}px 0px`];
      for (let x = CW; x >= 0; x -= 22) pts2.push(`${x}px ${(Y + 46 * Math.max(0, Math.sin(x / 37)) ** 3 + 10 * Math.sin(x / 13)).toFixed(1)}px`);
      return {clipPath: `polygon(${pts2.join(', ')})`};
    }
    case 'whip': return dir === 'out'
      ? (k > 0.55 ? null : {transform: `translateY(${-CH * 1.1 * easeIn(clamp(k / 0.55))}px)`})
      : (k < 0.4 ? null : {transform: `translateY(${CH * 1.1 * (1 - easeOut(seg(k, 0.4, 1)))}px)`});
    case 'drop': return dir === 'out'
      ? (k > 0.05 ? null : {})
      : (k < 0.05 ? null : {transform: `scale(${lerp(1.3, 1, easeOut(seg(k, 0.05, 1)))})`, transformOrigin: '50% 50%'});
    case 'flip': return (dir === 'out') === (k < 0.5) ? {} : null;
    default: return {};
  }
}

const SceneLayer: React.FC<{E: Entry[]; i: number; f: number; loose: boolean}> = ({E, i, f, loose}) => {
  const e = E[i], prev = E[i - 1], next = E[i + 1];
  const trIn = prev ? trOf(prev, e) : null, trOut = next ? trOf(e, next) : null;
  const start = e.filmA - (trIn?.pre ?? 0), end = e.filmB + (trOut?.post ?? 0);
  if ((f < start && !(loose && i === 0)) || (f >= end && !(loose && i === E.length - 1))) return null;
  let st: React.CSSProperties = {};
  if (trIn && f < e.filmA + trIn.post) {
    const c = cutStyle(trIn.kind, 'in', (f - (e.filmA - trIn.pre)) / (trIn.pre + trIn.post || 1), POINTS[key(prev!, e)]);
    if (!c) return null;
    st = {...st, ...c};
  }
  if (trOut && f >= e.filmB - trOut.pre && f < end) {
    const c = cutStyle(trOut.kind, 'out', (f - (e.filmB - trOut.pre)) / (trOut.pre + trOut.post || 1), POINTS[key(e, next!)]);
    if (!c) return null;
    st = {...st, ...c};
  }
  const Scene = SCENE_COMPONENTS[SCENES[e.bar].id];
  return <div style={{position: 'absolute', inset: 0, ...st}}><Scene t={f + e.offset} /></div>;
};

// Things drawn over the card content during a transition: zoom lines, petals on the wind's edge, a flash on drops
const CutOverlay: React.FC<{E: Entry[]; f: number}> = ({E, f}) => {
  for (let i = 1; i < E.length; i++) {
    const tr = trOf(E[i - 1], E[i]), at = E[i].filmA;
    if (f < at - tr.pre || f >= at + tr.post + 0.3) continue;
    const k = (f - (at - tr.pre)) / (tr.pre + tr.post || 1);
    const pts = POINTS[key(E[i - 1], E[i])];
    if ((tr.kind === 'pushIn' || tr.kind === 'zoomTo') && k < 1) {
      const P = pts?.[0] ?? [CW / 2, CH / 2], o = Math.sin(Math.PI * seg(k, 0.15, 0.95));
      return (
        <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
          {Array.from({length: 28}, (_, j) => {
            const a = (j / 28) * Math.PI * 2 + 0.11 * (j % 3), r0 = 180 + 260 * k + 30 * (j % 4), r1 = r0 + 140 + 60 * (j % 3);
            return <line key={j} x1={P[0] + Math.cos(a) * r0} y1={P[1] + Math.sin(a) * r0} x2={P[0] + Math.cos(a) * r1} y2={P[1] + Math.sin(a) * r1} stroke="#FFF4DA" strokeWidth={5} strokeLinecap="round" opacity={0.75} />;
          })}
        </svg>
      );
    }
    if (tr.kind === 'windWipe' && k < 1) {
      const X = lerp(-90, CW + 90, easeInOut(k));
      return <>{Array.from({length: 16}, (_, j) => <Petal key={j} x={X + 30 * Math.sin(j * 2.3) + 20} y={(j + 0.5) * (CH / 16)} u={8 + (j % 3) * 3} rot={j * 47 + k * 400} />)}</>;
    }
    if (tr.kind === 'whip' && k < 1) {
      return <>{Array.from({length: 9}, (_, j) => <div key={j} style={{position: 'absolute', left: 40 + j * 98, top: 0, width: 8, height: CH, background: '#FFFFFF', opacity: 0.5 * Math.sin(Math.PI * k), transform: `translateY(${(1 - k) * 200 - 100}px) scaleY(${0.4 + 0.6 * Math.sin(Math.PI * k)})`}} />)}</>;
    }
    if (tr.kind === 'drip' && k < 1) {
      const Y = lerp(-80, CH + 120, easeInOut(k));
      return <>{Array.from({length: 12}, (_, j) => <div key={j} style={{position: 'absolute', left: 30 + j * 74, top: Y + 30 * Math.sin(j * 1.7) - 20, width: 12, height: 20, borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%', background: '#BFE0FF', opacity: 0.85}} />)}</>;
    }
  }
  return null;
};

// ---- the finale: every postcard flies into one giant heart around the shrinking last card ----
const HEART_C: [number, number] = [540, 1000], HEART_CELL = 95;
const heartPoint = (i: number, n: number): [number, number] => {
  const th = (i / n) * Math.PI * 2 + Math.PI; // start at the bottom tip
  const x = 16 * Math.sin(th) ** 3, y = -(13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th));
  return [HEART_C[0] + x * 23, HEART_C[1] + (y + 2.5) * 23];
};
const MINI: {bg: string; icon: React.ReactNode}[] = [
  {bg: 'linear-gradient(#141B3D,#2D3B78)', icon: <Moon x={44} y={10} u={6} />},
  {bg: 'linear-gradient(#6E4A8C,#F29A7A 70%,#FFD08A)', icon: <Sun x={64} y={60} r={24} />},
  {bg: '#F3E9D2', icon: <div style={{position: 'absolute', inset: 14, backgroundImage: 'radial-gradient(#D9825C 30%, transparent 32%)', backgroundSize: '12px 12px'}} />},
  {bg: 'radial-gradient(#22306A,#0E132E)', icon: <div style={{position: 'absolute', left: 40, top: 22, width: 48, height: 48, borderRadius: 24, background: '#F8F1E1'}} />},
  {bg: 'linear-gradient(#9ED6EF 60%,#82C56F 60%)', icon: <Petal x={64} y={34} u={12} rot={20} />},
  {bg: 'radial-gradient(#FFF2C4,#F8A574)', icon: <PixelHeart x={40} y={18} cell={5.4} />},
  {bg: 'linear-gradient(#232B57,#6E80B0)', icon: <div style={{position: 'absolute', left: 54, top: 22, width: 20, height: 30, borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%', background: '#7FC4F5'}} />},
  {bg: 'linear-gradient(#5A8FD8,#FFE6B8)', icon: <>{[0, 1, 2].map((j) => <div key={j} style={{position: 'absolute', left: 20 + j * 8, top: 26 + j * 16, width: 80, height: 6, borderRadius: 3, background: '#FFFFFF'}} />)}</>},
  {bg: 'linear-gradient(#3A6FD6,#D8EEFF)', icon: <svg width={80} height={60} viewBox="0 0 10 8" style={{position: 'absolute', left: 24, top: 14}}><path d="M0 7 C 2 2, 6 0, 10 1 C 8 2, 9 3, 7 3.5 C 8.5 4, 7.5 5, 5.5 5 C 6.5 6, 4 6.6, 0 7 Z" fill="#FFFFFF" /></svg>},
  {bg: 'linear-gradient(#F59A6B,#FFE3B0)', icon: <Bird x={64} y={44} u={6} up />},
  {bg: 'linear-gradient(#7A5C9A,#FFD39A)', icon: <div style={{position: 'absolute', left: 30, top: 24, width: 68, height: 44, background: '#FFFDF6', border: '3px solid #C8372D'}} />},
  {bg: 'linear-gradient(#3B3A5E,#7A6E94)', icon: <div style={{position: 'absolute', left: 32, top: 28, padding: '2px 8px', borderRadius: 16, background: '#E8433A', fontFamily: MONO, fontWeight: 800, fontSize: 22, color: '#FFFFFF'}}>99+</div>},
  {bg: 'linear-gradient(#0D1433,#3A4F8E)', icon: <svg width={128} height={92} style={{position: 'absolute', left: 0, top: 0}}><path d="M64 14 L110 92 L18 92 Z" fill="#4E6A9E" /><path d="M64 14 L80 40 L48 40 Z" fill="#F4F8FF" /></svg>},
  {bg: 'linear-gradient(#121A3E,#C8553A)', icon: <Flame x={64} y={80} u={7} k={1} />},
  {bg: 'linear-gradient(#F2A07A,#FFE7BE)', icon: <Note x={64} y={46} u={8} />},
];
const Finale: React.FC<{f: number; cut: Cut; t: number}> = ({f, t}) => {
  const k = t - BLESS.boom;
  if (k < -0.05) return null;
  const beat = Math.max(...BLESS.beats.map((b) => (t >= b ? Math.exp(-(t - b) / 0.1) : 0)));
  const fw = [0, 0.2, 0.4, 0.6, 0.8];
  return (
    <>
      <div style={{position: 'absolute', left: HEART_C[0] - 4.5 * HEART_CELL, top: HEART_C[1] - 4 * HEART_CELL, opacity: 0.35 * easeOut(clamp(k / 0.3)), transform: `scale(${1 + 0.05 * beat})`}}>
        <PixelHeart x={0} y={0} cell={HEART_CELL} color="#FF9AAE" shine="#FFD0DA" />
      </div>
      {fw.map((d, i) => <Firework key={i} x={[200, 880, 540, 170, 910][i]} y={[720, 680, 600, 1300, 1330][i]} k={k - d} r={330 - i * 15} colors={[['#FFE07A', '#FF8A3A'], ['#FF7A9A', '#FFFFFF'], ['#7AE0FF', '#FFFFFF'], ['#B88CFF', '#FFE07A'], ['#7BD88F', '#FFFFFF']][i]} seed={i * 1.3} />)}
      {MINI.map((m, i) => {
        const [x, y] = heartPoint(i, MINI.length), a = Math.atan2(y - HEART_C[1], x - HEART_C[0]);
        const p = easeOut(clamp((k - i * 0.022) / 0.38));
        const px = lerp(x + Math.cos(a) * 900, x, p), py = lerp(y + Math.sin(a) * 900, y, p);
        return (
          <div key={i} style={{position: 'absolute', left: px - 64, top: py - 46, width: 128, height: 92, background: AIRMAIL, padding: 6, boxSizing: 'border-box', boxShadow: '0 8px 14px rgba(60,40,20,0.3)',
            transform: `rotate(${((i * 37) % 17) - 8 + 200 * (1 - p)}deg) scale(${1 + 0.08 * beat})`}}>
            <div style={{position: 'relative', width: '100%', height: '100%', background: m.bg, overflow: 'hidden'}}>{m.icon}</div>
          </div>
        );
      })}
    </>
  );
};

const CardStack: React.FC<{f: number; cut: Cut; loose: boolean}> = ({f, cut, loose}) => {
  const E = CUTS[cut].entries, e = entryAt(cut, f), i = E.indexOf(e), t = f + e.offset;
  const tilt = i === 0 ? TILT[0] : lerp(TILT[(i - 1) % TILT.length], TILT[i % TILT.length], springAt(f - e.filmA, 2.2, 0.38));
  let scale = 1 + 0.006 * Math.exp(-sincePulse(t) / 0.1) + (i === 0 ? 0 : 0.028 * Math.exp(-(f - e.filmA) / 0.09));
  // flips at their boundary
  let flip = 0;
  for (let j = 1; j < E.length; j++) {
    const tr = trOf(E[j - 1], E[j]);
    if (tr.kind !== 'flip') continue;
    const fk = seg(f, E[j].filmA - tr.pre, E[j].filmA + tr.post);
    if (fk > 0 && fk < 1) flip = fk < 0.5 ? 90 * easeIn(fk / 0.5) : -90 * (1 - easeOut((fk - 0.5) / 0.5));
  }
  // the finale: the last card shrinks into the middle of the giant heart
  const last = e === E[E.length - 1] && !loose, fin = last ? easeInOut(seg(t, BLESS.boom - 0.1, BLESS.boom + 0.3)) : 0;
  const beat = last ? Math.max(...BLESS.beats.map((b) => (t >= b ? Math.exp(-(t - b) / 0.1) : 0))) : 0;
  scale *= lerp(1, 0.36, fin) * (1 + 0.08 * beat * fin);
  const dy = fin * (HEART_C[1] + 30 - (CARD.y + CARD.h / 2));
  const layers = E.map((x, j) => {
    const layer = <SceneLayer E={E} i={j} f={f} loose={loose} />;
    if (loose) return <React.Fragment key={j}>{layer}</React.Fragment>;
    const prev = E[j - 1], next = E[j + 1];
    const from = Math.max(0, Math.floor((x.filmA - (prev ? trOf(prev, x).pre : 0)) * FPS));
    const to = Math.min(CUTS[cut].frames, Math.ceil((x.filmB + (next ? trOf(x, next).post : 0)) * FPS));
    return <Sequence key={j} from={from} durationInFrames={Math.max(1, to - from)} name={SCENES[x.bar].name} layout="none">{layer}</Sequence>;
  });
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`}}>
      <Postcard tilt={tilt * (1 - fin)} scale={scale} flip={flip} overlay={<Status f={f} cut={cut} />}>
        {layers}
        <CutOverlay E={E} f={f} />
      </Postcard>
    </div>
  );
};

// One complete frame at film time f. `loose` is the copy of the opening seen through the closing heart window.
export const FilmFrame: React.FC<{f: number; cut: Cut; loose?: boolean}> = ({f, cut, loose = false}) => {
  const cam = camera(cut, f), e = entryAt(cut, f), t = f + e.offset;
  const lastE = CUTS[cut].entries.at(-1)!, finale = !loose && e === lastE && t > BLESS.boom - 0.1;
  return (
    <AbsoluteFill style={{transform: `translate(${cam.x}px, ${cam.y}px) rotate(${cam.r}deg) scale(${cam.s})`}}>
      <Paper />
      <Header />
      <div style={{opacity: finale ? 1 - seg(t, BLESS.boom - 0.1, BLESS.boom + 0.2) : 1}}><BackCards /></div>
      {finale && <Finale f={f} cut={cut} t={t} />}
      <CardStack f={f} cut={cut} loose={loose} />
      <LyricTrack f={f} cut={cut} />
    </AbsoluteFill>
  );
};

// The closing window: the giant heart opens until the opening frame fills the screen
const HeartWindow: React.FC<{f: number; cut: Cut}> = ({f, cut}) => {
  const C = CUTS[cut], last = C.entries.at(-1)!;
  const k = seg(f, BLESS.window - last.offset, C.dur - 0.04);
  if (k <= 0) return null;
  const c = HEART_CELL * Math.pow(20, k ** 1.25), [cx, cy] = HEART_C;
  const xy = HEART_OUTLINE.map(([px, py]) => [cx + (px - 4.5) * c, cy + (py - 4) * c]);
  return (
    <>
      <AbsoluteFill style={{clipPath: `polygon(${xy.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`}}><FilmFrame f={f - C.dur} cut={cut} loose /></AbsoluteFill>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <polygon points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke="#E33F36" strokeWidth={Math.min(26, Math.max(10, c * 0.2))} strokeLinejoin="miter" opacity={1 - seg(k, 0.75, 1)} />
      </svg>
    </>
  );
};

const DropFlash: React.FC<{f: number; cut: Cut}> = ({f, cut}) => {
  let o = 0;
  for (const at of DROPS[cut]) { const u = f - at; if (u >= -0.02 && u < 0.3) o = Math.max(o, u < 0.03 ? 0.95 : 0.95 * (1 - (u - 0.03) / 0.27)); }
  return o > 0 ? <AbsoluteFill style={{background: '#FFFDF4', opacity: o}} /> : null;
};

export const Film: React.FC<{cut: Cut; audio?: boolean}> = ({cut, audio = true}) => {
  const f = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{backgroundColor: '#E2D3B5', overflow: 'hidden'}}>
      <FilmFrame f={f} cut={cut} />
      <DropFlash f={f} cut={cut} />
      <HeartWindow f={f} cut={cut} />
      {audio && <Audio src={staticFile(CUTS[cut].music)} />}
    </AbsoluteFill>
  );
};
