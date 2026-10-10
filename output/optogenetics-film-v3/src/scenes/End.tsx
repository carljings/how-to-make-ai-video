// End (60–64 s): the neuron from the title fires again under the title lockup; then the closing question,
// a real discussion prompt with a few concrete answers to pick from.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {FPS, BEAT, END_FIRE, CTA, pulse} from '../timeline';
import {springAt, clamp} from '../lib/math';
import {C, HERO, drawNeuron, drawSpike, fiber} from '../art/neuron';
import {drawDepth} from '../art/field';
import {SANS} from '../lib/fonts';
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
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawEnd} />
      {k > 0.001 && (
        <div style={{position: 'absolute', left: 72, top: 1080, width: 830, padding: '30px 34px 34px', borderRadius: 30, background: 'rgba(10,20,36,0.86)',
          border: `2px solid ${rgba('blue', 0.55)}`, boxShadow: `0 0 50px ${rgba('blue', 0.25)}, 0 30px 60px rgba(0,0,0,0.5)`, opacity: clamp(k * 2), transform: `translateY(${(1 - k) * 140}px)`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16}}>
            <div style={{transform: `scale(${1 + 0.12 * Math.max(0, Math.sin((t - CTA.at) * Math.PI * 2))})`}}><Bubble size={46} color={rgba('blue')} /></div>
            <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 34, color: rgba('blue'), letterSpacing: 3}}>{CTA.call}</div>
          </div>
          {CTA.question.map((line, i) => (
            <div key={i} style={{fontFamily: SANS, fontWeight: 900, fontSize: 54, lineHeight: '72px', color: '#f4f8ff', whiteSpace: 'nowrap'}}>{line}</div>
          ))}
          <div style={{display: 'flex', gap: 18, marginTop: 22}}>
            {CTA.chips.map((c, i) => {
              const p = springAt(t - CTA.at - 0.5 - i * BEAT, {freq: 2.6, damp: 0.45});
              return (
                <div key={c} style={{padding: '10px 28px', borderRadius: 34, border: `2px solid ${rgba('ice', 0.7)}`, background: rgba('blue', 0.12), fontFamily: SANS, fontWeight: 700, fontSize: 38,
                  color: '#e6f3ff', transform: `scale(${p})`, opacity: clamp(p * 2)}}>{c}</div>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
