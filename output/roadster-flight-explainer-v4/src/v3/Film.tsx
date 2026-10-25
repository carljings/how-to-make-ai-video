// Film.tsx: 「比墙还陡」. Plate (Blender picture / v2 plates / poster composite) -> vector graphics -> vignette + grain ->
// freeze punch -> type -> fade. Every frame is a pure function of the frame index and the canonical data files.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FPS, overlayAt, plateAt} from './data';
import {Graphics} from './Graphics';
import {Plate} from './Plate';
import {FadeOut, Flash, Grain, Vignette, punchScale} from './Post';
import {Captions, Credit, EndCard, HookTitle, Kinetic, Labels, Slate} from './Type';
import './fonts';

export type V3Props = {plateRoot?: string; graphics?: boolean; text?: boolean; post?: boolean};

export const V3Film: React.FC<V3Props> = ({plateRoot = 'plates', graphics = true, text = true, post = true}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const o = overlayAt(frame);
  return (
    <AbsoluteFill style={{background: '#000', fontSynthesis: 'none', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${punchScale(t)})`, transformOrigin: '50% 45%'}}>
        <Plate spec={plateAt(frame)} o={o} root={plateRoot} />
        {graphics && <Graphics o={o} frame={frame} />}
      </AbsoluteFill>
      {post && <Vignette />}
      {post && <Grain frame={frame} />}
      {post && <Flash t={t} />}
      {text && (
        <>
          <Slate t={t} />
          <HookTitle t={t} />
          <Kinetic t={t} />
          <Captions t={t} />
          {graphics && <Labels o={o} t={t} />}
          <EndCard t={t} />
          <Credit t={t} />
        </>
      )}
      {post && <FadeOut t={t} />}
    </AbsoluteFill>
  );
};
