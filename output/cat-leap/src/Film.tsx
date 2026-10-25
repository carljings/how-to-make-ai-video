// Film.tsx: 一跃 · One Leap. Twelve prepared segments (scripts/prep.py) play in the order of src/timeline.json; every cut
// sits on a downbeat of the 120 BPM score, and each world change has its own transition (all pure functions of the
// frame, no state): a zoom punch into the drop, a whip pan into the koi, a white splash into the milk, a dissolve into
// the snow globe, a spin into space, an iris that opens onto the moon, and the moon shrinking into the paper lamp as
// the kitten wakes up. A small beat pulse rides the drops; grain and a vignette sit on top.
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import TL from './timeline.json';

export const FPS = TL.fps;
export const W = TL.w;
export const H = TL.h;
export const FRAMES = Math.round(TL.length * FPS);

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const easeOut = (p: number) => 1 - Math.pow(1 - clamp(p), 3);
const easeInOut = (p: number) => {
  const x = clamp(p);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const smooth = (a: number, b: number, x: number) => {
  const p = clamp((x - a) / (b - a));
  return p * p * (3 - 2 * p);
};
const seg = (id: string) => TL.segments.find((s) => s.id === id)!;
const F = (sec: number) => Math.round(sec * FPS);

// the moon in G (centre, radius, px at 1080×1920) and the paper lamp in H1a it turns into
const MOON = {x: 540, y: 730, r: 530};
const LAMP = {x: 176, y: 130, r: 160};

type Layer = {dx?: number; dy?: number; scale?: number; rotate?: number; opacity?: number; origin?: string};

// One video layer with a transform; `ghosts` adds faint offset copies for motion blur during fast moves.
const Clip: React.FC<{id: string; t: Layer; ghosts?: Layer[]; mask?: string}> = ({id, t, ghosts = [], mask}) => {
  // the mask is in the layer's own coordinates, so it moves and shrinks with the picture
  const style = (l: Layer, o: number): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    width: W,
    height: H,
    transformOrigin: l.origin ?? '50% 50%',
    transform: `translate(${l.dx ?? 0}px, ${l.dy ?? 0}px) scale(${l.scale ?? 1}) rotate(${l.rotate ?? 0}deg)`,
    opacity: o,
    ...(mask ? {WebkitMaskImage: mask, maskImage: mask} : {}),
  });
  const src = staticFile(`seg/${id}.mp4`);
  return (
    <AbsoluteFill>
      <OffthreadVideo src={src} muted style={style(t, t.opacity ?? 1)} />
      {ghosts.map((g, i) => (
        <OffthreadVideo key={i} src={src} muted style={style({...t, ...g}, (g.opacity ?? 0.3) * (t.opacity ?? 1))} />
      ))}
    </AbsoluteFill>
  );
};

const Frozen: React.FC<{file: string; opacity?: number; t?: Layer; ghosts?: Layer[]}> = ({file, opacity = 1, t = {}, ghosts = []}) => (
  <>
    {[t, ...ghosts.map((g) => ({...t, ...g}))].map((l, i) => (
      <Img
        key={i}
        src={staticFile(file)}
        style={{
          position: 'absolute',
          inset: 0,
          width: W,
          height: H,
          opacity: i === 0 ? opacity : (l.opacity ?? 0.3) * opacity,
          transform: `translate(${l.dx ?? 0}px, ${l.dy ?? 0}px) scale(${l.scale ?? 1}) rotate(${l.rotate ?? 0}deg)`,
        }}
      />
    ))}
  </>
);

// the whip pan at 8 s: B2 and C move as one strip, C a frame-width to the right of B2, over 4 + 5 frames
const WHIP = {t0: 8.0 - 4 / FPS, t1: 8.0 + 5 / FPS};
const whipX = (s: number) => -W * easeInOut((s - WHIP.t0) / (WHIP.t1 - WHIP.t0));
const whipSpeed = (s: number) => Math.abs(whipX(s + 0.5 / FPS) - whipX(s - 0.5 / FPS)); // px per frame
const whipGhosts = (s: number, x: number): Layer[] => {
  const v = whipSpeed(s);
  if (v < 1) return [];
  return [1, 2, 3, 4, 5].map((k) => ({dx: x + (v * k) / 6, opacity: 0.32 - 0.05 * k}));
};
// rotational blur: six faint copies spread over `spread` degrees behind the motion
const spinGhosts = (rot: number, sc: number, spread: number): Layer[] =>
  Math.abs(spread) < 0.3 ? [] : [1, 2, 3, 4, 5, 6].map((k) => ({rotate: rot + (spread * k) / 6, scale: sc, opacity: 0.22 - 0.025 * k}));

// the transform of each segment at global time `s` (seconds)
function layerFor(id: string, s: number): {t: Layer; ghosts?: Layer[]; mask?: string} {
  const sg = seg(id);
  const u = s - sg.a; // seconds into the segment
  const left = sg.b - s; // seconds before its end
  switch (id) {
    case 'A2': {
      // anticipation: push in over the last 3 frames before the drop
      const p = clamp(1 - left / (3 / FPS));
      return {t: {scale: 1 + 0.08 * p * p}};
    }
    case 'B1': {
      // the drop: punch in from 118 % with a zoom-blur trail
      const p = easeOut(u / (8 / FPS));
      const sc = lerp(1.18, 1, p);
      const g = u < 5 / FPS ? [{scale: sc * 1.05, opacity: 0.3}, {scale: sc * 1.1, opacity: 0.15}] : [];
      return {t: {scale: sc}, ghosts: g};
    }
    case 'B2': {
      const pin = easeOut(u / (5 / FPS));
      const x = whipX(s);
      return {t: {scale: lerp(1.05, 1, pin), dx: x}, ghosts: whipGhosts(s, x)};
    }
    case 'C': {
      const x = whipX(s) + W;
      return {t: {dx: x}, ghosts: whipGhosts(s, x)};
    }
    case 'D':
      return {t: {scale: lerp(1.1, 1, easeOut(u / (10 / FPS)))}};
    case 'E': {
      // in: settle from 106 %; out: spin and zoom into space
      const pin = easeOut(u / (8 / FPS));
      const pout = clamp(1 - left / (5 / FPS));
      const rot = 15 * pout * pout;
      const sc = lerp(1.06, 1, pin) * (1 + 0.3 * pout * pout);
      return {t: {rotate: rot, scale: sc}, ghosts: spinGhosts(rot, sc, -9 * pout * pout)};
    }
    case 'F': {
      const p = clamp(u / (6 / FPS));
      const rot = -15 * Math.pow(1 - p, 2);
      const sc = 1 + 0.3 * Math.pow(1 - p, 2);
      const spread = 9 * Math.pow(1 - p, 2); // the faster it turns, the longer the blur
      return {t: {rotate: rot, scale: sc}, ghosts: spinGhosts(rot, sc, spread)};
    }
    case 'G': {
      // in: an iris opening from the moon's centre; out (28–29 s): the moon shrinks into the paper lamp
      const pin = easeOut(u / (8 / FPS));
      const rIn = lerp(0, 1400, pin);
      const q = easeInOut(clamp((s - 28.0) / 1.0));
      if (s < 28.0) {
        const edge = rIn < 1390 ? `radial-gradient(circle ${rIn}px at ${MOON.x}px ${MOON.y}px, #000 ${Math.max(0, rIn - 14)}px, transparent ${rIn}px)` : undefined;
        return {t: {}, mask: edge};
      }
      const sc = lerp(1, LAMP.r / MOON.r, q);
      const dx = (LAMP.x - MOON.x) * q;
      const dy = (LAMP.y - MOON.y) * q;
      // the mask closes onto the moon disc in the first 40 %, so only the moon travels to the lamp
      const rm = lerp(1400, MOON.r * 0.97, smooth(0, 0.4, q));
      const mask = `radial-gradient(circle ${rm}px at ${MOON.x}px ${MOON.y}px, #000 ${rm - 45}px, transparent ${rm}px)`;
      return {t: {dx, dy, scale: sc, origin: `${MOON.x}px ${MOON.y}px`, opacity: 1 - smooth(0.55, 1, q)}, mask};
    }
    default:
      return {t: {}};
  }
}

// a white flash: [time, peak opacity, frames to fade]
const FLASHES: [number, number, number][] = [
  [4.0, 0.85, 6],
  [12.0, 0.8, 7],
  [20.0, 0.45, 6],
];

const beatPulse = (s: number) => {
  const inDrop = (s >= 4 && s < 20) || (s >= 24 && s < 28);
  if (!inDrop) return 1;
  const tb = Math.floor((s - 4) / 0.5) * 0.5 + 4;
  return 1 + 0.014 * Math.exp(-(s - tb) / 0.09);
};

export const Film: React.FC<{audio?: string}> = ({audio}) => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const flash = FLASHES.reduce((acc, [t0, peak, n]) => {
    const d = s - t0;
    return d >= 0 && d < n / FPS ? Math.max(acc, peak * (1 - d / (n / FPS)) ** 2) : acc;
  }, 0);
  // the iris ring: a thin glow on the edge of the opening moon
  const uG = s - 24.0;
  const ring = uG >= 0 && uG < 8 / FPS ? lerp(0, 1400, easeOut(uG / (8 / FPS))) : 0;
  const order = ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E', 'F', 'H1a', 'H1b', 'H2', 'G'];
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{transform: `scale(${beatPulse(s)})`}}>
        {order.map((id) => {
          const sg = seg(id);
          const l = layerFor(id, s);
          return (
            <React.Fragment key={id}>
              {id === 'G' && (
                // F's last frame stays under the iris while the moon opens
                <Sequence from={F(24.0)} durationInFrames={8} name="F freeze">
                  <Frozen file="seg/F-last.png" />
                </Sequence>
              )}
              <Sequence from={F(sg.a)} durationInFrames={F(sg.b - sg.a)} name={id}>
                <Clip id={id} t={l.t} ghosts={l.ghosts} mask={l.mask} />
              </Sequence>
            </React.Fragment>
          );
        })}
        {/* the whip's other half: C's first frame before 8 s, B2's last frame after */}
        <Sequence from={F(WHIP.t0)} durationInFrames={F(8.0 - WHIP.t0)} name="whip C">
          <Frozen file="seg/C-first.png" t={{dx: whipX(s) + W}} ghosts={whipGhosts(s, whipX(s) + W)} />
        </Sequence>
        <Sequence from={F(8.0)} durationInFrames={F(WHIP.t1 - 8.0)} name="whip B2">
          <Frozen file="seg/B2-last.png" t={{dx: whipX(s)}} ghosts={whipGhosts(s, whipX(s))} />
        </Sequence>
        {/* D's last frame dissolves away over the start of the snow globe */}
        <Sequence from={F(16.0)} durationInFrames={8} name="D freeze">
          <Frozen file="seg/D-last.png" opacity={1 - clamp((s - 16.0) / (8 / FPS))} />
        </Sequence>
        {ring > 0 && (
          <AbsoluteFill
            style={{
              background: `radial-gradient(circle ${ring + 10}px at ${MOON.x}px ${MOON.y}px, transparent ${ring - 18}px, rgba(190,220,255,0.75) ${ring - 4}px, transparent ${ring + 10}px)`,
            }}
          />
        )}
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{backgroundColor: `rgba(255,252,245,${flash})`}} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 45%, transparent 55%, rgba(0,0,0,0.32) 100%)'}} />
      <Img
        src={staticFile(`grain/${frame % 8}.png`)}
        style={{position: 'absolute', inset: 0, width: W, height: H, opacity: 0.07, mixBlendMode: 'overlay'}}
      />
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
};
