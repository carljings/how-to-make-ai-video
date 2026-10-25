import React from 'react';
import {Composition, Still} from 'remotion';
import {Cover, CoverProps} from './Cover';
import {FPS, FRAMES, H, W} from './data';
import {V3Film, V3Props} from './Film';

// Finalizer contract (Codex): V3 {plateRoot}; covers {frame, plateRoot, height}. Plates are staged under
// public/<plateRoot>/new/{frames,stills,layers} and public/<plateRoot>/v2; fonts in public/fonts/roadster; grain in
// public/v2/grain. Proof stills render V3 itself at the exact frame index with native proof plates staged.
export const V3Root: React.FC = () => (
  <>
    <Composition id="V3" component={V3Film} durationInFrames={FRAMES} fps={FPS} width={W} height={H}
      defaultProps={{plateRoot: 'plates'} as V3Props} />
    <Still id="V3Cover" component={Cover} width={1080} height={1920} defaultProps={{frame: 48, plateRoot: 'plates', height: 1920} as CoverProps} />
    <Still id="V3Cover34" component={Cover} width={1080} height={1440} defaultProps={{frame: 48, plateRoot: 'plates', height: 1440} as CoverProps} />
  </>
);
