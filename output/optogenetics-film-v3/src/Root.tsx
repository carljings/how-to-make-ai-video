import React from 'react';
import {Composition, Still} from 'remotion';
import {Film} from './Film';
import {Cover} from './Cover';
import {W, H, FPS, FRAMES} from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
    <Still id="Cover" component={Cover} width={W} height={H} />
  </>
);
