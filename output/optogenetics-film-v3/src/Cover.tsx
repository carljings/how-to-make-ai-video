// Cover.tsx: the Douyin cover, a still made from the hook. Profile grids crop covers to 3:4, so everything that
// matters sits between y = 240 and 1680; the title is large enough to read as a thumbnail.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Hook} from './scenes/Hook';
import {SANS} from './lib/fonts';
import {rgba} from './ui/Text';
import './lib/fonts';

const Line: React.FC<{text: string; key_: string; size: number}> = ({text, key_, size}) => (
  <div style={{fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: `${size * 1.12}px`, color: '#f4f8ff', whiteSpace: 'nowrap', textShadow: '0 4px 24px rgba(0,0,0,0.7)'}}>
    {[...text].map((c, i) => (
      <span key={i} style={c === key_ ? {color: rgba('blue'), textShadow: `0 0 34px ${rgba('blue', 0.85)}`} : undefined}>{c}</span>
    ))}
  </div>
);

export const Cover: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#04070e'}}>
    <Hook t={1.25} cover />
    <div style={{position: 'absolute', left: 0, right: 0, top: 240, height: 660, background: 'linear-gradient(180deg, rgba(2,4,9,0.7) 0%, rgba(2,4,9,0.55) 70%, rgba(2,4,9,0) 100%)'}} />
    <div style={{position: 'absolute', left: 72, top: 280}}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 14, padding: '8px 22px', borderRadius: 30, border: '2px solid rgba(236,200,120,0.9)', background: 'rgba(236,200,120,0.12)',
        fontFamily: SANS, fontWeight: 700, fontSize: 36, color: 'rgb(236,200,120)', letterSpacing: 3}}>2026 诺贝尔奖 · 光遗传学</div>
      <div style={{marginTop: 26}}>
        <Line text="灯一亮，" key_="亮" size={176} />
        <Line text="它就跑" key_="跑" size={176} />
      </div>
      <div style={{marginTop: 18, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: '#d6e4f0', letterSpacing: 2}}>大脑里的“光开关”，1分钟看懂</div>
    </div>
  </AbsoluteFill>
);
