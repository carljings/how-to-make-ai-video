// V2Film.tsx: 「一口气」. Plate (Blender picture) -> vector graphics -> vignette + grain -> white punch -> type -> fade.
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {FPS, H, W, overlayAt} from './data';
import {Graphics} from './Graphics';
import {FadeOut, Grain, Vignette, WhiteFlash, punchScale} from './Post';
import {Captions, EndCard, Hook, Labels, Slate, Stop} from './Type';
import './fonts';

export type PlateSource =
  | {kind: 'frames'; dir: string; ext: 'png' | 'jpg'}
  | {kind: 'still'; src: string}
  | {kind: 'video'; src: string}
  | {kind: 'none'};
export type V2Props = {plates: PlateSource; frame?: number; graphics?: boolean; text?: boolean; post?: boolean};

const Plate: React.FC<{plates: PlateSource; frame: number}> = ({plates, frame}) => {
  const style: React.CSSProperties = {width: W, height: H, objectFit: 'cover'};
  if (plates.kind === 'frames') return <Img src={staticFile(`${plates.dir}/f${String(frame).padStart(5, '0')}.${plates.ext}`)} style={style} />;
  if (plates.kind === 'still') return <Img src={staticFile(plates.src)} style={style} />;
  if (plates.kind === 'video') return <OffthreadVideo src={staticFile(plates.src)} muted style={style} />;
  return <AbsoluteFill style={{background: 'linear-gradient(180deg, #020306 0%, #06080c 60%, #101215 100%)'}} />;
};

export const V2Film: React.FC<V2Props> = ({plates, frame: fixed, graphics = true, text = true, post = true}) => {
  const cur = useCurrentFrame();
  const frame = fixed ?? cur;
  const t = frame / FPS;
  const o = overlayAt(frame);
  const s = punchScale(t);
  return (
    <AbsoluteFill style={{background: '#000', fontSynthesis: 'none', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${s})`, transformOrigin: '50% 45%'}}>
        <Plate plates={plates} frame={frame} />
        {graphics && <Graphics o={o} frame={frame} />}
      </AbsoluteFill>
      {post && <Vignette />}
      {post && <Grain frame={frame} />}
      {post && <WhiteFlash t={t} />}
      {text && (
        <>
          <Slate t={t} />
          <Hook t={t} />
          <Stop t={t} />
          <Captions t={t} />
          {graphics && <Labels o={o} />}
          <EndCard t={t} />
        </>
      )}
      {post && <FadeOut t={t} />}
    </AbsoluteFill>
  );
};
