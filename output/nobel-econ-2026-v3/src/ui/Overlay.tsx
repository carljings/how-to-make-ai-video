// Overlay.tsx: everything Remotion lays over the Seedance footage. Big text at the top (kicker + one or two lines,
// keywords in the head's key colour), the "三天前" stamp, the laureates' name cards, the bank chief's speech bubble, the
// closing poll, subtitles, the fable label and the progress bar. All of it reads timeline.ts.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {HEADS, CAPTIONS, CHAPTERS, STAMP, LAUREATES, BUBBLE, FABLE, POLL, DUR, type Head, type Tone} from '../timeline';
import {SANS, MONO} from '../lib/fonts';
import {clamp, seg, easeIn, easeOut, springAt} from '../lib/math';

const GOLD = '#FFD54A', RED = '#FF5A4A', GREEN = '#7CE495', INK = 'rgba(16,10,6,0.92)';
const KEY: Record<Tone, string> = {bad: RED, gold: GOLD, good: GREEN};
const SAFE_W = 940, HEAD_Y = 360;
const ems = (s: string) => [...s.replace(/\*\*/g, '')].reduce((n, c) => n + (/[\x20-\x7e]/.test(c) ? 0.6 : 1), 0);
const parts = (line: string) => line.split('**').flatMap((p, j) => [...p].map((ch) => ({ch, key: j % 2 === 1})));
const stroke = (px: number) => ({WebkitTextStroke: `${px}px ${INK}`, paintOrder: 'stroke fill' as const});
const live = (t: number, a: number, b: number) => t >= a && t < b;

// soft gradients behind the text areas
export const Shades: React.FC<{t: number}> = ({t}) => {
  const top = HEADS.some((h) => (h.y ?? HEAD_Y) < 500 && t >= h.a - 0.2 && t < h.b + 0.2) || live(t, LAUREATES.a, LAUREATES.b + 0.2) || t >= POLL.a - 0.2 ? 1 : 0;
  return (
    <>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(12,8,24,0.66) 0%, rgba(12,8,24,0.38) 21%, rgba(12,8,24,0) 37%)', opacity: top}} />
      <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(12,8,24,0.62) 0%, rgba(12,8,24,0.4) 22%, rgba(12,8,24,0) 40%)'}} />
    </>
  );
};

const Kicker: React.FC<{text: string; k: number; color?: string; top?: number}> = ({text, k, color = GOLD, top = 272}) => (
  <div style={{position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: k, transform: `translateY(${(1 - k) * -14}px)`}}>
    <div style={{height: 54, padding: '0 26px', borderRadius: 27, display: 'flex', alignItems: 'center', gap: 12, fontFamily: SANS, fontWeight: 900, fontSize: 29, letterSpacing: 2,
      color, background: 'rgba(20,12,4,0.55)', border: `3px solid ${color}`, boxShadow: '0 4px 18px rgba(0,0,0,0.35)'}}>
      <div style={{width: 13, height: 13, borderRadius: 7, background: RED}} />{text}
    </div>
  </div>
);

// a domino falling flat: upright (−90°) to lying down, with a small bounce where it lands
const fall = (s: number) => (s <= 0 ? 0 : s < 0.22 ? easeIn(s / 0.22) : 1 + 0.07 * Math.exp(-(s - 0.22) * 12) * Math.sin((s - 0.22) * 38));

const Line: React.FC<{text: string; t: number; at: number; y: number; size: number; out: number; key_: string; tip?: boolean; rumor?: boolean}> = ({text, t, at, y, size, out, key_, tip, rumor}) => {
  const k = tip ? fall(t - at) : 1;
  return (
    <div style={{position: 'absolute', top: y, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - out, transform: `translateY(${-out * 24}px)`}}>
      <div style={{display: 'inline-block', fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: 1.15, whiteSpace: 'nowrap',
        transformOrigin: '0% 100%', transform: tip ? `rotate(${-(1 - k) * 90}deg)` : undefined}}>
        {parts(text).map((p, i) => {
          const s = springAt(t - at - i * 0.025, {freq: 2.6, damp: 0.52});
          const jitter = rumor ? Math.sin(t * 31 + i * 1.7) * 2.2 : 0;   // a whisper shivers
          return (
            <span key={i} style={{display: 'inline-block', color: p.key ? key_ : rumor ? '#E4ECFF' : '#fff', ...stroke(size * 0.11),
              opacity: tip ? 1 : clamp((t - at - i * 0.025) * 9),
              transform: tip ? undefined : `translate(${jitter}px, ${(1 - s) * 36}px) scale(${0.86 + 0.14 * s})`,
              textShadow: `0 6px 18px rgba(0,0,0,0.45)${p.key ? `, 0 0 26px ${key_}66` : ''}`}}>
              {p.ch === ' ' ? ' ' : p.ch}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const Headline: React.FC<{t: number}> = ({t}) => {
  const active = HEADS.filter((h) => t >= h.a - 1e-4 && t < h.b + 0.15);
  const cur = HEADS.find((h) => live(t, h.a, h.b));
  return (
    <>
      {cur?.kicker && <Kicker text={cur.kicker} k={cur.a === 0 ? 1 : easeOut(seg(t, cur.a, cur.a + 0.3))} color={cur.tone === 'bad' ? '#FFB3A8' : GOLD} top={(cur.y ?? HEAD_Y) - 88} />}
      {active.map((h: Head, idx) => {
        const out = clamp((t - h.b) / 0.15);
        const size = h.size ?? Math.min(h.lines.length > 1 ? 104 : 116, ...h.lines.map((l) => SAFE_W / ems(l)));
        return (
          <React.Fragment key={idx}>
            {h.lines.map((l, i) => {
              const at = h.a === 0 ? -1 : h.at?.[i] ?? h.a + 0.06 + i * 0.22;
              return t < at ? null : <Line key={i} text={l} t={t} at={at} y={(h.y ?? HEAD_Y) + i * size * 1.18} size={size} out={out} key_={KEY[h.tone ?? 'gold']} tip={h.tip} rumor={h.rumor} />;
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ---- "三天前": a rubber stamp slammed down on the cut ----
export const Stamp: React.FC<{t: number}> = ({t}) => {
  if (!live(t, STAMP.a, STAMP.b + 0.2)) return null;
  const s = t - STAMP.a, slam = s < 0.12 ? 2.1 - 1.1 * easeIn(s / 0.12) : 1 + 0.05 * Math.exp(-(s - 0.12) * 10) * Math.cos((s - 0.12) * 30);
  const out = clamp((t - STAMP.b) / 0.2);
  return (
    <div style={{position: 'absolute', left: 540, top: 470, transform: `translate(-50%, -50%) rotate(-9deg) scale(${slam})`, opacity: clamp(s * 14) * (1 - out)}}>
      <div style={{padding: '6px 40px 12px', border: `9px solid ${RED}`, borderRadius: 18, color: RED, fontFamily: SANS, fontWeight: 900, fontSize: 132, letterSpacing: 10,
        background: 'rgba(255,248,236,0.86)', boxShadow: '0 12px 30px rgba(0,0,0,0.35)', lineHeight: 1.1}}>{STAMP.text}</div>
    </div>
  );
};

// ---- the laureates: silhouettes, not likenesses ----
const Card: React.FC<{x: number; k: number; zh: string; en: string; school: string; from: number}> = ({x, k, zh, en, school, from}) => (
  <div style={{position: 'absolute', left: x, top: 356, width: 450, height: 172, transform: `translateX(${(1 - k) * from * 500}px)`, opacity: clamp(k * 1.5),
    borderRadius: 26, background: 'rgba(24,16,8,0.72)', border: `3px solid ${GOLD}`, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px'}}>
    <svg width={96} height={96} viewBox="-50 -50 100 100" style={{flex: 'none'}}>
      <circle r={48} fill="rgba(255,213,74,0.18)" stroke={GOLD} strokeWidth={3} />
      <circle cy={-12} r={20} fill={GOLD} opacity={0.85} /><path d="M -36 40 Q -36 6 0 6 Q 36 6 36 40 Z" fill={GOLD} opacity={0.85} />
    </svg>
    <div style={{fontFamily: SANS, lineHeight: 1.25}}>
      <div style={{fontWeight: 900, fontSize: zh.length > 6 ? 34 : 40, color: '#fff'}}>{zh}</div>
      <div style={{fontFamily: MONO, fontSize: 21, color: 'rgba(255,255,255,0.75)'}}>{en}</div>
      <div style={{fontWeight: 900, fontSize: 28, color: GOLD}}>{school}</div>
    </div>
  </div>
);
export const Laureates: React.FC<{t: number}> = ({t}) => {
  if (t < LAUREATES.a - 0.1 || t > LAUREATES.b + 0.3) return null;
  const out = clamp((t - LAUREATES.b) / 0.25);
  const k1 = springAt(t - LAUREATES.a, {freq: 2, damp: 0.6}), k2 = springAt(t - LAUREATES.a - 0.12, {freq: 2, damp: 0.6});
  return (
    <div style={{opacity: 1 - out}}>
      <Kicker text="2026诺贝尔经济学奖 · 获奖者" k={clamp(k1 * 2)} />
      <Card x={60} k={k1} zh="罗伯特·霍尔" en="Robert E. Hall" school="斯坦福大学" from={-1} />
      <Card x={570} k={k2} zh="迈克尔·伍德福德" en="Michael Woodford" school="哥伦比亚大学" from={1} />
      <div style={{position: 'absolute', top: 552, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 30, color: '#fff', ...stroke(7),
        opacity: clamp((t - LAUREATES.a - 0.4) * 3)}}>{LAUREATES.reason}</div>
    </div>
  );
};

// ---- the bank chief speaks: a speech bubble under his mouth in the close-up ----
export const Bubble: React.FC<{t: number}> = ({t}) => {
  if (!live(t, BUBBLE.a, BUBBLE.b + 0.2)) return null;
  const k = springAt(t - BUBBLE.a, {freq: 2.6, damp: 0.42}), out = clamp((t - BUBBLE.b) / 0.2);
  return (
    <div style={{position: 'absolute', left: 540, top: 1360, transform: `translate(-50%, -50%) scale(${(0.3 + 0.7 * k) * (1 - 0.2 * out)})`, opacity: clamp(k * 2) * (1 - out)}}>
      <div style={{position: 'relative', padding: '22px 46px', borderRadius: 60, background: '#fff', border: `6px solid ${INK}`, boxShadow: `8px 10px 0 ${INK}`,
        fontFamily: SANS, fontWeight: 900, fontSize: 76, color: '#1B1B1B', whiteSpace: 'nowrap'}}>
        {BUBBLE.text}
        <svg width={90} height={70} viewBox="0 0 90 70" style={{position: 'absolute', left: '50%', top: -62, marginLeft: -20}}>
          <path d="M 4 70 L 40 4 L 70 70 Z" fill="#fff" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <rect x={0} y={68} width={78} height={10} fill="#fff" />
        </svg>
      </div>
    </div>
  );
};

// ---- the closing poll: the question at the top, A/B buttons under the chef's face ----
export const Poll: React.FC<{t: number}> = ({t}) => {
  if (t < POLL.a) return null;
  const k = (i: number) => springAt(t - POLL.a - 0.35 - i * 0.15, {freq: 2.4, damp: 0.45});
  const hi = Math.floor((t - POLL.a) / 0.5) % 2;
  const size = Math.min(92, SAFE_W / ems(POLL.title[0]));
  return (
    <>
      {POLL.title.map((l, i) => <Line key={l} text={l} t={t} at={POLL.a + i * 0.25} y={310 + i * size * 1.18} size={size} out={0} key_={GOLD} />)}
      <div style={{position: 'absolute', top: 1310, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 36}}>
        {POLL.options.map((o, i) => (
          <div key={o} style={{display: 'flex', alignItems: 'center', gap: 14, padding: '14px 30px 14px 16px', borderRadius: 50, background: i ? '#FF8A3D' : '#20B79F',
            border: `5px solid ${INK}`, boxShadow: `6px 7px 0 ${INK}`, transform: `scale(${(0.5 + 0.5 * k(i)) * (hi === i ? 1.06 : 1)})`, opacity: clamp(k(i) * 2)}}>
            <div style={{width: 70, height: 70, borderRadius: 35, background: '#fff', border: `5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: MONO, fontWeight: 700, fontSize: 40, color: '#222'}}>{i ? 'B' : 'A'}</div>
            <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 52, color: '#fff', ...stroke(4)}}>{o}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', top: 1450, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontWeight: 900, fontSize: 46, color: GOLD, ...stroke(9),
        opacity: clamp((t - POLL.a - 0.8) * 3)}}>{POLL.call}</div>
    </>
  );
};

// ---- subtitles (they step aside when the same words are already on screen) ----
export const Captions: React.FC<{t: number}> = ({t}) => {
  if (t >= POLL.a || live(t, BUBBLE.a, BUBBLE.b) || HEADS.some((h) => h.quiet && live(t, h.a, h.b))) return null;
  const on = CAPTIONS.filter((c) => t >= c.a && t < c.b);
  const c = on[on.length - 1];
  // a line that began under a quiet head was already on screen there: don't show it again as the head leaves
  if (!c || HEADS.some((h) => h.quiet && c.a >= h.a - 0.15 && c.a < h.b)) return null;
  const k = springAt(t - c.a, {freq: 3.2, damp: 0.6});
  return (
    <div style={{position: 'absolute', top: 1300, left: 40, right: 40, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 54, lineHeight: 1.2, color: '#fff', whiteSpace: 'nowrap', ...stroke(10), letterSpacing: 1,
        transform: `scale(${0.92 + 0.08 * k})`, opacity: clamp((t - c.a) * 14)}}>{c.text}</div>
    </div>
  );
};

// ---- progress: one segment per clip, as long as the clip; the fable label sits under it ----
export const Progress: React.FC<{t: number}> = ({t}) => {
  const x0 = 150, w = 780, gap = 14, room = w - gap * (CHAPTERS.length - 1);
  let x = x0;
  return (
    <>
      {CHAPTERS.map(([a, b], i) => {
        const sw = room * (b - a) / DUR, left = x; x += sw + gap;
        return (
          <div key={i} style={{position: 'absolute', top: 212, left, width: sw, height: 9, borderRadius: 5, overflow: 'hidden', background: 'rgba(255,255,255,0.28)'}}>
            <div style={{width: `${clamp((t - a) / (b - a)) * 100}%`, height: '100%', background: GOLD}} />
          </div>
        );
      })}
      <div style={{position: 'absolute', top: 230, left: x0, fontFamily: SANS, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.8)', ...stroke(4)}}>{FABLE}</div>
    </>
  );
};
