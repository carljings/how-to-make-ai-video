// World.tsx · 看看忙碌的世界 · 是否依然: a dotted world map, busy with planes, chat bubbles, pings and racing clocks.
// The mascot looks left and right on 看、看; postmarks land on 世 and 界. On 是否依然 everything slows to a stop, a
// question mark rises, and on 然 the map rolls up into a globe, which the planet scene picks up.
import React from 'react';
import {CW, CH} from '../layout';
import {WORLD, BARLINE, PULSE, HALF, T0, pulseAt, sincePulse} from '../timeline';
import {Clawd} from '../art/Clawd';
import {PaperPlane, Clock, Bubble, Ripple} from '../art/props';
import {DOTS, flat, sphere, CITIES} from '../art/globe';
import {MONO, SERIF} from '../lib/fonts';
import {clamp, seg, lerp, easeIn, easeOut, easeInOut, backOut} from '../lib/math';

export const GLOBE0 = {lam: 15, phi: 12, cx: 444, cy: 330, R: 190}; // where the map ends up (the planet starts here)
const MX = 444, FEET = CH - 20, U = 10;
// On 然 the mascot jumps from the bottom of the card onto the top of the globe; the planet scene finishes the jump
export const jumpFeet = (t: number, top: number) => {
  const j = seg(t, WORLD.globe, BARLINE[3] + 0.25);
  return lerp(FEET, top, easeOut(j)) - 56 * Math.sin(Math.PI * j);
};
const ROUTES: [string, string][] = [['SFO', 'TYO'], ['NYC', 'LON'], ['LON', 'PEK'], ['SHA', 'SYD'], ['SAO', 'NYC'], ['DXB', 'LAG'], ['DEL', 'CAI']];
const CITY_KEYS = Object.keys(CITIES);

// "Busy time": runs at full speed until 是, slows to a stop by 否 (the integral of a linear slow-down)
const busyTime = (t: number) => {
  const a = WORLD.slow, b = WORLD.ask;
  if (t <= a) return t;
  if (t >= b) return a + (b - a) / 2;
  const x = t - a;
  return a + x - (x * x) / (2 * (b - a));
};
const bez = (a: [number, number], b: [number, number], q: number): [number, number, number] => {
  const c: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.32 * Math.hypot(b[0] - a[0], b[1] - a[1])];
  const x = (1 - q) ** 2 * a[0] + 2 * (1 - q) * q * c[0] + q * q * b[0], y = (1 - q) ** 2 * a[1] + 2 * (1 - q) * q * c[1] + q * q * b[1];
  const dx = 2 * (1 - q) * (c[0] - a[0]) + 2 * q * (b[0] - c[0]), dy = 2 * (1 - q) * (c[1] - a[1]) + 2 * q * (b[1] - c[1]);
  return [x, y, (Math.atan2(dy, dx) * 180) / Math.PI];
};

export const World: React.FC<{t: number}> = ({t}) => {
  const tau = busyTime(t), busy = 1 - seg(t, WORLD.slow, WORLD.ask);
  const roll = easeInOut(seg(t, WORLD.globe, BARLINE[3])); // map → globe
  const extras = 1 - seg(t, WORLD.globe - 0.15, WORLD.globe + 0.1); // planes, clocks, stamps fade before the roll
  const beat = Math.exp(-sincePulse(t) / 0.1);
  const city = (k: string) => flat(...CITIES[k]);

  // the mascot: looks left, right, then hops with the busy world; stops, asks, tilts, and jumps onto the globe
  const L = t >= WORLD.look2 ? (t < WORLD.look2 + 0.35 ? 1 : 0) : t >= WORLD.look1 - 0.03 ? -1 : 0;
  const jump = seg(t, WORLD.globe, BARLINE[3] + 0.25);
  const feetY = jumpFeet(t, GLOBE0.cy - GLOBE0.R + 4);
  const tilt = t > WORLD.tilt ? 12 * easeOut(seg(t, WORLD.tilt, WORLD.tilt + 0.15)) * (1 - seg(t, WORLD.globe, WORLD.globe + 0.1)) : 0;
  const ask = t > WORLD.ask - 0.03 ? backOut(clamp((t - WORLD.ask + 0.03) / 0.25), 2.4) : 0;

  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3E9D2'}}>
      <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(150,118,80,0.09) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(150,118,80,0.09) 1.5px, transparent 1.5px)', backgroundSize: '44px 44px'}} />
      <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {roll > 0 && <circle cx={GLOBE0.cx} cy={GLOBE0.cy} r={GLOBE0.R + 6} fill="#F8F1E1" stroke="#CDB78F" strokeWidth={4} opacity={roll} />}
        {DOTS.map((d, i) => {
          const [fx, fy] = flat(d.lon, d.lat);
          let x = fx, y = fy, r = 4.3, op = 1;
          if (roll > 0) {
            const [sx, sy, z] = sphere(d.lon, d.lat, GLOBE0.lam, GLOBE0.phi, GLOBE0.cx, GLOBE0.cy, GLOBE0.R);
            x = lerp(fx, sx, roll); y = lerp(fy, sy, roll); r = lerp(4.3, 4.6 * (0.55 + 0.45 * Math.max(0, z)), roll);
            if (z < 0) op = 1 - roll;
          }
          // a ripple of brightness runs across the map on every pulse while the world is busy
          const wave = busy * Math.exp(-(((fx / CW) - (sincePulse(t) / PULSE)) ** 2) / 0.01);
          return <circle key={i} cx={x} cy={y} r={r * (1 + 0.25 * wave)} fill={i % 9 === 0 ? '#2F4C8A' : '#D9825C'} opacity={op} />;
        })}
        {/* flight routes */}
        {extras > 0 && ROUTES.map(([a, b], i) => {
          const P = 1.25 + 0.18 * i, q = (((tau - T0) / P + i * 0.37) % 1 + 1) % 1;
          const A = city(a), B = city(b), pts: string[] = [];
          for (let s = Math.max(0, q - 0.4); s <= q; s += 0.02) { const [x, y] = bez(A, B, s); pts.push(`${x.toFixed(1)},${y.toFixed(1)}`); }
          return <polyline key={i} points={pts.join(' ')} fill="none" stroke="#6B5B47" strokeWidth={2.4} strokeDasharray="7 7" opacity={0.5 * extras} />;
        })}
        {CITY_KEYS.map((k) => { const [x, y] = city(k); return <circle key={k} cx={x} cy={y} r={6.5} fill="#C8372D" stroke="#FFFFFF" strokeWidth={2.5} opacity={extras} />; })}
      </svg>
      {extras > 0 && ROUTES.map(([a, b], i) => {
        const P = 1.25 + 0.18 * i, q = (((tau - T0) / P + i * 0.37) % 1 + 1) % 1;
        const [x, y, rot] = bez(city(a), city(b), q);
        return <PaperPlane key={i} x={x} y={y} s={17} rot={rot} opacity={extras * clamp(Math.min(q, 1 - q) * 12)} />;
      })}
      {/* pings and chat bubbles on the half-pulses while busy */}
      {extras > 0 && CITY_KEYS.map((k, i) => { const [x, y] = city(k); return pulseAt(t) % 3 === i % 3 && busy > 0 ? <Ripple key={k} x={x} y={y} k={sincePulse(t) / 0.38} r={26} color="#C8372D" width={4} /> : null; })}
      {extras > 0 && Array.from({length: 24}, (_, j) => {
        const tb = BARLINE[2] - 0.2 + j * HALF; if (tb > WORLD.slow) return null;
        const k = CITY_KEYS[(j * 5) % CITY_KEYS.length], [x, y] = city(k);
        return <Bubble key={j} x={x + 14} y={y - 6} s={26} k={(t - tb) / 0.6} />;
      })}
      {/* postmarks: 世 and 界 */}
      {[{at: WORLD.stamp1, x: 650, y: 214, rot: -12, kind: 'round'}, {at: WORLD.stamp2, x: 236, y: 318, rot: 8, kind: 'square'}].map((s, i) => {
        const u = t - s.at; if (u < -0.07) return null;
        const sc = u < 0 ? lerp(2.2, 1, easeIn(clamp((u + 0.07) / 0.07))) : 1 - 0.08 * Math.exp(-u / 0.06);
        const op = (u < 0 ? lerp(0.3, 1, clamp((u + 0.07) / 0.07)) : 1) * extras;
        return s.kind === 'round' ? (
          <svg key={i} width={200} height={140} viewBox="-70 -70 200 140" style={{position: 'absolute', left: s.x - 70, top: s.y - 70, transform: `rotate(${s.rot}deg) scale(${sc})`, opacity: op, overflow: 'visible'}}>
            <circle r={60} fill="none" stroke="#C8372D" strokeWidth={5} /><circle r={50} fill="none" stroke="#C8372D" strokeWidth={2} />
            <text x={0} y={-12} textAnchor="middle" fontFamily={MONO} fontWeight={800} fontSize={17} fill="#C8372D">BUSY</text>
            <text x={0} y={14} textAnchor="middle" fontFamily={MONO} fontWeight={800} fontSize={17} fill="#C8372D">WORLD</text>
            <text x={0} y={36} textAnchor="middle" fontFamily={MONO} fontWeight={500} fontSize={12} fill="#C8372D">24H</text>
            {[0, 1, 2].map((j) => <path key={j} d={`M66 ${-16 + j * 16} q10 -8 20 0 t20 0 t20 0`} fill="none" stroke="#C8372D" strokeWidth={4} />)}
          </svg>
        ) : (
          <div key={i} style={{position: 'absolute', left: s.x - 95, top: s.y - 36, width: 190, height: 72, border: '5px solid #23407A', borderRadius: 8, transform: `rotate(${s.rot}deg) scale(${sc})`, opacity: op,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 800, fontSize: 26, color: '#23407A', letterSpacing: 3, background: 'rgba(35,64,122,0.06)'}}>PAR AVION</div>
        );
      })}
      {/* clocks racing, then stopping */}
      {['NYC', 'LON', 'PEK', 'TYO'].map((k, i) => <div key={k} style={{opacity: extras}}><Clock x={570 + i * 70} y={588} r={24} h={tau * 1.6 + i * 2.7} label={k} /></div>)}
      <Clawd x={MX} y={feetY} u={U} eye={1} gaze={L} lift={0.6 * beat * busy * (t > BARLINE[2] + 0.3 ? 1 : 0)} tilt={tilt} squash={1 + 0.05 * beat * busy}
        mood={t >= WORLD.globe && jump < 1 ? 'surprised' : 'normal'} cap={{x: 0, y: 0, r: -8}} heart={0.6} />
      {ask > 0 && extras > 0 && (
        <div style={{position: 'absolute', left: MX + 30, top: feetY - 10 * U - 120, width: 86, height: 86, borderRadius: 43, background: '#FFFFFF', border: '4px solid #24345C', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: 58, color: '#E39C22', transform: `scale(${ask})`, transformOrigin: '20% 100%', opacity: extras}}>？</div>
      )}
    </div>
  );
};
