// Spring.tsx · 春风不解风情: a spring hill under a cherry branch. Gusts of petals blow through on 春 and 风; on 不解
// the breeze takes the mascot's nightcap, and on 风情 it takes the letter it was holding, too.
import React from 'react';
import {CW, CH} from '../layout';
import {SPRING, BARLINE, LINES, sincePulse} from '../timeline';
import {Clawd, Nightcap} from '../art/Clawd';
import {Petal} from '../art/props';
import {SERIF} from '../lib/fonts';
import {clamp, seg, easeOut, easeIn, backOut, rng, TAU} from '../lib/math';

const MX = 300, FEET = 489, U = 12;
const L = LINES[4].syl;
const GUSTS = [L[0].t, L[1].t, L[2].t, L[4].t];
// How far the wind has carried things by time t (px): a steady breeze plus a decaying shove at every gust
const windX = (t: number) => {
  let x = 150 * t;
  for (const g of GUSTS) if (t > g - 0.05) x += 520 * (1 - Math.exp(-(t - g + 0.05) / 0.45));
  return x;
};
const PETALS = (() => { const r = rng(44); return Array.from({length: 38}, () => ({x0: r() * 1200, y0: r() * CH, s: 0.6 + r() * 0.8, ph: r() * TAU, u: 6 + r() * 4})); })();
const BLOSSOMS: [number, number, number][] = [[840, 40, 1], [780, 70, 0.8], [720, 104, 1], [664, 118, 0.7], [610, 150, 0.9], [760, 140, 0.7], [820, 110, 0.9], [700, 60, 0.6], [560, 168, 0.75], [650, 190, 0.6]];

// The letter: held, tugged on 风, carried off on 情 (the heart scene catches it)
export const letterAt = (t: number) => {
  const hold: [number, number] = [MX + 106, FEET - 6 * U - 10];
  const tug = seg(t, SPRING.letter, SPRING.drift);
  const k = seg(t, SPRING.drift, BARLINE[5] + 0.2);
  const x = hold[0] + (CW + 140 - hold[0]) * easeIn(k);
  const y = hold[1] - 26 * tug - (hold[1] + 120) * k + 40 * Math.sin(k * Math.PI * 3);
  const rot = 12 * Math.sin((t - SPRING.letter) * 18) * tug * (1 - k) + 26 * Math.sin(k * Math.PI * 4) - 8;
  return {x, y, rot};
};

export const Letter: React.FC<{x: number; y: number; rot: number; s?: number; open?: number}> = ({x, y, rot, s = 1, open = 0}) => (
  <div style={{position: 'absolute', left: x - 64 * s, top: y - 42 * s, width: 128 * s, height: 84 * s, transform: `rotate(${rot}deg)`,
    background: 'repeating-linear-gradient(-45deg, #C8372D 0 9px, #FFFFFF 9px 15px, #23407A 15px 24px, #FFFFFF 24px 30px)', borderRadius: 4 * s, boxShadow: '0 6px 10px rgba(40,30,20,0.25)'}}>
    <div style={{position: 'absolute', inset: 7 * s, background: '#FFFDF6', borderRadius: 2 * s}} />
    <svg width={128 * s} height={84 * s} viewBox="0 0 128 84" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <path d={`M7 7 L64 ${48 - 70 * open} L121 7`} fill={open > 0.5 ? '#F3E6CC' : 'none'} stroke="#D8CBB0" strokeWidth={3} />
      {open < 0.5 && <circle cx={64} cy={46} r={11} fill="#D2372E" />}
      {open < 0.5 && <path d="M58 44 q3 -5 6 0 q3 -5 6 0 l-6 7 z" fill="#FFB0A8" />}
    </svg>
  </div>
);

export const Spring: React.FC<{t: number}> = ({t}) => {
  const wx = windX(t), beat = Math.exp(-sincePulse(t) / 0.12);
  const capK = seg(t, SPRING.cap, SPRING.cap + 1.15);
  const capOn = t < SPRING.cap;
  const reach = easeOut(seg(t, SPRING.drift, SPRING.drift + 0.2));
  const startle = t > SPRING.cap ? Math.exp(-(t - SPRING.cap) / 0.5) : 0;
  const let_ = letterAt(t);
  const sway = 1.6 * Math.sin(t * 2.2) + 1.2 * Math.exp(-sincePulse(t) / 0.2);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #9ED6EF 0%, #CDEBF6 55%, #EAF7FA 100%)'}}>
      {[[120, 90, 190], [520, 50, 150], [330, 220, 120]].map(([x, y, w], i) => (
        <div key={i} style={{position: 'absolute', left: ((x + 18 * t + i * 40) % (CW + 200)) - 100, top: y, width: w, height: w * 0.32, borderRadius: w, background: '#FFFFFF', opacity: 0.85}} />
      ))}
      <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0}}>
        <ellipse cx={720} cy={720} rx={560} ry={300} fill="#BFE3A4" />
        <ellipse cx={444} cy={900} rx={700} ry={420} fill="#82C56F" />
        <ellipse cx={444} cy={906} rx={700} ry={420} fill="none" stroke="#6AAE5B" strokeWidth={8} />
        {Array.from({length: 18}, (_, i) => { const x = 30 + i * 49, y = 900 - 420 * Math.sqrt(Math.max(0, 1 - ((x - 444) / 700) ** 2)) + 26 + (i % 3) * 14;
          const b = 6 * Math.sin(t * 3 + i) + 8 * Math.exp(-sincePulse(t) / 0.15);
          return <path key={i} d={`M${x} ${y} q${2 + b * 0.3} -14 ${b * 0.6} -24 M${x + 8} ${y} q${2 + b * 0.3} -10 ${b * 0.5} -18`} stroke="#4E9A4A" strokeWidth={4} fill="none" strokeLinecap="round" />; })}
      </svg>
      {/* the cherry branch, swaying with the breeze */}
      <div style={{position: 'absolute', left: 0, top: 0, width: CW, height: CH, transform: `rotate(${sway}deg)`, transformOrigin: `${CW + 20}px -20px`}}>
        <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <path d={`M${CW + 20} 10 C 820 40, 720 90, 560 170 M760 70 C 740 110, 760 130, 780 150 M680 112 C 670 150, 640 170, 640 196`} stroke="#7A4B3A" strokeWidth={14} fill="none" strokeLinecap="round" />
          {BLOSSOMS.map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s * (1 + 0.05 * beat)})`}>
              {[0, 1, 2, 3, 4].map((j) => <circle key={j} cx={Math.cos((j / 5) * TAU) * 13} cy={Math.sin((j / 5) * TAU) * 13} r={11} fill={j % 2 ? '#F7B3C7' : '#F59BB7'} />)}
              <circle r={7} fill="#FFE3EC" /><circle r={3} fill="#E5577E" />
            </g>
          ))}
        </svg>
      </div>
      <Clawd x={MX} y={FEET} u={U} eye={1} mood={startle > 0.3 ? 'surprised' : 'normal'} gaze={t > SPRING.cap ? 1 : 0.3} look={t > SPRING.drift ? -1 : 0}
        lift={0.4 * beat} squash={1 + 0.04 * beat} tilt={6 * startle} armR={1 + 2 * reach} armL={t > SPRING.cap ? 1.5 * startle : 0}
        cap={capOn ? {x: 0, y: 0, r: -8 + 4 * Math.sin(t * 6) * seg(t, L[0].t, L[0].t + 0.2)} : null} heart={0.6} />
      {!capOn && capK < 1 && <Nightcap x={MX + 6 + 660 * easeOut(capK)} y={FEET - 10 * U - 6 - 250 * capK + 70 * Math.sin(capK * Math.PI * 2)} u={U} r={-8 + 620 * capK} />}
      {t > SPRING.cap && startle > 0.05 && (
        <div style={{position: 'absolute', left: MX + 40, top: FEET - 10 * U - 110, fontFamily: SERIF, fontWeight: 900, fontSize: 64, color: '#E39C22', WebkitTextStroke: '2px #8A5410',
          transform: `scale(${Math.max(0, backOut(clamp((t - SPRING.cap) / 0.2), 2.4))})`, opacity: clamp(startle * 2)}}>？</div>
      )}
      <Letter x={let_.x} y={let_.y} rot={let_.rot} />
      {PETALS.map((p, i) => {
        const x = ((p.x0 + wx * p.s) % 1160) - 120, y = ((p.y0 + 38 * (t - 12) * p.s) % (CH + 60)) - 30 + 22 * Math.sin(t * 1.6 + p.ph);
        return <Petal key={i} x={x} y={y} u={p.u} rot={(wx * 0.9 + p.ph * 60) * p.s} />;
      })}
    </div>
  );
};
