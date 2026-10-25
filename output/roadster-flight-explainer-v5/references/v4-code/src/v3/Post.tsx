// Post.tsx: finishing between picture and type. Vignette, seeded film grain (v2's tiles), the freeze punch
// (exposure flash + 1.03 scale kick), and the final fade. Deterministic per frame.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {A, CUES, H, SEC, W, ramp} from './data';

const GRAIN_TILES = 6;
const FREEZE = SEC.freeze.start;
const flash = (t: number, at: number, peak: number, decay: number) => (t < at ? 0 : peak * Math.exp(-(t - at) / decay));

export const punchScale = (t: number) => 1 + 0.03 * flash(t, FREEZE, 1, 0.1);

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 64% at 50% 46%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.5) 100%)'}} />
);

export const Grain: React.FC<{frame: number}> = ({frame}) => {
  const k = frame % GRAIN_TILES;
  const ox = ((frame * 7919) % 97) - 48, oy = ((frame * 104729) % 89) - 44;
  return (
    <AbsoluteFill style={{overflow: 'hidden', mixBlendMode: 'overlay', opacity: 0.1}}>
      <Img src={staticFile(`v2/grain/g${k}.png`)} style={{position: 'absolute', left: -60 + ox, top: -60 + oy, width: W + 120, height: H + 120}} />
    </AbsoluteFill>
  );
};

// the freeze lands as a 3-frame exposure punch; sits under the type
export const Flash: React.FC<{t: number}> = ({t}) => {
  const white = flash(t, FREEZE, 0.45, 0.05);
  return white > 0.004 ? <AbsoluteFill style={{background: '#FFFFFF', opacity: Math.min(0.6, white)}} /> : null;
};

export const FadeOut: React.FC<{t: number}> = ({t}) => {
  const black = ramp(t, A.fade_out, CUES.duration_s - 0.02);
  return black > 0.001 ? <AbsoluteFill style={{background: '#000000', opacity: black}} /> : null;
};
