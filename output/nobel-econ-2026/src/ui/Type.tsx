// Type.tsx: everything written on screen. The text beats (kicker + one or two big lines, keywords in the accent colour)
// and the four-chapter progress bar. There is no narration, so the beats carry the story. All read timeline.ts.
import React from 'react';
import {BEATS, CHAPTERS, DUR, YELLOW_SCENES, sceneAt} from '../timeline';
import {C} from '../lib/palette';
import {SANS} from '../lib/fonts';
import {clamp, seg, easeOut, springAt} from '../lib/math';

export const KICKER_Y = 300, HEAD_Y = 352, LINE_H = 128, SAFE_W = 920;

const parts = (line: string) => {
  const out: {ch: string; key: boolean}[] = [];
  line.split('**').forEach((p, j) => { for (const ch of p) out.push({ch, key: j % 2 === 1}); });
  return out;
};
// width of a line in ems: CJK characters are 1 em, Latin letters, digits and spaces about 0.6
const ems = (line: string) => [...line.replace(/\*\*/g, '')].reduce((s, c) => s + (/[\x20-\x7e]/.test(c) ? 0.6 : 1), 0);
const isYellow = (t: number) => YELLOW_SCENES.includes(sceneAt(t).id);

const Kicker: React.FC<{text: string; k: number; yellow: boolean}> = ({text, k, yellow}) => (
  <div style={{position: 'absolute', top: KICKER_Y - 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: k, transform: `translateY(${(1 - k) * -16}px)`}}>
    <div style={{height: 56, padding: '0 26px', borderRadius: 28, display: 'flex', alignItems: 'center', gap: 12, fontFamily: SANS, fontWeight: 900, fontSize: 30, letterSpacing: 2,
      background: yellow ? C.ink : 'rgba(246,196,69,0.12)', color: yellow ? C.yellow : C.gold, border: yellow ? 'none' : `3px solid ${C.gold}`}}>
      <div style={{width: 14, height: 14, borderRadius: 7, background: yellow ? C.red : C.gold}} />{text}
    </div>
  </div>
);

const HeadLine: React.FC<{text: string; t: number; at: number; y: number; size: number; yellow: boolean; out: number}> = ({text, t, at, y, size, yellow, out}) => {
  const ps = parts(text);
  const base = yellow ? C.ink : C.cream, accent = yellow ? C.red : C.gold;
  return (
    <div style={{position: 'absolute', top: y, left: 0, right: 0, display: 'flex', justifyContent: 'center', fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: 1.12,
      whiteSpace: 'nowrap', opacity: 1 - out, transform: `translateY(${-out * 30}px)`}}>
      {ps.map((p, i) => {
        const k = springAt(t - at - i * 0.028, {freq: 2.6, damp: 0.5});
        const pop = p.key ? Math.max(0, 1 - Math.abs(t - at - 0.35 - i * 0.028) / 0.25) : 0;
        return (
          <span key={i} style={{display: 'inline-block', position: 'relative', color: p.key ? accent : base, opacity: clamp((t - at - i * 0.028) * 8),
            transform: `translateY(${(1 - k) * 40}px) scale(${(0.85 + 0.15 * k) * (1 + 0.12 * pop)})`,
            textShadow: yellow ? '0 5px 0 rgba(255,255,255,0.55)' : `0 6px 0 ${C.navyLo}, 0 0 ${p.key ? 30 : 0}px rgba(246,196,69,0.35)`}}>
            {p.ch === ' ' ? ' ' : p.ch}
            {p.key && <span style={{position: 'absolute', left: '-2%', right: '-2%', bottom: size * 0.06, height: size * 0.24, borderRadius: size * 0.05, background: yellow ? '#fff' : 'rgba(246,196,69,0.28)', opacity: yellow ? 0.8 : 1,
              transform: `scaleX(${easeOut(seg(t, at + 0.25, at + 0.55))})`, transformOrigin: '0 50%', zIndex: -1}} />}
          </span>
        );
      })}
    </div>
  );
};

export const Headline: React.FC<{t: number}> = ({t}) => {
  const yellow = isYellow(t);
  // the current beat, plus the previous one while it leaves (0.15 s)
  const active = BEATS.map((b, i) => ({b, i})).filter(({b}) => t >= b.a - 1e-4 && t < b.b + 0.15);
  // the kicker stays put across consecutive beats that share it, and only enters with the first of them
  const cur = BEATS.find((b) => t >= b.a && t < b.b) ?? active[active.length - 1]?.b;
  let kickAt = -1;
  if (cur?.kicker) {
    let j = BEATS.indexOf(cur);
    while (j > 0 && BEATS[j - 1].kicker === cur.kicker && cur.a - BEATS[j - 1].b < 0.6) j--;
    kickAt = BEATS[j].a === 0 ? -1 : BEATS[j].a;
  }
  const kOut = cur && t >= cur.b ? clamp((t - cur.b) / 0.15) : 0;
  return (
    <>
      {cur?.kicker && <Kicker text={cur.kicker} k={(kickAt < 0 ? 1 : easeOut(seg(t, kickAt, kickAt + 0.3))) * (1 - kOut)} yellow={yellow} />}
      {active.map(({b, i}) => {
        const out = clamp((t - b.b) / 0.15);
        const size = Math.min(b.lines.length > 1 ? 112 : 120, ...b.lines.map((l) => SAFE_W / ems(l)));
        return (
          <React.Fragment key={i}>
            {b.lines.map((l, k) => {
              const at = b.a === 0 ? -1 : b.a + 0.06 + k * 0.2;
              if (t < at) return null;
              return <HeadLine key={k} text={l} t={t} at={at} y={HEAD_Y + k * LINE_H * (size / 112)} size={size} yellow={yellow} out={out} />;
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ---- progress: four chapters across the top ----
export const Progress: React.FC<{t: number}> = ({t}) => {
  const yellow = isYellow(t), x0 = 150, w = 780, gap = 14, segW = (w - gap * 3) / 4;
  const ends = [...CHAPTERS.slice(1).map(([a]) => a), DUR];
  return (
    <div style={{position: 'absolute', top: 236, left: x0, width: w, height: 10}}>
      {CHAPTERS.map(([a, name], i) => {
        const fill = clamp((t - a) / (ends[i] - a)), on = t >= a && t < ends[i];
        return (
          <div key={name} style={{position: 'absolute', left: i * (segW + gap), width: segW, height: 10, borderRadius: 5, overflow: 'hidden',
            background: yellow ? 'rgba(22,24,31,0.18)' : 'rgba(255,246,229,0.16)'}}>
            <div style={{width: `${fill * 100}%`, height: '100%', background: yellow ? C.ink : on ? C.gold : 'rgba(246,196,69,0.75)'}} />
          </div>
        );
      })}
    </div>
  );
};
