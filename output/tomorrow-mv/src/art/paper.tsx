// paper.tsx: the beige grid paper behind everything, and the airmail postcard that holds each scene.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {W, H} from '../timeline';
import {CARD} from '../layout';
import {rng} from '../lib/math';

// Paper grain: SVG turbulence rasterised once by the browser as a tile (no per-frame filter work)
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.25 0 0 0 0 0.12 1.1 0 0 0 -0.45'/></filter><rect width='256' height='256' filter='url(#n)'/></svg>`;
export const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_SVG)}")`;

const DOTS = (() => { const r = rng(5); return Array.from({length: 14}, () => ({x: r() * W, y: r() * H, s: 5 + r() * 4, o: 0.18 + r() * 0.22})); })();

// The paper bleeds 60 px past every edge so a camera shake never shows the frame's edge
export const Paper: React.FC = () => (
  <AbsoluteFill style={{left: -60, top: -60, width: W + 120, height: H + 120,
    background: 'radial-gradient(ellipse 75% 60% at 50% 42%, #EADFC8 0%, #E2D3B5 62%, #CDB68E 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(120,88,48,0.11) 2px, transparent 2px), linear-gradient(90deg, rgba(120,88,48,0.11) 2px, transparent 2px)',
      backgroundSize: '64px 64px', backgroundPosition: '28px 30px'}} />
    <AbsoluteFill style={{backgroundImage: GRAIN, backgroundSize: '256px 256px', opacity: 0.55}} />
    {DOTS.map((d, i) => <div key={i} style={{position: 'absolute', left: d.x + 60, top: d.y + 60, width: d.s, height: d.s, borderRadius: '50%', background: '#C8473A', opacity: d.o}} />)}
  </AbsoluteFill>
);

export const AIRMAIL = 'repeating-linear-gradient(-45deg, #C8372D 0 17px, #FBF6EA 17px 29px, #23407A 29px 46px, #FBF6EA 46px 58px)';

// Two older postcards peeking out under the current one: the stack of cards that has "arrived" so far
export const BackCards: React.FC = () => (
  <>
    {[{r: -4.2, dx: -14, dy: 18}, {r: 3.1, dx: 16, dy: 10}].map((c, i) => (
      <div key={i} style={{position: 'absolute', left: CARD.x + c.dx, top: CARD.y + c.dy, width: CARD.w, height: CARD.h, transform: `rotate(${c.r}deg)`,
        background: AIRMAIL, boxShadow: '0 10px 24px rgba(70,45,20,0.18)', borderRadius: 4}}>
        <div style={{position: 'absolute', inset: CARD.border, background: '#F4ECDA', borderRadius: 2}} />
      </div>
    ))}
  </>
);

// The postcard frame. Children are drawn in the content area (CW × CH) and clipped to it.
export const Postcard: React.FC<{tilt: number; scale: number; flip?: number; children: React.ReactNode; overlay?: React.ReactNode}> = ({tilt, scale, flip = 0, children, overlay}) => (
  <div style={{position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h,
    transform: `perspective(2400px) rotateY(${flip}deg) rotate(${tilt}deg) scale(${scale})`, transformOrigin: '50% 50%',
    background: AIRMAIL, borderRadius: 4, boxShadow: '0 22px 44px rgba(70,45,20,0.28), 0 3px 8px rgba(70,45,20,0.2)'}}>
    <div style={{position: 'absolute', inset: CARD.border, background: '#FBF6EA', borderRadius: 2}}>
      <div style={{position: 'absolute', inset: CARD.pad, overflow: 'hidden', borderRadius: 2, background: '#F3E9D2'}}>
        {children}
      </div>
      {overlay}
    </div>
  </div>
);
