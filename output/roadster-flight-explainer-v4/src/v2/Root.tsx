import React from 'react';
import {Composition, Still} from 'remotion';
import {Cover} from './Cover';
import {FPS, FRAMES, H, W} from './data';
import {V2Film, V2Props} from './V2Film';

export const V2Root: React.FC = () => (
  <>
    <Composition id="V2" component={V2Film} durationInFrames={FRAMES} fps={FPS} width={W} height={H}
      defaultProps={{plates: {kind: 'none'}} as V2Props} />
    {/* one proof plate (render_v2.py --times/--proof) with the overlay and type of its frame */}
    <Composition id="V2Still" component={V2Film} durationInFrames={1} fps={FPS} width={W} height={H}
      defaultProps={{plates: {kind: 'none'}, frame: 0} as V2Props} />
    <Still id="V2Cover" component={Cover} width={1080} height={1920} defaultProps={{plate: 'plates/cover.png', height: 1920}} />
    <Still id="V2Cover34" component={Cover} width={1080} height={1440} defaultProps={{plate: 'plates/cover.png', height: 1440}} />
  </>
);
