import React from 'react';
import {Composition, Still} from 'remotion';
import {Film} from './Film';
import {Cover, Cover34, Cover43} from './Cover';
import {W, H, FPS, CUTS} from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition id="Full" component={Film} durationInFrames={CUTS.full.frames} fps={FPS} width={W} height={H} defaultProps={{cut: 'full' as const, audio: true}} />
    <Composition id="Short40" component={Film} durationInFrames={CUTS.short.frames} fps={FPS} width={W} height={H} defaultProps={{cut: 'short' as const, audio: true}} />
    <Still id="Cover" component={Cover} width={W} height={H} />
    <Still id="Cover34" component={Cover34} width={1080} height={1440} />
    <Still id="Cover43" component={Cover43} width={1440} height={1080} />
  </>
);
