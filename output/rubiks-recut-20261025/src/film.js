// film.js — entry. window.film = { ready, error, duration, render(t) }; every frame is a pure function of t.
import { W, H } from './lib/core.js';
import { initStage, film as grainPass } from './lib/stage.js';
import { buildSeqs } from './seqs.js';
import { CUE, DURATION } from './timeline.js';
import * as open from './scenes/open.js';
import * as origin from './scenes/origin.js';
import * as count from './scenes/count.js';
import * as twenty from './scenes/twenty.js';
import * as human from './scenes/human.js';
import * as methods from './scenes/methods.js';
import * as race from './scenes/race.js';
import * as ending from './scenes/ending.js';

const SCENES = [
  { t0: 0, t1: CUE.origin, m: open },
  { t0: CUE.origin, t1: CUE.count, m: origin },
  { t0: CUE.count, t1: CUE.twenty, m: count },
  { t0: CUE.twenty, t1: CUE.human, m: twenty },
  { t0: CUE.human, t1: CUE.methods, m: human },
  { t0: CUE.methods, t1: CUE.race, m: methods },
  { t0: CUE.race, t1: CUE.ending, m: race },
  { t0: CUE.ending, t1: CUE.end + 1, m: ending },
];

const LABEL = new URLSearchParams(location.search).has('label');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });

async function boot() {
  const faces = ['900 40px "F-Sans"', '700 40px "F-Sans"', '400 40px "F-Sans"', '800 40px "F-Cond"', '300 40px "F-Cond"', '500 40px "F-Mono"', '600 40px "F-Mono"'];
  await Promise.all(faces.map((f) => document.fonts.load(f, '魔方0123456789')));
  await Promise.all([...document.fonts].map((face) => face.load()));
  initStage();
  buildSeqs();
  for (const s of SCENES) if (s.m.init) s.m.init();
}

function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const s = SCENES.find((x) => t >= x.t0 && t < x.t1) || SCENES[SCENES.length - 1];
  ctx.save(); s.m.draw(ctx, t); ctx.restore();
  grainPass(ctx, t);
  if (LABEL) { ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, 330, 84); ctx.font = '700 60px "F-Mono"'; ctx.fillStyle = '#ffde59'; ctx.textBaseline = 'top'; ctx.fillText(t.toFixed(2), 14, 12); }
  return Promise.resolve();
}

window.film = { ready: false, error: null, duration: DURATION, render };
// soundtrack export (tools/render.mjs … audio OUT.wav)
window.scoreWav = async () => {
  const { renderScore, wav } = await import('./score.js');
  const w = wav(await renderScore());
  window.__wav = w.bytes;
  return { bytes: w.bytes.length, peak: w.peak, gain: w.gain };
};
window.wavChunk = (i, size) => {
  const b = window.__wav.subarray(i, i + size);
  let s = '';
  for (let j = 0; j < b.length; j += 0x8000) s += String.fromCharCode.apply(null, b.subarray(j, j + 0x8000));
  return btoa(s);
};
boot().then(() => { window.film.ready = true; }).catch((e) => { window.film.error = String(e && e.stack || e); });
