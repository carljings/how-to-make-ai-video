// v3 uses the already-exercised codec, full-decode and audio checks from the v2 tool.
import {readFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyV2, measureAudio} from '../v2/verify.mjs';
export {measureAudio};
export const verifyV3 = verifyV2;
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).map((s) => {const i = s.indexOf('='); return [s.slice(2, i), s.slice(i + 1)];}));
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const cues = JSON.parse(readFileSync(join(root, 'v3/cues.json'), 'utf8'));
  const out = resolve(args.out); mkdirSync(out, {recursive: true});
  const result = verifyV3({video: resolve(args.video), out, expectFrames: Math.round(cues.duration_s * cues.fps), fps: cues.fps, width: cues.width, height: cues.height});
  process.exitCode = result.pass ? 0 : 1;
}
