// Hall.tsx: Robert Hall's ideas in three pictures.
// Spread: a one-off 1000 is spread thinly over many years; a monthly 1000 lifts spending at once.
// Surprise: the spending line ignores what was known in advance and only jumps on news.
// Types: of ten households, about eight look ahead and two spend what they earn (Hall & Mishkin 1982).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SPREAD, SURPRISE, TYPES, scene} from '../timeline';
import {C} from '../lib/palette';
import {SANS, MONO} from '../lib/fonts';
import {clamp, seg, easeOut, easeInOut, springAt, lerp} from '../lib/math';
import {Coin, GiftIcon, RaiseIcon, Bolt, Sparkle} from '../art/Props';
import {Bean, blinkAt} from '../art/Bean';
import {NavyBg} from '../ui/World';

const YEARS = 10, X0 = 110, BW = 66, GAP = 17; // bar layout: 10 years from x = 110 to 923
const barX = (i: number) => X0 + i * (BW + GAP);
const XR = barX(YEARS - 1) + BW;

const Lane: React.FC<{y: number; label: string; sub: string; subK: number; color: string; base: number; extra: (i: number) => number; children?: React.ReactNode}> = ({y, label, sub, subK, color, base, extra, children}) => (
  <g transform={`translate(0 ${y})`}>
    <text x={X0} y={-base - 132} fontFamily={SANS} fontWeight={900} fontSize={44} fill={C.cream}>{label}</text>
    <line x1={X0 - 14} y1={0} x2={XR + 14} y2={0} stroke={C.cream} strokeOpacity={0.4} strokeWidth={5} strokeLinecap="round" />
    {Array.from({length: YEARS}, (_, i) => {
      const h = base + extra(i);
      return (
        <g key={i}>
          <rect x={barX(i)} y={-h} width={BW} height={h} rx={12} fill={color} stroke={C.line} strokeWidth={5} />
          <rect x={barX(i) + 5} y={-base + 5} width={BW - 10} height={base - 10} rx={8} fill={C.navyLo} opacity={0.35} />
        </g>
      );
    })}
    <g opacity={subK} transform={`translate(${XR} ${-base - 132}) scale(${0.7 + 0.3 * subK})`}>
      <text textAnchor="end" fontFamily={SANS} fontWeight={900} fontSize={44} fill={color}>{sub}</text>
    </g>
    {children}
  </g>
);

export const Spread: React.FC<{t: number}> = ({t}) => {
  // lane 1: a coin pile on year 1 bursts into ten coins, one landing on each year
  const fly = (i: number) => clamp((t - SPREAD.burst - i * 0.07) / 0.55);
  const small = (i: number) => 16 * easeOut(clamp((t - SPREAD.burst - i * 0.07 - 0.5) / 0.25));
  const big = 104 * springAt(t - SPREAD.monthly - 0.1, {freq: 2.2, damp: 0.5});
  const pileK = 1 - clamp((t - SPREAD.burst) / 0.1);
  const base = 84;
  return (
    <AbsoluteFill>
      <NavyBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {/* the shared time axis */}
        <g transform="translate(0 676)">
          <text x={X0} y={0} fontFamily={SANS} fontWeight={700} fontSize={34} fill={C.grey}>今年</text>
          <line x1={X0 + 84} y1={-12} x2={XR - 230} y2={-12} stroke={C.grey} strokeWidth={4} strokeDasharray="10 10" />
          <text x={XR} y={0} textAnchor="end" fontFamily={SANS} fontWeight={700} fontSize={34} fill={C.grey}>很多年以后 →</text>
        </g>
        <Lane y={960} label="一次性 +1000" sub="摊开，慢慢花" subK={easeOut(seg(t, SPREAD.slow - 0.2, SPREAD.slow + 0.2))} color={C.teal} base={base} extra={small}>
          {pileK > 0 && [0, 1, 2, 3].map((j) => <Coin key={j} x={barX(0) + BW / 2} y={-base - 26 - j * 18} r={32} spin={1.2} />)}
          {Array.from({length: YEARS}, (_, i) => {
            const k = fly(i);
            if (k <= 0 || k >= 1) return null;
            const x0 = barX(0) + BW / 2, x1 = barX(i) + BW / 2;
            const x = lerp(x0, x1, k), y = lerp(-base - 60, -base - 22, k) - Math.sin(k * Math.PI) * (110 + i * 12);
            return <Coin key={i} x={x} y={y} r={22} spin={k * 9} />;
          })}
          {Array.from({length: YEARS}, (_, i) => fly(i) >= 1 && <Coin key={i} x={barX(i) + BW / 2} y={-base - small(i) - 20} r={20} spin={1.25} />)}
        </Lane>
        <Lane y={1236} label="每月都有 +1000" sub="马上多花" subK={easeOut(seg(t, SPREAD.now - 0.2, SPREAD.now + 0.2))} color={C.orange} base={base} extra={() => big}>
          {t > SPREAD.monthly && t < SPREAD.monthly + 0.6 && (
            <path d={`M ${X0 - 14} ${-base - big} L ${XR + 14} ${-base - big}`} stroke="#fff" strokeWidth={6} strokeDasharray="10 12" opacity={1 - (t - SPREAD.monthly) / 0.6} />
          )}
        </Lane>
      </svg>
    </AbsoluteFill>
  );
};

// ---- surprise: a spending line that only moves on news ----
export const Surprise: React.FC<{t: number}> = ({t}) => {
  const {a, b} = scene('surprise');
  const xL = 110, xR = 920, xStep = 700, yBase = 1080, step = 175;
  // the head of the line sweeps across, timed so it reaches the two known events and the bolt on their words
  const keys: [number, number][] = [[a + 0.1, xL], [SURPRISE.stamp1, 270], [SURPRISE.stamp2, 530], [SURPRISE.bolt, xStep], [b, xR]];
  let hx = xL;
  for (let i = 1; i < keys.length; i++) if (t >= keys[i - 1][0]) hx = lerp(keys[i - 1][1], keys[i][1], clamp((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  const jump = springAt(t - SURPRISE.bolt, {freq: 2.4, damp: 0.45});
  const yAt = (x: number) => (x < xStep ? yBase : yBase - step * (t >= SURPRISE.bolt ? Math.min(1.15, jump) : 0)) + Math.sin(x * 0.05) * 3;
  const pts: string[] = [];
  for (let x = xL; x <= hx; x += 6) pts.push(`${x.toFixed(1)},${yAt(x).toFixed(1)}`);
  pts.push(`${hx.toFixed(1)},${yAt(hx).toFixed(1)}`);
  const flash = t >= SURPRISE.bolt ? Math.exp(-(t - SURPRISE.bolt) / 0.12) : 0;
  const stamp = (x: number, y: number, at: number) => {
    const k = clamp((t - at) / 0.16), s = k < 1 ? lerp(2.2, 1, easeInOut(k)) : 1;
    if (t < at) return null;
    return (
      <g transform={`translate(${x} ${y}) rotate(-12) scale(${s})`} opacity={clamp(k * 3)}>
        <rect x={-104} y={-36} width={208} height={72} rx={14} fill={C.navy} fillOpacity={0.7} stroke={C.red} strokeWidth={7} />
        <text y={13} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={36} fill={C.red}>早算进去了</text>
      </g>
    );
  };
  const event = (x: number, icon: React.ReactNode, label: string, at: number, note = '早知道') => (
    <g transform={`translate(${x} ${yBase - 232})`} opacity={clamp((t - a - 0.2) * 3)}>
      <path d="M 0 70 L 0 220" stroke={C.cream} strokeOpacity={0.35} strokeWidth={4} strokeDasharray="8 10" />
      <g transform={`scale(${1.3 * (1 + 0.15 * Math.max(0, 1 - Math.abs(t - at) / 0.3))})`}>{icon}</g>
      <text y={-104} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={40} fill={C.cream}>{label}</text>
      <text y={-66} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={28} fill={C.grey}>（{note}）</text>
      {stamp(0, 4, at)}
    </g>
  );
  return (
    <AbsoluteFill>
      <NavyBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <text x={xL} y={1236} fontFamily={SANS} fontWeight={700} fontSize={30} fill={C.grey}>你每个月花的钱</text>
        <line x1={xL} y1={1176} x2={xR} y2={1176} stroke={C.cream} strokeOpacity={0.35} strokeWidth={4} />
        <text x={xR} y={1222} textAnchor="end" fontFamily={SANS} fontWeight={700} fontSize={30} fill={C.grey}>时间 →</text>
        {event(270, <GiftIcon s={1} />, '年终奖', SURPRISE.stamp1)}
        {event(530, <RaiseIcon s={1} />, '涨薪', SURPRISE.stamp2)}
        <polyline points={pts.join(' ')} fill="none" stroke={C.gold} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
        {/* the bolt */}
        {t >= SURPRISE.bolt - 0.05 && (
          <g opacity={clamp((t - SURPRISE.bolt + 0.05) * 10)}>
            <g transform={`translate(800 ${lerp(700, 860, easeOut(clamp((t - SURPRISE.bolt + 0.05) / 0.12)))}) rotate(8)`}><Bolt s={1.4} /></g>
            <text x={800} y={732} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={66} fill={C.gold} stroke={C.navy} strokeWidth={8} paintOrder="stroke">意外！</text>
            <text x={800} y={778} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={34} fill={C.cream} stroke={C.navy} strokeWidth={6} paintOrder="stroke">突然加薪</text>
          </g>
        )}
        {flash > 0.02 && [0, 1, 2, 3, 4, 5, 6].map((i) => <Sparkle key={i} x={xStep + Math.cos(i) * 130 * (1.4 - flash)} y={yBase - 80 + Math.sin(i) * 130 * (1.4 - flash)} r={26 * flash} fill={C.gold} />)}
        {/* "you" rides the head of the line */}
        <Bean x={hx} y={yAt(hx) - 8} s={0.56} color={C.white} mood={t > SURPRISE.bolt && t < SURPRISE.bolt + 1.2 ? 'o' : 'smile'} look={[1, -0.2]} blink={blinkAt(t, 4)}
          squash={Math.sin(t * 14) * 0.25} tilt={Math.sin(t * 14) * 4} />
      </svg>
      {flash > 0.02 && <AbsoluteFill style={{background: '#fff', opacity: flash * 0.35}} />}
    </AbsoluteFill>
  );
};

// ---- types: ten households, eight look ahead and two live hand to mouth ----
export const Types: React.FC<{t: number}> = ({t}) => {
  const xs = Array.from({length: 10}, (_, i) => 150 + i * 84);
  const y0 = 1090;
  return (
    <AbsoluteFill>
      <NavyBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <text x={540} y={548} textAnchor="middle" fontFamily={MONO} fontWeight={400} fontSize={24} fill={C.grey} opacity={clamp((t - TYPES.row) * 2)}>
          Hall &amp; Mishkin 1982 · 美国2309户家庭 · 比例因时因地而异
        </text>
        {/* you, above the row, deciding */}
        <Bean x={540} y={872} s={0.92} color={C.white} mood="o" look={[Math.sin(t * 1.6) * 0.9, 0.6]} blink={blinkAt(t, 2)} label="你" labelK={1} prop="question" propK={springAt(t - TYPES.row)} />
        {xs.map((x, i) => {
          const ahead = i < 8, at = ahead ? TYPES.eighty + i * 0.07 : TYPES.twenty + (i - 8) * 0.12;
          const k = springAt(t - at, {freq: 2.6, damp: 0.45}), on = t >= at;
          const appear = springAt(t - TYPES.row - i * 0.04, {freq: 2.4, damp: 0.5});
          return (
            <g key={i} transform={`translate(0 ${(1 - appear) * 200})`} opacity={clamp(appear * 2)}>
              <Bean x={x} y={y0 - (on ? 20 * Math.max(0, Math.sin(clamp((t - at) / 0.3) * Math.PI)) : 0)} s={0.58}
                color={on ? (ahead ? C.teal : C.orange) : '#B9C2D3'} mood={on ? (ahead ? 'smile' : 'worry') : 'flat'}
                look={on ? (ahead ? [1, -0.8] : [0, 0.8]) : [0, 0]} blink={blinkAt(t, i + 3)} prop={on ? (ahead ? 'telescope' : 'wallet') : null} propK={k} />
            </g>
          );
        })}
        {/* brackets and the two numbers */}
        <g opacity={easeOut(seg(t, TYPES.eighty + 0.3, TYPES.eighty + 0.7))}>
          <path d={`M ${xs[0] - 38} ${y0 + 22} L ${xs[0] - 38} ${y0 + 40} L ${xs[7] + 38} ${y0 + 40} L ${xs[7] + 38} ${y0 + 22}`} fill="none" stroke={C.teal} strokeWidth={6} strokeLinejoin="round" />
          <text x={(xs[0] + xs[7]) / 2 - 90} y={y0 + 140} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={96} fill={C.teal}>80%</text>
          <text x={(xs[0] + xs[7]) / 2 + 90} y={y0 + 126} fontFamily={SANS} fontWeight={900} fontSize={46} fill={C.cream}>往前看</text>
        </g>
        <g opacity={easeOut(seg(t, TYPES.twenty + 0.25, TYPES.twenty + 0.6))}>
          <path d={`M ${xs[8] - 38} ${y0 + 22} L ${xs[8] - 38} ${y0 + 40} L ${xs[9] + 38} ${y0 + 40} L ${xs[9] + 38} ${y0 + 22}`} fill="none" stroke={C.orange} strokeWidth={6} strokeLinejoin="round" />
          <text x={(xs[8] + xs[9]) / 2} y={y0 + 118} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={72} fill={C.orange}>20%</text>
          <text x={(xs[8] + xs[9]) / 2 - 8} y={y0 + 160} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={28} fill={C.cream}>挣多少花多少</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
