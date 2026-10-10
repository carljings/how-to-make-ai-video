// Text.tsx: the on-screen story text from timeline.ts: kicker, headline (keywords pop into their colour), sub-line.
import React from 'react';
import {TEXTS, RGB, DUR, type Cue, type Key} from '../timeline';
import {clamp, seg, springAt, easeOut} from '../lib/math';
import {SANS, SERIF, MONO} from '../lib/fonts';

export const X0 = 72, KICKER_Y = 292, LINE0_Y = 392, LINE_H = 110, MAX_W = 936;
export const rgba = (k: Key | readonly number[], a = 1) => `rgba(${(typeof k === 'string' ? RGB[k] : k).join(',')},${a})`;
const GOLD = [236, 200, 120] as const;

// Split "灯一**亮**，它就**跑**" into characters, each flagged as keyword or not
const chars = (line: string) => {
  const out: {ch: string; key: boolean}[] = [];
  line.split('**').forEach((part, j) => { for (const ch of part) out.push({ch, key: j % 2 === 1}); });
  return out;
};
const plain = (c: Cue) => c.lines.map((l) => l.replace(/\*\*/g, ''));

// Headline size: as large as possible up to `base`, so the longest line fits MAX_W
const fit = (lines: string[], base: number) => Math.min(base, ...lines.map((l) => MAX_W / Math.max(1, [...l.replace(/\*\*/g, '')].length)));

const Kicker: React.FC<{cue: Cue; t: number; a: number; y: number; prev?: Cue}> = ({cue, t, a, y, prev}) => {
  if (!cue.kicker) return null;
  // a kicker that carries on from the previous block stays put instead of entering again
  const same = (prev?.kicker === cue.kicker && prev.b === cue.a) || cue.a === 0;
  const gold = cue.kicker.startsWith('2026'), col = gold ? rgba(GOLD) : rgba(cue.key), k = same ? 1 : easeOut(seg(t, cue.a, cue.a + 0.35));
  return (
    <div style={{position: 'absolute', left: X0, top: y - 22, height: 44, display: 'flex', alignItems: 'center', gap: 14, opacity: a * k, transform: `translateX(${(1 - k) * -24}px)`}}>
      <div style={{width: 6, height: 30, background: col, boxShadow: `0 0 14px ${col}`}} />
      <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: col, whiteSpace: 'nowrap'}}>{cue.kicker}</div>
    </div>
  );
};

const Sub: React.FC<{cue: Cue; t: number; a: number; y: number; size?: number}> = ({cue, t, a, y, size = 34}) => {
  if (!cue.sub) return null;
  const at = cue.subAt ?? cue.a + 0.3, k = easeOut(seg(t, at, at + 0.4));
  const latin = /^[\x20-\x7e·]+$/.test(cue.sub);
  return (
    <div style={{position: 'absolute', left: X0, top: y, maxWidth: MAX_W, fontFamily: latin ? MONO : SANS, fontWeight: 400, fontSize: size, lineHeight: 1.35,
      color: '#b4c4d2', letterSpacing: latin ? 2 : 0.5, opacity: a * k, transform: `translateY(${(1 - k) * 14}px)`, whiteSpace: 'nowrap'}}>{cue.sub}</div>
  );
};

// One character of a headline. `pop` is the keyword emphasis (0..1 envelope), `inK` the entrance (0..1).
const Glyph: React.FC<{ch: string; key_: boolean; col: Key; inK: number; pop: number; colorK: number; size: number; flip?: number; glitch?: number}> = ({ch, key_, col, inK, pop, colorK, size, flip = 0, glitch = 0}) => {
  const c = RGB[col], mix = key_ ? colorK : 0, rgb = [0, 1, 2].map((i) => Math.round(244 + (c[i] - 244) * mix));
  const glow = key_ && colorK > 0 ? `0 0 ${18 + 20 * pop}px ${rgba(col, 0.55 * colorK + 0.3 * pop)}` : '0 2px 10px rgba(0,0,0,0.6)';
  const split = glitch > 0.01 ? `, ${-6 * glitch}px 0 0 rgba(255,40,60,${0.8 * glitch}), ${6 * glitch}px 0 0 rgba(40,230,255,${0.8 * glitch})` : '';
  return (
    <span style={{display: 'inline-block', width: /[\x20-\x7e]/.test(ch) ? undefined : size, textAlign: 'center', color: `rgb(${rgb.join(',')})`, textShadow: glow + split,
      opacity: clamp(inK * 1.4), transform: `translateY(${(1 - inK) * 44}px) scale(${(0.9 + 0.1 * inK) * (1 + 0.16 * pop)}) rotateX(${flip}deg)`, transformOrigin: '50% 60%'}}>{ch}</span>
  );
};

// Keyword underline that wipes in from the left when the keyword turns colour
const Bar: React.FC<{col: Key; k: number; size: number}> = ({col, k, size}) => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: size * 0.02, height: size * 0.09, background: rgba(col, 0.9), boxShadow: `0 0 16px ${rgba(col, 0.8)}`,
    transform: `scaleX(${k})`, transformOrigin: '0 50%', borderRadius: 4}} />
);

function Headline({cue, t, a, prev, glitch}: {cue: Cue; t: number; a: number; prev?: Cue; glitch: number}) {
  const size = fit(cue.lines, 92), flipGroup = cue.style === 'flip' && prev?.group === cue.group;
  // the opening block is fully formed on frame 0 (keywords already lit); later blocks colour their keywords as they land
  const at = cue.a === 0 ? -0.2 : cue.a + 0.22, colorK = seg(t, at, at + 0.2), pop = Math.exp(-Math.max(0, t - at) / 0.18) * (t >= at ? 1 : 0);
  let n = 0;
  return (
    <>
      {cue.lines.map((line, li) => {
        const cs = chars(line), old = flipGroup && prev ? chars(prev.lines[li] ?? '') : null;
        // group the characters into runs so each keyword can carry its underline
        const runs: {key: boolean; items: {ch: string; i: number}[]}[] = [];
        cs.forEach(({ch, key}, i) => {
          if (!runs.length || runs[runs.length - 1].key !== key) runs.push({key, items: []});
          runs[runs.length - 1].items.push({ch, i});
        });
        let changed = 0;
        return (
          <div key={li} style={{position: 'absolute', left: X0, top: LINE0_Y + li * LINE_H - size * 0.62, height: size * 1.25, whiteSpace: 'nowrap',
            fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: `${size * 1.25}px`, letterSpacing: 0, perspective: 600, opacity: a}}>
            {runs.map((r, ri) => (
              <span key={ri} style={{position: 'relative', display: 'inline-block'}}>
                {r.items.map(({ch, i}) => {
                  const idx = n++;
                  if (old) {
                    // split-flap: unchanged characters stay put; changed ones flip over, one after another
                    const was = old[i]?.ch;
                    if (was === ch) return <Glyph key={i} ch={ch} key_={r.key} col={cue.key} inK={1} pop={r.key ? pop : 0} colorK={r.key ? colorK : 0} size={size} glitch={glitch} />;
                    const tau = t - cue.a - 0.06 * changed++;
                    const first = tau < 0.09;
                    return <Glyph key={i} ch={first ? was ?? ch : ch} key_={first ? !!old[i]?.key : r.key} col={first && prev ? prev.key : cue.key} inK={1} pop={r.key && !first ? pop : 0}
                      colorK={first ? 1 : r.key ? colorK : 0} size={size} flip={first ? (tau / 0.09) * 90 : Math.max(0, 1 - (tau - 0.09) / 0.12) * -90} glitch={glitch} />;
                  }
                  const inK = cue.a === 0 ? 1 : springAt(t - cue.a - idx * 0.03, {freq: 2.4, damp: 0.55});
                  return <Glyph key={i} ch={ch} key_={r.key} col={cue.key} inK={inK} pop={r.key ? pop : 0} colorK={r.key ? colorK : 0} size={size} glitch={glitch} />;
                })}
                {r.key && <Bar col={cue.key} k={easeOut(seg(t, at, at + 0.35))} size={size} />}
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
}

// The big title lockup (6–10 s and 60–64 s): line 1 normal, line 2 huge with a light sweep across it
function Title({cue, t, a}: {cue: Cue; t: number; a: number}) {
  const [l1, l2] = cue.lines, big = l2.replace(/\*\*/g, '').length <= 3, size2 = big ? 230 : fit([l2], 132), k2 = springAt(t - cue.a - 0.15, {freq: 1.6, damp: 0.5});
  const sweep = ((t - cue.a - 0.5) % 2.0) / 2.0, col = RGB[cue.key];
  const c1 = chars(l1);
  const parts = chars(l2);
  return (
    <>
      <div style={{position: 'absolute', left: X0, top: LINE0_Y - 52, fontFamily: SANS, fontWeight: 900, fontSize: 84, lineHeight: '104px', whiteSpace: 'nowrap', opacity: a}}>
        {c1.map(({ch}, i) => <Glyph key={i} ch={ch} key_={false} col={cue.key} inK={springAt(t - cue.a - i * 0.035, {freq: 2.4, damp: 0.55})} pop={0} colorK={0} size={84} />)}
      </div>
      <div style={{position: 'absolute', left: X0 - (big ? 10 : 0), top: LINE0_Y + 66, whiteSpace: 'nowrap', fontFamily: SERIF, fontWeight: 900, fontSize: size2, lineHeight: `${size2 * 1.12}px`,
        opacity: a * clamp(k2 * 2), transform: `scale(${1.25 - 0.25 * k2})`, transformOrigin: '0% 50%'}}>
        {parts.map(({ch, key}, i) => (
          <span key={i} style={key ? {
            backgroundImage: `linear-gradient(100deg, rgb(${col.join(',')}) 0%, rgb(${col.join(',')}) ${sweep * 140 - 30}%, #ffffff ${sweep * 140 - 12}%, rgb(${col.join(',')}) ${sweep * 140 + 6}%, rgb(${col.join(',')}) 100%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: `drop-shadow(0 0 ${big ? 26 : 18}px ${rgba(cue.key, 0.75)})`,
          } : {color: '#f4f8ff'}}>{ch}</span>
        ))}
      </div>
    </>
  );
}

export const TextTrack: React.FC<{t: number; glitch?: number}> = ({t, glitch = 0}) => {
  const i = TEXTS.findIndex((x) => t >= x.a && t < x.b), cue = TEXTS[i < 0 ? TEXTS.length - 1 : i], prev = TEXTS[(i < 0 ? TEXTS.length - 1 : i) - 1], next = TEXTS[i + 1];
  // fade out at the end of a block unless the next block continues the same flip group
  const leaving = next && !(next.style === 'flip' && next.group === cue.group && cue.group) ? 1 - seg(t, cue.b - 0.14, cue.b) : 1;
  const a = cue.b >= DUR ? 1 : leaving, dy = (1 - a) * -18;
  const lines = cue.lines.length, subY = cue.style === 'title' ? LINE0_Y + 66 + (cue.lines[1].replace(/\*\*/g, '').length <= 3 ? 270 : 160) : LINE0_Y + (lines - 1) * LINE_H + 70;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 170, height: 560, background: 'linear-gradient(180deg, rgba(2,4,9,0) 0%, rgba(2,4,9,0.55) 22%, rgba(2,4,9,0.45) 70%, rgba(2,4,9,0) 100%)'}} />
      <Kicker cue={cue} t={t} a={next?.kicker === cue.kicker ? 1 : a} y={KICKER_Y} prev={prev} />
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`}}>
        {cue.style === 'title' ? <Title cue={cue} t={t} a={a} /> : <Headline cue={cue} t={t} a={a} prev={prev} glitch={glitch} />}
        <Sub cue={cue} t={t} a={a} y={subY} />
      </div>
    </div>
  );
};
export {plain};
