// Labels.tsx: diagram labels anchored to the rendered 3D points. Positions and chip boxes come from
// export_overlay.py (projection through the render camera, collision-free layout with hysteresis); this only draws.
import {SANS} from '../lib/fonts';
import {GROUP_COLOR, LABEL_GROUP} from './copy';
import {H, OVERLAY, OverlayFrame, W, clamp, labelText} from './data';

const nearestOnBox = (x: number, y: number, bx: number, by: number, bw: number, bh: number): [number, number] =>
  [clamp(x, bx, bx + bw), clamp(y, by, by + bh)];

export const Labels: React.FC<{f: OverlayFrame}> = ({f}) => {
  const [padX] = OVERLAY.pad;
  return (
    <>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {f.l.map(([id, ax, ay, bx, by, bw, bh, , lv]) => {
          const color = GROUP_COLOR[LABEL_GROUP[id] ?? 'white'];
          const [ex, ey] = nearestOnBox(ax, ay, bx, by, bw, bh);
          const far = Math.hypot(ex - ax, ey - ay) > 14;
          const onScreen = ax > 4 && ax < W - 4 && ay > 4 && ay < H - 4;
          const a = clamp(lv);
          return (
            <g key={id} opacity={a}>
              {far && onScreen && <line x1={ax} y1={ay} x2={ex} y2={ey} stroke={color} strokeWidth={2.5} strokeOpacity={0.85} strokeLinecap="round" />}
              {onScreen && <circle cx={ax} cy={ay} r={7} fill={color} stroke="rgba(0,0,0,0.7)" strokeWidth={3} />}
            </g>
          );
        })}
      </svg>
      {f.l.map(([id, , , bx, by, bw, bh, , lv]) => {
        const color = GROUP_COLOR[LABEL_GROUP[id] ?? 'white'];
        const [head, ...subs] = labelText(id).split('\n');
        return (
          <div key={id} style={{
            position: 'absolute', left: bx, top: by, width: bw, height: bh, boxSizing: 'border-box', opacity: clamp(lv),
            padding: `0 ${padX}px 0 ${padX + 4}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            background: 'rgba(4, 8, 13, 0.68)', borderRadius: 10, overflow: 'hidden',
            fontFamily: SANS, color: LABEL_GROUP[id] ? color : '#ffffff', whiteSpace: 'nowrap',
          }}>
            <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: color}} />
            <div style={{fontWeight: 700, fontSize: OVERLAY.label_px, lineHeight: 1.25}}>{head}</div>
            {subs.map((s) => (
              <div key={s} style={{fontWeight: 500, fontSize: OVERLAY.sub_px, lineHeight: 1.3, color: 'rgba(235,240,245,0.82)'}}>{s}</div>
            ))}
          </div>
        );
      })}
    </>
  );
};
