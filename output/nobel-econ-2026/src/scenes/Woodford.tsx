// Woodford.tsx: prices look ahead too. A street of shops raises prices because everyone expects prices to rise;
// the central bank answers with a sentence people believe; 1994 versus now.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SHOPS, BANK, THEN, scene} from '../timeline';
import {C} from '../lib/palette';
import {SANS} from '../lib/fonts';
import {clamp, seg, easeOut, springAt} from '../lib/math';
import {Tag, Gauge, Sparkle} from '../art/Props';
import {Bean, blinkAt} from '../art/Bean';
import {NavyBg} from '../ui/World';

const SHOP_LIST = [
  {name: '面馆', awning: C.red}, {name: '奶茶', awning: C.teal}, {name: '水果', awning: C.orange}, {name: '理发', awning: '#7C6CF0'},
];
const SX = [132, 346, 560, 774]; // shop centres

const Shop: React.FC<{x: number; y: number; name: string; awning: string; t: number; i: number; think: number; flip: number; calm: number}> = ({x, y, name, awning, t, i, think, flip, calm}) => {
  const w = 204, h = 270;
  const stripes = Array.from({length: 6}, (_, j) => <rect key={j} x={-w / 2 + j * (w / 6)} y={-h / 2 - 20} width={w / 12} height={46} fill="#fff" opacity={0.9} />);
  const bub = springAt(think, {freq: 2.6, damp: 0.5});
  const calmK = springAt(calm, {freq: 2.6, damp: 0.5});
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={C.navyHi} stroke={C.line} strokeWidth={6} />
      <rect x={-w / 2 - 10} y={-h / 2 - 22} width={w + 20} height={50} rx={8} fill={awning} stroke={C.line} strokeWidth={6} />
      <g clipPath={`url(#aw${i})`}>{stripes}</g>
      <defs><clipPath id={`aw${i}`}><rect x={-w / 2 - 10} y={-h / 2 - 22} width={w + 20} height={50} rx={8} /></clipPath></defs>
      <rect x={-64} y={-h / 2 + 38} width={128} height={52} rx={8} fill={C.cream} stroke={C.line} strokeWidth={4} />
      <text y={-h / 2 + 77} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={36} fill={C.ink}>{name}</text>
      <Bean x={0} y={84} s={0.46} color={i % 2 ? '#F7D9B5' : '#FFE0C2'} mood={calmK > 0.5 ? 'smile' : bub > 0.5 ? 'worry' : 'smile'} look={[0, 0.3]} blink={blinkAt(t, i + 9)} />
      <rect x={-w / 2} y={60} width={w} height={h / 2 - 60} fill="#2A3D66" stroke={C.line} strokeWidth={6} />
      {/* the thought bubble: "要涨…" then "不急" */}
      {bub > 0.01 && (
        <g transform={`translate(10 ${-h / 2 - 92}) scale(${bub})`}>
          <circle cx={-40} cy={62} r={10} fill="#fff" stroke={C.line} strokeWidth={3} />
          <rect x={-86} y={-46} width={172} height={92} rx={44} fill="#fff" stroke={C.line} strokeWidth={5} />
          <text y={16} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={44} fill={calmK > 0.5 ? C.tealLo : C.redLo}>{calmK > 0.5 ? '不急' : '要涨…'}</text>
        </g>
      )}
      <Tag x={0} y={h / 2 + 78} from="¥10" to="¥12" flip={flip} s={1.08} hot={clamp(flip)} />
    </g>
  );
};

export const Shops: React.FC<{t: number}> = ({t}) => {
  const flipAt = (i: number) => SHOPS.flip + i * 0.16;
  const v = 0.5 + 0.38 * easeOut(seg(t, SHOPS.flip, SHOPS.real + 0.3)) + Math.sin(t * 9) * 0.012 * (t > SHOPS.flip ? 1 : 0);
  return (
    <AbsoluteFill>
      <NavyBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <Gauge x={540} y={712} r={100} v={v} label="物价" />
        {SHOP_LIST.map((s, i) => (
          <Shop key={i} x={SX[i]} y={1062} name={s.name} awning={s.awning} t={t} i={i} think={t - SHOPS.think - i * 0.12} flip={(t - flipAt(i)) / 0.22} calm={-1} />
        ))}
        {t > SHOPS.real && [0, 1, 2, 3].map((i) => <Sparkle key={i} x={SX[i] + 80} y={1240} r={22 * Math.exp(-(t - SHOPS.real - i * 0.05) / 0.3)} fill={C.red} />)}
        {/* you, out shopping, flinch when the tags flip */}
        <g transform={`translate(${830 + Math.min(1, (t - scene('shops').a) / 3) * 60} 1445)`}>
          <Bean x={0} y={-Math.abs(Math.sin(t * 7)) * 8 * (t < SHOPS.flip ? 1 : 0)} s={0.62} color={C.white} mood={t < SHOPS.flip ? 'smile' : 'o'} look={[-1, -0.6]} blink={blinkAt(t, 12)}
            tilt={t < SHOPS.flip ? Math.sin(t * 7) * 4 : 0} label="你" labelK={1} />
          {t > SHOPS.flip && <text x={-96} y={-150} fontFamily={SANS} fontWeight={900} fontSize={64} fill={C.red} transform={`rotate(-10 -96 -150) scale(${Math.min(1, (t - SHOPS.flip) * 6)})`}>！</text>}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---- the central bank: an interest-rate lever, then a microphone and one sentence ----
const BankBuilding: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M -250 -150 L 0 -260 L 250 -150 Z" fill={C.cream} stroke={C.line} strokeWidth={7} strokeLinejoin="round" />
    <text y={-168} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={52} fill={C.navy}>央行</text>
    <rect x={-240} y={-150} width={480} height={34} fill={C.cream} stroke={C.line} strokeWidth={6} />
    {[-180, -90, 0, 90, 180].map((cx) => <rect key={cx} x={cx - 24} y={-116} width={48} height={190} fill="#E9DFC8" stroke={C.line} strokeWidth={5} />)}
    <rect x={-270} y={74} width={540} height={30} fill={C.cream} stroke={C.line} strokeWidth={6} />
    <rect x={-300} y={104} width={600} height={30} fill="#E9DFC8" stroke={C.line} strokeWidth={6} />
  </g>
);

export const Bank: React.FC<{t: number}> = ({t}) => {
  const {a} = scene('bank');
  const lever = springAt(t - a - 0.3), mic = springAt(t - BANK.mic, {freq: 2.2, damp: 0.5});
  const v = 0.88 - 0.38 * easeOut(seg(t, BANK.calm, BANK.calm + 0.9)) + Math.sin(t * 9) * 0.012 * (t < BANK.calm ? 1 : 0);
  const talk = t > BANK.mic ? Math.abs(Math.sin((t - BANK.mic) * 16)) : 0;
  return (
    <AbsoluteFill>
      <NavyBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <g transform="translate(540 930) scale(1.08) translate(-540 -930)"><BankBuilding x={540} y={930} /></g>
        {/* the interest-rate lever, left */}
        <g transform={`translate(132 ${1010 + (1 - lever) * 300}) scale(1.25)`} opacity={clamp(lever * 2)}>
          <rect x={-22} y={-150} width={44} height={170} rx={22} fill={C.navyHi} stroke={C.line} strokeWidth={5} />
          <circle cx={0} cy={-110 + 60 * Math.sin(Math.min(1, Math.max(0, (t - a - 0.4) / 0.6)) * Math.PI)} r={30} fill={C.gold} stroke={C.line} strokeWidth={5} />
          <text y={70} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={36} fill={C.cream}>利率</text>
        </g>
        {/* the microphone and the sentence */}
        <g transform={`translate(540 ${1170 + (1 - mic) * 260})`} opacity={clamp(mic * 2)}>
          <rect x={-8} y={-30} width={16} height={130} fill="#5B6B88" stroke={C.line} strokeWidth={4} />
          <rect x={-40} y={-110} width={80} height={100} rx={40} fill="#3A4766" stroke={C.line} strokeWidth={6} />
          {[0, 1, 2].map((j) => <line key={j} x1={-26} x2={26} y1={-84 + j * 22} y2={-84 + j * 22} stroke={C.grey} strokeWidth={4} />)}
        </g>
        <g transform={`translate(540 ${915}) scale(${mic * (1 + 0.03 * talk)})`} opacity={clamp(mic * 2)}>
          <path d="M -30 118 L 0 178 L 34 118 Z" fill="#fff" stroke={C.line} strokeWidth={6} strokeLinejoin="round" />
          <rect x={-250} y={-30} width={500} height={150} rx={60} fill="#fff" stroke={C.line} strokeWidth={7} />
          <path d="M -28 117 L 32 117" stroke="#fff" strokeWidth={8} />
          <text y={68} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={66} fill={C.ink}>物价会稳住</text>
        </g>
        <Gauge x={890} y={1170} r={86} v={v} label="" />
        <Bean x={300} y={1440} s={0.62} color={C.white} mood={t < BANK.calm ? 'worry' : 'grin'} look={[0.5, -0.8]} blink={blinkAt(t, 13)}
          squash={t > BANK.calm ? -Math.abs(Math.sin((t - BANK.calm) * 6)) * 0.3 : 0} label="你" labelK={1} />
        <text x={890} y={1226} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={32} fill={C.cream}>物价</text>
      </svg>
    </AbsoluteFill>
  );
};

// ---- 1994 versus now ----
export const Then: React.FC<{t: number}> = ({t}) => {
  const reveal = easeOut(seg(t, THEN.now - 0.15, THEN.now + 0.35));
  const flashes = THEN.flashes.map(([x, y, at]) => ({x, y, at}));
  return (
    <AbsoluteFill>
      <NavyBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {/* left: 1994, sepia, the door stays shut */}
        <g>
          <rect x={60} y={640} width={450} height={600} rx={30} fill="#3B3226" stroke="#C9A66B" strokeWidth={5} />
          <text x={285} y={720} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={60} fill="#E8C98A">1994年以前</text>
          <rect x={200} y={760} width={170} height={300} rx={8} fill="#6E5A3E" stroke="#1D160E" strokeWidth={6} />
          <circle cx={345} cy={915} r={10} fill="#E8C98A" />
          <rect x={215} y={800} width={140} height={46} rx={6} fill="#E8C98A" />
          <text x={285} y={836} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={34} fill="#3B3226">会议中</text>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <Bean x={120 + i * 150 + (i === 1 ? 20 : 0)} y={1180} s={0.4} color="#C9B48F" mood="worry" look={[i === 0 ? 1 : i === 2 ? -1 : 0, -0.8]} blink={blinkAt(t, i + 20)} outline="#1D160E" />
              <text x={130 + i * 150 + (i === 1 ? 20 : 0)} y={1080 - Math.abs(Math.sin(t * 3 + i)) * 16} fontFamily={SANS} fontWeight={900} fontSize={64} fill="#E8C98A">?</text>
            </g>
          ))}
        </g>
        {/* right: now, a press conference and the path ahead */}
        <g opacity={reveal} transform={`translate(${(1 - reveal) * 120} 0)`}>
          <rect x={560} y={640} width={370} height={600} rx={30} fill={C.navyHi} stroke={C.gold} strokeWidth={5} />
          <text x={745} y={720} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={60} fill={C.gold}>现在</text>
          {/* the dotted path into the future */}
          <path d="M 600 900 C 680 860 740 940 800 880 S 880 800 900 790" fill="none" stroke={C.teal} strokeWidth={8} strokeDasharray="4 16" strokeLinecap="round"
            strokeDashoffset={-t * 60} opacity={easeOut(seg(t, THEN.tell, THEN.tell + 0.4))} />
          <path d="M 886 770 L 912 786 L 888 806" fill="none" stroke={C.teal} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={easeOut(seg(t, THEN.tell + 0.2, THEN.tell + 0.5))} />
          <text x={745} y={846} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={44} fill={C.teal} opacity={easeOut(seg(t, THEN.tell, THEN.tell + 0.4))}>下一步</text>
          {/* podium with microphones */}
          <Bean x={745} y={1010} s={0.62} color={C.cream} mood="grin" look={[0, 0.2]} blink={blinkAt(t, 31)} />
          <rect x={650} y={1000} width={190} height={190} rx={12} fill={C.cream} stroke={C.line} strokeWidth={6} />
          <rect x={712} y={1046} width={66} height={66} rx={33} fill={C.gold} stroke={C.line} strokeWidth={5} />
          {[-34, 0, 34].map((dx) => <g key={dx}><rect x={739 + dx} y={958} width={14} height={46} rx={7} fill="#3A4766" stroke={C.line} strokeWidth={3} /></g>)}
          {flashes.map((f, i) => t > f.at && t < f.at + 0.35 && <Sparkle key={i} x={f.x} y={f.y} r={60 * (1 - (t - f.at) / 0.35)} fill="#fff" />)}
        </g>
        {reveal < 1 && <rect x={560} y={640} width={370} height={600} rx={30} fill={C.navyLo} opacity={1 - reveal} stroke={C.cream} strokeOpacity={0.15} strokeWidth={4} strokeDasharray="12 12" />}
      </svg>
    </AbsoluteFill>
  );
};
