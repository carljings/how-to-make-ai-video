// Hud.tsx: things that sit above every scene: the chapter strip, flashes on hits, and camera shake.
import React from 'react';
import {CHAPTERS, HITS, RGB, CUTS, W, H, type SceneId, SCENES} from '../timeline';
import {clamp, seg, noise1, easeInOut, expoOut, easeIn} from '../lib/math';
import {SANS, MONO} from '../lib/fonts';
import {X0, rgba} from './Text';

// Where the viewer is in the story: eight chapters, the current one filling up
export const ChapterStrip: React.FC<{t: number}> = ({t}) => {
  const i = CHAPTERS.findIndex(([a, b]) => t >= a && t < b);
  const vis = i < 0 ? 0 : Math.min(seg(t, CHAPTERS[i][0], CHAPTERS[i][0] + 0.3) + ((i > 0 && CHAPTERS[i - 1][1] === CHAPTERS[i][0]) || CHAPTERS[i][0] === 0 ? 1 : 0), 1 - seg(t, CHAPTERS[i][1] - 0.2, CHAPTERS[i][1]) + (CHAPTERS[i + 1]?.[0] === CHAPTERS[i][1] ? 1 : 0));
  if (vis <= 0.01) return null;
  const x1 = X0 + 150, x2 = 880, gap = 8, n = CHAPTERS.length, w = (x2 - x1 - gap * (n - 1)) / n;
  return (
    <div style={{position: 'absolute', left: 0, top: 222, width: W, height: 30, opacity: clamp(vis)}}>
      <div style={{position: 'absolute', left: X0, top: 0, fontFamily: MONO, fontWeight: 700, fontSize: 21, color: rgba('blue'), letterSpacing: 1, lineHeight: '28px'}}>
        {String(i).padStart(2, '0')}<span style={{fontFamily: SANS, fontWeight: 700, color: '#d8e6f2', marginLeft: 10, letterSpacing: 2}}>{CHAPTERS[i][2]}</span>
      </div>
      {CHAPTERS.map(([a, b], j) => {
        const k = j < i ? 1 : j > i ? 0 : seg(t, a, b);
        return (
          <div key={j} style={{position: 'absolute', left: x1 + j * (w + gap), top: 13, width: w, height: 3, background: 'rgba(150,170,190,0.22)', borderRadius: 2}}>
            <div style={{width: `${k * 100}%`, height: '100%', background: j === i ? rgba('blue') : 'rgba(150,200,240,0.6)', borderRadius: 2, boxShadow: j === i ? `0 0 10px ${rgba('blue')}` : undefined}} />
          </div>
        );
      })}
      <div style={{position: 'absolute', right: W - 1008, top: 0, fontFamily: SANS, fontSize: 20, color: 'rgba(170,186,204,0.75)', letterSpacing: 2, lineHeight: '28px'}}>原理示意</div>
    </div>
  );
};

// A short screen-blend flash after each hit (light switching on, the electrode, the drop...)
export const Flash: React.FC<{t: number}> = ({t}) => {
  let best = 0, col: number[] = [255, 255, 255];
  for (const [at, s, key] of HITS) {
    // no flash on the opening frame: it has to be crisp and dark to stop the scroll
    if (at === 0 || t < at || t - at > 0.6) continue;
    const v = s * Math.exp(-(t - at) / 0.11);
    if (v > best) { best = v; col = RGB[key].map((c) => Math.round(c + (255 - c) * 0.55)); }
  }
  if (best < 0.01) return null;
  return <div style={{position: 'absolute', inset: 0, background: `rgb(${col.join(',')})`, opacity: clamp(best * 0.34), mixBlendMode: 'screen'}} />;
};

// Camera shake: a decaying jitter after each hit, as [dx, dy, degrees]
export const shake = (t: number): [number, number, number] => {
  let amp = 0;
  for (const [at, s] of HITS) if (t >= at && t - at < 0.6) amp = Math.max(amp, s * Math.exp(-(t - at) / 0.12));
  if (amp < 0.01) return [0, 0, 0];
  return [noise1(t * 38, 1) * 22 * amp, noise1(t * 38, 2) * 22 * amp, noise1(t * 30, 3) * 0.8 * amp];
};

// How a scene enters and leaves, from the cut kinds in timeline.ts. Returns a style for the scene's container,
// or null when the scene should not be drawn at this moment.
export function cutStyle(id: SceneId, t: number): React.CSSProperties | null {
  const s = SCENES.find((x) => x.id === id)!, inK = CUTS[s.a], outK = CUTS[s.b];
  const style: React.CSSProperties = {};
  if (t < s.a) {
    if (inK === 'iris') { const k = easeInOut(seg(t, s.a - 0.45, s.a)); style.clipPath = `circle(${(k * 1500).toFixed(1)}px at 740px 1060px)`; }
    else if (inK === 'whip') style.transform = `translateX(${(1 - easeIn(seg(t, s.a - 0.22, s.a))) * W * 1.1}px)`;
    else if (inK === 'leak') style.opacity = seg(t, s.a - 0.45, s.a);
    else return null;
    if (t < s.a - 0.7) return null;
  }
  if (t >= s.b) {
    if (outK === 'whip') { if (t > s.b + 0.22) return null; style.transform = `translateX(${-expoOut(seg(t, s.b, s.b + 0.22)) * W * 1.1}px)`; }
    else return null;
  }
  if (t >= s.a && t < s.a + 0.6) {
    if (inK === 'zoom') { const k = expoOut(seg(t, s.a, s.a + 0.55)); style.transform = `scale(${2.2 - 1.2 * k})`; }
    if (inK === 'slam') { const k = expoOut(seg(t, s.a, s.a + 0.3)); style.transform = `scale(${1.14 - 0.14 * k})`; }
    if (inK === 'whip') style.transform = `translateX(${(1 - expoOut(seg(t, s.a, s.a + 0.22))) * W * 0.06}px)`;
  }
  if (t < s.b && t > s.b - 0.25 && outK === 'whip') style.transform = `translateX(${-easeIn(seg(t, s.b - 0.25, s.b)) * W * 0.08}px)`;
  return style;
}
// Radial speed lines bursting out of the centre as the camera dives through a zoom cut
export const ZoomStreaks: React.FC<{t: number; at: number}> = ({t, at}) => {
  const k = 1 - Math.abs(t - at) / 0.22;
  if (k <= 0) return null;
  const u = seg(t, at - 0.22, at + 0.22);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: k}}>
      {Array.from({length: 48}, (_, i) => {
        const a = (i / 48) * Math.PI * 2 + ((i * 0.37) % 1) * 0.12, r0 = 220 + ((i * 0.61) % 1) * 300 + u * 500, r1 = r0 + 260 + ((i * 0.23) % 1) * 600;
        return <line key={i} x1={W / 2 + Math.cos(a) * r0} y1={H / 2 + Math.sin(a) * r0} x2={W / 2 + Math.cos(a) * r1} y2={H / 2 + Math.sin(a) * r1}
          stroke="rgba(200,232,255,0.55)" strokeWidth={2 + (i % 3)} strokeLinecap="round" />;
      })}
    </svg>
  );
};
// A warm light leak that sweeps across the crossfade into the clinic scene
export const LightLeak: React.FC<{t: number; at: number}> = ({t, at}) => {
  const k = Math.max(0, 1 - Math.abs(t - at) / 0.5);
  if (k <= 0) return null;
  const x = -40 + seg(t, at - 0.5, at + 0.5) * 120;
  return <div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.55 * k,
    background: `radial-gradient(ellipse 60% 45% at ${x}% 40%, rgba(255,150,70,0.9) 0%, rgba(255,90,40,0.35) 45%, rgba(0,0,0,0) 75%)`}} />;
};
// Horizontal speed streaks over a whip pan
export const WhipStreaks: React.FC<{t: number; at: number}> = ({t, at}) => {
  const k = 1 - Math.abs(t - at) / 0.25;
  if (k <= 0) return null;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: k}}>
      {Array.from({length: 18}, (_, i) => {
        const y = ((i * 0.618) % 1) * H, w = 300 + ((i * 0.37) % 1) * 700;
        return <div key={i} style={{position: 'absolute', left: ((i * 0.29) % 1) * W - 200, top: y, width: w, height: 2 + (i % 3) * 2, background: 'linear-gradient(90deg, rgba(160,210,255,0), rgba(200,235,255,0.7), rgba(160,210,255,0))'}} />;
      })}
    </div>
  );
};
