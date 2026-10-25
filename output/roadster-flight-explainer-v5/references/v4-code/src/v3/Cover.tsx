// Cover.tsx: Douyin covers (9:16 and 3:4) from one film frame (default 1.6 s): the car hanging under the curl, the
// question in full, and the CG slate (the cover is a reconstruction too).
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {CUES, PAL, SANS, pad5} from './data';
import {HookTitle} from './Type';
import './fonts';

export type CoverProps = {frame?: number; plateRoot?: string; height?: number};

export const Cover: React.FC<CoverProps> = ({frame = 48, plateRoot = 'plates', height = 1920}) => {
  const top = height === 1920 ? 0 : -150;
  const slate = CUES.slates[0].text;
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden', fontSynthesis: 'none'}}>
      <div style={{position: 'absolute', left: 0, top, width: 1080, height: 1920}}>
        <Img src={staticFile(`${plateRoot}/new/frames/f${pad5(frame)}.png`)} style={{width: 1080, height: 1920, objectFit: 'cover'}} />
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 64% at 50% 44%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.55) 100%)'}} />
        <HookTitle t={0} still />
      </div>
      <div style={{position: 'absolute', left: 64, top: height === 1920 ? 196 : 72, display: 'flex', alignItems: 'center', gap: 16,
        fontFamily: SANS, color: PAL.white, opacity: 0.74}}>
        <div style={{width: 30, height: 2, background: PAL.white, opacity: 0.8}} />
        <div style={{fontWeight: 300, fontSize: 26, letterSpacing: '0.12em', whiteSpace: 'pre', textShadow: '0 2px 18px rgba(0,0,0,0.85)'}}>{slate}</div>
      </div>
    </AbsoluteFill>
  );
};
