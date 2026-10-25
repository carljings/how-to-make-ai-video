// data.ts: the single cue table (blender/data/film_cues.json), the approved captions (support/narration) and the
// per-frame overlay generated from film.state() (blender/tools/export_overlay.py). Nothing here is hand-timed.
import cues from '../../blender/data/film_cues.json';
import captions from '../../support/narration/caption-cues.json';
import overlay from '../data/overlay.json';

export const FPS = 30, W = 1080, H = 1920;
export const DURATION = cues.duration_s;
export const FRAMES = Math.round(DURATION * FPS);
export const CUTS = cues.source_cuts_s;
export const SOURCE_END = 14;

export type Caption = {id: number; line_id: string; start_s: number; end_s: number; text: string; display_text: string};
export const CAPTIONS = captions.cues as Caption[];

// overlay frame: a act, s shot, r reserve, v vessels, l labels [id, ax, ay, bx, by, bw, bh, side, level], n notes
export type LabelRow = [string, number, number, number, number, number, number, string, number];
export type OverlayFrame = {a: string; s: string | null; r: number | null; v: number; l: LabelRow[]; n: [string, number][]};
export const OVERLAY = overlay as unknown as {texts: Record<string, string>; frames: OverlayFrame[]; label_px: number; sub_px: number; pad: [number, number]};
export const overlayAt = (frame: number): OverlayFrame => OVERLAY.frames[Math.max(0, Math.min(OVERLAY.frames.length - 1, frame))];
export const labelText = (id: string) => OVERLAY.texts[id];
export const noteText = (id: string) => OVERLAY.texts['note:' + id];

export const scene = (id: string) => cues.scenes.find((s) => s.id === id)!;
export const phrase = (lineId: string, k: number) => cues.lines.find((l) => l.id === lineId)!.phrases[k];

// explicit picture cuts after the source section: camera and CoM jump there (Codex review-02)
export const HARD_CUTS = [14, 40, 52.1];

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const win = (t: number, a: number, b: number, c: number, d: number) => Math.min(smooth((t - a) / (b - a)), 1 - smooth((t - c) / (d - c)));
