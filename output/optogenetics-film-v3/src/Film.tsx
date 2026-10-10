// Film.tsx: the whole 64-second film. Each scene is a <Sequence> (so it shows by name in Remotion Studio) and
// draws itself from the absolute time t; the text, chapter strip, flashes and soundtrack sit above the scenes.
import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {FPS, DUR, SCENES, CUTS, type SceneId} from './timeline';
import {TextTrack} from './ui/Text';
import {ChapterStrip, Flash, shake, cutStyle, WhipStreaks, ZoomStreaks, LightLeak} from './ui/Hud';
import {SCENE_COMPONENTS} from './scenes';
import './lib/fonts';

const PRE = 0.75, POST = 0.3;

export const Film: React.FC<{audio?: boolean}> = ({audio = true}) => {
  const frame = useCurrentFrame(), t = frame / FPS;
  const [sx, sy, rot] = shake(t);
  // the electrode's zap and the cut into the quiz both glitch the type for a few frames
  const glitch = Math.max(t >= 14.5 && t < 14.9 ? 1 - (t - 14.5) / 0.4 : 0, Math.abs(t - 18) < 0.2 ? 1 - Math.abs(t - 18) / 0.2 : 0);
  return (
    <AbsoluteFill style={{backgroundColor: '#04070e'}}>
      <AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) rotate(${rot}deg) scale(${1 + Math.abs(rot) * 0.02})`}}>
        {SCENES.map((s) => {
          const from = Math.max(0, Math.round((s.a - PRE) * FPS)), to = Math.min(Math.round(DUR * FPS), Math.round((s.b + POST) * FPS));
          const Scene = SCENE_COMPONENTS[s.id as SceneId];
          return (
            <Sequence key={s.id} from={from} durationInFrames={to - from} name={s.name}>
              <SceneFrame id={s.id} t={t} Scene={Scene} />
            </Sequence>
          );
        })}
        {Object.entries(CUTS).map(([at, k]) => k === 'whip' ? <WhipStreaks key={at} t={t} at={+at} /> : k === 'zoom' ? <ZoomStreaks key={at} t={t} at={+at} /> : k === 'leak' ? <LightLeak key={at} t={t} at={+at} /> : null)}
      </AbsoluteFill>
      <AbsoluteFill style={{transform: `translate(${sx * 0.4}px, ${sy * 0.4}px)`}}>
        <TextTrack t={t} glitch={glitch} />
        <ChapterStrip t={t} />
      </AbsoluteFill>
      <Flash t={t} />
      {audio && <Audio src={staticFile('score.wav')} />}
    </AbsoluteFill>
  );
};

const SceneFrame: React.FC<{id: SceneId; t: number; Scene: React.FC<{t: number}>}> = ({id, t, Scene}) => {
  const style = cutStyle(id, t);
  if (!style) return null;
  return (
    <AbsoluteFill style={{...style, transformOrigin: '50% 50%'}}>
      <Scene t={t} />
    </AbsoluteFill>
  );
};
