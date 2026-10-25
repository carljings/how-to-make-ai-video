// Big.tsx: the two wide shots near the end.
// Globe: a dotted Earth (Natural Earth land) turning, with central banks lighting up and the model's three parts.
// Crowd: the big pull-back. It starts on "you" and pulls back until thousands of little people form the economy's curve.
import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill} from 'remotion';
import {GLOBE, CROWD, scene, W, H} from '../timeline';
import {C} from '../lib/palette';
import {SANS} from '../lib/fonts';
import {clamp, seg, easeOut, easeInOut, springAt, rng, lerp, TAU} from '../lib/math';
import {LAND} from '../art/land';
import {NavyBg} from '../ui/World';
import {Bean, blinkAt} from '../art/Bean';

const RAD = Math.PI / 180;
// central banks, roughly where they sit (lon, lat); no labels on screen
const BANKS: [number, number][] = [[-77, 38.9], [-75.7, 45.4], [-99.1, 19.4], [-47.9, -15.8], [0, 51.5], [8.7, 50.1], [18, 59.3], [8.5, 47.4], [37.6, 55.8], [28.2, -25.7],
  [72.8, 19], [116.4, 39.9], [127, 37.6], [139.7, 35.7], [103.8, 1.3], [151.2, -33.9], [174.8, -41.3], [55.3, 25.3], [31.2, 30]];

export const Globe: React.FC<{t: number}> = ({t}) => {
  const {a} = scene('globe');
  const cx = 540, cy = 930, R = 285, lat0 = 18 * RAD, lon0 = (40 + (t - a) * 16) * RAD;
  const grow = springAt(t - a - 0.05, {freq: 1.6, damp: 0.6});
  const proj = (lon: number, lat: number) => {
    const l = lon * RAD - lon0, p = lat * RAD;
    const x = Math.cos(p) * Math.sin(l), y = Math.cos(lat0) * Math.sin(p) - Math.sin(lat0) * Math.cos(p) * Math.cos(l);
    const z = Math.sin(lat0) * Math.sin(p) + Math.cos(lat0) * Math.cos(p) * Math.cos(l);
    return [cx + x * R * grow, cy - y * R * grow, z] as const;
  };
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < LAND.length; i += 2) {
    const [x, y, z] = proj(LAND[i], LAND[i + 1]);
    if (z > 0) dots.push(<circle key={i} cx={x} cy={y} r={2.2 + 3.2 * z} fill={C.teal} opacity={0.25 + 0.7 * z} />);
  }
  const pins = BANKS.map(([lon, lat], i) => {
    const at = GLOBE.pins + i * 0.09, k = springAt(t - at, {freq: 2.6, damp: 0.45});
    const [x, y, z] = proj(lon, lat);
    if (z <= 0.05 || k <= 0.01) return null;
    const s = k * (0.6 + 0.4 * z);
    return (
      <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity={clamp(z * 3)}>
        <circle r={26 + 18 * Math.max(0, 1 - (t - at) / 0.6)} fill={C.gold} opacity={0.25 * Math.max(0, 1 - (t - at) / 0.6)} />
        <path d="M 0 0 C -14 -22 -22 -32 -22 -44 A 22 22 0 1 1 22 -44 C 22 -32 14 -22 0 0 Z" fill={C.gold} stroke={C.line} strokeWidth={4} />
        <path d="M -10 -40 L 0 -50 L 10 -40 Z M -10 -38 L 10 -38 L 10 -36 L -10 -36 Z" fill={C.line} />
        <rect x={-8} y={-36} width={4} height={10} fill={C.line} /><rect x={-2} y={-36} width={4} height={10} fill={C.line} /><rect x={4} y={-36} width={4} height={10} fill={C.line} />
      </g>
    );
  });
  // you, in orbit: an ellipse around the globe, drawn behind it on the far side
  const th = (t - a) * 1.5 + 0.6, ox = cx + Math.cos(th) * (R + 70) * grow, oy = cy + Math.sin(th) * 110 * grow - 40, orbitBehind = Math.sin(th) < 0;
  const orbit = <Bean x={ox} y={oy} s={0.34 * (orbitBehind ? 0.8 : 1) * grow} color={C.white} mood="grin" look={[-Math.sign(Math.cos(th)), -0.2]} blink={blinkAt(t, 14)} tilt={Math.cos(th) * 18} />;
  const parts: [string, string, number, number][] = [['① 消费', C.teal, 205, 745], ['② 定价', C.red, 822, 800], ['③ 利率', C.gold, 240, 1150]];
  return (
    <AbsoluteFill>
      <NavyBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <defs>
          <radialGradient id="sea" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#24406E" /><stop offset="100%" stopColor="#0E1A33" /></radialGradient>
        </defs>
        {orbitBehind && orbit}
        <circle cx={cx} cy={cy} r={R * grow + 26} fill={C.teal} opacity={0.08} />
        <circle cx={cx} cy={cy} r={R * grow} fill="url(#sea)" stroke={C.teal} strokeOpacity={0.5} strokeWidth={3} />
        {dots}
        {pins}
        {!orbitBehind && orbit}
        {parts.map(([label, col, x, y], i) => {
          const k = springAt(t - GLOBE.model - i * 0.15, {freq: 2.4, damp: 0.5});
          if (k <= 0.01) return null;
          return (
            <g key={label} transform={`translate(${x} ${y + Math.sin(t * 2 + i) * 8}) scale(${k})`}>
              <rect x={-92} y={-36} width={184} height={72} rx={36} fill={C.navyHi} stroke={col} strokeWidth={5} />
              <text y={13} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={36} fill={col}>{label}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ---- the crowd ----
// World coordinates equal screen coordinates at zoom 1. People stand in rows on a jittered grid along wave(x),
// so close up they look like a crowd seen from the front, and far away the band traces the economy's ups and downs.
const wave = (x: number) => 960 + 150 * Math.sin((x / 1080) * TAU * 1.1 + 0.5) + 40 * Math.sin((x / 1080) * TAU * 3.2 + 1.3);
const BW0 = 7, BH0 = 10, DX = 8.6, DY = 11.5, ROWS = 5; // bean size and spacing at zoom 1; rows either side of the curve
const YOU = {x: 520, y: wave(520) + 0.4 * DY};
const PEOPLE = (() => {
  const R = rng(2026), out: {x: number; y: number; c: string; s: number; ph: number}[] = [];
  for (let x = -200; x <= 1280; x += DX) for (let r = -ROWS; r <= ROWS; r++) {
    const px = x + (r % 2 ? DX / 2 : 0) + (R() - 0.5) * 2.4, py = wave(px) + r * DY + (R() - 0.5) * 2.4;
    if (Math.abs(r) === ROWS && R() < 0.5) continue; // a ragged edge
    if (Math.abs(px - YOU.x) < DX * 0.8 && Math.abs(py - YOU.y) < DY * 0.8) continue;
    out.push({x: px, y: py, c: R() < 0.8 ? C.teal : C.orange, s: 0.9 + R() * 0.2, ph: R() * TAU});
  }
  return out.sort((p, q) => p.y - q.y);
})();
export const CROWD_COUNT = PEOPLE.length + 1;
const Z0 = 10; // starting zoom: "you" is about 100 px tall

export const Crowd: React.FC<{t: number}> = ({t}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const {a, b} = scene('crowd');
  // exponential zoom from Z0 to 1, finishing when the narration reaches "经济的起落"
  const p = easeInOut(seg(t, CROWD.zoom, CROWD.wave + 0.1));
  const z = Math.exp(lerp(Math.log(Z0), 0, p));
  // "you" sits a little below the screen centre at the start and slides to its true place as the zoom reaches 1
  const ys = {x: lerp(540, YOU.x, p), y: lerp(1060, YOU.y, p)};
  const toScreen = (x: number, y: number) => [ys.x + (x - YOU.x) * z, ys.y + (y - YOU.y) * z] as const;
  const curve = easeInOut(seg(t, CROWD.wave, Math.min(b, CROWD.wave + 1.1)));
  const think = easeOut(seg(t, CROWD.tomorrow - 0.2, CROWD.tomorrow + 0.4));
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, W, H);
    const bw = BW0 * z, bh = BH0 * z;
    for (const q of PEOPLE) {
      const [x, y] = toScreen(q.x, q.y);
      if (x < -bw * 2 || x > W + bw * 2 || y < -bh * 3 || y > H + bh) continue;
      const hop = Math.max(0, Math.sin(t * 7 + q.ph)) * 0.25 * bh * 0.12;
      const w = bw * q.s, h = bh * q.s;
      g.fillStyle = q.c; g.strokeStyle = C.line; g.lineWidth = Math.max(1, w * 0.06);
      g.beginPath(); g.roundRect(x - w / 2, y - h - hop, w, h, w / 2); g.fill(); if (h > 24) g.stroke();
      if (h > 26) { // close enough to see faces
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(x - w * 0.18, y - h * 0.64 - hop, w * 0.13, 0, TAU); g.arc(x + w * 0.18, y - h * 0.64 - hop, w * 0.13, 0, TAU); g.fill();
        g.fillStyle = C.line;
        g.beginPath(); g.arc(x - w * 0.15, y - h * 0.63 - hop, w * 0.065, 0, TAU); g.arc(x + w * 0.21, y - h * 0.63 - hop, w * 0.065, 0, TAU); g.fill();
      }
      // a thought about tomorrow over some heads, only while we are close
      if (think > 0 && h > 40 && q.ph < 1.4) {
        g.globalAlpha = think * clamp((h - 40) / 20); g.fillStyle = '#fff'; g.strokeStyle = C.line; g.lineWidth = w * 0.05;
        g.beginPath(); g.arc(x + w * 0.42, y - h * 1.32 - hop, w * 0.36, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = C.navy; g.font = `900 ${w * 0.44}px "Noto Sans SC"`; g.textAlign = 'center'; g.fillText('?', x + w * 0.42, y - h * 1.18 - hop);
        g.globalAlpha = 1;
      }
    }
    // the economy's curve, drawn through the crowd once it is all in view
    if (curve > 0) {
      g.strokeStyle = C.gold; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      for (let x = 0; x <= 1080 * curve; x += 8) { const [sx, sy] = toScreen(x, wave(x) - (ROWS + 3) * DY); x === 0 ? g.moveTo(sx, sy) : g.lineTo(sx, sy); }
      g.stroke();
    }
  });
  const youH = BH0 * z * 1.06; // "you" drawn in SVG on top so it stays crisp at every zoom
  const ring = 0.5 + 0.5 * Math.sin((t - a) * 6);
  return (
    <AbsoluteFill>
      <NavyBg t={t} />
      <canvas ref={ref} width={W} height={H} style={{position: 'absolute', width: W, height: H}} />
      {/* keep the headline readable over the crowd */}
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.navyLo} 0%, rgba(11,20,38,0.92) 30%, rgba(11,20,38,0) 40%)`}} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <circle cx={ys.x} cy={ys.y - youH * 0.55} r={Math.max(16, youH * 0.85) + ring * 5} fill="none" stroke="#fff" strokeWidth={Math.max(3, 6 * Math.min(1, z / 3))} opacity={0.9} />
        <Bean x={ys.x} y={ys.y} s={youH / 206} color={C.white} mood="smile" look={[0.4, -0.5]} blink={blinkAt(t, 6)} prop={think > 0 && z > 3 ? 'think' : null} propK={think}
          label={z > 3 ? '你' : undefined} labelK={clamp((z - 3) / 1.5)} />
        {z <= 3 && (
          <g transform={`translate(${ys.x} ${ys.y - Math.max(40, youH * 2.2)})`} opacity={clamp((3 - z) / 0.8)}>
            <path d="M -14 -16 L 0 0 L 14 -16" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            <text y={-28} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={40} fill="#fff">你</text>
          </g>
        )}
        {curve > 0.6 && <text x={930} y={wave(900) - (ROWS + 3) * DY - 40} textAnchor="end" fontFamily={SANS} fontWeight={900} fontSize={44} fill={C.gold} opacity={(curve - 0.6) / 0.4}>经济的起落</text>}
      </svg>
    </AbsoluteFill>
  );
};
