// Type.tsx: every word on screen. One family, five real weights: 300 slate / 500 labels / 600 captions /
// 700 end card / 900 titles and kinetic. No boxes. At most one slate, one caption (or kinetic / end card) and one
// label at a time. Colours follow the picture: gold = borrowed air, ice blue = carried gas, red = push, white = rest.
import React from 'react';
import {A, CUES, H, LINES, OFrame, PAL, SANS, W, back, clamp, display, ease, line, ramp, toneColor, win} from './data';

const SHADOW = '0 2px 18px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.7)';
// captions can cross the lit car or concrete: a wider dark halo (still no box)
const CAPTION_SHADOW = '0 0 26px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.8)';
const base: React.CSSProperties = {position: 'absolute', fontFamily: SANS, color: PAL.white, whiteSpace: 'pre', fontKerning: 'normal'};
const END = CUES.duration_s;
const fadeAll = (t: number) => 1 - ramp(t, A.fade_out, END - 0.05);

// --------------------------------------------------------------------------------------------- slate (top left)
export const Slate: React.FC<{t: number}> = ({t}) => {
  const s = CUES.slates.find((x) => t >= x.start && t < x.end);
  if (!s) return null;
  const lv = s.start === 0 ? 1 : Math.min(ramp(t, s.start, s.start + 0.25), 1 - ramp(t, s.end - 0.1, s.end));
  return (
    <div style={{...base, left: 64, top: 196, display: 'flex', alignItems: 'center', gap: 16, opacity: 0.74 * lv * fadeAll(t)}}>
      <div style={{width: 30, height: 2, background: PAL.white, opacity: 0.8}} />
      <div style={{fontWeight: 300, fontSize: 26, letterSpacing: '0.12em', textShadow: SHADOW}}>{s.text}</div>
    </div>
  );
};

// --------------------------------------------------------------------------------------------- hook (frame 0)
export const HOOK_TOP = 1110;
export const HookTitle: React.FC<{t: number; still?: boolean}> = ({t, still}) => {
  const h = CUES.titles.hook;
  if (!still && t >= h.out + 0.12) return null;
  const settle = still ? 1 : ease(t / 0.7);
  const out = still ? 0 : ramp(t, h.out - 0.04, h.out + 0.1);
  const small = still ? 1 : ramp(t, A.hook_small, A.hook_small + 0.3);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      {/* soft scrim under the words (no box): keeps white legible where the lit wall passes behind */}
      <div style={{position: 'absolute', left: -120, top: HOOK_TOP - 170, width: W + 240, height: 640,
        background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0) 100%)'}} />
      <div style={{...base, left: 0, width: W, top: HOOK_TOP, textAlign: 'center', fontWeight: 900, fontSize: 206, lineHeight: 1,
        letterSpacing: '0.03em', textShadow: '0 6px 46px rgba(0,0,0,0.8)', transform: `scale(${1.06 - 0.06 * settle + 0.03 * out})`,
        transformOrigin: '50% 50%'}}>{h.big}</div>
      <div style={{...base, left: 0, width: W, top: HOOK_TOP + 246, textAlign: 'center', fontWeight: 600, fontSize: 60,
        letterSpacing: '0.08em', textShadow: SHADOW, opacity: small, transform: `translateY(${(1 - small) * 16}px)`}}>{h.small}</div>
    </div>
  );
};

// --------------------------------------------------------------------------------------------- captions
const CAPTION_LINES = LINES.filter((l) => l.display === 'caption').map((l) => l.id);
export const Captions: React.FC<{t: number}> = ({t}) => {
  for (const id of CAPTION_LINES) {
    for (const p of line(id).phrases) {
      const a = p.start_s - 0.06, b = p.end_s;
      if (t < a || t >= b) continue;
      const k = ease((t - a) / 0.2), out = ramp(t, b - 0.14, b);
      return (
        <div style={{...base, left: 0, width: W, top: id === 'L14' ? 1640 : 1292, textAlign: 'center', fontWeight: 600, fontSize: 60, lineHeight: 1.2,
          letterSpacing: '0.06em', color: toneColor(p.tone), textShadow: CAPTION_SHADOW, opacity: k * (1 - out) * fadeAll(t),
          transform: `translateY(${(1 - k) * 14}px)`}}>{display(p.text)}</div>
      );
    }
  }
  return null;
};

// --------------------------------------------------------------------------------------------- 吸 -> 压 (L04)
const KX = 285, KY = 985, KS = 270;     // the open black side of the P1 cross-section, clear of the car
export const Kinetic: React.FC<{t: number}> = ({t}) => {
  const kin = CUES.titles.kinetic;
  const xiOn = A.xi_on, yaOn = A.ya_on, end = line('L04').end_s + 0.3;
  if (t < xiOn - 0.05 || t > end + 0.3) return null;
  const xiIn = back((t - xiOn) / 0.28, 1.2), slashAt = line('L04').phrases[1].start_s;
  const slash = ease((t - slashAt) / 0.18);
  const xiOut = ramp(t, yaOn - 0.3, yaOn + 0.05);
  const yaK = (t - yaOn) / 0.22, ya = clamp(yaK * 4);
  const yaScale = t < yaOn ? 1.4 : 1.4 - 0.4 * back(yaK, 2.2);
  const outAll = 1 - ramp(t, end, end + 0.25);
  const glyph: React.CSSProperties = {...base, left: KX - KS / 2, top: KY - KS / 2, width: KS, height: KS, fontWeight: 900,
    fontSize: KS, lineHeight: 1, textAlign: 'center'};
  return (
    <div style={{position: 'absolute', inset: 0, opacity: outAll}}>
      {t < yaOn + 0.05 && (
        <div style={{opacity: (1 - xiOut) * clamp(xiIn * 1.5)}}>
          <div style={{...glyph, transform: `scale(${0.85 + 0.15 * xiIn})`, textShadow: '0 8px 50px rgba(0,0,0,0.7)'}}>{kin.xi}</div>
          {slash > 0 && (
            <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
              <line x1={KX - 150} y1={KY + 120} x2={KX - 150 + 300 * slash} y2={KY + 120 - 240 * slash} stroke={PAL.force}
                strokeWidth={16} strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}
      {t >= yaOn && (
        <div style={{...glyph, color: PAL.force, opacity: ya, transform: `scale(${yaScale})`,
          textShadow: `0 0 60px rgba(255,74,31,${0.45 * ya}), 0 8px 40px rgba(0,0,0,0.7)`}}>{kin.ya}</div>
      )}
    </div>
  );
};

// --------------------------------------------------------------------------------------------- labels
const Leader: React.FC<{x0: number; y0: number; x1: number; y1: number; lv: number}> = ({x0, y0, x1, y1, lv}) => (
  <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: lv}}>
    <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={PAL.white} strokeWidth={1.4} opacity={0.75} />
    <circle cx={x0} cy={y0} r={3.5} fill={PAL.white} />
  </svg>
);
const Label: React.FC<{x: number; y: number; text: string; sub?: string; lv: number; align?: 'left' | 'right'}> = ({x, y, text, sub, lv, align = 'left'}) => (
  <div style={{...base, left: align === 'left' ? x : x - 420, width: align === 'left' ? undefined : 420, top: y, opacity: lv,
    textAlign: align}}>
    <div style={{fontWeight: 500, fontSize: 34, letterSpacing: '0.08em', textShadow: SHADOW}}>{text}</div>
    {sub && <div style={{fontWeight: 300, fontSize: 26, letterSpacing: '0.1em', opacity: 0.8, marginTop: 4, textShadow: SHADOW}}>{sub}</div>}
  </div>
);

const avg = (pts: number[][]) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
export const Labels: React.FC<{o: OFrame; t: number}> = ({o, t}) => {
  const L = CUES.labels, out: React.ReactNode[] = [];
  // 重力: at the gravity arrow tip in the first cross-section; once more on the strobe plate
  const g = o.grav as number[] | undefined;
  const gLv = o.s === 'press_a' ? win(t, A.grav_on + 0.15, A.grav_on + 0.45, 7.35, 7.6) : 0;
  if (g && gLv > 0.01) out.push(<Label key="g" x={g[2] + 22} y={g[3] - 22} text={L.gravity} lv={gLv * (g[4] as number)} />);
  if (o.s === 'chrono' && o.ghosts?.length) {
    const lv = win(t, A.grav_ghosts + 0.2, A.grav_ghosts + 0.5, A.grav_ghosts + 1.9, A.grav_ghosts + 2.3);
    const gg = o.ghosts[0].grav as number[] | null | undefined;
    if (gg && lv > 0.01) out.push(<Label key="gg" x={gg[2] + 18} y={gg[3] - 18} text={L.gravity} lv={lv} />);
  }
  // 风扇抽气 · 示意: on the open side (left), led to the nearer intake marker
  if (o.fan?.length) {
    const f = o.fan.reduce((a, b) => (b[0] < a[0] ? b : a));
    if (f[2] > 0.01) {
      const lx = 80, ly = clamp(f[1] - 150, 330, 1150);
      out.push(<Leader key="fl" x0={f[0]} y0={f[1]} x1={lx + 160} y1={ly + 22} lv={f[2]} />,
        <Label key="f" x={lx} y={ly} text={L.fan[0]} sub={L.fan[1]} lv={f[2]} />);
    }
  }
  // 低压 beside the lens, on the open side (left of the lens centre)
  if (o.gap && o.gap.label > 0.01) {
    const [cx, cy] = avg(o.gap.pts);
    const lx = clamp(cx - 360, 80, W - 300), ly = clamp(cy - 150, 330, 1150);
    out.push(<Leader key="ll" x0={cx} y0={cy} x1={lx + 80} y1={ly + 44} lv={o.gap.label} />,
      <Label key="l" x={lx} y={ly} text={L.low} lv={o.gap.label} />);
  }
  // 重心 (K2)
  if (o.com && o.com[2] > 0.01) out.push(<Label key="c" x={o.com[0] + 32} y={o.com[1] - 70} text={L.com} lv={o.com[2]} />);
  // pressure-vessel callout (x-ray)
  if (o.vl && o.vl[2] > 0.01) {
    const [ax, ay, lv] = o.vl, lx = clamp(ax + 110, 70, W - 70 - 420), ly = clamp(ay - 260, 300, 1100);
    out.push(<Leader key="vll" x0={ax} y0={ay} x1={lx - 8} y1={ly + 44} lv={lv} />,
      <Label key="vl" x={lx} y={ly} text={L.vessel[0]} sub={L.vessel[1]} lv={lv} />);
  }
  return <>{out}</>;
};

// --------------------------------------------------------------------------------------------- end card + credit
const Typed: React.FC<{text: string; t0: number; dur: number; t: number; color: string}> = ({text, t0, dur, t, color}) => {
  const chars = [...text], n = chars.length;
  return (
    <>
      {chars.map((c, i) => {
        const k = ease((t - t0 - (dur * i) / n) / 0.22);
        return <span key={i} style={{display: 'inline-block', color, opacity: k, transform: `translateY(${(1 - k) * 12}px)`}}>{c}</span>;
      })}
    </>
  );
};
export const EndCard: React.FC<{t: number}> = ({t}) => {
  const e = CUES.titles.end, l12 = line('L12'), l13 = line('L13');
  if (t < l12.start_s - 0.1) return null;
  const row = (parts: string[], l: typeof l12, top: number, tone: string) => (
    <div style={{...base, left: 0, width: W, top, textAlign: 'center', fontWeight: 700, fontSize: 76, letterSpacing: '0.06em',
      textShadow: SHADOW}}>
      <Typed text={parts[0]} t0={l.phrases[0].start_s - 0.04} dur={l.phrases[0].words_end_s - l.phrases[0].start_s} t={t} color={PAL.white} />
      <span style={{display: 'inline-block', width: 56}} />
      <Typed text={parts[1]} t0={l.phrases[1].start_s - 0.04} dur={l.phrases[1].words_end_s - l.phrases[1].start_s} t={t} color={tone} />
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fadeAll(t)}}>
      {row(e.line1, l12, 268, PAL.air)}
      {row(e.line2, l13, 382, PAL.gas)}
    </div>
  );
};
export const Credit: React.FC<{t: number}> = ({t}) => {
  const lv = ramp(t, line('L14').end_s + 0.1, line('L14').end_s + 0.5) * fadeAll(t);
  if (lv <= 0.001) return null;
  return (
    <div style={{...base, left: 0, width: W, top: 1500, textAlign: 'center', fontWeight: 300, fontSize: 24, lineHeight: 1.6,
      letterSpacing: '0.05em', opacity: 0.8 * lv, textShadow: SHADOW}}>
      {CUES.credit.split(' ｜ ').map((s, i) => <div key={i}>{s}</div>)}
    </div>
  );
};
