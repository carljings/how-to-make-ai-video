// data.ts: everything the v3 composition knows comes from four canonical / generated files:
//   v3/cues.json             the edit (sections, slates, titles, labels, palette, credit)
//   v3/timing.json           measured narration: clip windows, words, caption phrases (blender/tools/retime_v3.py)
//   src/v3/data/overlay.json per-frame vector graphics projected through the plate cameras (export_v3_overlay.py)
//   src/v3/data/plates.json  per-frame picture recipe + word anchors (export_v3_overlay.py)
import cues from '../../v3/cues.json';
import timing from '../../v3/timing.json';
import overlay from './data/overlay.json';
import plates from './data/plates.json';

export const FPS = cues.fps, W = cues.width, H = cues.height;
export const DURATION = cues.duration_s;
export const FRAMES = Math.round(DURATION * FPS);
export const CUES = cues;
export const PAL = cues.palette;
export const SANS = '"Roadster Film Sans", sans-serif';
export const A = plates.anchors as Record<string, number>;           // word anchors (film s), measured
export const POSTER = {w: plates.poster[0], h: plates.poster[1]};

export type Tone = 'white' | 'air' | 'gas' | 'force';
export type Phrase = {text: string; tone: Tone; start_s: number; end_s: number; words_end_s: number};
export type Line = {id: string; display: string; text: string; start_s: number; end_s: number; phrases: Phrase[];
  words: {text: string; start_s: number; end_s: number}[]};
export const LINES = timing.lines as unknown as Line[];
export const line = (id: string) => LINES.find((l) => l.id === id)!;

// plate recipe per film frame (blender/v3_film.plate_for)
export type PlateSpec =
  | {k: 'r'; f: number}                                              // per-frame render (or held frame)
  | {k: 's'; id: string; z: number}                                  // still + 2D push
  | {k: 'w'; a: string; b: string; z: number}                        // x-ray wipe a -> b (+ push)
  | {k: 'v2'; f: number}                                             // v2 clean plate, 1:1
  | {k: '0'} | {k: 'b'}                                              // black
  | {k: 'p'; crop: number[]; ghosts: {id: string; op: number}[]; live: {f?: number; still?: string} | null; cloud: number};
export const plateAt = (frame: number) => (plates.plates as unknown as PlateSpec[])[clampFrame(frame)];

// overlay frame (blender/v3_film.overlay; keys present only when drawn)
export type Seg = number[];                                          // [x0,y0,x1,y1, ...]
export type Arrow = (number | string)[];                             // [x0,y0,x1,y1,level,kind]
export type Ghost = {press?: Arrow | null; grav?: Arrow | null; pulse?: number; vcomp?: Seg};
export type OFrame = {
  f: number; s: string; ev?: number;
  air?: Seg[]; ticks?: Seg[]; gap?: {pts: number[][]; lv: number; label: number}; fan?: Seg[];
  grav?: Arrow | null; press?: Arrow | null; flash?: Seg | null; contact?: Seg[]; trac?: Arrow[];
  lip?: Seg | null; shards?: Seg[]; scan?: {p: number[]; axis: number[]; prog: number}; vl?: Seg;
  relay?: {pts: number[][]; prog: number; lv: number}; jet?: Seg[]; react?: Arrow[];
  ghosts?: Ghost[]; cold?: {jet: Seg[]; react: Arrow[]; lv: number; live?: boolean}[]; crop?: number[];
  loa?: Seg; com?: Seg; arm?: Seg; arc?: {pts: number[][]; lv: number; draw: number}; v2f?: number;
  sheet?: {pl: number[][][]; lv: number} | null;                    // v4 light-sheet intersections (polylines)
};
const OV = overlay as unknown as {frames: OFrame[]};
export const clampFrame = (f: number) => Math.max(0, Math.min(FRAMES - 1, Math.round(f)));
export const overlayAt = (frame: number): OFrame => OV.frames[clampFrame(frame)];

export const sectionAt = (t: number) => cues.sections.find((s) => t >= s.start && t < s.end) ?? cues.sections[cues.sections.length - 1];
export const SEC = Object.fromEntries(cues.sections.map((s) => [s.id, s])) as Record<string, (typeof cues.sections)[number]>;

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const ease = (x: number) => { const t = clamp(x); return 1 - Math.pow(1 - t, 3); };              // out-cubic
export const back = (x: number, k = 1.6) => { const t = clamp(x) - 1; return 1 + t * t * ((k + 1) * t + k); };   // out-back
export const ramp = (t: number, a: number, b: number) => (b > a ? smooth((t - a) / (b - a)) : t >= a ? 1 : 0);
export const win = (t: number, a: number, b: number, c: number, d: number) => Math.min(ramp(t, a, b), 1 - ramp(t, c, d));
export const toneColor = (tone: string) =>
  tone === 'gas' ? PAL.gas : tone === 'air' ? PAL.air : tone === 'force' ? '#FF6A42' : PAL.white;
// on-screen text: no trailing punctuation; an internal comma becomes a two-space pause (only audited glyphs are drawn)
export const display = (s: string) => s.replace(/[，。！？、；]+$/u, '').replace(/[，、；]/gu, '  ');
export const pad5 = (n: number) => String(n).padStart(5, '0');
