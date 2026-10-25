// Prize.tsx: the curtain falls on the yellow world and the prize arrives: a gold medal and the two laureates.
// Name cards use silhouettes, not photographs or likenesses.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {NOBEL, scene} from '../timeline';
import {C} from '../lib/palette';
import {SANS, MONO} from '../lib/fonts';
import {clamp, seg, easeOut, springAt, rng} from '../lib/math';
import {Medal, Bust, Sparkle} from '../art/Props';
import {Bean, blinkAt} from '../art/Bean';
import {NavyBg} from '../ui/World';

const GLINTS = (() => { const R = rng(3); return Array.from({length: 22}, () => ({a: R() * Math.PI * 2, v: 380 + R() * 520, r: 8 + R() * 16, spin: R() * 360})); })();

const NameCard: React.FC<{x: number; y: number; k: number; zh: string; en: string; school: string; from: -1 | 1}> = ({x, y, k, zh, en, school, from}) => (
  <g transform={`translate(${x + (1 - k) * from * 420} ${y})`} opacity={clamp(k * 1.5)}>
    <rect x={8} y={10} width={420} height={176} rx={26} fill={C.navyLo} />
    <rect x={0} y={0} width={420} height={176} rx={26} fill={C.navyHi} stroke={C.gold} strokeWidth={4} />
    <circle cx={74} cy={88} r={52} fill={C.navy} stroke={C.gold} strokeWidth={3} />
    <g clipPath={`url(#bust${from})`}><Bust x={74} y={104} s={0.95} fill={C.goldLo} /></g>
    <defs><clipPath id={`bust${from}`}><circle cx={74} cy={88} r={50} /></clipPath></defs>
    <text x={142} y={66} fontFamily={SANS} fontWeight={900} fontSize={zh.length > 6 ? 34 : 40} fill={C.cream}>{zh}</text>
    <text x={142} y={104} fontFamily={MONO} fontWeight={400} fontSize={22} fill={C.grey}>{en}</text>
    <text x={142} y={146} fontFamily={SANS} fontWeight={700} fontSize={30} fill={C.gold}>{school}</text>
  </g>
);

export const Nobel: React.FC<{t: number}> = ({t}) => {
  const a = scene('nobel').a;
  const land = NOBEL.medal, drop = springAt(t - (land - 0.35), {freq: 1.6, damp: 0.42});
  const my = -260 + (800 + 260) * drop, spin = Math.max(0, 1 - clamp((t - land + 0.35) / 1.1)) * Math.PI * 3;
  const burst = t - land;
  const nk = springAt(t - NOBEL.names, {freq: 2, damp: 0.6});
  return (
    <AbsoluteFill>
      <NavyBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {/* light rays behind the medal once it lands */}
        <g transform={`translate(540 800) rotate(${(t - a) * 10})`} opacity={0.5 * easeOut(seg(t, land, land + 0.6))}>
          {Array.from({length: 14}, (_, i) => <path key={i} d="M 0 0 L -70 -900 L 70 -900 Z" fill={C.gold} opacity={0.18} transform={`rotate(${i * (360 / 14)})`} />)}
        </g>
        <circle cx={540} cy={800} r={250} fill={C.gold} opacity={0.12 * easeOut(seg(t, land, land + 0.4))} />
        <Medal x={540} y={my} r={170} spin={spin} shine={seg(t, NOBEL.shine, NOBEL.shine + 0.7) * 2 - 0.3} />
        {burst > 0 && burst < 1.4 && GLINTS.map((g, i) => {
          const d = g.v * easeOut(clamp(burst / 1.2));
          return <Sparkle key={i} x={540 + Math.cos(g.a) * (180 + d)} y={800 + Math.sin(g.a) * (180 + d)} r={g.r * (1 - burst / 1.4)} rot={g.spin + burst * 200} fill={i % 3 ? C.gold : '#fff'} />;
        })}
        <Bean x={846} y={968 + (1 - springAt(t - land - 0.15, {freq: 2.2, damp: 0.5})) * 400 - 26 * Math.abs(Math.sin((t - land) * 7)) * (t > land ? 1 : 0)} s={0.56}
          color={C.white} mood="grin" look={[-1, -0.6]} blink={blinkAt(t, 8)} squash={-Math.abs(Math.sin((t - land) * 7)) * 0.4} />
        <text x={540} y={1036} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={30} fill={C.cream} opacity={0.85 * clamp((t - NOBEL.names - 0.3) * 3)}>
          获奖理由：为宏观经济稳定政策奠定微观经济学基础
        </text>
        <NameCard x={56} y={1070} k={nk} zh="罗伯特·霍尔" en="Robert E. Hall" school="斯坦福大学" from={-1} />
        <NameCard x={500} y={1070} k={springAt(t - NOBEL.names - 0.12, {freq: 2, damp: 0.6})} zh="迈克尔·伍德福德" en="Michael Woodford" school="哥伦比亚大学" from={1} />
      </svg>
    </AbsoluteFill>
  );
};
