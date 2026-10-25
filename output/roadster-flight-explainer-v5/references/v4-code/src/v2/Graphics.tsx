// Graphics.tsx: the vector layer over the plate. Every coordinate comes from overlay.json, projected through the
// same camera as the Blender plate, so lines sit exactly on the rendered nozzles. Colour carries meaning:
// ice blue = gas leaving, red-orange = the push back on the car, white = centre of mass and line of action.
// No arrow labels: the voice and the colour code explain; only 重心 and the vessel callout are named (Type.tsx).
import React from 'react';
import {BEAT, FPS, H, OFrame, PALETTE, W, clamp, ease} from './data';

const FORCE = PALETTE.force;
const FORCE_CORE = '#FFD9C9';
const GAS = PALETTE.gas;

const head = (x0: number, y0: number, x1: number, y1: number, len: number, half: number) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, k = Math.min(len, 0.6 * L), h = Math.min(half, 0.3 * L);
  const bx = x1 - ux * k, by = y1 - uy * k;
  return {points: `${x1},${y1} ${bx - uy * h},${by + ux * h} ${bx + uy * h},${by - ux * h}`, bx, by};
};

const Beam: React.FC<{x0: number; y0: number; x1: number; y1: number; lv: number; glow: boolean}> = ({x0, y0, x1, y1, lv, glow}) => {
  const hd = head(x0, y0, x1, y1, 38, 17);
  if (glow) {
    return (
      <g opacity={0.9 * lv}>
        <line x1={x0} y1={y0} x2={hd.bx} y2={hd.by} stroke={FORCE} strokeWidth={16} strokeLinecap="round" />
        <polygon points={hd.points} fill={FORCE} />
      </g>
    );
  }
  return (
    <g opacity={lv}>
      <line x1={x0} y1={y0} x2={hd.bx} y2={hd.by} stroke={FORCE} strokeWidth={7} strokeLinecap="round" />
      <line x1={x0} y1={y0} x2={hd.bx} y2={hd.by} stroke={FORCE_CORE} strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
      <polygon points={hd.points} fill={FORCE} />
      <circle cx={x0} cy={y0} r={6.5} fill={FORCE_CORE} />
    </g>
  );
};

const Arc: React.FC<{pts: number[][]; lv: number; draw: number; glow: boolean}> = ({pts, lv, draw, glow}) => {
  const n = Math.max(2, Math.round(ease(draw) * (pts.length - 1)) + 1);
  const vis = pts.slice(0, n);
  const a = vis[vis.length - 2], b = vis[vis.length - 1];
  // extend the arrow tip slightly beyond the last point along the tangent so the head sits on the arc
  const hd = head(a[0], a[1], b[0], b[1], 34, 16);
  const d = vis.slice(0, -1).map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ') + ` L${hd.bx},${hd.by}`;
  return (
    <g opacity={(glow ? 0.85 : 1) * lv}>
      <path d={d} stroke={FORCE} strokeWidth={glow ? 15 : 6.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {!glow && <path d={d} stroke={FORCE_CORE} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.8} />}
      <polygon points={hd.points} fill={FORCE} />
    </g>
  );
};

export const Graphics: React.FC<{o: OFrame; frame: number}> = ({o, frame}) => {
  const t = frame / FPS;
  const parts = o.p ?? [];
  const beams = (o.b ?? []) as [string, number, number, number, number, number][];
  const lines = (o.l ?? []) as [string, number, number, number, number, number][];
  if (!parts.length && !beams.length && !lines.length && !o.c && !o.a && !o.fl) return null;
  const comAge = t - BEAT.com_on;
  const ring = 1 + 0.9 * Math.exp(-Math.max(0, comAge) * 5.5);
  const flowShift = -(frame * 2.4) % 26;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <defs>
        <filter id="g-wide" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="11" /></filter>
        <filter id="g-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2" /></filter>
      </defs>
      {/* gas: soft halo then crisp streaks */}
      {parts.length > 0 && (
        <>
          <g filter="url(#g-soft)">
            {parts.map((p, i) => <line key={i} x1={p[2]} y1={p[3]} x2={p[0]} y2={p[1]} stroke={GAS} strokeWidth={p[4] * 2.6} strokeLinecap="round" opacity={0.55 * p[5]} />)}
          </g>
          <g>
            {parts.map((p, i) => <line key={i} x1={p[2]} y1={p[3]} x2={p[0]} y2={p[1]} stroke={GAS} strokeWidth={Math.max(1.4, p[4] * 1.15)} strokeLinecap="round" opacity={p[5]} />)}
          </g>
        </>
      )}
      {/* stored gas: flowing paths from the vessel to every port */}
      {o.fl && (
        <g opacity={o.fl.lv}>
          {o.fl.paths.map(([n, pts]) => (
            <g key={n}>
              <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={GAS} strokeWidth={9} opacity={0.25} filter="url(#g-soft)" />
              <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={GAS} strokeWidth={3} strokeDasharray="10 16" strokeDashoffset={flowShift} strokeLinecap="round" />
            </g>
          ))}
        </g>
      )}
      {/* line of action and lever arm */}
      {lines.map(([id, x0, y0, x1, y1, lv]) => (
        <line key={id} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#FFFFFF" strokeWidth={2.4} strokeDasharray="15 12" opacity={0.78 * lv} />
      ))}
      {o.arm && <line x1={o.arm[0]} y1={o.arm[1]} x2={o.arm[2]} y2={o.arm[3]} stroke="#FFFFFF" strokeWidth={2} opacity={0.55 * o.arm[4]} />}
      {/* forces and torque: wide glow, then crisp core */}
      <g filter="url(#g-wide)">
        {beams.map(([n, x0, y0, x1, y1, lv]) => <Beam key={n} x0={x0} y0={y0} x1={x1} y1={y1} lv={lv} glow />)}
        {o.a && <Arc pts={o.a.pts} lv={o.a.lv} draw={o.a.draw} glow />}
      </g>
      {beams.map(([n, x0, y0, x1, y1, lv]) => <Beam key={n} x0={x0} y0={y0} x1={x1} y1={y1} lv={lv} glow={false} />)}
      {o.a && <Arc pts={o.a.pts} lv={o.a.lv} draw={o.a.draw} glow={false} />}
      {/* centre of mass */}
      {o.c && (
        <g opacity={o.c[2]}>
          <circle cx={o.c[0]} cy={o.c[1]} r={22 * ring} fill="none" stroke="#FFFFFF" strokeWidth={2.4} opacity={clamp(0.85 / ring)} />
          <circle cx={o.c[0]} cy={o.c[1]} r={18} fill="#FFFFFF" opacity={0.25} filter="url(#g-soft)" />
          <circle cx={o.c[0]} cy={o.c[1]} r={8.5} fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
};
