import {Composition, Still} from 'remotion';
import {Cover} from './film/Cover';
import {Film, FilmProps} from './film/Film';
import {FPS, FRAMES, H, W} from './film/data';
import plates from './data/plates.json';
import './lib/fonts';

const filmDefaults: FilmProps = {plates: plates as FilmProps['plates'], captions: true};

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={filmDefaults} />
    {/* one proof plate (render_film.py --proof-times) with the overlay of its frame: props {plates:{kind:'still',src}, frameOverride} */}
    <Composition id="Proof" component={Film} durationInFrames={1} fps={FPS} width={W} height={H}
      defaultProps={{plates: {kind: 'none'}, captions: true, frameOverride: 630} as FilmProps} />
    <Still id="Cover" component={Cover} width={1080} height={1920} defaultProps={{plate: 'plates/cover.png', height: 1920}} />
    <Still id="Cover34" component={Cover} width={1080} height={1440} defaultProps={{plate: 'plates/cover.png', height: 1440}} />
  </>
);
