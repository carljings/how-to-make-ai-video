// Cover.tsx: the Douyin covers. Same picture as the first frame (title, cover and frame 0 say the same thing),
// laid out for 9:16 (1080×1920), 3:4 (1080×1440) and 4:3 (1440×1080).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from './lib/palette';
import {SANS} from './lib/fonts';
import {Phone, Notice, Coin, Choice, BagIcon, PiggyIcon, Sparkle} from './art/Props';
import {Bean} from './art/Bean';
import './lib/fonts';

const COINS: [number, number, number, number][] = [[-300, -60, 44, 0.3], [300, -120, 34, 1.0], [-280, 220, 30, 0.6], [320, 180, 32, 1.3], [240, -330, 28, 0.9]];

const Scene: React.FC<{w: number; h: number; s: number; phone: [number, number]; head: [number, number]; buttons: number; you: [number, number]}> = ({w, h, s, phone, head, buttons, you}) => (
  <AbsoluteFill style={{background: `radial-gradient(120% 75% at 50% 45%, ${C.yellowHi} 0%, ${C.yellow} 55%, ${C.yellowLo} 100%)`}}>
    <svg width={w} height={h} style={{position: 'absolute'}}>
      <g transform={`translate(${phone[0]} ${phone[1]})`} opacity={0.22}>
        {Array.from({length: 18}, (_, i) => <path key={i} d="M 0 0 L -90 -1600 L 90 -1600 Z" fill="#fff" transform={`rotate(${i * 20 + 5})`} />)}
      </g>
      <circle cx={phone[0]} cy={phone[1]} r={340 * s} fill="#fff" opacity={0.4} />
      <g transform={`translate(${phone[0]} ${phone[1]}) scale(${s}) rotate(-4)`}>
        <Phone x={0} y={0} w={440} h={600}>
          <Notice x={22} y={86} w={396} title="到账提醒" amount="+¥1000.00" />
          <g transform="translate(220 400)"><circle r={96} fill={C.yellow} opacity={0.5} /><Coin x={0} y={0} r={74} spin={0.4} /></g>
        </Phone>
        {COINS.map(([x, y, r, sp], i) => <Coin key={i} x={x} y={y} r={r} spin={sp} rot={i * 9 - 20} />)}
        {[0, 1, 2, 3].map((i) => <Sparkle key={i} x={[-330, 330, -300, 290][i]} y={[-200, -250, 90, 60][i]} r={[22, 18, 14, 16][i]} />)}
      </g>
      <Bean x={you[0]} y={you[1]} s={0.86 * s} color={C.white} mood="o" look={[1, -0.4]} label="你" prop="question" />
      <g transform={`translate(${w / 2} ${buttons}) scale(${s})`}>
        <Choice x={-215} y={0} w={390} letter="A" label="花掉" fill={C.red} icon={<BagIcon s={0.62} />} hi={1} />
        <Choice x={215} y={0} w={390} letter="B" label="存起来" fill={C.teal} icon={<PiggyIcon s={0.62} />} />
      </g>
    </svg>
    <div style={{position: 'absolute', top: head[0], left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontWeight: 900, color: C.ink, lineHeight: 1.08}}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, height: 60, padding: '0 28px', borderRadius: 30, background: C.ink, color: C.yellow, fontSize: 32 * Math.min(1, s + 0.15), letterSpacing: 2}}>
        <div style={{width: 14, height: 14, borderRadius: 7, background: C.red}} />2026诺贝尔经济学奖
      </div>
      <div style={{fontSize: head[1], marginTop: 18, textShadow: '0 6px 0 rgba(255,255,255,0.55)'}}>多给你<span style={{color: C.red}}>1000</span>块</div>
      <div style={{fontSize: head[1] * 0.92, textShadow: '0 6px 0 rgba(255,255,255,0.55)'}}>你会花吗？</div>
    </div>
  </AbsoluteFill>
);

export const Cover: React.FC = () => <Scene w={1080} h={1920} s={1} phone={[610, 1000]} head={[250, 132]} buttons={1420} you={[175, 1235]} />;
export const Cover34: React.FC = () => <Scene w={1080} h={1440} s={0.78} phone={[610, 900]} head={[80, 118]} buttons={1290} you={[200, 1080]} />;
export const Cover43: React.FC = () => (
  <AbsoluteFill>
    <Scene w={1440} h={1080} s={0.72} phone={[1040, 600]} head={[-1000, 0]} buttons={960} you={[760, 860]} />
    <div style={{position: 'absolute', left: 80, top: 220, fontFamily: SANS, fontWeight: 900, color: C.ink, lineHeight: 1.1}}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, height: 56, padding: '0 26px', borderRadius: 28, background: C.ink, color: C.yellow, fontSize: 30, letterSpacing: 2}}>
        <div style={{width: 14, height: 14, borderRadius: 7, background: C.red}} />2026诺贝尔经济学奖
      </div>
      <div style={{fontSize: 118, marginTop: 24, textShadow: '0 6px 0 rgba(255,255,255,0.55)'}}>多给你<span style={{color: C.red}}>1000</span>块</div>
      <div style={{fontSize: 108, textShadow: '0 6px 0 rgba(255,255,255,0.55)'}}>你会花吗？</div>
    </div>
  </AbsoluteFill>
);
