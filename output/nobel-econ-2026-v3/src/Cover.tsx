// Cover.tsx: the Douyin covers. The picture is the film's opening key frame (the GPT Image frame Seedance started from:
// the noodle chef's frightened face as the town goes dark), with the hook line on top, laid out for 9:16, 3:4 and 4:3.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {SANS} from './lib/fonts';
import {HOOK_KICKER} from './timeline';
import './lib/fonts';

const GOLD = '#FFD54A', RED = '#FF5A4A', INK = 'rgba(16,10,6,0.92)';
const stroke = (px: number) => ({WebkitTextStroke: `${px}px ${INK}`, paintOrder: 'stroke fill' as const});

const Layout: React.FC<{size: number; top: number; left?: number; align?: 'center' | 'left'; pos: string}> = ({size, top, left = 0, align = 'center', pos}) => (
  <AbsoluteFill>
    <Img src={staticFile('cover-bg.png')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos}} />
    <AbsoluteFill style={{background: align === 'center'
      ? 'linear-gradient(180deg, rgba(12,8,24,0.72) 0%, rgba(12,8,24,0.4) 30%, rgba(12,8,24,0) 48%)'
      : 'linear-gradient(90deg, rgba(12,8,24,0.75) 0%, rgba(12,8,24,0.45) 40%, rgba(12,8,24,0) 62%)'}} />
    <div style={{position: 'absolute', top, left: align === 'center' ? 0 : left, right: align === 'center' ? 0 : undefined, textAlign: align, fontFamily: SANS, fontWeight: 900, lineHeight: 1.12}}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, height: 58, padding: '0 26px', borderRadius: 29, color: GOLD, background: 'rgba(20,12,4,0.6)',
        border: `3px solid ${GOLD}`, fontSize: 30, letterSpacing: 2}}>
        <div style={{width: 13, height: 13, borderRadius: 7, background: RED}} />{HOOK_KICKER}
      </div>
      <div style={{fontSize: size, color: '#fff', marginTop: 18, ...stroke(size * 0.11), textShadow: '0 8px 24px rgba(0,0,0,0.5)'}}>一句话，</div>
      <div style={{fontSize: size, color: '#fff', ...stroke(size * 0.11), textShadow: '0 8px 24px rgba(0,0,0,0.5)'}}>让整个小镇<span style={{color: RED}}>破产</span>了</div>
    </div>
  </AbsoluteFill>
);

export const Cover: React.FC = () => <Layout size={112} top={250} pos="50% 50%" />;
export const Cover34: React.FC = () => <Layout size={100} top={70} pos="50% 62%" />;
export const Cover43: React.FC = () => <Layout size={86} top={60} left={60} align="left" pos="50% 55%" />;
