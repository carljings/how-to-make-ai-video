import React from 'react';
import {Composition, Still} from 'remotion';
import {Film} from './Film';
import {Cover, Cover34, Cover43} from './Cover';
import {W, H, FPS, FRAMES} from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{audio: true}} />
    <Still id="Cover" component={Cover} width={W} height={H} />
    <Still id="Cover34" component={Cover34} width={1080} height={1440} />
    <Still id="Cover43" component={Cover43} width={1440} height={1080} />
  </>
);
