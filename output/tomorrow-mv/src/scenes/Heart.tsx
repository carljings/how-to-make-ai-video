// Heart.tsx · 吹动少年的心: the letter the wind took lands at sunrise and opens; a pixel heart pops out. The wind
// blows it about (吹), it wobbles (动), it lifts the mascot like a balloon while sparkles burst (少年), and on 的 it
// flies up out of the postcard to become the last word, 心, which beats on the last three pulses.
import React from 'react';
import {CW, CH, CX0, CY0} from '../layout';
import {HEART, BARLINE, LINES, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Sun, Sparkle, PixelHeart} from '../art/props';
import {Pix, MINI_HEART} from '../art/pixel';
import {Letter} from './Spring';
import {clamp, seg, lerp, easeOut, easeIn, backOut, TAU} from '../lib/math';

const L = LINES[5].syl;
const RELEASE = L[4].t; // 的: the heart leaves the card
const MX = 444, FEET = 600, U = 13;
export const HEART_SPOT: [number, number] = [868, 402]; // where 心 sits among the lyrics: the end of the line (screen pixels)

// The heart while it is inside the card (card pixels; cell = size of one heart pixel)
export const heartInCard = (t: number) => {
  const u = t - HEART.open - 0.03;
  if (u < 0) return null;
  const pop = backOut(clamp(u / 0.2), 1.8);
  let x = MX, y = lerp(410, 296, pop), rot = 0;
  const b = t - HEART.blow;
  if (b > 0) { const w = clamp(b / 0.25); x += 60 * Math.sin(b * 4.2) * w; y -= 14 * Math.sin(b * 3) * w + 24 * w; rot = 10 * Math.sin(b * 5) * w; }
  const v = t - HEART.wobble;
  if (v > 0) rot += 18 * Math.sin(v * 22) * Math.exp(-v / 0.35);
  y -= 30 * easeOut(seg(t, HEART.wobble, RELEASE)); // rising like a balloon, lifting the mascot with it
  return {x, y, cell: 13 * Math.max(0.05, pop), rot};
};

// The heart in screen pixels once it has left the card: flying up (的 → 心), then beating
export const heartFlight = (t: number) => {
  const none = {screen: false, x: 0, y: 0, cell: 0, rot: 0, glow: 0, text: 0};
  if (t < RELEASE) return none;
  const from = heartInCard(RELEASE)!;
  const k = seg(t, RELEASE, HEART.land);
  let cell = lerp(from.cell, 23, easeIn(k));
  for (const b of HEART.beats) if (t >= b) cell *= 1 + 0.15 * Math.exp(-(t - b) / 0.09);
  return {
    screen: true,
    x: lerp(CX0 + from.x, HEART_SPOT[0], easeOut(k)), y: lerp(CY0 + from.y, HEART_SPOT[1], easeIn(k)),
    cell, rot: from.rot * (1 - k), glow: 0.5 + 0.5 * Math.exp(-sincePulse(t) / 0.12), text: clamp((k - 0.75) / 0.25),
  };
};

export const Heart: React.FC<{t: number}> = ({t}) => {
  const beat = Math.exp(-sincePulse(t) / 0.1);
  const land = seg(t, BARLINE[5] - 0.04, BARLINE[5] + 0.16);
  const open = easeOut(seg(t, HEART.open - 0.06, HEART.open + 0.06));
  const letterGone = seg(t, HEART.blow, HEART.blow + 0.5);
  const lx = lerp(CW + 110, MX, easeOut(land)) - 420 * easeIn(letterGone), ly = lerp(-80, 430, easeOut(land)) + 300 * easeIn(letterGone);
  const h = t < RELEASE ? heartInCard(t) : null;
  const holding = t > HEART.wobble && t < RELEASE;
  const lift = holding ? 1.3 * easeOut(seg(t, HEART.wobble, HEART.wobble + 0.5)) : t >= RELEASE ? 1.3 * (1 - easeIn(seg(t, RELEASE, RELEASE + 0.15))) : 0;
  const cheer = t > HEART.land ? Math.max(...HEART.beats.map((b) => (t >= b ? Math.exp(-(t - b) / 0.12) : 0))) : 0;
  const happy = t > HEART.spark - 0.05;
  const handX = MX + 7 * U, handY = FEET - 10 * U - lift * U + 1 * U;
  return (
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 85% 75% at 50% 92%, #FFF2C4 0%, #FFD08A 38%, #F8A574 72%, #EE8D6E 100%)'}}>
      <Sun x={MX} y={CH + 30} r={150} spin={t * 0.22} rays={18} color="#FFE6A0" rayColor="#FFF4D2" rayOpacity={0.3 + 0.1 * beat} />
      <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={`M0 ${FEET - 6} Q 220 ${FEET - 40} 444 ${FEET - 8} T ${CW} ${FEET - 20} L ${CW} ${CH} L 0 ${CH} Z`} fill="#F6C98C" />
        <path d={`M0 ${FEET + 30} Q 260 ${FEET + 4} 520 ${FEET + 28} T ${CW} ${FEET + 22} L ${CW} ${CH} L 0 ${CH} Z`} fill="#F0B477" />
      </svg>
      {t < HEART.blow + 0.5 && <Letter x={lx} y={ly} rot={lerp(28, 0, easeOut(land)) - 200 * letterGone + 6 * Math.sin(t * 9) * (1 - land)} s={1.2} open={open} />}
      {/* the string from the heart to the mascot's raised hand */}
      {h && holding && (
        <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0}}>
          <path d={`M${h.x} ${h.y + 4 * h.cell} Q ${(h.x + handX) / 2 + 20 * Math.sin(t * 6)} ${(h.y + handY) / 2 + 30} ${handX} ${handY}`} stroke="#7A4B3A" strokeWidth={4} fill="none" />
        </svg>
      )}
      <Clawd x={MX} y={FEET} u={U} eye={1} mood={happy ? 'happy' : t > HEART.open ? 'surprised' : 'normal'} gaze={t > RELEASE ? 0 : 0.2} look={t > RELEASE ? -1 : -0.5}
        lift={lift + 0.9 * cheer} squash={1 + 0.06 * beat} armR={holding ? 3 : 2.5 * cheer} armL={2.5 * cheer} blush={happy ? 1 : 0} cap={null} heart={0.7} />
      {h && (
        <div style={{position: 'absolute', left: h.x - 4.5 * h.cell, top: h.y - 4 * h.cell, transform: `rotate(${h.rot}deg)`}}>
          <PixelHeart x={0} y={0} cell={h.cell} />
        </div>
      )}
      {/* sparkles on 少、年 and a burst where the heart takes off */}
      {[L[2].t, L[3].t].map((ts, j) => Array.from({length: 6}, (_, i) => {
        const a = (i / 6) * TAU + j * 0.5, k = (t - ts - (i % 2) * 0.05) / 0.6, d = 60 + 170 * easeOut(clamp(k));
        return <Sparkle key={`${j}-${i}`} x={MX + Math.cos(a) * d} y={FEET - 80 + Math.sin(a) * d * 0.7} s={20 + (i % 3) * 6} k={k} color="#FFF0A0" />;
      }))}
      {Array.from({length: 10}, (_, i) => {
        const a = (i / 10) * TAU, k = (t - RELEASE) / 0.5, d = 30 + 160 * easeOut(clamp(k));
        const p = heartInCard(RELEASE)!;
        return <Sparkle key={'b' + i} x={p.x + Math.cos(a) * d} y={p.y + Math.sin(a) * d} s={18} k={k} color="#FFFFFF" />;
      })}
      {/* little hearts float up from the mascot once 心 has landed */}
      {Array.from({length: 6}, (_, i) => {
        const tb = HEART.land + i * 0.16, k = (t - tb) / 0.9; if (k < 0 || k > 1) return null;
        return (
          <svg key={'m' + i} width={30} height={30} viewBox="0 0 5 5" style={{position: 'absolute', left: MX - 15 + (i % 2 ? 1 : -1) * (70 + 20 * i) + 14 * Math.sin(k * 7), top: FEET - 150 - 260 * k, opacity: Math.sin(k * Math.PI)}}>
            <Pix rows={MINI_HEART} pal={{r: i % 2 ? '#E8433A' : '#FF7A8A'}} />
          </svg>
        );
      })}
    </div>
  );
};
