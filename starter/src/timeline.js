// timeline.js: the single source of truth. Picture, captions and sound all read these numbers,
// so moving a cue here moves the image and the sound together.
import { seg, easeInOut } from './lib.js';

export const W = 1920, H = 1080, FPS = 30, DUR = 15;

export const CUE = {
  spark: 1.0, // the first point of light (and the first bell)
  grow: [4.2, 9.4], // seeds appear, each turned 137.5° from the last
  gather: [9.4, 11.0], // the seeds fall into a line
  title: 10.6, // the title lands (low boom)
};

// [scene, start, end]: a scene is drawn only inside its window
export const SCENES = [
  ['spark', 0, 5.2],
  ['swarm', 4.0, DUR],
  ['title', 10.2, DUR],
];

// [start, end, text]
export const CAPTIONS = [
  [1.6, 4.4, 'Every frame is a function of time.'],
  [5.0, 9.0, 'Same t in, same picture out, so frames can render in any order.'],
];

// How many seeds are visible at time t. The score reads this too, to ring a bell on each Fibonacci number.
export const SEEDS = 610;
export const seedCount = t => Math.floor(1 + (SEEDS - 1) * easeInOut(seg(t, CUE.grow[0], CUE.grow[1])));
