// Cover.tsx: platform cover from a rendered plate (default: the inverted car over the lineup, source time 8.75 s)
// with the cover line and the boundary tag. 9:16 and 3:4 crops share the layout.
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {SANS} from '../lib/fonts';
import {TAG} from './copy';

export const COVER_LINES = ['没有翅膀，', '靠什么飞？'];

export const Cover: React.FC<{plate: string; height: number}> = ({plate, height}) => (
  <AbsoluteFill style={{background: '#000', fontSynthesis: 'none'}}>
    <Img src={staticFile(plate)} style={{position: 'absolute', width: 1080, height: 1920, top: (height - 1920) / 2, objectFit: 'cover'}} />
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.55) 100%)'}} />
    <div style={{position: 'absolute', left: 64, top: height * 0.09, fontFamily: SANS, color: '#fff', textShadow: '0 6px 30px rgba(0,0,0,0.8)'}}>
      <div style={{fontSize: 96, fontWeight: 700, letterSpacing: 6}}>{COVER_LINES[0]}</div>
      <div style={{fontSize: 150, fontWeight: 900, letterSpacing: 8, marginTop: -10, color: '#eaf6ff'}}>{COVER_LINES[1]}</div>
    </div>
    <div style={{position: 'absolute', left: 64, bottom: height * 0.06, padding: '6px 16px', borderRadius: 8, fontFamily: SANS, fontWeight: 500,
      fontSize: 32, letterSpacing: 2, color: 'rgba(255,255,255,0.92)', background: 'rgba(6,10,16,0.55)', border: '1.5px solid rgba(255,255,255,0.3)'}}>{TAG}</div>
  </AbsoluteFill>
);
