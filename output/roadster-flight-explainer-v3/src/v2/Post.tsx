// Post.tsx: the finishing layer between picture and type. Vignette, animated film grain (seeded tiles), the freeze
// punch (exposure flash), cut flashes and the final fade. Deterministic per frame.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {BEAT, CUES, H, W, ramp} from './data';

const GRAIN_TILES = 6;
const flash = (t: number, at: number, peak: number, decay: number) => (t < at ? 0 : peak * Math.exp(-(t - at) / decay));

export const punchScale = (t: number) => 1 + 0.04 * Math.exp(-Math.max(0, t - BEAT.freeze) / 0.12) * (t >= BEAT.freeze ? 1 : 0);

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 78% 62% at 50% 46%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.5) 100%)'}} />
);

export const Grain: React.FC<{frame: number}> = ({frame}) => {
  const k = frame % GRAIN_TILES;
  const ox = ((frame * 7919) % 97) - 48, oy = ((frame * 104729) % 89) - 44;
  return (
    <AbsoluteFill style={{overflow: 'hidden', mixBlendMode: 'overlay', opacity: 0.11}}>
      <Img src={staticFile(`v2/grain/g${k}.png`)} style={{position: 'absolute', left: -60 + ox, top: -60 + oy, width: W + 120, height: H + 120}} />
    </AbsoluteFill>
  );
};

// the white punch sits UNDER the type (the 停 stamp must land crisp on the freeze); only the final fade covers all
export const WhiteFlash: React.FC<{t: number}> = ({t}) => {
  const white = flash(t, BEAT.freeze, 0.42, 0.07) + flash(t, BEAT.resume, 0.28, 0.06) +
    flash(t, CUES.sections[1].start, 0.22, 0.05);
  return white > 0.004 ? <AbsoluteFill style={{background: '#FFFFFF', opacity: Math.min(0.6, white)}} /> : null;
};

export const FadeOut: React.FC<{t: number}> = ({t}) => {
  const black = ramp(t, BEAT.fade_out, CUES.duration_s - 0.02);
  return black > 0.001 ? <AbsoluteFill style={{background: '#000000', opacity: black}} /> : null;
};
