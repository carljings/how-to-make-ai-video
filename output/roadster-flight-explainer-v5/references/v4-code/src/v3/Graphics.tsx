// Graphics.tsx: the vector layer over the plate. Every coordinate comes from overlay.json, projected through the
// same camera as the Blender plate (blender/v3_film.overlay), so arrows sit on the rendered car and ramp.
// Colour carries meaning: warm gold = the air the car borrows, ice blue = the gas it carries, red-orange = any push
// on the car, white = gravity and neutral marks. Arrow lengths are schematic; directions are computed.
// Look bible: hero arrows 13 px with a hot white core and a crisp head; ticks 1.5 px; streaks oriented by motion;
// no round dots, no lens flares.
import React from 'react';
import {Arrow, FPS, Ghost, H, OFrame, PAL, Seg, W, clamp, ease} from './data';

const FORCE = PAL.force, CORE = '#FFE2D6', GAS = PAL.gas, AIR = PAL.air, WHITE = PAL.white, XRAY = PAL.xray;

const headPts = (x0: number, y0: number, x1: number, y1: number, len: number, half: number) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, k = Math.min(len, 0.55 * L), h = Math.min(half, 0.32 * L);
  const bx = x1 - ux * k, by = y1 - uy * k;
  return {pts: `${x1},${y1} ${bx - uy * h},${by + ux * h} ${bx + uy * h},${by - ux * h}`, bx, by, L};
};

type ArrowStyle = {color: string; width: number; head: number; half: number; core?: boolean; glow?: boolean};
const HERO: ArrowStyle = {color: FORCE, width: 13, head: 46, half: 21, core: true};
const GHOST_P: ArrowStyle = {color: FORCE, width: 8, head: 30, half: 14, core: true};
const GRAV: ArrowStyle = {color: WHITE, width: 6, head: 30, half: 13};
const GHOST_G: ArrowStyle = {color: WHITE, width: 3.5, head: 20, half: 9};

const Arr: React.FC<{a: Arrow | null | undefined; s: ArrowStyle; glow?: boolean; scale?: number}> = ({a, s, glow, scale = 1}) => {
  if (!a) return null;
  const [x0, y0, x1, y1, lv] = a as number[];
  if (!(lv > 0.01)) return null;
  const hd = headPts(x0, y0, x1, y1, s.head * scale, s.half * scale);
  if (hd.L < 3) return null;
  if (glow) {
    return (
      <g opacity={0.75 * lv}>
        <line x1={x0} y1={y0} x2={hd.bx} y2={hd.by} stroke={s.color} strokeWidth={s.width * scale * 2.1} strokeLinecap="round" />
        <polygon points={hd.pts} fill={s.color} />
      </g>
    );
  }
  return (
    <g opacity={lv}>
      <line x1={x0} y1={y0} x2={hd.bx} y2={hd.by} stroke={s.color} strokeWidth={s.width * scale} strokeLinecap="round" />
      {s.core && <line x1={x0} y1={y0} x2={hd.bx} y2={hd.by} stroke={CORE} strokeWidth={Math.max(1.6, s.width * scale * 0.28)} strokeLinecap="round" opacity={0.9} />}
      <polygon points={hd.pts} fill={s.color} strokeLinejoin="round" stroke={s.color} strokeWidth={1.5} />
    </g>
  );
};

// warm air / cold gas streaks [x0,y0,x1,y1,w,a]: soft halo pass + crisp pass
const Streaks: React.FC<{segs?: Seg[]; color: string; halo?: number; minW?: number}> = ({segs, color, halo = 0.45, minW = 1.4}) => {
  if (!segs || !segs.length) return null;
  return (
    <>
      <g filter="url(#v3-soft)">
        {segs.map((p, i) => <line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} stroke={color} strokeWidth={p[4] * 2.6} strokeLinecap="round" opacity={halo * p[5]} />)}
      </g>
      {segs.map((p, i) => <line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} stroke={color} strokeWidth={Math.max(minW, p[4])} strokeLinecap="round" opacity={p[5]} />)}
    </>
  );
};

const GhostArrows: React.FC<{g: Ghost; glow: boolean}> = ({g, glow}) => {
  const pulse = g.pulse ?? 0;
  return (
    <>
      <Arr a={g.grav} s={GHOST_G} glow={glow} />
      <Arr a={g.press} s={GHOST_P} glow={glow} scale={1 + 0.35 * pulse} />
      {!glow && g.vcomp && g.vcomp[4] > 0.01 && (
        <line x1={g.vcomp[0]} y1={g.vcomp[1]} x2={g.vcomp[2]} y2={g.vcomp[3]} stroke={WHITE} strokeWidth={3}
          strokeDasharray="2 9" strokeLinecap="round" opacity={0.9 * g.vcomp[4]} />
      )}
    </>
  );
};

export const Graphics: React.FC<{o: OFrame; frame: number}> = ({o, frame}) => {
  const t = frame / FPS;
  const arrows = [o.press, ...(o.trac ?? []), ...(o.react ?? [])];
  const flow = -(frame * 2.6) % 28;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <defs>
        <filter id="v3-wide" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10" /></filter>
        <filter id="v3-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" /></filter>
        <radialGradient id="v3-contact"><stop offset="0" stopColor="#FFD2BE" stopOpacity="1" /><stop offset="0.35" stopColor={FORCE} stopOpacity="0.85" /><stop offset="1" stopColor={FORCE} stopOpacity="0" /></radialGradient>
      </defs>

      {/* v4 light-sheet: where the sheet cuts the ramp, the car's centre section, the tyre, or (at the end) the boundary
          at the deck's free end -- razor ice-white lines with a soft halo, under every explanation mark */}
      {o.sheet && o.sheet.lv > 0.01 && o.sheet.pl.length > 0 && (() => {
        const pls = o.sheet.pl.map((pl) => pl.map((p) => p.join(',')).join(' '));
        return (
          <g opacity={o.sheet.lv}>
            <g filter="url(#v3-soft)">
              {pls.map((d, i) => <polyline key={i} points={d} fill="none" stroke={XRAY} strokeWidth={8} opacity={0.3} strokeLinejoin="round" strokeLinecap="round" />)}
            </g>
            {pls.map((d, i) => <polyline key={i} points={d} fill="none" stroke={XRAY} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
          </g>
        );
      })()}
      {/* low-pressure lens under the floor: it lights up as a region (white veil, glowing rim) while the gold air
          outside stays dense and the inside is nearly empty */}
      {o.gap && o.gap.lv > 0.01 && (() => {
        const pts = o.gap.pts.map((p) => p.join(',')).join(' ');
        return (
          <g opacity={o.gap.lv}>
            <polygon points={pts} fill={WHITE} opacity={0.13} />
            <polygon points={pts} fill="none" stroke={WHITE} strokeWidth={9} opacity={0.32} filter="url(#v3-soft)" strokeLinejoin="round" />
            <polygon points={pts} fill="none" stroke={WHITE} strokeWidth={2} opacity={0.9} strokeLinejoin="round" />
          </g>
        );
      })()}
      <Streaks segs={o.air} color={AIR} halo={0.35} />
      {/* pressure ticks: short impacts normal to the skin, pointing in */}
      {o.ticks && o.ticks.map((p, i) => <line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} stroke={AIR} strokeWidth={1.6} strokeLinecap="round" opacity={p[4]} />)}
      {/* schematic fan intakes */}
      {o.fan && o.fan.map((f, i) => f[2] > 0.01 && (
        <g key={i} opacity={f[2]}>
          <circle cx={f[0]} cy={f[1]} r={17} fill="none" stroke={WHITE} strokeWidth={2} />
          <circle cx={f[0]} cy={f[1]} r={9} fill="none" stroke={WHITE} strokeWidth={1.4} strokeDasharray="3 4" transform={`rotate(${(t * 220) % 360} ${f[0]} ${f[1]})`} />
        </g>
      ))}
      {/* the lip edge, the slope flash at the press foot */}
      {o.lip && o.lip[4] > 0.01 && <line x1={o.lip[0]} y1={o.lip[1]} x2={o.lip[2]} y2={o.lip[3]} stroke={WHITE} strokeWidth={2.4} opacity={0.95 * o.lip[4]} strokeLinecap="round" />}
      {o.flash && o.flash[4] > 0.01 && (
        <g opacity={o.flash[4]}>
          <line x1={o.flash[0]} y1={o.flash[1]} x2={o.flash[2]} y2={o.flash[3]} stroke={WHITE} strokeWidth={10} opacity={0.35} filter="url(#v3-soft)" />
          <line x1={o.flash[0]} y1={o.flash[1]} x2={o.flash[2]} y2={o.flash[3]} stroke={WHITE} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      )}
      {/* gas: streaks in the plumes (ramp jets, ending cold ghosts, K2) and the relay pulse */}
      <Streaks segs={o.jet} color={GAS} />
      {o.cold && o.cold.map((c, i) => <Streaks key={i} segs={c.jet} color={GAS} halo={0.3} />)}
      {o.relay && o.relay.lv > 0.01 && o.relay.pts.length > 1 && (() => {
        const pts = o.relay.pts, n = pts.length, k = Math.min(n - 1, Math.round(ease(o.relay.prog) * (n - 1)));
        const d = pts.map((p) => p.join(',')).join(' ');
        return (
          <g opacity={o.relay.lv}>
            <polyline points={d} fill="none" stroke={GAS} strokeWidth={10} opacity={0.22} filter="url(#v3-soft)" />
            <polyline points={d} fill="none" stroke={GAS} strokeWidth={3} strokeDasharray="10 14" strokeDashoffset={flow} strokeLinecap="round" />
            <circle cx={pts[k][0]} cy={pts[k][1]} r={14} fill={GAS} opacity={0.5} filter="url(#v3-soft)" />
            <circle cx={pts[k][0]} cy={pts[k][1]} r={5} fill={WHITE} />
          </g>
        );
      })()}
      {/* x-ray scan line: luminous bar across the car at the scan front */}
      {o.scan && o.scan.prog > 0.001 && o.scan.prog < 0.999 && (() => {
        const [px, py] = o.scan.p, [ax, ay] = o.scan.axis, L = 620, dx = -ay * L, dy = ax * L;
        return (
          <g>
            <line x1={px - dx} y1={py - dy} x2={px + dx} y2={py + dy} stroke={XRAY} strokeWidth={26} opacity={0.35} filter="url(#v3-wide)" />
            <line x1={px - dx} y1={py - dy} x2={px + dx} y2={py + dy} stroke={XRAY} strokeWidth={3} opacity={0.95} />
          </g>
        );
      })()}
      {/* K2 (kickflip torque): line of action, lever arm, centre of mass */}
      {o.loa && o.loa[4] > 0.01 && <line x1={o.loa[0]} y1={o.loa[1]} x2={o.loa[2]} y2={o.loa[3]} stroke={WHITE} strokeWidth={2.4} strokeDasharray="15 12" opacity={0.8 * o.loa[4]} />}
      {o.arm && o.arm[4] > 0.01 && <line x1={o.arm[0]} y1={o.arm[1]} x2={o.arm[2]} y2={o.arm[3]} stroke={WHITE} strokeWidth={2} opacity={0.6 * o.arm[4]} />}

      {/* forces: wide glow pass, then crisp */}
      <g filter="url(#v3-wide)">
        <Arr a={o.grav} s={GRAV} glow />
        {arrows.map((a, i) => <Arr key={i} a={a} s={HERO} glow />)}
        {o.ghosts && o.ghosts.map((g, i) => <GhostArrows key={i} g={g} glow />)}
        {o.cold && o.cold.map((c, i) => c.react.map((a, j) => <Arr key={`${i}-${j}`} a={[...(a as number[]).slice(0, 4), (a[4] as number) * c.lv]} s={GHOST_P} glow />))}
        {o.arc && <ArcArrow arc={o.arc} glow />}
      </g>
      <Arr a={o.grav} s={GRAV} />
      {o.ghosts && o.ghosts.map((g, i) => <GhostArrows key={i} g={g} glow={false} />)}
      {o.cold && o.cold.map((c, i) => c.react.map((a, j) => <Arr key={`${i}-${j}`} a={[...(a as number[]).slice(0, 4), (a[4] as number) * c.lv]} s={GHOST_P} />))}
      {arrows.map((a, i) => <Arr key={i} a={a} s={HERO} />)}
      {o.arc && <ArcArrow arc={o.arc} glow={false} />}

      {/* tyre contact patches light up under the press */}
      {o.contact && o.contact.map((c, i) => c[3] > 0.01 && (
        <ellipse key={i} cx={c[0]} cy={c[1]} rx={c[2] * 1.4} ry={c[2] * 0.7} fill="url(#v3-contact)" opacity={c[3]} />
      ))}
      {/* the press arrow's remainder breaking up: warm specks drifting out (diamonds, not dots) */}
      {o.shards && o.shards.map((s, i) => s[3] > 0.01 && (
        <rect key={i} x={s[0] - s[2]} y={s[1] - s[2]} width={2 * s[2]} height={2 * s[2]} fill={AIR} opacity={s[3]}
          transform={`rotate(45 ${s[0]} ${s[1]})`} />
      ))}
      {o.com && o.com[2] > 0.01 && (
        <g opacity={o.com[2]}>
          <circle cx={o.com[0]} cy={o.com[1]} r={21} fill="none" stroke={WHITE} strokeWidth={2.4} opacity={0.85} />
          <circle cx={o.com[0]} cy={o.com[1]} r={8} fill={WHITE} />
        </g>
      )}
    </svg>
  );
};

const ArcArrow: React.FC<{arc: NonNullable<OFrame['arc']>; glow: boolean}> = ({arc, glow}) => {
  if (arc.lv <= 0.01 || arc.pts.length < 2) return null;
  const n = Math.max(2, Math.round(ease(arc.draw) * (arc.pts.length - 1)) + 1);
  const vis = arc.pts.slice(0, n);
  const a = vis[vis.length - 2], b = vis[vis.length - 1];
  const hd = headPts(a[0], a[1], b[0], b[1], 36, 17);
  const d = vis.slice(0, -1).map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ') + ` L${hd.bx},${hd.by}`;
  return (
    <g opacity={(glow ? 0.8 : 1) * clamp(arc.lv)}>
      <path d={d} stroke={FORCE} strokeWidth={glow ? 16 : 8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {!glow && <path d={d} stroke={CORE} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.85} />}
      <polygon points={hd.pts} fill={FORCE} />
    </g>
  );
};
