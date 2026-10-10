// fonts.ts: the film's fonts ship in public/fonts (subsets made by scripts/fonts.py). loadFont() holds every
// render until the files are loaded, so no frame is ever drawn with a fallback font.
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const SERIF = '"Noto Serif SC", serif';
export const SANS = '"Noto Sans SC", sans-serif';
export const MONO = '"JetBrains Mono", "Noto Sans SC", monospace';

const faces: [string, string, number][] = [
  ['Noto Serif SC', 'NotoSerifSC', 900], ['Noto Sans SC', 'NotoSansSC', 700],
  ['JetBrains Mono', 'JetBrainsMono', 500], ['JetBrains Mono', 'JetBrainsMono', 800],
];
export const fontsReady = Promise.all(
  faces.map(([family, stem, weight]) => loadFont({family, url: staticFile(`fonts/${stem}-${weight}.woff2`), weight: String(weight), format: 'woff2'})),
);
