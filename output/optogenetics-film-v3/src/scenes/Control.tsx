// Control (36–51 s): 2005: the gene is packed into a virus, delivered, and the neuron builds light gates (one per
// sixteenth note). Then a fibre and a two-track sequencer: every flash, one spike, at 2, 4 and 8 per second.
// At 48 s amber light: the cell falls silent while its neighbours carry on.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {FPS, PACK, FLY, DROP, CHANNEL_TIMES, PULSES, RATE_STEPS, AMBER_ON, pulse} from '../timeline';
import {seg, lerp, easeInOut, easeOut, smooth, rng, TAU} from '../lib/math';
import {C, SIDE, makeNeuron, drawNeuron, drawSpike, fiber} from '../art/neuron';
import {drawHelix, drawCapsid} from '../art/install';
import {drawDepth} from '../art/field';
import {Callout} from '../ui/widgets';
import {SANS, MONO} from '../lib/fonts';
import {rgba} from '../ui/Text';

const N0 = {x: 690, y: 1150, s: 0.92}, N1 = {x: 330, y: 930, s: 0.76}, GENE: [number, number] = [300, 990];
const BLUE_PULSES = PULSES.filter((p) => p < AMBER_ON);
const MINI = makeNeuron(88, {dendrites: 5, axon: 160, reach: 70, depth: 2});
const NR = rng(4242);
const NEAR = [[590, 760], [820, 800], [880, 1010]].map(([x, y]) => {
  const sp: number[] = [];
  for (let t = 42.4 + NR() * 0.8; t < 51.5; t += 0.45 + NR() * 0.9) sp.push(t);
  return {x, y, sp};
});
const pos = (t: number) => {
  const k = easeInOut(seg(t, 40.4, 41.5));
  return {x: lerp(N0.x, N1.x, k), y: lerp(N0.y, N1.y, k), s: lerp(N0.s, N1.s, k)};
};
const chAt = (t: number) => CHANNEL_TIMES.reduce((n, c) => n + seg(t, c, c + 0.06), 0) / CHANNEL_TIMES.length;

function drawControl(g: Gfx, t: number) {
  g.begin([3, 6, 14]);
  drawDepth(g, t, 0.15, 0.7);
  const n = pos(t), amber = smooth(seg(t, AMBER_ON, AMBER_ON + 0.15));
  // the gene, packed into a virus shell, flies to the neuron
  if (t < DROP) {
    const pack = easeInOut(seg(t, PACK, PACK + 0.45)), fly = easeInOut(seg(t, FLY[0], FLY[1]));
    const along = (k: number): [number, number] => [lerp(GENE[0], n.x, k), lerp(GENE[1], n.y, k) - Math.sin(k * Math.PI) * 200];
    const [cx, cy] = along(fly), [bx, by] = along(Math.max(0, fly - 0.05));
    if (pack < 1) drawHelix(g, GENE[0], GENE[1], 380, t * 3.2, 1 - pack * 0.4, lerp(1, 0.18, pack));
    if (pack > 0) drawCapsid(g, cx, cy, 64, t * 1.8, 0.4 + t * 0.9, pack);
    if (fly > 0.02 && fly < 1) g.streak(cx, cy, Math.atan2(cy - by, cx - bx), 240 * Math.sin(fly * Math.PI), 30, C.ice, 0.6);
  }
  const drop = t - DROP;
  if (drop >= 0 && drop < 0.6) {
    drawCapsid(g, n.x, n.y, 64, t * 1.8, 0.4 + t * 0.9, 1, easeOut(drop / 0.6));
    g.glowArc(n.x, n.y, 40 + drop * 1200, C.blue, (1 - drop / 0.6) * 0.8, 3.5);
  }
  // fibre (rhythm and brake)
  const fib = easeOut(seg(t, 41.1, 41.7)), f = pulse(t, BLUE_PULSES, 0.07);
  if (fib > 0.01) {
    const tip = n.y - 64 * n.s - 40;
    fiber(g, n.x, 640, lerp(640, tip, fib), amber > 0 ? C.amber : C.blue, amber > 0 ? amber : f, [n.x, n.y - 10], 46, fib);
    if (amber > 0.01) { g.glow(n.x, n.y, 220, C.amber, amber * 0.45, 'halo'); g.beam(n.x, tip, n.x, n.y + 30, C.amber, amber * 0.8, 8, 70); }
  }
  // the neuron: channels appear one per sixteenth note after the drop; it fires on each blue pulse
  const ch = chAt(t), arrive = pulse(t, [DROP], 0.35);
  drawNeuron(g, SIDE, n.x, n.y, n.s, {soma: Math.max(0.1 + f * 0.9, arrive), channels: ch, chColor: C.blue, a: 1 - amber * 0.35, glow: arrive > f ? C.white : C.blue});
  // each new gate pops as it appears
  CHANNEL_TIMES.forEach((c, i) => {
    const age = t - c;
    if (age < 0 || age > 0.3) return;
    const k = (i / 16) * TAU - Math.PI / 2, r = 30 * n.s;
    g.glow(n.x + Math.cos(k) * r, n.y + Math.sin(k) * r, 34 * (1 - age / 0.3) + 8, C.ice, 1 - age / 0.3, 'glow');
  });
  // the brake protein's pumps sit between the gates and light up amber
  if (t > AMBER_ON - 0.6) for (let i = 0; i < 8; i++) {
    const k = ((i + 0.5) / 8) * TAU - Math.PI / 2, r = 30 * n.s, on = seg(t, AMBER_ON - 0.6 + i * 0.05, AMBER_ON - 0.5 + i * 0.05);
    g.glow(n.x + Math.cos(k) * r, n.y + Math.sin(k) * r, 7, C.amber, on * (0.5 + 0.5 * amber), 'core');
    if (amber > 0) g.glow(n.x + Math.cos(k) * r, n.y + Math.sin(k) * r, 20, C.amber, amber * 0.4, 'glow');
  }
  for (const p of BLUE_PULSES) {
    drawSpike(g, SIDE, n.x, n.y, n.s, (t - p - 0.02) / 0.42, C.blue, 0.95);
    const age = t - p;
    if (age > 0 && age < 0.35) g.glowArc(n.x, n.y, 30 * n.s + age * 300, C.blue, (1 - age / 0.35) * 0.5, 2);
  }
  // neighbouring cells keep their own rhythm throughout
  const na = seg(t, 42.2, 42.8);
  if (na > 0) for (const c of NEAR) {
    const act = pulse(t, c.sp, 0.16);
    drawNeuron(g, MINI, c.x, c.y, 0.55, {a: na * 0.75, soma: act, glow: C.ice});
  }
  g.bloom(0.7);
  g.vignette(0.6);
  g.grain(Math.round(t * FPS), 0.12);
}

// Two-track sequencer: light pulses above, the cell's firing below; time runs right to left past a playhead
const Sequencer: React.FC<{t: number}> = ({t}) => {
  const k = easeOut(seg(t, 41.4, 42.0)), Wd = 820, span = 3, head = Wd * 0.86, X = (time: number) => head - ((t - time) / span) * Wd;
  if (k <= 0) return null;
  const L = 70, F = 196, amberOn = t >= AMBER_ON;
  const recent = BLUE_PULSES.filter((p) => p <= t + 0.5 && p >= t - span);
  // spike trace with explicit points at each spike so none is lost between samples
  const times: number[] = [];
  for (let i = 0; i <= 260; i++) times.push(t - span + (i / 260) * span);
  for (const p of recent) if (p <= t) times.push(p + 0.004, p + 0.012, p + 0.03);
  times.sort((a, b) => a - b);
  const pts = times.filter((x) => x <= t).map((time) => {
    let v = Math.sin(time * 37) * 0.03 + Math.sin(time * 61 + 1) * 0.02;
    for (const p of recent) { const d = time - p; if (d >= 0.004 && d < 0.012) v += 1; else if (d >= 0.012 && d < 0.06) v -= 0.25 * Math.sin(((d - 0.012) / 0.048) * Math.PI); }
    return `${X(time).toFixed(1)},${(F - v * 90).toFixed(1)}`;
  }).join(' ');
  const step = [...RATE_STEPS].reverse().find(([a]) => t >= a);
  const rate = amberOn ? 0 : step ? step[1] : 0, fired = BLUE_PULSES.filter((p) => p <= t).length;
  return (
    <div style={{position: 'absolute', left: 80, top: 1160, width: Wd, height: 290, opacity: k, transform: `translateY(${(1 - k) * 120}px)`}}>
      <svg width={Wd} height={260} style={{position: 'absolute', top: 30, overflow: 'visible'}}>
        <rect x={0} y={0} width={Wd} height={250} rx={18} fill="rgba(6,12,22,0.8)" stroke="rgba(120,160,200,0.3)" strokeWidth={2} />
        <line x1={0} y1={L} x2={Wd} y2={L} stroke="rgba(120,160,200,0.15)" />
        <line x1={0} y1={F} x2={Wd} y2={F} stroke="rgba(120,160,200,0.15)" />
        {recent.map((p, i) => {
          const x = X(p), near = Math.max(0, 1 - Math.abs(t - p) / 0.12);
          return x > 70 && x < Wd ? <rect key={i} x={x - 7} y={L - 20} width={14} height={40} rx={3} fill={rgba('blue', p <= t ? 1 : 0.35)} style={{filter: near > 0 ? `drop-shadow(0 0 ${10 * near}px ${rgba('blue')})` : undefined}} /> : null;
        })}
        {amberOn && <rect x={Math.max(70, X(AMBER_ON))} y={L - 14} width={head - Math.max(70, X(AMBER_ON))} height={28} rx={4} fill={rgba('amber')} style={{filter: `drop-shadow(0 0 8px ${rgba('amber')})`}} />}
        <clipPath id="seqclip"><rect x={70} y={0} width={Wd - 70} height={250} /></clipPath>
        <polyline points={pts} clipPath="url(#seqclip)" fill="none" stroke={amberOn ? 'rgba(200,215,230,0.85)' : rgba('blue')} strokeWidth={3.5} strokeLinejoin="round" />
        <line x1={head} y1={10} x2={head} y2={240} stroke="rgba(230,245,255,0.7)" strokeWidth={2} />
        <text x={22} y={L + 9} fill="#cfe0ee" fontFamily={SANS} fontWeight={700} fontSize={26}>光</text>
        <text x={14} y={F + 9} fill="#cfe0ee" fontFamily={SANS} fontWeight={700} fontSize={26}>放电</text>
      </svg>
      <div style={{position: 'absolute', left: 0, top: -12, display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: SANS, fontWeight: 700, fontSize: 26, color: amberOn ? rgba('amber') : '#cfe0ee', letterSpacing: 1}}>
        {amberOn ? '黄光：持续照射' : <>闪光 <span style={{fontFamily: MONO, fontSize: 40, color: rgba('blue')}}>{rate}</span> 次/秒</>}
      </div>
      <div style={{position: 'absolute', right: 0, top: -6, fontFamily: MONO, fontWeight: 700, fontSize: 24, color: amberOn ? rgba('amber') : rgba('blue'), letterSpacing: 1}}>
        {amberOn ? '放电 → 0' : `放电 ×${fired}`}
      </div>
    </div>
  );
};

export const Control: React.FC<{t: number}> = ({t}) => {
  const n = pos(t);
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawControl} />
      <Callout x={GENE[0] + 150} y={GENE[1] + 30} tx={GENE[0] + 60} ty={GENE[1] + 170} text="光敏通道的基因" k={seg(t, 36.3, 36.7) * (1 - seg(t, PACK, PACK + 0.2))} color={rgba('ice')} size={28} />
      <Callout x={GENE[0]} y={GENE[1] + 70} tx={GENE[0] - 40} ty={GENE[1] + 200} text="病毒载体" k={seg(t, PACK + 0.3, PACK + 0.5) * (1 - seg(t, FLY[0], FLY[0] + 0.1))} color={rgba('ice')} size={28} />
      <Callout x={n.x + 30} y={n.y + 26} tx={n.x - 40} ty={n.y + 230} text={`光控闸门 ×${Math.round(chAt(t) * 16)}`} k={seg(t, 38.5, 38.9) * (1 - seg(t, 40.2, 40.5))} color={rgba('blue')} size={28} />
      <Callout x={NEAR[1].x} y={NEAR[1].y} tx={NEAR[1].x - 30} ty={NEAR[1].y - 120} align="right" text="旁边的细胞照常工作" k={seg(t, AMBER_ON + 0.6, AMBER_ON + 1.0) * (1 - seg(t, 50.8, 51))} color="#c6d6e4" size={24} />
      <Sequencer t={t} />
    </AbsoluteFill>
  );
};
