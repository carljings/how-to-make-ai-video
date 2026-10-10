// End (64–70 s): the neuron from the title fires again under the title lockup; then the closing debate:
// a two-sided question with a personal stake, and an honest note on where the science actually is.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {FPS, BEAT, END_FIRE, CTA, pulse} from '../timeline';
import {springAt, clamp} from '../lib/math';
import {C, HERO, drawNeuron, drawSpike, fiber} from '../art/neuron';
import {drawDepth} from '../art/field';
import {SANS, MONO} from '../lib/fonts';
import {rgba} from '../ui/Text';

const NX = 470, NY = 900, NS = 0.62;
function drawEnd(g: Gfx, t: number) {
  g.begin([3, 6, 13]);
  drawDepth(g, t, 0.1, 0.8);
  const f = pulse(t, END_FIRE, 0.3);
  fiber(g, NX, 690, NY - 64, C.blue, f, [NX, NY - 10], 40);
  drawNeuron(g, HERO, NX, NY, NS, {soma: 0.15 + f * 0.85});
  for (const p of END_FIRE) {
    const k = (t - p) / 0.8;
    if (k > 0 && k < 1) g.glowArc(NX, NY, 24 + k * 260, C.blue, (1 - k) * 0.7, 2.4);
    drawSpike(g, HERO, NX, NY, NS, (t - p - 0.05) / 0.6, C.blue, 1);
  }
  g.bloom(0.75);
  g.vignette(0.6);
  g.grain(Math.round(t * FPS), 0.12);
}

const Bubble: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <path d="M 6 8 H 34 A 4 4 0 0 1 38 12 V 26 A 4 4 0 0 1 34 30 H 18 L 10 37 V 30 H 6 A 4 4 0 0 1 2 26 V 12 A 4 4 0 0 1 6 8 Z" fill={color} />
    {[12, 20, 28].map((x) => <circle key={x} cx={x} cy={19} r={2.6} fill="#06121f" />)}
  </svg>
);

export const End: React.FC<{t: number}> = ({t}) => {
  const k = springAt(t - CTA.at, {freq: 1.8, damp: 0.6});
  // once both answers are up, the highlight swings between them on the beat, like a live poll
  const swing = t > CTA.at + 1.4 ? Math.floor((t - CTA.at - 1.4) / (BEAT * 2)) % 2 : -1;
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawEnd} />
      {k > 0.001 && (
        <div style={{position: 'absolute', left: 72, top: 1030, width: 830, padding: '28px 34px 32px', borderRadius: 30, background: 'rgba(10,20,36,0.88)',
          border: `2px solid ${rgba('blue', 0.55)}`, boxShadow: `0 0 50px ${rgba('blue', 0.25)}, 0 30px 60px rgba(0,0,0,0.5)`, opacity: clamp(k * 2), transform: `translateY(${(1 - k) * 140}px)`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14}}>
            <div style={{transform: `scale(${1 + 0.12 * Math.max(0, Math.sin((t - CTA.at) * Math.PI * 2))})`}}><Bubble size={44} color={rgba('blue')} /></div>
            <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 32, color: rgba('blue'), letterSpacing: 3}}>{CTA.call}</div>
          </div>
          {CTA.question.map((line, i) => (
            <div key={i} style={{fontFamily: SANS, fontWeight: 900, fontSize: 52, lineHeight: '70px', color: '#f4f8ff', whiteSpace: 'nowrap'}}>{line}</div>
          ))}
          <div style={{fontFamily: SANS, fontSize: 24, color: 'rgba(176,192,208,0.85)', marginTop: 6, letterSpacing: 1}}>{CTA.note}</div>
          <div style={{display: 'flex', gap: 22, marginTop: 22}}>
            {CTA.options.map((o, i) => {
              const p = springAt(t - CTA.at - 0.5 - i * BEAT, {freq: 2.6, damp: 0.45}), col = i === 0 ? 'blue' : 'amber', hot = swing === i;
              return (
                <div key={o} style={{flex: 1, height: 96, borderRadius: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
                  border: `3px solid ${rgba(col, hot ? 1 : 0.7)}`, background: rgba(col, hot ? 0.28 : 0.12), boxShadow: hot ? `0 0 34px ${rgba(col, 0.55)}` : undefined,
                  transform: `scale(${p * (hot ? 1.04 : 1)})`, opacity: clamp(p * 2)}}>
                  <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 36, color: rgba(col)}}>{i === 0 ? 'A' : 'B'}</span>
                  <span style={{fontFamily: SANS, fontWeight: 900, fontSize: 44, color: '#f4f8ff'}}>{o}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
