// fonts.ts: the v2 typeface, Roadster Film Sans (OFL Noto Sans SC subset built by Codex, support/fonts/), real static
// 300 / 600 / 900 faces. loadFont() holds each frame until the files are loaded: no fallback glyphs, no synthetic bold.
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const WEIGHTS = [300, 600, 900] as const;
export const fontsReady = Promise.all(
  WEIGHTS.map((w) => loadFont({family: 'Roadster Film Sans', url: staticFile(`fonts/roadster/RoadsterFilmSans-${w}.woff2`), weight: String(w), format: 'woff2'})),
);
