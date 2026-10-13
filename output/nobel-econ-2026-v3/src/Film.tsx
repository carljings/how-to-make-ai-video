// Film.tsx: the whole film. The three Seedance clips play in order (each a <Sequence>, named in Remotion Studio);
// the text, labels, subtitles and progress bar sit on top; the soundtrack (scripts/mix.mjs) plays underneath.
import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {FPS, CLIP_LIST} from './timeline';
import {Shades, Headline, Stamp, Laureates, Bubble, Poll, Captions, Progress} from './ui/Overlay';
import './lib/fonts';

export const Film: React.FC<{audio?: boolean}> = ({audio = true}) => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {CLIP_LIST.map((c) => (
        <Sequence key={c.id} from={Math.round(c.a * FPS)} durationInFrames={Math.round(c.dur * FPS)} name={c.id}>
          <OffthreadVideo src={staticFile(c.file)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Sequence>
      ))}
      <Shades t={t} />
      <Progress t={t} />
      <Headline t={t} />
      <Stamp t={t} />
      <Laureates t={t} />
      <Bubble t={t} />
      <Poll t={t} />
      <Captions t={t} />
      {audio && <Audio src={staticFile('mix.wav')} />}
    </AbsoluteFill>
  );
};
