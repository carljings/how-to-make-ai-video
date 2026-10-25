// pixel.tsx: pixel art from text bitmaps. Each row is a string; each character names a colour in the palette and
// '.' is empty. Horizontal runs of one colour become one <rect>, so a sprite is a handful of SVG elements.
import React from 'react';

export type Palette = Record<string, string>;

export const Pix: React.FC<{rows: string[]; pal: Palette; x?: number; y?: number; u?: number; opacity?: number}> = ({rows, pal, x = 0, y = 0, u = 1, opacity}) => {
  const rects: React.ReactNode[] = [];
  rows.forEach((row, j) => {
    let i = 0;
    while (i < row.length) {
      const c = row[i];
      if (c === '.' || c === ' ' || !pal[c]) { i++; continue; }
      let k = i + 1;
      while (k < row.length && row[k] === c) k++;
      // overlap each rect by a hair so neighbouring runs never show a seam when scaled
      rects.push(<rect key={`${j}-${i}`} x={x + i * u} y={y + j * u} width={(k - i) * u + 0.02 * u} height={u * 1.02} fill={pal[c]} />);
      i = k;
    }
  });
  return <g opacity={opacity} shapeRendering="crispEdges">{rects}</g>;
};

// ---- shared sprites ----
export const HEART_ROWS = [
  '.rr...rr.',
  'rhhr.rrrr',
  'rhrrrrrrr',
  'rrrrrrrrr',
  '.rrrrrrr.',
  '..rrrrr..',
  '...rrr...',
  '....r....',
];
// The heart's outline on its 9×8 grid, clockwise: used as a clip path for the closing heart wipe
export const HEART_OUTLINE: [number, number][] = [
  [1, 0], [3, 0], [3, 1], [4, 1], [4, 2], [5, 2], [5, 1], [6, 1], [6, 0], [8, 0], [8, 1], [9, 1], [9, 4], [8, 4], [8, 5], [7, 5], [7, 6],
  [6, 6], [6, 7], [5, 7], [5, 8], [4, 8], [4, 7], [3, 7], [3, 6], [2, 6], [2, 5], [1, 5], [1, 4], [0, 4], [0, 1], [1, 1],
];
export const MINI_HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];

export const CURSOR_ROWS = [
  'k...........',
  'kk..........',
  'kwk.........',
  'kwwk........',
  'kwwwk.......',
  'kwwwwk......',
  'kwwwwwk.....',
  'kwwwwwwk....',
  'kwwwwwwwk...',
  'kwwwwwwwwk..',
  'kwwwwwwwwwk.',
  'kwwwwwwkkkkk',
  'kwwwkwwk....',
  'kwwkkwwk....',
  'kwk..kwwk...',
  'kk...kwwk...',
  'k.....kwwk..',
  '......kwwk..',
  '.......kk...',
];
