// Offline Canvas adapter. The scene modules and their time functions are shared with the HTML preview.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

process.env.DISABLE_SYSTEM_FONTS_LOAD = '1';
export const { createCanvas, GlobalFonts } = await import('@napi-rs/canvas');
export const ROOT = fileURLToPath(new URL('../', import.meta.url));

export async function openFilm(project = ROOT) {
  const meta = JSON.parse(fs.readFileSync(path.join(project, 'src/fonts/fonts.json'), 'utf8'));
  const registered = new Set();
  for (const face of meta.faces) {
    const split = face.family_in_page === 'F-Sans' || face.family_in_page === 'F-Serif';
    const key = `${face.family_in_page}/${face.weight}`;
    if (registered.has(key)) continue;
    const file = split ? path.join('native', `${face.family_in_page === 'F-Sans' ? 'sans' : 'serif'}-${face.weight}.ttf`) : face.file;
    if (!GlobalFonts.registerFromPath(path.join(project, 'src/fonts', file), face.family_in_page)) {
      throw new Error(`Font registration failed: ${face.file}`);
    }
    registered.add(key);
  }
  const canvas = createCanvas(1080, 1920);
  globalThis.document = {
    getElementById: () => canvas,
    createElement(tag) { if (tag !== 'canvas') throw new Error(`Unsupported element: ${tag}`); return createCanvas(300, 150); },
    fonts: { load: async () => [] },
  };
  globalThis.window = {};
  globalThis.location = { search: '' };
  await import(pathToFileURL(path.join(project, 'src/film.js')));
  const begin = Date.now();
  while (!window.film.ready) {
    if (window.film.error) throw new Error(window.film.error);
    if (Date.now() - begin > 10000) throw new Error('Film initialisation timed out');
    await new Promise((resolve) => setImmediate(resolve));
  }
  return { canvas, render: window.film.render, duration: window.film.duration };
}
