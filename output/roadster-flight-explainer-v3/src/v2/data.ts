// data.ts: everything the v2 composition knows comes from three generated/canonical files:
//   v2/cues.json            the edit (sections, beats, voice starts, titles, slates, labels, palette)
//   v2/timing.json          measured narration: clip starts/ends, word and caption-phrase windows (retime_v2.py)
//   src/v2/data/overlay.json per-frame vector graphics projected through the plate camera (export_v2_overlay.py)
import cues from '../../v2/cues.json';
import timing from '../../v2/timing.json';
import overlay from './data/overlay.json';

export const FPS = cues.fps, W = cues.width, H = cues.height;
export const DURATION = cues.duration_s;
export const FRAMES = Math.round(DURATION * FPS);
export const CUES = cues;
export const BEAT = cues.beats as Record<string, number>;
export const PALETTE = cues.palette;
export const SANS = '"Roadster Film Sans", sans-serif';

export type Phrase = {text: string; tone: 'white' | 'gas' | 'force'; start_s: number; end_s: number; words_end_s: number};
export type Line = {id: string; file: string; text: string; caption: string; start_s: number; end_s: number; dur_s: number; phrases: Phrase[]; words: {text: string; start_s: number; end_s: number}[]};
export const LINES = timing.lines as Line[];
export const line = (id: string) => LINES.find((l) => l.id === id)!;

// overlay frame (see blender/tools/export_v2_overlay.py)
export type OFrame = {
  f: number; s: string; ev: number;
  p?: number[][];                                   // particles [x0,y0,x1,y1,w,a] (head, tail)
  b?: (string | number)[][];                        // force lines [port,x0,y0,x1,y1,level]
  l?: (string | number)[][];                        // line of action
  c?: number[];                                     // CoM [x,y,level]
  arm?: number[];                                   // CoM -> line of action [x0,y0,x1,y1,level]
  a?: {pts: number[][]; lv: number; draw: number};  // torque arc
  fl?: {paths: [string, number[][]][]; lv: number; phase: number};
  vl?: number[];                                    // vessel label anchor [x,y,level]
};
const OV = overlay as unknown as {frames: OFrame[]};
export const overlayAt = (frame: number): OFrame => OV.frames[Math.max(0, Math.min(OV.frames.length - 1, frame))];

export const sectionAt = (t: number) => cues.sections.find((s) => t >= s.start && t < s.end) ?? cues.sections[cues.sections.length - 1];

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const ease = (x: number) => { const t = clamp(x); return 1 - Math.pow(1 - t, 3); };           // out-cubic
export const ramp = (t: number, a: number, b: number) => (b > a ? smooth((t - a) / (b - a)) : t >= a ? 1 : 0);
export const win = (t: number, a: number, b: number, c: number, d: number) => Math.min(ramp(t, a, b), 1 - ramp(t, c, d));
export const toneColor = (tone: string) => (tone === 'gas' ? PALETTE.gas : tone === 'force' ? '#FF6A42' : PALETTE.white);
// caption display: no trailing punctuation; internal commas become a pause of two plain spaces (white-space: pre),
// so only glyphs already in the audited subset are drawn
export const display = (s: string) => s.replace(/[，。！？、]+$/u, '').replace(/[，、]/gu, '  ');
