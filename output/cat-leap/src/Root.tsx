import React from 'react';
import {Composition} from 'remotion';
import {Film, FPS, W, H, FRAMES} from './Film';

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{audio: undefined as string | undefined}} />
  </>
);
