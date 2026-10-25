// Film.tsx: the 75 s composition. The Blender plate carries the picture and its bloom; everything typographic is
// drawn on top, crisp. Timing comes only from the cue table and the exported film states.
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Labels} from './Labels';
import {Plate, PlateSource} from './Plate';
import {Captions, Chapter, Chips, Hook, Statements, Tag, Transition} from './Type';
import {FPS, overlayAt} from './data';

export type FilmProps = {plates: PlateSource; captions: boolean; frameOverride?: number};

export const Film: React.FC<FilmProps> = ({plates, captions, frameOverride}) => {
  const cur = useCurrentFrame();
  const frame = frameOverride ?? cur;
  const t = frame / FPS;
  const f = overlayAt(frame);
  return (
    <AbsoluteFill style={{background: '#000', fontSynthesis: 'none'}}>
      <Plate plates={plates} />
      <Labels f={f} />
      <Hook t={t} />
      <Tag />
      <Chapter t={t} />
      <Chips t={t} f={f} />
      <Statements f={f} />
      {captions && <Captions t={t} />}
      <Transition t={t} />
    </AbsoluteFill>
  );
};
