// Plate.tsx: the Blender picture for one film frame, from plates.json (blender/v3_film.plate_for):
//   r  per-frame render (also the held freeze frame)      s  still + 2D push      w  x-ray wipe (scan line from overlay)
//   v2 v2 clean plate, 1:1                                  0/b black
//   p  multi-exposure poster: background still cropped/zoomed, ghost exposures (screen), live car layer, cloud.
// Paths follow the finalizer contract: <plateRoot>/new/{frames,stills,layers}/..., <plateRoot>/v2/fNNNNN.png.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {H, OFrame, POSTER, PlateSpec, W, pad5} from './data';

const fill: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: W, height: H};

const Pic: React.FC<{src: string; z?: number; style?: React.CSSProperties}> = ({src, z = 1, style}) => (
  <Img src={staticFile(src)} style={{...fill, objectFit: 'cover', transform: z !== 1 ? `scale(${z})` : undefined,
    transformOrigin: '50% 50%', ...style}} />
);

// half-plane on the nose side of the scan line (overlay px): the part of the car the scan has already crossed
const scanClip = (o: OFrame) => {
  if (!o.scan || o.scan.prog <= 0) return 'polygon(0 0, 0 0, 0 0)';
  const [px, py] = o.scan.p, [ax, ay] = o.scan.axis, L = 4000, dx = -ay * L, dy = ax * L;
  const pts = [[px + dx, py + dy], [px + dx + ax * L, py + dy + ay * L], [px - dx + ax * L, py - dy + ay * L], [px - dx, py - dy]];
  return `polygon(${pts.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(', ')})`;
};

const Poster: React.FC<{spec: Extract<PlateSpec, {k: 'p'}>; root: string}> = ({spec, root}) => {
  const [x0, y0, w] = spec.crop, s = W / w;
  const box: React.CSSProperties = {position: 'absolute', left: -x0 * s, top: -y0 * s, width: POSTER.w * s, height: POSTER.h * s};
  const still = (id: string) => `${root}/new/stills/${id}.png`;
  const live = spec.live ? (spec.live.f !== undefined ? `${root}/new/layers/f${pad5(spec.live.f)}.png` : still(spec.live.still!)) : null;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      <Img src={staticFile(still('POSTER_BG'))} style={box} />
      {/* strobe exposures add light, as on a Marey plate: screen blend keeps them luminous and see-through */}
      {spec.ghosts.map((g) => <Img key={g.id} src={staticFile(still(g.id))} style={{...box, opacity: g.op, mixBlendMode: 'screen'}} />)}
      {live && <Img src={staticFile(live)} style={box} />}
      {/* Near-floor gas stays in front of the live car, preserving the source's obscured contact. */}
      {spec.cloud > 0.002 && <Img src={staticFile(still('POSTER_CLOUD'))} style={{...box, opacity: spec.cloud}} />}
    </AbsoluteFill>
  );
};

export const Plate: React.FC<{spec: PlateSpec; o: OFrame; root: string}> = ({spec, o, root}) => {
  switch (spec.k) {
    case 'r': return <Pic src={`${root}/new/frames/f${pad5(spec.f)}.png`} />;
    case 's': return <Pic src={`${root}/new/stills/${spec.id}.png`} z={spec.z} />;
    case 'w':
      return (
        <>
          <Pic src={`${root}/new/stills/${spec.a}.png`} z={spec.z} />
          <AbsoluteFill style={{clipPath: scanClip(o)}}><Pic src={`${root}/new/stills/${spec.b}.png`} z={spec.z} /></AbsoluteFill>
        </>
      );
    case 'v2': return <Pic src={`${root}/v2/f${pad5(spec.f)}.png`} />;
    case 'p': return <Poster spec={spec} root={root} />;
    default: return <AbsoluteFill style={{background: '#000'}} />;
  }
};
