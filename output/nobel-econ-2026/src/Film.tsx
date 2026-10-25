// Film.tsx: the whole film. Each scene is a <Sequence> (so it shows by name in Remotion Studio) and draws itself from
// the absolute time t; the progress bar, the text beats, flashes and soundtrack sit above the scenes.
import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {FPS, FRAMES, SCENES, CUT_KIND, TRANSITION, NOBEL, scene, type SceneId} from './timeline';
import {SCENE_COMPONENTS} from './scenes';
import {Headline, Progress} from './ui/Type';
import {sceneStyle, WhipStreaks, Flash} from './ui/World';
import {C} from './lib/palette';
import './lib/fonts';

const FLASHES: [number, number][] = [[scene('split').a, 0.55], [NOBEL.medal, 0.25], [scene('crowd').a, 0.7]];

export const Film: React.FC<{audio?: boolean}> = ({audio = true}) => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{backgroundColor: C.navy}}>
      {SCENES.map((s, i) => {
        const next = SCENES[i + 1]?.id as SceneId | undefined;
        const from = Math.round(s.a * FPS), to = Math.min(FRAMES, Math.round((s.b + TRANSITION) * FPS));
        const Scene = SCENE_COMPONENTS[s.id];
        const style = sceneStyle(s.id, next, t, s.a, s.b);
        return (
          <Sequence key={s.id} from={from} durationInFrames={Math.max(1, to - from)} name={s.name}>
            {style && <AbsoluteFill style={{...style, transformOrigin: '50% 50%', overflow: 'hidden'}}><Scene t={t} /></AbsoluteFill>}
          </Sequence>
        );
      })}
      {SCENES.filter((s) => CUT_KIND[s.id] === 'whip').map((s) => <WhipStreaks key={s.id} t={t} at={s.a} />)}
      <Progress t={t} />
      <Headline t={t} />
      <Flash t={t} hits={FLASHES} />
      {audio && <Audio src={staticFile('score.wav')} />}
    </AbsoluteFill>
  );
};
