// Overlay.tsx: everything Remotion lays over the Seedance footage. Big text at the top (kicker + one or two lines,
// keywords in gold), labels placed in the picture, the laureates' name cards, the closing poll, subtitles and the
// progress bar. Text sits on soft dark gradients so it reads over bright footage; all of it reads timeline.ts.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {HEADS, CAPTIONS, CHAPTERS, MONEY, PILLS, LAUREATES, FINE, TAGS, WORLD, CTA, type Head} from '../timeline';
import {SANS, MONO} from '../lib/fonts';
import {clamp, seg, easeOut, springAt} from '../lib/math';

const GOLD = '#FFD54A', INK = 'rgba(16,10,6,0.92)';
const SAFE_W = 940, HEAD_Y = 360;
const ems = (s: string) => [...s.replace(/\*\*/g, '')].reduce((n, c) => n + (/[\x20-\x7e]/.test(c) ? 0.6 : 1), 0);
const parts = (line: string) => line.split('**').flatMap((p, j) => [...p].map((ch) => ({ch, key: j % 2 === 1})));
const stroke = (px: number) => ({WebkitTextStroke: `${px}px ${INK}`, paintOrder: 'stroke fill' as const});

// soft gradients behind the text areas
export const Shades: React.FC<{t: number}> = ({t}) => {
  const top = HEADS.some((h) => t >= h.a - 0.2 && t < h.b + 0.2) ? 1 : 0;
  return (
    <>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(12,8,24,0.66) 0%, rgba(12,8,24,0.38) 21%, rgba(12,8,24,0) 37%)', opacity: top}} />
      <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(12,8,24,0.62) 0%, rgba(12,8,24,0.4) 22%, rgba(12,8,24,0) 40%)'}} />
    </>
  );
};

const Kicker: React.FC<{text: string; k: number}> = ({text, k}) => (
  <div style={{position: 'absolute', top: 272, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: k, transform: `translateY(${(1 - k) * -14}px)`}}>
    <div style={{height: 54, padding: '0 26px', borderRadius: 27, display: 'flex', alignItems: 'center', gap: 12, fontFamily: SANS, fontWeight: 900, fontSize: 29, letterSpacing: 2,
      color: GOLD, background: 'rgba(20,12,4,0.55)', border: `3px solid ${GOLD}`, boxShadow: '0 4px 18px rgba(0,0,0,0.35)'}}>
      <div style={{width: 13, height: 13, borderRadius: 7, background: '#FF5A4A'}} />{text}
    </div>
  </div>
);

const Line: React.FC<{text: string; t: number; at: number; y: number; size: number; out: number}> = ({text, t, at, y, size, out}) => (
  <div style={{position: 'absolute', top: y, left: 0, right: 0, display: 'flex', justifyContent: 'center', fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: 1.15,
    whiteSpace: 'nowrap', opacity: 1 - out, transform: `translateY(${-out * 24}px)`}}>
    {parts(text).map((p, i) => {
      const k = springAt(t - at - i * 0.025, {freq: 2.6, damp: 0.52});
      return (
        <span key={i} style={{display: 'inline-block', color: p.key ? GOLD : '#fff', ...stroke(size * 0.11), opacity: clamp((t - at - i * 0.025) * 9),
          transform: `translateY(${(1 - k) * 36}px) scale(${0.86 + 0.14 * k})`, textShadow: `0 6px 18px rgba(0,0,0,0.45)${p.key ? ', 0 0 26px rgba(255,200,60,0.45)' : ''}`}}>
          {p.ch === ' ' ? ' ' : p.ch}
        </span>
      );
    })}
  </div>
);

export const Headline: React.FC<{t: number}> = ({t}) => {
  const active = HEADS.filter((h) => t >= h.a - 1e-4 && t < h.b + 0.15);
  const cur = HEADS.find((h) => t >= h.a && t < h.b);
  // the kicker stays put across consecutive heads that share it
  let kickAt = -1;
  if (cur?.kicker) {
    let j = HEADS.indexOf(cur);
    while (j > 0 && HEADS[j - 1].kicker === cur.kicker && cur.a - HEADS[j - 1].b < 0.3) j--;
    kickAt = HEADS[j].a === 0 ? -1 : HEADS[j].a;
  }
  return (
    <>
      {cur?.kicker && <Kicker text={cur.kicker} k={kickAt < 0 ? 1 : easeOut(seg(t, kickAt, kickAt + 0.3))} />}
      {active.map((h: Head, idx) => {
        const out = clamp((t - h.b) / 0.15);
        const size = h.size ?? Math.min(h.lines.length > 1 ? 104 : 116, ...h.lines.map((l) => SAFE_W / ems(l)));
        return (
          <React.Fragment key={idx}>
            {h.lines.map((l, i) => {
              const at = h.a === 0 ? -1 : h.at?.[i] ?? h.a + 0.06 + i * 0.22;
              return t < at ? null : <Line key={i} text={l} t={t} at={at} y={HEAD_Y + i * size * 1.18} size={size} out={out} />;
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ---- labels in the picture ----
const Sticker: React.FC<{x: number; y: number; k: number; rot?: number; bg: string; color?: string; size?: number; children: React.ReactNode}> = ({x, y, k, rot = 0, bg, color = '#fff', size = 52, children}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${0.4 + 0.6 * k})`, opacity: clamp(k * 2)}}>
    <div style={{padding: `${size * 0.22}px ${size * 0.5}px`, borderRadius: size * 0.6, background: bg, color, fontFamily: SANS, fontWeight: 900, fontSize: size, whiteSpace: 'nowrap',
      border: `5px solid ${INK}`, boxShadow: `6px 8px 0 ${INK}, 0 10px 30px rgba(0,0,0,0.35)`}}>{children}</div>
  </div>
);

export const Labels: React.FC<{t: number}> = ({t}) => {
  const fade = (a: number, b: number) => (t < a || t > b + 0.25 ? 0 : springAt(t - a, {freq: 2.4, damp: 0.5}) * (1 - clamp((t - b) / 0.25)));
  const flipK = clamp((t - TAGS.flip) / 0.25);
  return (
    <>
      {t < MONEY.b + 0.3 && <Sticker x={790} y={800 + Math.sin(t * 5) * 8} k={MONEY.a === 0 && t < 0.5 ? 1 : fade(MONEY.a, MONEY.b)} rot={-8} bg={GOLD} color="#5A2E00" size={70}>+¥1000</Sticker>}
      <Sticker x={PILLS.once[0]} y={PILLS.once[1]} k={fade(PILLS.a, PILLS.b)} rot={-5} bg="#FF8A3D">只发一次</Sticker>
      <Sticker x={PILLS.monthly[0]} y={PILLS.monthly[1]} k={fade(PILLS.monthlyAt - 1.6, PILLS.b)} rot={5} bg="#20B79F">每月都有</Sticker>
      {t >= TAGS.a && t < TAGS.b + 0.3 && (
        <Sticker x={540} y={1200} k={fade(TAGS.a, TAGS.b)} bg="#fff" color="#222" size={64}>
          <span>{TAGS.from}</span><span style={{margin: '0 18px'}}>→</span>
          <span style={{color: '#E5322B', display: 'inline-block', transform: `scale(${1 + 0.25 * Math.max(0, 1 - Math.abs(t - TAGS.flip - 0.12) / 0.2)})`, opacity: flipK}}>{TAGS.to}</span>
        </Sticker>
      )}
      {t >= WORLD.a && t < WORLD.b + 0.3 && <Sticker x={540} y={712} k={fade(WORLD.a, WORLD.b)} bg="rgba(20,12,4,0.78)" color={GOLD} size={38}>{WORLD.text}</Sticker>}
      {t >= FINE.a && t < FINE.b + 0.3 && (
        <div style={{position: 'absolute', top: 640, left: 0, right: 0, textAlign: 'center', fontFamily: MONO, fontSize: 24, color: 'rgba(255,255,255,0.9)', ...stroke(5),
          opacity: fade(FINE.a, FINE.b)}}>{FINE.text}</div>
      )}
    </>
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

// ---- the closing poll, on the empty desk at the lower left ----
export const Poll: React.FC<{t: number}> = ({t}) => {
  if (t < CTA.a) return null;
  const k = (i: number) => springAt(t - CTA.a - i * 0.15, {freq: 2.4, damp: 0.45});
  const hi = Math.floor((t - CTA.a) / 0.5) % 2;
  return (
    <div style={{position: 'absolute', left: 64, top: 1010}}>
      {CTA.options.map((o, i) => (
        <div key={o} style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, transform: `scale(${(0.5 + 0.5 * k(i)) * (hi === i ? 1.06 : 1)})`, transformOrigin: '0 50%', opacity: clamp(k(i) * 2)}}>
          <div style={{width: 74, height: 74, borderRadius: 37, background: '#fff', border: `5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: MONO, fontWeight: 700, fontSize: 40, color: '#222'}}>{i ? 'B' : 'A'}</div>
          <div style={{padding: '14px 28px', borderRadius: 40, background: i ? '#FF8A3D' : '#20B79F', border: `5px solid ${INK}`, boxShadow: `6px 7px 0 ${INK}`,
            fontFamily: SANS, fontWeight: 900, fontSize: 44, color: '#fff', ...stroke(3)}}>{o}</div>
        </div>
      ))}
      <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 40, color: GOLD, ...stroke(8), opacity: clamp((t - CTA.a - 0.5) * 3), marginTop: 6}}>{CTA.call}</div>
    </div>
  );
};

// ---- subtitles ----
export const Captions: React.FC<{t: number}> = ({t}) => {
  if (t >= CTA.a) return null; // the closing poll says the same words, in its own place
  const live = CAPTIONS.filter((c) => t >= c.a && t < c.b);
  const c = live[live.length - 1];
  if (!c) return null;
  const k = springAt(t - c.a, {freq: 3.2, damp: 0.6});
  return (
    <div style={{position: 'absolute', top: 1300, left: 40, right: 40, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 54, lineHeight: 1.2, color: '#fff', whiteSpace: 'nowrap', ...stroke(10), letterSpacing: 1,
        transform: `scale(${0.92 + 0.08 * k})`, opacity: clamp((t - c.a) * 14)}}>{c.text}</div>
    </div>
  );
};

// ---- progress: four segments across the top, one per clip ----
export const Progress: React.FC<{t: number}> = ({t}) => {
  const x0 = 150, w = 780, gap = 14, segW = (w - gap * 3) / 4;
  return (
    <div style={{position: 'absolute', top: 228, left: x0, width: w, height: 9}}>
      {CHAPTERS.map(([a, b], i) => (
        <div key={i} style={{position: 'absolute', left: i * (segW + gap), width: segW, height: 9, borderRadius: 5, overflow: 'hidden', background: 'rgba(255,255,255,0.28)'}}>
          <div style={{width: `${clamp((t - a) / (b - a)) * 100}%`, height: '100%', background: GOLD}} />
        </div>
      ))}
    </div>
  );
};
