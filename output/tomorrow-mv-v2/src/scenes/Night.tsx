// Night.tsx · 轻轻敲醒沉睡的心灵: the mascot asleep on a cloud; the cursor taps twice (轻、轻), knocks (敲), it jolts
// awake (醒) and drifts off again (沉睡的); its chest heart lights (心) and glows (灵), warming the horizon.
import React from 'react';
import {CW, CH} from '../layout';
import {NIGHT, T0, PULSE, BARLINE, pulseAt, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Pix} from '../art/pixel';
import {Cursor, Ripple, Star, Moon, Sparkle} from '../art/props';
import {MONO} from '../lib/fonts';
import {clamp, seg, lerp, easeOut, easeInOut, backOut, rng, TAU} from '../lib/math';

const STARS = (() => {
  const r = rng(21), out: {x: number; y: number; ph: number; u: number}[] = [];
  while (out.length < 44) {
    const x = 20 + r() * (CW - 40), y = 16 + r() * 330;
    if (x > 640 && y < 150) continue; // the moon
    if (x > 470 && x < 640 && y > 170) continue; // the Z's path
    out.push({x, y, ph: r() * TAU, u: r() < 0.25 ? 5 : 3.5});
  }
  return out;
})();
const CLOUD = [
  '.......aaaaa............',
  '....aaaaaaaaaa....aaaa..',
  '..aaaaaaaaaaaaaaaaaaaaa.',
  '.aaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaaaaaaaa',
  'bbbbbbbbbbbbbbbbbbbbbbbb',
  '.bbbbbbbbbbbbbbbbbbbbbb.',
  '...bbbbbbbbbbbbbbbbbb...',
];
// Mascot and cursor geometry (card pixels)
const MX = 444, FEET = 536, U = 16, HEAD: [number, number] = [516, 380], REST: [number, number] = [562, 320];
export const NIGHT_FACE: [number, number] = [MX, FEET - 10 * U + 3 * U]; // where the push-in transition zooms to
const TAPS = [NIGHT.tap1, NIGHT.tap2, NIGHT.knock];

export const cursorAt = (t: number) => {
  const enter = easeOut(seg(t, -0.6, -0.04));
  let x = lerp(CW + 90, REST[0], enter), y = lerp(CH + 70, REST[1], enter);
  let press = 0;
  TAPS.forEach((tk, i) => { press = Math.max(press, Math.exp(-(((t - tk) / (i === 2 ? 0.075 : 0.05)) ** 2))); });
  const wind = t < NIGHT.knock ? Math.exp(-(((t - (NIGHT.knock - 0.13)) / 0.06) ** 2)) : 0; // wind-up before the knock
  x += (HEAD[0] - REST[0]) * press + 34 * wind; y += (HEAD[1] - REST[1]) * press - 34 * wind;
  const away = easeInOut(seg(t, NIGHT.jolt + 0.12, NIGHT.jolt + 0.75));
  x = lerp(x, 712, away); y = lerp(y, 238, away) + 9 * Math.sin(t * 3.2) * away;
  return {x, y, press};
};

export const Night: React.FC<{t: number}> = ({t}) => {
  const v = t - NIGHT.jolt; // seconds since 醒
  // the mascot: breathing while asleep, squashed by each tap, a hop on 醒
  let squash = 1 + 0.035 * Math.sin(t * 2.6);
  TAPS.forEach((tk, i) => { if (t >= tk) squash += (i === 2 ? 0.14 : 0.07) * Math.exp(-(t - tk) / 0.08); });
  let lift = 0;
  if (v >= 0 && v < 0.36) lift = 2.3 * Math.sin((Math.PI * v) / 0.36);
  if (v >= -0.05 && v < 0) squash += 0.12;
  if (v >= 0.36) squash += 0.12 * Math.exp(-(v - 0.36) / 0.07);
  const eye = v < 0 ? 0 : v < 0.04 ? (v / 0.04) * 0.55 : v < 0.32 ? 0.55 : v < 0.6 ? lerp(0.55, 0.15, (v - 0.32) / 0.28) : v < 0.95 ? lerp(0.15, 0, (v - 0.6) / 0.35) : 0;
  const heart = t < NIGHT.heart - 0.03 ? 0 : Math.max(0, backOut(clamp((t - NIGHT.heart + 0.03) / 0.25), 2));
  const glowK = easeOut(seg(t, NIGHT.glow, NIGHT.glow + 0.8));
  const beat = Math.exp(-sincePulse(t) / 0.12);
  const chest: [number, number] = [MX, FEET - 10 * U + 6.1 * U - lift * U];
  const cur = cursorAt(t);

  // Z's: one per pulse while asleep; at 醒 they all pop. Smaller ones return from 睡 until 心.
  const zs: React.ReactNode[] = [];
  for (let k = -6; k < 40; k++) {
    const tb = T0 + k * PULSE;
    const drowsy = tb > NIGHT.jolt;
    if (drowsy && (tb < NIGHT.jolt + 0.55 || tb > NIGHT.heart || k % 2)) continue;
    const p = (t - tb) / 1.8;
    if (p < 0 || p > 1) continue;
    let sc = drowsy ? 0.65 : 1, op = Math.sin(p * Math.PI);
    if (!drowsy && v > 0) { sc *= 1 + v * 4; op *= clamp(1 - v / 0.16); }
    if (op <= 0.01) continue;
    zs.push(<div key={k} style={{position: 'absolute', left: 528 + p * 96 + 12 * Math.sin(p * 7 + k), top: 350 - p * 190, fontFamily: MONO, fontWeight: 800,
      fontSize: (28 + p * 30) * sc, color: '#EAF0FF', opacity: op * 0.9, transform: `rotate(${-12 + 10 * Math.sin(k)}deg)`}}>Z</div>);
  }
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #111735 0%, #1B2553 55%, #2D3B78 100%)'}}>
      {/* warm light rising behind the horizon once the heart glows */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 55% at 50% 112%, rgba(255,168,108,0.85) 0%, rgba(255,150,110,0.25) 45%, rgba(255,150,110,0) 75%)', opacity: glowK}} />
      {STARS.map((s, i) => {
        let b = 0.5 + 0.5 * Math.sin(t * 1.7 + s.ph);
        if (pulseAt(t) % 4 === i % 4) b = Math.max(b, beat);
        return <Star key={i} x={s.x} y={s.y} u={s.u} b={b} />;
      })}
      <Moon x={688} y={38} u={10} />
      {/* far hills */}
      <svg width={CW} height={120} viewBox={`0 0 ${CW} 120`} style={{position: 'absolute', left: 0, top: CH - 110}}>
        <path d={`M0 70 Q 150 20 300 60 T 600 50 T ${CW} 40 L ${CW} 120 L 0 120 Z`} fill="#16204A" />
        <path d={`M0 95 Q 200 60 420 92 T ${CW} 80 L ${CW} 120 L 0 120 Z`} fill="#121A3E" />
      </svg>
      {zs}
      {/* the heart's glow and the light it sends out on 灵 */}
      {heart > 0 && <div style={{position: 'absolute', left: chest[0] - 160, top: chest[1] - 160, width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,140,110,0.75) 0%, rgba(255,140,110,0.18) 40%, rgba(255,140,110,0) 70%)',
        opacity: clamp(heart) * (0.35 + 0.65 * glowK) * (0.85 + 0.15 * beat), transform: `scale(${0.45 + 0.75 * glowK})`}} />}
      <Clawd x={MX} y={FEET} u={U} eye={eye} mood={v >= 0 && v < 0.32 ? 'surprised' : 'normal'} squash={squash} lift={lift} tilt={v >= 0 && v < 0.6 ? 0 : -5}
        cap={{x: 0, y: v >= 0 && v < 0.4 ? -1.3 * Math.sin((Math.PI * v) / 0.4) : 0, r: v >= 0 ? -16 : -8 + 3 * Math.sin(t * 1.3)}} heart={heart} />
      <div style={{position: 'absolute', left: 240, top: 500}}>
        <svg width={408} height={136} viewBox="0 0 24 8"><Pix rows={CLOUD} pal={{a: '#DCE4FA', b: '#B3C0EA'}} /></svg>
      </div>
      {Array.from({length: 14}, (_, i) => {
        const a = (i / 14) * TAU + 0.3, k = (t - NIGHT.glow - (i % 3) * 0.04) / 0.75, d = 40 + 250 * easeOut(clamp(k));
        return <Sparkle key={i} x={chest[0] + Math.cos(a) * d} y={chest[1] + Math.sin(a) * d * 0.8} s={14 + (i % 3) * 5} k={k} color="#FFD9A0" />;
      })}
      {TAPS.map((tk, i) => <Ripple key={i} x={HEAD[0]} y={HEAD[1]} k={(t - tk) / (i === 2 ? 0.5 : 0.38)} r={i === 2 ? 110 : 60} width={i === 2 ? 8 : 5} />)}
      <Ripple x={HEAD[0]} y={HEAD[1]} k={(t - NIGHT.knock - 0.08) / 0.5} r={160} width={4} />
      <Cursor x={cur.x} y={cur.y} u={5} press={cur.press} opacity={1 - seg(t, BARLINE[1] - 0.2, BARLINE[1])} />
    </div>
  );
};
