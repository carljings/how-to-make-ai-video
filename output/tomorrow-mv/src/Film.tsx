// Film.tsx: the whole 19.2-second film. The paper, header and lyrics sit around one postcard; each scene inside the
// card is a <Sequence> (so it shows by name in Remotion Studio) drawn from the absolute time t. On the last pulse a
// heart-shaped window opens from 心 onto the film's own first frame, so the loop on Douyin is seamless.
import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {W, H, FPS, DUR, SCENES, TRANSITIONS, HITS, HEART, sincePulse, type CutKind} from './timeline';
import {CW, CH, TILT} from './layout';
import {Paper, BackCards, Postcard} from './art/paper';
import {Header, Status} from './ui/Hud';
import {LyricTrack} from './ui/Lyrics';
import {SCENE_COMPONENTS} from './scenes';
import {NIGHT_FACE} from './scenes/Night';
import {DAWN_EYE} from './scenes/Dawn';
import {HEART_SPOT} from './scenes/Heart';
import {HEART_OUTLINE} from './art/pixel';
import {Petal, PixelHeart} from './art/props';
import {clamp, seg, lerp, easeIn, easeOut, easeInOut, springAt, noise1} from './lib/math';
import './lib/fonts';

const sceneIndex = (t: number) => { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].a) return i; return 0; };
const trAt = (at: number) => TRANSITIONS.find((x) => Math.abs(x.at - at) < 1e-6);
const DAWN_FACE: [number, number] = [444, DAWN_EYE[1]];

// Accented syllables shake the whole frame a little
export function shake(t: number): [number, number, number] {
  let x = 0, y = 0, r = 0;
  HITS.forEach(([at, s], i) => {
    const u = t - at;
    if (u < 0 || u > 0.6) return;
    const d = s * Math.exp(-u / 0.11);
    x += 13 * d * noise1(u * 38, i * 3 + 1); y += 11 * d * noise1(u * 41, i * 3 + 2); r += 0.6 * d * noise1(u * 33, i * 3 + 3);
  });
  return [x, y, r];
}

// How a scene looks while it leaves (out) or arrives (in) through a transition at progress k (0..1); null = hidden
function cutStyle(kind: CutKind, dir: 'in' | 'out', k: number): React.CSSProperties | null {
  switch (kind) {
    case 'pushIn': return dir === 'out'
      ? (k > 0.9 ? null : {transform: `scale(${1 + 2.7 * easeIn(clamp(k / 0.8))})`, transformOrigin: `${NIGHT_FACE[0]}px ${NIGHT_FACE[1]}px`, opacity: 1 - seg(k, 0.55, 0.9)})
      : (k < 0.45 ? null : {transform: `scale(${lerp(0.72, 1, easeOut(seg(k, 0.45, 1)))})`, transformOrigin: `${DAWN_FACE[0]}px ${DAWN_FACE[1]}px`, opacity: seg(k, 0.45, 0.75)});
    case 'eyeIris': {
      if (dir === 'out') return k > 0.97 ? null : {transform: `scale(${1 + 5.5 * easeIn(clamp(k / 0.5))})`, transformOrigin: `${DAWN_EYE[0]}px ${DAWN_EYE[1]}px`};
      const r = 1050 * easeOut(seg(k, 0.38, 1));
      return r <= 0.5 ? null : {clipPath: `circle(${r}px at ${DAWN_EYE[0]}px ${DAWN_EYE[1]}px)`, transform: `scale(${lerp(1.5, 1, easeOut(seg(k, 0.38, 1)))})`, transformOrigin: `${DAWN_EYE[0]}px ${DAWN_EYE[1]}px`};
    }
    case 'windWipe': {
      if (dir === 'out') return {};
      const X = lerp(-90, CW + 90, easeInOut(k));
      if (X <= -60) return null;
      const pts = ['0px 0px'];
      for (let y = 0; y <= CH; y += 26) pts.push(`${(X + 34 * Math.sin(y / 60 + k * 9)).toFixed(1)}px ${y}px`);
      pts.push(`0px ${CH}px`);
      return {clipPath: `polygon(${pts.join(', ')})`};
    }
    case 'flip': return (dir === 'out') === (k < 0.5) ? {} : null;
    default: return {};
  }
}

function sceneStyle(i: number, t: number, loose: boolean): React.CSSProperties | null {
  const s = SCENES[i], trIn = trAt(s.a), trOut = trAt(s.b);
  const start = s.a - (trIn?.pre ?? 0), end = s.b + (trOut?.post ?? 0);
  // `loose`: the first scene also covers negative time (the loop's heart window), the last one runs past the end
  if ((t < start && !(loose && i === 0)) || (t >= end && !(loose && i === SCENES.length - 1))) return null;
  let st: React.CSSProperties = {};
  if (trIn && t < trIn.at + trIn.post) {
    const c = cutStyle(trIn.kind, 'in', (t - (trIn.at - trIn.pre)) / (trIn.pre + trIn.post));
    if (!c) return null;
    st = {...st, ...c};
  }
  if (trOut && t >= trOut.at - trOut.pre && t < end) {
    const c = cutStyle(trOut.kind, 'out', (t - (trOut.at - trOut.pre)) / (trOut.pre + trOut.post));
    if (!c) return null;
    st = {...st, ...c};
  }
  return st;
}

const SceneLayer: React.FC<{i: number; t: number; loose: boolean}> = ({i, t, loose}) => {
  const st = sceneStyle(i, t, loose);
  if (!st) return null;
  const Scene = SCENE_COMPONENTS[SCENES[i].id];
  return <div style={{position: 'absolute', inset: 0, ...st}}><Scene t={t} /></div>;
};

// Things drawn over the card content during a transition: zoom lines for the push-in, petals along the wind's edge
const CutOverlay: React.FC<{t: number}> = ({t}) => {
  const tr = TRANSITIONS.find((x) => t >= x.at - x.pre && t < x.at + x.post);
  if (!tr) return null;
  const k = (t - (tr.at - tr.pre)) / (tr.pre + tr.post);
  if (tr.kind === 'pushIn') {
    const o = Math.sin(Math.PI * seg(k, 0.15, 0.95));
    return (
      <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
        {Array.from({length: 28}, (_, i) => {
          const a = (i / 28) * Math.PI * 2 + 0.11 * (i % 3), r0 = 180 + 260 * k + 30 * (i % 4), r1 = r0 + 140 + 60 * (i % 3);
          return <line key={i} x1={NIGHT_FACE[0] + Math.cos(a) * r0} y1={NIGHT_FACE[1] + Math.sin(a) * r0} x2={NIGHT_FACE[0] + Math.cos(a) * r1} y2={NIGHT_FACE[1] + Math.sin(a) * r1} stroke="#FFF4DA" strokeWidth={5} strokeLinecap="round" opacity={0.75} />;
        })}
      </svg>
    );
  }
  if (tr.kind === 'windWipe') {
    const X = lerp(-90, CW + 90, easeInOut(k));
    return <>{Array.from({length: 16}, (_, i) => <Petal key={i} x={X + 30 * Math.sin(i * 2.3) + 20} y={(i + 0.5) * (CH / 16)} u={8 + (i % 3) * 3} rot={i * 47 + k * 400} />)}</>;
  }
  return null;
};

const CardStack: React.FC<{t: number; loose: boolean}> = ({t, loose}) => {
  const i = sceneIndex(t), a = SCENES[i].a;
  const tilt = i === 0 ? TILT[0] : lerp(TILT[i - 1], TILT[i], springAt(t - a, 2.2, 0.38));
  const scale = 1 + 0.006 * Math.exp(-sincePulse(t) / 0.1) + (i === 0 ? 0 : 0.028 * Math.exp(-(t - a) / 0.09));
  const fl = TRANSITIONS.find((x) => x.kind === 'flip')!;
  const fk = seg(t, fl.at - fl.pre, fl.at + fl.post);
  const flip = fk <= 0 || fk >= 1 ? 0 : fk < 0.5 ? 90 * easeIn(fk / 0.5) : -90 * (1 - easeOut((fk - 0.5) / 0.5));
  const layers = SCENES.map((s, j) => {
    const layer = <SceneLayer i={j} t={t} loose={loose} />;
    if (loose) return <React.Fragment key={s.id}>{layer}</React.Fragment>;
    const trIn = trAt(s.a), trOut = trAt(s.b);
    const from = Math.max(0, Math.floor((s.a - (trIn?.pre ?? 0)) * FPS)), to = Math.min(Math.round(DUR * FPS), Math.ceil((s.b + (trOut?.post ?? 0)) * FPS));
    return <Sequence key={s.id} from={from} durationInFrames={to - from} name={s.name} layout="none">{layer}</Sequence>;
  });
  return (
    <Postcard tilt={tilt} scale={scale} flip={flip} overlay={<Status t={t} />}>
      {layers}
      <CutOverlay t={t} />
    </Postcard>
  );
};

// One complete frame at time t. `loose` is used for the copy of the opening seen through the closing heart window.
export const FilmFrame: React.FC<{t: number; loose?: boolean}> = ({t, loose = false}) => {
  const [sx, sy, rot] = shake(t);
  return (
    <AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) rotate(${rot}deg)`}}>
      <Paper />
      <Header />
      <BackCards />
      <CardStack t={t} loose={loose} />
      <LyricTrack t={t} />
    </AbsoluteFill>
  );
};

// The closing window: a pixel heart that grows from 心 until the opening frame fills the screen
const HeartWindow: React.FC<{t: number}> = ({t}) => {
  const k = seg(t, HEART.wipe, DUR - 0.04);
  if (k <= 0) return null;
  const c = 23 * Math.pow(80, k ** 1.25), [cx, cy] = HEART_SPOT;
  const xy = HEART_OUTLINE.map(([px, py]) => [cx + (px - 4.5) * c, cy + (py - 4) * c]);
  const pts = xy.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ');
  return (
    <>
      <AbsoluteFill style={{clipPath: `polygon(${pts})`}}><FilmFrame t={t - DUR} loose /></AbsoluteFill>
      {/* the heart's edge, so the window reads as a heart while it grows over the paper */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <polygon points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke="#E33F36" strokeWidth={Math.min(26, Math.max(10, c * 0.32))} strokeLinejoin="miter" opacity={1 - seg(k, 0.75, 1)} />
      </svg>
      {/* the beating heart itself bursts as the window opens */}
      <div style={{position: 'absolute', left: cx - 4.5 * c, top: cy - 4 * c, opacity: 1 - seg(k, 0, 0.22)}}><PixelHeart x={0} y={0} cell={c} /></div>
    </>
  );
};

export const Film: React.FC<{audio?: boolean}> = ({audio = true}) => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{backgroundColor: '#E2D3B5', overflow: 'hidden'}}>
      <FilmFrame t={t} />
      <HeartWindow t={t} />
      {audio && <Audio src={staticFile('music.wav')} />}
    </AbsoluteFill>
  );
};
