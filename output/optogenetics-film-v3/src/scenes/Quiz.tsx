// Quiz (18–22 s): "where would you find such a switch?" Three cards pop in on the beat, a 3-2-1 countdown, then
// the green alga lights up and the next scene opens out of its card.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {FPS, QUIZ_CARDS, COUNTDOWN, REVEAL} from '../timeline';
import {seg, easeOut, springAt, clamp, rng, TAU, lerp} from '../lib/math';
import {C} from '../art/neuron';
import {drawField, FIELD_CAM, FIELD_ZOOM} from '../art/field';
import {SANS, MONO} from '../lib/fonts';
import {rgba} from '../ui/Text';

export const CARD_Y = 1060, CARD_X = [212, 476, 740], CARD_W = 248, CARD_H = 430;

function drawQuiz(g: Gfx, t: number) {
  g.begin([3, 6, 13]);
  g.camera(FIELD_CAM[0], FIELD_CAM[1], FIELD_ZOOM * 0.96);
  drawField(g, t, {a: 0.28, dim: 0.6});
  g.screen();
  // the answer bursts out of card C
  const age = t - REVEAL;
  if (age >= 0 && age < 1) {
    const R = rng(5);
    for (let i = 0; i < 40; i++) {
      const a = R() * TAU, sp = 300 + R() * 700, x = CARD_X[2] + Math.cos(a) * sp * easeOut(age), y = CARD_Y + Math.sin(a) * sp * easeOut(age);
      g.glow(x, y, 6 + R() * 8, C.green, (1 - age), 'glow');
    }
    g.glowArc(CARD_X[2], CARD_Y, 140 + age * 700, C.green, (1 - age) * 0.7, 3);
    g.glow(CARD_X[2], CARD_Y, 360, C.green, (1 - age) * 0.5, 'halo');
  }
  g.apply();
  g.bloom(0.6);
  g.vignette(0.6);
  g.glitch(1 - seg(t, 18, 18.2), Math.round(t * FPS) + 3);
  g.grain(Math.round(t * FPS), 0.12);
}

// ---- line-art icons, animated by t ----
const stroke = {fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
const Firefly: React.FC<{t: number; dim: number}> = ({t, dim}) => {
  const glow = 0.55 + 0.45 * Math.sin(t * 7) ** 2, ink = `rgba(200,225,255,${0.9 * dim})`;
  return (
    <g>
      <ellipse cx={18} cy={34} rx={34} ry={22} fill={`rgba(220,255,120,${0.35 * glow * dim})`} style={{filter: 'blur(6px)'}} />
      <ellipse cx={18} cy={30} rx={24} ry={15} fill={`rgba(230,255,140,${0.9 * glow * dim})`} />
      <ellipse cx={-14} cy={4} rx={36} ry={18} stroke={ink} strokeWidth={4} {...stroke} />
      <circle cx={-52} cy={-6} r={13} stroke={ink} strokeWidth={4} {...stroke} />
      <path d="M -60 -16 Q -74 -44 -88 -50 M -52 -18 Q -58 -48 -66 -60" stroke={ink} strokeWidth={3} {...stroke} />
      <ellipse cx={-4} cy={-22} rx={30} ry={12} transform={`rotate(${-24 + Math.sin(t * 40) * 8} -4 -22)`} stroke={ink} strokeWidth={3} {...stroke} />
      <ellipse cx={14} cy={-18} rx={28} ry={11} transform={`rotate(${-8 + Math.sin(t * 40 + 1) * 8} 14 -18)`} stroke={ink} strokeWidth={3} {...stroke} />
    </g>
  );
};
const Jelly: React.FC<{t: number; dim: number}> = ({t, dim}) => {
  const ink = `rgba(200,225,255,${0.9 * dim})`, pulse = 1 + 0.06 * Math.sin(t * 4);
  return (
    <g>
      <path d={`M -58 0 Q -58 ${-62 * pulse} 0 ${-64 * pulse} Q 58 ${-62 * pulse} 58 0 Q 30 -12 0 -10 Q -30 -12 -58 0 Z`} stroke={ink} strokeWidth={4} fill={`rgba(120,255,170,${0.12 * dim})`} {...{strokeLinejoin: 'round'}} />
      <circle cx={0} cy={-30} r={12} stroke={`rgba(120,255,170,${0.8 * dim})`} strokeWidth={3} fill="none" />
      {[-40, -18, 4, 26, 46].map((x, i) => {
        const pts = Array.from({length: 9}, (_, j) => `${(x + Math.sin(t * 3 + j * 0.8 + i) * 8 * (j / 8)).toFixed(1)},${(j * 11).toFixed(1)}`).join(' ');
        return <polyline key={i} points={pts} stroke={ink} strokeWidth={3} {...stroke} />;
      })}
    </g>
  );
};
export const AlgaIcon: React.FC<{t: number; dim: number; lit?: number}> = ({t, dim, lit = 0}) => {
  const ink = `rgba(${Math.round(lerp(200, 140, lit))},${Math.round(lerp(225, 255, lit))},${Math.round(lerp(255, 150, lit))},${0.95 * dim})`, beat = Math.sin(t * 9);
  return (
    <g>
      <ellipse cx={0} cy={16} rx={52} ry={62} stroke={ink} strokeWidth={4} fill={`rgba(90,200,110,${(0.12 + 0.25 * lit) * dim})`} />
      <path d="M -38 40 Q -40 -10 0 -24 Q 40 -10 38 40" stroke={`rgba(120,222,130,${0.85 * dim})`} strokeWidth={7} {...stroke} />
      <circle cx={30} cy={-8} r={8} fill={`rgba(255,96,80,${dim})`} />
      <path d={`M -6 -44 Q ${-30 - beat * 14} -80 ${-56 - beat * 18} -96`} stroke={ink} strokeWidth={3} {...stroke} />
      <path d={`M 6 -44 Q ${30 + beat * 14} -80 ${56 + beat * 18} -96`} stroke={ink} strokeWidth={3} {...stroke} />
    </g>
  );
};

const LABELS = ['萤火虫', '水母', '绿藻'], LETTERS = ['A', 'B', 'C'];
export const Quiz: React.FC<{t: number}> = ({t}) => {
  const reveal = clamp((t - REVEAL) / 0.25), tag = springAt(t - 18.25, {freq: 2.2, damp: 0.4});
  const cd = COUNTDOWN.findIndex((c, i) => t >= c && t < (COUNTDOWN[i + 1] ?? REVEAL));
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawQuiz} />
      {/* 猜一猜 stamp */}
      <div style={{position: 'absolute', left: 72, top: 650, transform: `scale(${tag}) rotate(-6deg)`, transformOrigin: '0% 50%', opacity: clamp(tag * 2) * (1 - reveal * 0.6),
        padding: '10px 26px', borderRadius: 40, background: rgba('sun', 0.16), border: `3px solid ${rgba('sun')}`, fontFamily: SANS, fontWeight: 900, fontSize: 44, color: rgba('sun'),
        boxShadow: `0 0 30px ${rgba('sun', 0.4)}`, letterSpacing: 4}}>猜一猜 ↓</div>
      {CARD_X.map((x, i) => {
        const k = springAt(t - QUIZ_CARDS[i], {freq: 2.0, damp: 0.42}), right = i === 2;
        const sc = (0.6 + 0.4 * k) * (right ? 1 + 0.08 * easeOut(reveal) : 1 - 0.06 * reveal), dim = right ? 1 : 1 - 0.65 * reveal;
        const border = right && reveal > 0 ? rgba('green', 0.4 + 0.6 * reveal) : 'rgba(150,190,230,0.35)';
        return (
          <div key={i} style={{position: 'absolute', left: x - CARD_W / 2, top: CARD_Y - CARD_H / 2, width: CARD_W, height: CARD_H, borderRadius: 30, opacity: clamp(k * 3) * dim,
            transform: `translateY(${(1 - k) * 80}px) scale(${sc}) rotate(${(1 - k) * (i - 1) * 6}deg)`, background: right && reveal > 0 ? `rgba(20,52,34,${0.5 + 0.3 * reveal})` : 'rgba(14,24,40,0.78)',
            border: `3px solid ${border}`, boxShadow: right && reveal > 0 ? `0 0 ${50 * reveal}px ${rgba('green', 0.6)}` : '0 20px 50px rgba(0,0,0,0.5)'}}>
            <div style={{position: 'absolute', left: 18, top: 18, width: 58, height: 58, borderRadius: 29, background: right && reveal > 0 ? rgba('green') : 'rgba(150,190,230,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 32, color: right && reveal > 0 ? '#06210f' : '#dbe8f4'}}>{LETTERS[i]}</div>
            <svg width={CARD_W} height={260} viewBox={`${-CARD_W / 2 / 1.35} ${-130 / 1.35} ${CARD_W / 1.35} ${260 / 1.35}`} style={{position: 'absolute', left: 0, top: 74}}>
              {i === 0 ? <Firefly t={t} dim={1} /> : i === 1 ? <Jelly t={t} dim={1} /> : <AlgaIcon t={t} dim={1} lit={reveal} />}
            </svg>
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', fontFamily: SANS, fontWeight: 900, fontSize: 46, color: right && reveal > 0 ? rgba('green') : '#eef5fb'}}>{LABELS[i]}</div>
            {right && reveal > 0 && (
              <svg width={80} height={80} viewBox="0 0 80 80" style={{position: 'absolute', right: 14, top: 14}}>
                <circle cx={40} cy={40} r={34} fill={rgba('green')} opacity={reveal} />
                <path d="M 24 41 L 36 53 L 58 28" stroke="#06210f" strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={60} strokeDashoffset={60 * (1 - clamp((t - REVEAL - 0.08) / 0.2))} />
              </svg>
            )}
          </div>
        );
      })}
      {/* countdown ring */}
      {cd >= 0 && (() => {
        const c0 = COUNTDOWN[cd], k = seg(t, c0, c0 + 0.5), pop = springAt(t - c0, {freq: 3, damp: 0.4});
        return (
          <div style={{position: 'absolute', left: 476 - 80, top: 1330, width: 160, height: 160}}>
            <svg width={160} height={160} viewBox="-80 -80 160 160">
              <circle r={64} stroke="rgba(150,170,190,0.25)" strokeWidth={8} fill="rgba(8,14,24,0.7)" />
              <circle r={64} stroke={rgba('sun')} strokeWidth={8} fill="none" strokeDasharray={2 * Math.PI * 64} strokeDashoffset={2 * Math.PI * 64 * k} transform="rotate(-90)" strokeLinecap="round" />
            </svg>
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 84, color: '#fff4d6',
              transform: `scale(${0.6 + 0.4 * pop})`, textShadow: `0 0 20px ${rgba('sun', 0.7)}`}}>{3 - cd}</div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};
