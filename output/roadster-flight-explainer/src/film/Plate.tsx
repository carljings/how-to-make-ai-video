// Plate.tsx: the Blender-rendered picture for the current frame (bloom already in it). Three sources:
//   frames: public/<dir>/f00000.png … (render_film.py --frames output), frame-exact
//   video:  public/<src>, an encode of those frames (OffthreadVideo extracts the exact frame)
//   none:   a labelled test card, for overlay layout checks only; never a deliverable (verify refuses it)
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {SANS} from '../lib/fonts';
import {H, W, overlayAt} from './data';

export type PlateSource = {kind: 'frames'; dir: string; ext: 'png' | 'jpg'} | {kind: 'video'; src: string} | {kind: 'still'; src: string} | {kind: 'none'};

export const Plate: React.FC<{plates: PlateSource}> = ({plates}) => {
  const frame = useCurrentFrame();
  const style = {width: W, height: H, objectFit: 'cover' as const};
  if (plates.kind === 'frames') {
    return <Img src={staticFile(`${plates.dir}/f${String(frame).padStart(5, '0')}.${plates.ext}`)} style={style} />;
  }
  if (plates.kind === 'video') return <OffthreadVideo src={staticFile(plates.src)} muted style={style} />;
  if (plates.kind === 'still') return <Img src={staticFile(plates.src)} style={style} />;
  const f = overlayAt(frame);
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #05070b 0%, #0b1018 55%, #1b1f24 100%)'}}>
      <div style={{position: 'absolute', left: 60, bottom: 560, fontFamily: SANS, fontWeight: 500, fontSize: 28, color: 'rgba(255,255,255,0.35)'}}>
        TEST CARD · no plate · f{String(frame).padStart(5, '0')} · {f.a}{f.s ? '/' + f.s : ''}
      </div>
    </AbsoluteFill>
  );
};
