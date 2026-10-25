// Art.tsx: one canvas per scene, redrawn from scratch for every frame by a pure draw(g, t) function.
import {useLayoutEffect, useRef} from 'react';
import {Gfx} from '../lib/gfx';
import {W, H} from '../timeline';

export const Art: React.FC<{t: number; draw: (g: Gfx, t: number) => void; style?: React.CSSProperties}> = ({t, draw, style}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const gfx = useRef<Gfx | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    gfx.current ??= new Gfx(ref.current);
    draw(gfx.current, t);
  }, [t, draw]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, ...style}} />;
};
