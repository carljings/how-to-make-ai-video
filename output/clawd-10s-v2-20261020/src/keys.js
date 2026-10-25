// keys.js — the camera's key positions (pure data). Shared by motion.js (the camera path) and world.js (which keeps the
// plain of dominos out of the lens's way, so nothing ever blocks the view of Clawd).
import { CUES } from './cues.js';
const E = CUES.events, DROP = E.drop, BAR2 = E.bar_lines[1], BAR3 = E.bar_lines[2], END = CUES.end_s;
const V = (x, y, z) => [x, y, z];
export const KEYS = [
  // t, pos, look, fov, ease (into this key)
  [0.0, V(3.0, 3.40, 5.6), V(-5.0, 0.4, -6.0), 50, 'io'],     // reverse angle: Clawd + the waiting plain, clean sky for the title
  [1.36, V(4.0, 3.30, 5.4), V(-1.5, 0.4, -6.0), 50, 'io'],
  [1.80, V(0.0, 1.00, 3.9), V(3.2, 0.75, -1.4), 46, 'io'],
  [2.15, V(-3.8, 3.40, 5.6), V(11.0, 0.0, -4.5), 50, 'io'],
  [4.00, V(-4.5, 4.00, 6.0), V(12.0, -0.5, -5.0), 48, 'io'],
  [DROP, V(-4.3, 3.80, 5.7), V(12.5, 0.0, -5.0), 44, 'io'],
  [DROP + 0.9, V(-1.8, 6.40, 5.0), V(12.0, -5.0, -5.0), 56, 'expo'],
  [BAR2, V(-1.4, 5.40, 4.4), V(12.0, -4.0, -5.0), 54, 'io'],
  [BAR3, V(-1.0, 4.60, 4.3), V(11.0, -3.4, -5.0), 52, 'io'],
  [END, V(-1.2, 4.70, 4.6), V(11.0, -3.4, -5.0), 52, 'io'],
];
