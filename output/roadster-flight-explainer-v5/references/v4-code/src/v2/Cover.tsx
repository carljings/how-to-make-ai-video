// Cover.tsx: Douyin covers (9:16 and 3:4) from one plate: the inverted car and the question, nothing else.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {CUES, PALETTE, SANS} from './data';
import './fonts';

export const Cover: React.FC<{plate: string; height: number}> = ({plate, height}) => {
  const h = CUES.titles.hook;
  const top = height === 1920 ? 1150 : 900;
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: SANS, color: PALETTE.white, overflow: 'hidden'}}>
      <Img src={staticFile(plate)} style={{position: 'absolute', left: 0, top: height === 1920 ? 0 : -300, width: 1080, height: 1920, objectFit: 'cover'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 64% at 50% 44%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.55) 100%)'}} />
      <div style={{position: 'absolute', left: 0, width: 1080, top, textAlign: 'center', fontWeight: 900, fontSize: 200, lineHeight: 1,
        letterSpacing: '0.02em', textShadow: '0 4px 40px rgba(0,0,0,0.75)'}}>{h.big}</div>
      <div style={{position: 'absolute', left: 0, width: 1080, top: top + 240, textAlign: 'center', fontWeight: 600, fontSize: 62,
        letterSpacing: '0.08em', textShadow: '0 2px 18px rgba(0,0,0,0.85)'}}>{h.small}</div>
    </AbsoluteFill>
  );
};
