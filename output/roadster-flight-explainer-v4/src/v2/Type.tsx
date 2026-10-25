// Type.tsx: all words on screen. One family at three weights (300 slate / 600 captions / 900 titles); no boxes.
// At most one slate, one caption and one label are visible at a time. The hook and the end card mirror each other:
// giant 没有翅膀 (the question) ... giant 一口气 (the answer).
import React from 'react';
import {BEAT, CUES, H, LINES, OFrame, PALETTE, SANS, W, clamp, display, ease, line, ramp, toneColor} from './data';

const SHADOW = '0 2px 18px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.7)';
const base: React.CSSProperties = {position: 'absolute', fontFamily: SANS, color: PALETTE.white, whiteSpace: 'pre', fontKerning: 'normal'};

// --------------------------------------------------------------------------------------------- slate (top left)
export const Slate: React.FC<{t: number}> = ({t}) => {
  const s = CUES.slates.find((x) => t >= x.start && t < x.end);
  if (!s) return null;
  const end = CUES.duration_s;
  const lv = Math.min(ramp(t, s.start, s.start + 0.25), 1 - ramp(t, Math.min(s.end, end) - 0.12, Math.min(s.end, end))) *
    (1 - ramp(t, BEAT.fade_out, BEAT.fade_out + 0.6));
  const op = s.start === 0 ? 1 : lv;
  return (
    <div style={{...base, left: 64, top: 196, display: 'flex', alignItems: 'center', gap: 16, opacity: 0.72 * op}}>
      <div style={{width: 30, height: 2, background: PALETTE.white, opacity: 0.8}} />
      <div style={{fontWeight: 300, fontSize: 27, letterSpacing: '0.12em', textShadow: SHADOW}}>{s.text}</div>
    </div>
  );
};

// --------------------------------------------------------------------------------------------- hook (teaser)
export const Hook: React.FC<{t: number}> = ({t}) => {
  const h = CUES.titles.hook;
  if (t >= h.out + 0.12) return null;
  const settle = ease(t / 0.6);
  const out = ramp(t, h.out - 0.02, h.out + 0.1);
  const small = ramp(t, h.small_at, h.small_at + 0.28);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: 1 - out}}>
      <div style={{...base, left: 0, width: W, top: 1150, textAlign: 'center', fontWeight: 900, fontSize: 196, lineHeight: 1,
        letterSpacing: '0.02em', textShadow: '0 4px 40px rgba(0,0,0,0.75)', transform: `scale(${1.05 - 0.05 * settle + 0.03 * out})`,
        transformOrigin: '50% 50%'}}>{h.big}</div>
      <div style={{...base, left: 0, width: W, top: 1388, textAlign: 'center', fontWeight: 600, fontSize: 58, letterSpacing: '0.08em',
        textShadow: SHADOW, opacity: small, transform: `translateY(${(1 - small) * 16}px)`}}>{h.small}</div>
    </div>
  );
};

// --------------------------------------------------------------------------------------------- 停 (freeze stamp)
export const Stop: React.FC<{t: number}> = ({t}) => {
  const l = line('L2a');
  const p = l.phrases[0];
  if (t < p.start_s - 0.01 || t > p.end_s + 0.2) return null;
  const k = ease((t - p.start_s) / 0.12);
  const lv = Math.min(k, 1 - ramp(t, p.end_s - 0.05, p.end_s + 0.18));
  const split = 7 * Math.exp(-Math.max(0, t - p.start_s) * 9);
  const glyph = (color: string, dx: number, op: number, blend: React.CSSProperties['mixBlendMode']) => (
    <div style={{...base, left: 0, width: W, top: 300, textAlign: 'center', fontWeight: 900, fontSize: 230, lineHeight: 1, color,
      opacity: op, mixBlendMode: blend, transform: `translateX(${dx}px) scale(${1.25 - 0.25 * k})`, transformOrigin: '50% 50%',
      textShadow: color === PALETTE.white ? '0 6px 50px rgba(0,0,0,0.6)' : 'none'}}>停</div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity: lv}}>
      {glyph(PALETTE.force, -split, 0.8 * clamp(split / 3), 'screen')}
      {glyph(PALETTE.gas, split, 0.8 * clamp(split / 3), 'screen')}
      {glyph(PALETTE.white, 0, 1, 'normal')}
    </div>
  );
};

// --------------------------------------------------------------------------------------------- captions
const CAPTION_LINES = ['L2b', 'L3', 'L4', 'L5'];
export const Captions: React.FC<{t: number}> = ({t}) => {
  for (const id of CAPTION_LINES) {
    const l = line(id);
    for (const p of l.phrases) {
      const a = p.start_s - 0.06, b = p.end_s;
      if (t < a || t >= b) continue;
      const k = ease((t - a) / 0.2);
      const out = ramp(t, b - 0.14, b);
      return (
        <div style={{...base, left: 0, width: W, top: 1296, textAlign: 'center', fontWeight: 600, fontSize: 62, lineHeight: 1.2,
          letterSpacing: '0.06em', color: toneColor(p.tone), textShadow: SHADOW, opacity: k * (1 - out),
          transform: `translateY(${(1 - k) * 14}px)`}}>{display(p.text)}</div>
      );
    }
  }
  return null;
};

// --------------------------------------------------------------------------------------------- labels
export const Labels: React.FC<{o: OFrame}> = ({o}) => {
  const out: React.ReactNode[] = [];
  if (o.c && o.c[2] > 0.01) {
    out.push(
      <div key="com" style={{...base, left: o.c[0] + 30, top: o.c[1] - 64, fontWeight: 600, fontSize: 36, letterSpacing: '0.1em',
        textShadow: SHADOW, opacity: o.c[2]}}>{CUES.labels.com}</div>,
    );
  }
  if (o.vl && o.vl[2] > 0.01) {
    const [ax, ay, lv] = o.vl;
    const lx = clamp(ax + 120, 64, W - 64 - 400), ly = clamp(ay - 230, 280, 1080);
    out.push(
      <svg key="vl-line" width={W} height={H} style={{position: 'absolute', inset: 0, opacity: lv}}>
        <polyline points={`${ax},${ay} ${lx - 14},${ly + 46} ${lx - 4},${ly + 46}`} fill="none" stroke="#FFFFFF" strokeWidth={1.8} opacity={0.75} />
        <circle cx={ax} cy={ay} r={5} fill="#FFFFFF" />
      </svg>,
      <div key="vl" style={{...base, left: lx, top: ly, opacity: lv}}>
        <div style={{fontWeight: 600, fontSize: 38, letterSpacing: '0.06em', textShadow: SHADOW}}>{CUES.labels.vessel[0]}</div>
        <div style={{fontWeight: 300, fontSize: 27, letterSpacing: '0.1em', opacity: 0.78, marginTop: 6, textShadow: SHADOW}}>{CUES.labels.vessel[1]}</div>
      </div>,
    );
  }
  return <>{out}</>;
};

// --------------------------------------------------------------------------------------------- end card
// Three tiers in the black sky above the cloud: L6 small line, the giant 一口气, then L7 as the kicker.
export const EndCard: React.FC<{t: number}> = ({t}) => {
  const e = CUES.titles.end;
  if (t < e.small_at - 0.1) return null;
  const l6 = line('L6'), l7 = line('L7');
  const fade = 1 - ramp(t, BEAT.fade_out + 0.15, CUES.duration_s - 0.05);
  const s = ease((t - e.small_at) / 0.35);
  const big = ease((t - e.big_at) / 0.5);
  const kicker = l7.phrases.map((p) => ease((t - p.start_s + 0.04) / 0.3));
  const glow = 0.55 * big;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{...base, left: 0, width: W, top: 330, textAlign: 'center', fontWeight: 600, fontSize: 56, letterSpacing: '0.1em',
        textShadow: SHADOW, opacity: s, transform: `translateY(${(1 - s) * 14}px)`}}>{display(l6.phrases[0].text)}</div>
      <div style={{...base, left: 0, width: W, top: 418, textAlign: 'center', fontWeight: 900, fontSize: 250, lineHeight: 1,
        letterSpacing: '0.04em', opacity: big, transform: `scale(${1.08 - 0.08 * big})`, transformOrigin: '50% 50%',
        textShadow: `0 0 60px rgba(154,220,255,${glow}), 0 6px 40px rgba(0,0,0,0.7)`}}>{e.big}</div>
      <div style={{...base, left: 0, width: W, top: 720, textAlign: 'center', fontWeight: 600, fontSize: 52, letterSpacing: '0.08em',
        textShadow: SHADOW}}>
        {l7.phrases.map((p, i) => (
          <span key={i} style={{opacity: kicker[i] * 0.92, display: 'inline-block', transform: `translateY(${(1 - kicker[i]) * 10}px)`}}>
            {display(p.text)}{i < l7.phrases.length - 1 ? '，' : ''}
          </span>
        ))}
      </div>
    </div>
  );
};

export const lineCount = LINES.length;
