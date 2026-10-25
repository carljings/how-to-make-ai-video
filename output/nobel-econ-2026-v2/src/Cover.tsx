// Cover.tsx: the Douyin covers. The picture is the film's first frame (the GPT Image key frame Seedance started from),
// with the same question on top, laid out for 9:16, 3:4 and 4:3.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {SANS} from './lib/fonts';
import './lib/fonts';

const GOLD = '#FFD54A', INK = 'rgba(16,10,6,0.92)';
const stroke = (px: number) => ({WebkitTextStroke: `${px}px ${INK}`, paintOrder: 'stroke fill' as const});

const Layout: React.FC<{size: number; top: number; left?: number; align?: 'center' | 'left'; pos: string; money: [number, number]}> = ({size, top, left = 0, align = 'center', pos, money}) => (
  <AbsoluteFill>
    <Img src={staticFile('cover-bg.png')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos}} />
    <AbsoluteFill style={{background: align === 'center'
      ? 'linear-gradient(180deg, rgba(12,8,24,0.7) 0%, rgba(12,8,24,0.35) 30%, rgba(12,8,24,0) 48%)'
      : 'linear-gradient(90deg, rgba(12,8,24,0.72) 0%, rgba(12,8,24,0.4) 40%, rgba(12,8,24,0) 62%)'}} />
    <div style={{position: 'absolute', top, left: align === 'center' ? 0 : left, right: align === 'center' ? 0 : undefined, textAlign: align, fontFamily: SANS, fontWeight: 900, lineHeight: 1.12}}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, height: 58, padding: '0 26px', borderRadius: 29, color: GOLD, background: 'rgba(20,12,4,0.6)',
        border: `3px solid ${GOLD}`, fontSize: 30, letterSpacing: 2}}>
        <div style={{width: 13, height: 13, borderRadius: 7, background: '#FF5A4A'}} />2026诺贝尔经济学奖
      </div>
      <div style={{fontSize: size, color: '#fff', marginTop: 18, ...stroke(size * 0.11), textShadow: '0 8px 24px rgba(0,0,0,0.5)'}}>多给你<span style={{color: GOLD}}>1000</span>块</div>
      <div style={{fontSize: size * 0.94, color: '#fff', ...stroke(size * 0.11), textShadow: '0 8px 24px rgba(0,0,0,0.5)'}}>你会花吗？</div>
    </div>
    <div style={{position: 'absolute', left: money[0], top: money[1], transform: 'translate(-50%, -50%) rotate(-8deg)', padding: '14px 34px', borderRadius: 40, background: GOLD,
      color: '#5A2E00', fontFamily: SANS, fontWeight: 900, fontSize: 72, whiteSpace: 'nowrap', border: `5px solid ${INK}`, boxShadow: `6px 8px 0 ${INK}`}}>+¥1000</div>
  </AbsoluteFill>
);

export const Cover: React.FC = () => <Layout size={128} top={250} pos="50% 50%" money={[800, 900]} />;
export const Cover34: React.FC = () => <Layout size={112} top={70} pos="50% 62%" money={[820, 760]} />;
export const Cover43: React.FC = () => <Layout size={96} top={36} pos="50% 62%" money={[1170, 620]} />;
