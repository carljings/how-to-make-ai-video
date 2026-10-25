// fonts.ts: the film's only typeface, Roadster Film Sans (open-licensed Noto Sans SC derivative, support/fonts/),
// shipped in public/fonts/roadster with real 500/700/900 faces. loadFont() holds every frame until the files are
// loaded, so nothing is ever drawn with a fallback font; only these three weights are used (no synthesised bold).
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const SANS = '"Roadster Film Sans", sans-serif';
export const WEIGHTS = [500, 700, 900] as const;

export const fontsReady = Promise.all(
  WEIGHTS.map((w) => loadFont({family: 'Roadster Film Sans', url: staticFile(`fonts/roadster/RoadsterFilmSans-${w}.woff2`), weight: String(w), format: 'woff2'})),
);
