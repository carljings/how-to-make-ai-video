// Clinic (56–60 s): 2021, one patient: goggles project orange light onto a retina treated by gene therapy;
// signals leave along the optic nerve and objects on a table become perceptible (partially, not normal sight).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Art} from '../ui/Art';
import type {Gfx} from '../lib/gfx';
import {FPS, GOGGLES_ON, RETINA_ON, OBJECTS} from '../timeline';
import {seg, smooth} from '../lib/math';
import {drawEye, drawPerceived, EYE} from '../art/eye';
import {Callout} from '../ui/widgets';
import {SANS} from '../lib/fonts';
import {rgba} from '../ui/Text';

function drawClinic(g: Gfx, t: number) {
  g.begin([5, 6, 12]);
  g.camera(540, 960 + (1 - smooth(seg(t, 55.6, 57))) * 30, 1 + 0.03 * seg(t, 56, 60));
  const on = smooth(seg(t, GOGGLES_ON, GOGGLES_ON + 0.25)), retina = smooth(seg(t, RETINA_ON, RETINA_ON + 0.5));
  // a warm haze that grows as the light comes on
  g.glow(EYE.x, EYE.y, 900, [120, 60, 30], 0.12 * on, 'halo');
  drawEye(g, t, {on, retina});
  drawPerceived(g, t, smooth(seg(t, OBJECTS[0], OBJECTS[0] + 1.0)), smooth(seg(t, OBJECTS[1], OBJECTS[1] + 1.0)), seg(t, 56.2, 56.6));
  g.bloom(0.7);
  g.vignette(0.6);
  g.grain(Math.round(t * FPS), 0.12);
}

export const Clinic: React.FC<{t: number}> = ({t}) => {
  const lab = seg(t, 56.4, 56.8);
  return (
    <AbsoluteFill>
      <Art t={t} draw={drawClinic} />
      <Callout x={195} y={EYE.y - 60} tx={150} ty={EYE.y - 190} text="光刺激眼镜" k={lab} color="#d6e2ee" size={28} />
      <Callout x={EYE.x + EYE.r - 14} y={EYE.y - 70} tx={EYE.x + EYE.r - 60} ty={EYE.y - 250} text="视网膜" k={seg(t, RETINA_ON, RETINA_ON + 0.4)} color={rgba('orange')} size={28} />
      <div style={{position: 'absolute', left: 130, top: 1248, fontFamily: SANS, fontWeight: 700, fontSize: 22, color: 'rgba(200,214,228,0.8)', opacity: seg(t, 56.4, 56.8), letterSpacing: 2}}>他能感知到的（示意）</div>
    </AbsoluteFill>
  );
};
