// Wings.tsx · 抬头寻找天空的翅膀 (the drop): a white flash and a whole sky. The mascot stands on the cloud sea and looks
// up on 抬头, left and right on 寻、找; the camera tilts up on 天空; wings pop out on 翅 and 膀 and it launches.
import React from 'react';
import {CW, CH} from '../layout';
import {WINGS, BARLINE, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Sparkle, SpeedLines} from '../art/props';
import {clamp, seg, lerp, easeOut, easeIn, easeInOut, backOut, rng, TAU} from '../lib/math';

// Puffy clouds: rows of circles; deterministic
const CLOUDS = (() => { const r = rng(91); return Array.from({length: 26}, () => ({x: r() * (CW + 200) - 100, y: r(), s: 70 + r() * 90})); })();
export const CloudSea: React.FC<{y: number; t: number; drift?: number; tint?: string}> = ({y, t, drift = 0, tint = '#FFFFFF'}) => (
  <>
    {CLOUDS.map((c, i) => {
      const x = ((c.x - t * drift * (0.6 + c.y)) % (CW + 300) + CW + 300) % (CW + 300) - 150;
      return <div key={i} style={{position: 'absolute', left: x - c.s, top: y + c.y * 140 - c.s * 0.6, width: c.s * 2, height: c.s * 1.2, borderRadius: c.s, background: tint, opacity: 0.85 + 0.15 * c.y, boxShadow: 'inset 0 -14px 0 rgba(150,180,220,0.35)'}} />;
    })}
    <div style={{position: 'absolute', left: 0, top: y + 70, width: CW, height: CH, background: tint}} />
  </>
);
export const wingsAt = (t: number) => {
  if (t < WINGS.wing1 - 0.04) return null;
  const k = Math.max(0, Math.min(backOut(clamp((t - WINGS.wing1 + 0.04) / 0.2), 2) * 0.6, 0.6)) + 0.4 * clamp(backOut(clamp((t - WINGS.wing2 + 0.04) / 0.2), 2.2));
  return {flap: 22 * Math.sin(t * TAU * 3.75), k};
};

export const Wings: React.FC<{t: number}> = ({t}) => {
  const tilt = easeInOut(seg(t, WINGS.tilt - 0.1, WINGS.tilt + 0.8));
  const launch = easeIn(seg(t, WINGS.launch, BARLINE[9] + 0.1));
  const beat = Math.exp(-sincePulse(t) / 0.1);
  const seaY = lerp(470, 640, tilt) + 900 * launch;
  const feet = seaY + 40 - 820 * launch;
  const gaze = t > WINGS.look[1] ? 1 : t > WINGS.look[0] ? -1 : 0;
  const look = t > WINGS.up - 0.05 ? -1 : 0;
  return (
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${tilt > 0.5 ? '#2F5FC8' : '#3A6FD6'} 0%, #78B7F2 50%, #D8EEFF 100%)`, overflow: 'hidden'}}>
      {/* light from above */}
      {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{position: 'absolute', left: 120 + i * 160 - 40, top: -80, width: 70, height: 900, background: 'linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0))', transform: `rotate(${-12 + i * 6}deg)`, transformOrigin: '50% 0', opacity: 0.6 + 0.4 * Math.sin(t * 2 + i)}} />)}
      {Array.from({length: 14}, (_, i) => <Sparkle key={i} x={(i * 137) % CW} y={((i * 211) % 380) + 30 + 900 * launch} s={10 + (i % 3) * 5} k={((t * 0.9 + i * 0.37) % 1)} color="#FFFFFF" />)}
      <CloudSea y={seaY} t={t} drift={30} />
      <Clawd x={444} y={feet} u={16} eye={1} gaze={gaze} look={look} mood={launch > 0.05 ? 'happy' : 'normal'} squash={1 + 0.05 * beat - 0.12 * seg(t, WINGS.launch - 0.15, WINGS.launch) + 0.1 * launch}
        tilt={6 * Math.sin(t * 7) * launch} cap={null} heart={0.7} wings={wingsAt(t)} armL={launch > 0 ? 1.5 : 0} armR={launch > 0 ? 1.5 : 0} />
      {launch > 0.02 && <SpeedLines x={444} y={feet + 40} len={220} dir={-90} k={clamp(launch * 3)} color="#FFFFFF" n={5} spread={46} />}
      {[WINGS.wing1, WINGS.wing2].map((tw, j) => Array.from({length: 6}, (_, i) => {
        const a = (i / 6) * TAU, k = (t - tw) / 0.5, d = 60 + 140 * easeOut(clamp(k));
        return <Sparkle key={`${j}${i}`} x={444 + (j ? 130 : -130) + Math.cos(a) * d * 0.5} y={feet - 110 + Math.sin(a) * d * 0.5} s={18} k={k} color="#FFFFFF" />;
      }))}
    </div>
  );
};
