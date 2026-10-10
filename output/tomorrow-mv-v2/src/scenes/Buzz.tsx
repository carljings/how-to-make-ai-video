// Buzz.tsx · 依然存在的消息: the bolt's red glow lingers on 火; then the postcard is pinned up and messages flood in:
// chat bubbles and little newspapers pour from every side while the mascot reads, worried. Red badges pop on 消 and 息.
import React from 'react';
import {CW, CH} from '../layout';
import {BUZZ, BARLINE, HALF, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {Bubble} from '../art/props';
import {Village} from './News';
import {AIRMAIL} from '../art/paper';
import {MONO, SANS} from '../lib/fonts';
import {clamp, seg, lerp, easeOut, backOut, rng} from '../lib/math';

const PAPERS = (() => { const r = rng(57); return Array.from({length: 18}, () => ({x0: r() * CW, side: r() < 0.5 ? -1 : 1, y0: r() * CH, rot: r() * 60 - 30, s: 0.7 + r() * 0.5})); })();

export const Buzz: React.FC<{t: number}> = ({t}) => {
  const red = 1 - seg(t, BUZZ.fire, BUZZ.fire + 0.35);
  const pin = easeOut(seg(t, BUZZ.fire, BUZZ.flood));
  const beat = Math.exp(-sincePulse(t) / 0.1);
  const flood = seg(t, BUZZ.flood - 0.1, BARLINE[12]);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #3B3A5E 0%, #57507A 60%, #7A6E94 100%)', overflow: 'hidden'}}>
      {/* the far-away postcard, pinned to the left */}
      <div style={{position: 'absolute', left: lerp(30, 40, pin), top: lerp(20, 60, pin), width: lerp(CW - 60, 330, pin), height: lerp(CH - 60, 250, pin), background: AIRMAIL, padding: 10, boxSizing: 'border-box',
        transform: `rotate(${lerp(-1.5, -7, pin)}deg)`, boxShadow: '0 10px 18px rgba(0,0,0,0.35)'}}>
        <div style={{position: 'relative', width: '100%', height: '100%', background: '#FBF6EA', padding: 6, boxSizing: 'border-box'}}>
          <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}>
            <Village t={t} w={lerp(CW - 92, 298, pin)} h={lerp(CH - 92, 218, pin)} storm={1} bolt={t - BUZZ.fire + 0.3} fill={0} mood="sad" />
          </div>
        </div>
        <div style={{position: 'absolute', left: '50%', top: -14, width: 26, height: 26, marginLeft: -13, borderRadius: 13, background: '#E8433A', boxShadow: '0 3px 0 rgba(0,0,0,0.3)', opacity: pin}} />
      </div>
      {/* bubbles and newspapers pour in on the half-pulses */}
      {PAPERS.map((p, i) => {
        const tb = BUZZ.flood + (i % 9) * HALF, k = (t - tb) / 1.1; if (k < 0 || k > 1) return null;
        const x = p.side < 0 ? lerp(-140, p.x0 * 0.6 + 200, easeOut(k)) : lerp(CW + 140, p.x0 * 0.6 + 200, easeOut(k)), y = p.y0 * 0.7 + 60 + 40 * k;
        return i % 2
          ? <Bubble key={i} x={x} y={y} s={34 * p.s} k={Math.min(0.7, k)} />
          : <div key={i} style={{position: 'absolute', left: x - 50 * p.s, top: y - 34 * p.s, width: 100 * p.s, height: 68 * p.s, background: '#F4F1EA', border: '2px solid #2A2F45', transform: `rotate(${p.rot + 200 * (1 - k)}deg)`, opacity: Math.min(1, k * 4)}}>
            <div style={{fontFamily: MONO, fontWeight: 800, fontSize: 18 * p.s, color: '#2A2F45', textAlign: 'center', marginTop: 4 * p.s}}>NEWS</div>
            {[0, 1, 2].map((j) => <div key={j} style={{height: 4 * p.s, background: '#9A96A6', margin: `${5 * p.s}px ${8 * p.s}px 0`}} />)}
          </div>;
      })}
      <Clawd x={620} y={CH - 74} u={13} eye={1} mood="sad" look={1} squash={1 + 0.03 * beat} cap={null} heart={0.7} armL={1} armR={1} />
      {/* the mascot's own newspaper */}
      <div style={{position: 'absolute', left: 520, top: CH - 112, width: 200, height: 92, background: '#F4F1EA', border: '3px solid #2A2F45', transform: `rotate(-3deg) scale(${1 + 0.02 * beat})`}}>
        <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 30, color: '#2A2F45', textAlign: 'center', marginTop: 4}}>远方的消息</div>
        <div style={{height: 6, background: '#B9B4C4', margin: '6px 16px 0'}} /><div style={{height: 6, background: '#B9B4C4', margin: '6px 16px 0'}} />
      </div>
      {/* red badges */}
      {[{t: BUZZ.badge1, x: 820, y: 90, txt: '99+'}, {t: BUZZ.badge2, x: 790, y: 300, txt: '999+'}].map((b, i) => {
        const k = t - b.t; if (k < -0.03) return null;
        const s = Math.max(0, backOut(clamp((k + 0.03) / 0.22), 2.6)) * (1 + 0.08 * beat);
        return <div key={i} style={{position: 'absolute', left: b.x - 70, top: b.y - 40, minWidth: 140, height: 80, borderRadius: 40, background: '#E8433A', border: '5px solid #FFFFFF', boxSizing: 'border-box', transform: `scale(${s})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 800, fontSize: 38, color: '#FFFFFF', boxShadow: '0 6px 0 rgba(0,0,0,0.25)'}}>{b.txt}</div>;
      })}
      {red > 0 && <div style={{position: 'absolute', inset: 0, background: '#FF3B2E', opacity: 0.35 * red}} />}
      <div style={{position: 'absolute', inset: 0, background: `rgba(20,10,40,${0.15 * flood})`}} />
    </div>
  );
};
