#!/usr/bin/env node
// score.mjs — v6 「空气现形」: the original procedural score + sound design for the voice-free cut. Every cue is an
// instant of web/engine/cues.js (the E events and the CARDS line entries), the same schedule the picture uses; nothing
// here reads speech, TTS, word timings or the v5 master. Deterministic (seeded PRNG, no samples). Writes a 48 kHz /
// 24-bit stereo WAV that runs a little past the film (tools/mix.mjs trims it to FRAMES / FPS exactly) and a cue sheet
// (score.cues.json) with every named hit, its time and its frame.
//   node tools/score.mjs [--out /ABS/out/audio/score.wav]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SR, TAU, Bus, rng, panLR, clamp, smooth, envAD, bell, sawBlep, Biquad, freeverb, softclip, writeWav } from './dsp.mjs';
import { E, END, FPS, FRAMES, CARDS } from '../web/engine/cues.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const DUR = END + 0.6;
const R = rng(181018);

const dry = new Bus(DUR);      // direct
const send = new Bus(DUR);     // → reverb
const groove = new Bus(DUR);   // rhythmic bed
const sheet = [];              // the named hits, for the cue sheet
const cue = (name, t) => { sheet.push({ name, t: +t.toFixed(4), frame: Math.round(t * FPS) }); return t; };

const I = (t) => Math.round(t * SR);
function put(bus, t0, n, fn, pan = 0) {
  const [gl, gr] = panLR(pan);
  const i0 = I(t0);
  for (let k = 0; k < n; k++) { const v = fn(k / SR, k); bus.add(i0 + k, v * gl, v * gr); }
}

// ------------------------------------------------------------------------------------------------ instruments
function boom(t0, { gain = 1, f0 = 95, f1 = 34, dur = 1.6, click = 1, rev = 0.25 } = {}) {
  let ph = 0;
  const hp = new Biquad('hp', 2500, 0.7);
  put(dry, t0, I(dur), (t) => {
    const f = f1 + (f0 - f1) * Math.exp(-t / 0.07);
    ph += TAU * f / SR;
    const body = Math.sin(ph) * envAD(t, 0.003, 0.5) + 0.35 * Math.sin(ph * 0.5) * envAD(t, 0.01, 0.9);
    const ck = hp.run(R() * 2 - 1) * Math.exp(-t / 0.006) * click;
    return Math.tanh((body * 1.4 + ck * 0.6) * gain) * 0.9;
  });
  put(send, t0, I(0.4), (t) => (R() * 2 - 1) * Math.exp(-t / 0.08) * 0.5 * rev * gain);
}

function noiseSweep(t0, dur, { f0 = 400, f1 = 3000, q = 1.2, gain = 0.3, pan0 = -0.5, pan1 = 0.5, shape = bell, rev = 0.3 } = {}) {
  const bp = new Biquad('bp', f0, q);
  const n = I(dur), i0 = I(t0);
  for (let k = 0; k < n; k++) {
    const u = k / n;
    if (k % 32 === 0) bp.set(f0 * Math.pow(f1 / f0, u), q);
    const v = bp.run(R() * 2 - 1) * shape(u * dur, dur) * gain;
    const [gl, gr] = panLR(pan0 + (pan1 - pan0) * u);
    dry.add(i0 + k, v * gl, v * gr);
    send.add(i0 + k, v * gl * rev, v * gr * rev);
  }
}

function riser(t0, t1, { gain = 0.25 } = {}) {
  const n = I(t1 - t0), i0 = I(t0);
  const hp = new Biquad('hp', 200, 0.8);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const u = k / n;
    if (k % 32 === 0) hp.set(200 * Math.pow(30, u), 0.9);
    const f = 110 * Math.pow(4, u);
    ph = (ph + f / SR) % 1;
    const v = (hp.run(R() * 2 - 1) * 0.8 + sawBlep(ph, f / SR) * 0.12) * Math.pow(u, 2.2) * gain;
    dry.add(i0 + k, v, v);
    send.add(i0 + k, v * 0.4, v * 0.4);
  }
}

function ping(t0, { gain = 0.5 } = {}) {
  // sonar: a glassy fifth with a long tail over a low thoom, a reverse shimmer swelling into it
  const partials = [[1318.5, 1.0], [1975.5, 0.55], [2637.0, 0.25], [3951, 0.08]];
  put(dry, t0, I(2.8), (t) => {
    let v = 0;
    for (const [f, a] of partials) v += Math.sin(TAU * f * t + 0.3 * Math.sin(TAU * 5.5 * t)) * a;
    return v * envAD(t, 0.002, 0.7) * 0.22 * gain;
  });
  put(send, t0, I(2.8), (t) => {
    let v = 0;
    for (const [f, a] of partials) v += Math.sin(TAU * f * t) * a;
    return v * envAD(t, 0.002, 0.5) * 0.5 * gain;
  });
  boom(t0, { gain: 0.7 * gain / 0.5, f0: 70, f1: 38, dur: 1.4, click: 0.2, rev: 0.1 });
  const n = I(0.5), tmp = new Float32Array(n);
  for (let k = 0; k < n; k++) { const t = k / SR; tmp[k] = (Math.sin(TAU * 2637 * t) * 0.5 + Math.sin(TAU * 3520 * t) * 0.3 + (R() - 0.5) * 0.3) * Math.exp(-t / 0.15); }
  const i0 = I(t0 - 0.5);
  for (let k = 0; k < n; k++) { const v = tmp[n - 1 - k] * 0.12 * gain; dry.add(i0 + k, v * 0.8, v); send.add(i0 + k, v, v); }
}

function impact(t0, { gain = 1 } = {}) {
  boom(t0, { gain: 1.25 * gain, f0: 120, f1: 32, dur: 2.2, click: 1.2, rev: 0.6 });
  const bp = new Biquad('bp', 1800, 2.5);               // metallic stamp + crash
  put(dry, t0, I(1.6), (t) => bp.run(R() * 2 - 1) * envAD(t, 0.001, 0.25) * 0.35 * gain);
  put(send, t0, I(1.8), (t) => (R() * 2 - 1) * envAD(t, 0.001, 0.5) * 0.35 * gain);
  const lp = new Biquad('lp', 2400, 0.9);               // low braam chord, filter closing
  const fs_ = [55, 82.4, 110, 164.8];
  const ph = fs_.map(() => R());
  put(dry, t0, I(2.4), (t, k) => {
    if (k % 32 === 0) lp.set(150 + 2200 * Math.exp(-t / 0.35), 0.9);
    let v = 0;
    fs_.forEach((f, j) => { ph[j] = (ph[j] + f * (1 + 0.003 * j) / SR) % 1; v += sawBlep(ph[j], f / SR); });
    return Math.tanh(lp.run(v * 0.3) * 2.0) * envAD(t, 0.005, 0.9) * 0.32 * gain;
  });
}

function glitch(t0, { gain = 0.35 } = {}) {
  put(dry, t0, I(0.32), (t) => {
    const hold = Math.floor(t * 900) / 900;
    const v = Math.sin(TAU * (900 - 2400 * t) * hold) > 0 ? 1 : -1;
    const n = (R() * 2 - 1) * 0.6;
    return (v * 0.4 + n) * Math.floor(envAD(t, 0.001, 0.08) * 8) / 8 * gain;
  }, 0.2);
  put(send, t0, I(0.2), (t) => (R() * 2 - 1) * envAD(t, 0.001, 0.05) * 0.4 * gain);
}

function fall(t0, { gain = 0.22 } = {}) {
  let ph = 0;
  put(dry, t0, I(0.7), (t) => { const f = 1400 * Math.pow(0.12, t / 0.7); ph += TAU * f / SR; return Math.sin(ph) * bell(t, 0.7) * gain; }, -0.2);
  noiseSweep(t0, 0.6, { f0: 3500, f1: 300, q: 1.5, gain: 0.18, pan0: 0.3, pan1: -0.4 });
}

function dust(t0, t1, density, gain) {
  const n = Math.round((t1 - t0) * density);
  for (let j = 0; j < n; j++) {
    const t = t0 + R() * (t1 - t0);
    const f = 3500 + R() * 6000, a = gain * (0.3 + R() * 0.7), pan = R() * 2 - 1;
    put(dry, t, I(0.09), (u) => Math.sin(TAU * f * u) * Math.exp(-u / 0.018) * a, pan);
    put(send, t, I(0.05), (u) => Math.sin(TAU * f * u) * Math.exp(-u / 0.018) * a * 1.5, pan);
  }
}

function drone(t0, t1, level, f = [55, 55.4, 82.6]) {
  const lp = new Biquad('lp', 160, 0.8), lp2 = new Biquad('lp', 160, 0.8);
  const ph = f.map(() => R());
  const n = I(t1 - t0), i0 = I(t0);
  for (let k = 0; k < n; k++) {
    const t = t0 + k / SR;
    let v = 0;
    f.forEach((fr, j) => { ph[j] = (ph[j] + fr / SR) % 1; v += sawBlep(ph[j], fr / SR); });
    if (k % 64 === 0) { const c = 120 + 80 * (0.5 + 0.5 * Math.sin(TAU * 0.13 * t)); lp.set(c); lp2.set(c * 1.1); }
    const g = level(t) * 0.11;
    dry.add(i0 + k, lp.run(v) * g, lp2.run(v) * g);
  }
}

function fan(t0, t1, speed, gain) {
  // blade-pass whine + air rush; speed(t) 0..1+
  const bp = new Biquad('bp', 800, 3), rush = new Biquad('bp', 900, 0.8);
  let ph = 0;
  const n = I(t1 - t0), i0 = I(t0);
  for (let k = 0; k < n; k++) {
    const t = t0 + k / SR;
    const s = speed(t);
    const f = 90 + 360 * s;
    ph = (ph + f / SR) % 1;
    if (k % 64 === 0) { bp.set(f * 3, 4); rush.set(600 + 1800 * s, 0.7); }
    const whine = bp.run(sawBlep(ph, f / SR)) * 0.5 + Math.sin(TAU * ph * 6) * 0.04;
    const air = rush.run(R() * 2 - 1) * 0.6;
    const v = (whine * s + air * s * s) * gain;
    dry.add(i0 + k, v * 0.9, v);
  }
}

function suction(t0, dur, gain) {
  // air pulled into the fans: low-passed noise sweeping down + a swirling tremolo
  const lp = new Biquad('lp', 4000, 1.4);
  const n = I(dur), i0 = I(t0);
  for (let k = 0; k < n; k++) {
    const u = k / n;
    if (k % 32 === 0) lp.set(4500 * Math.pow(0.06, u), 2.0);
    const trem = 0.65 + 0.35 * Math.sin(TAU * (3 + 9 * u) * k / SR);
    const v = lp.run(R() * 2 - 1) * Math.sin(Math.PI * Math.min(1, u * 1.4)) ** 2 * trem * gain;
    const [gl, gr] = panLR(Math.sin(TAU * 1.3 * k / SR) * 0.6);
    dry.add(i0 + k, v * gl, v * gr);
    send.add(i0 + k, v * 0.3, v * 0.3);
  }
}

function airPad(t0, t1, level) {
  // the air made audible: soft high partials + breath noise, slow movement
  const notes = [440, 659.3, 987.8, 1318.5, 1760];
  const hp = new Biquad('bp', 4200, 0.9), hp2 = new Biquad('bp', 4400, 0.9);
  const n = I(t1 - t0), i0 = I(t0);
  for (let k = 0; k < n; k++) {
    const t = t0 + k / SR;
    let v = 0;
    notes.forEach((f, j) => { v += Math.sin(TAU * f * t + j) * (0.5 + 0.5 * Math.sin(TAU * (0.07 + 0.03 * j) * t + j * 1.7)) / (1 + j * 0.6); });
    const br = (R() * 2 - 1);
    const g = level(t);
    const breath = 0.012 * (0.6 + 0.4 * Math.sin(TAU * 0.21 * t));
    dry.add(i0 + k, (v * 0.03 + hp.run(br) * breath) * g, (v * 0.03 + hp2.run(br) * breath) * g);
    send.add(i0 + k, v * 0.03 * g, v * 0.03 * g);
  }
}

function rain(t0, t1, level, tone) {
  // pressure as countless tiny impacts (the gold glints): level(t) is the density 0..1, tone(t) the brightness
  const n = Math.round((t1 - t0) * 420);
  for (let j = 0; j < n; j++) {
    const t = t0 + R() * (t1 - t0);
    const lv = level(t);
    if (R() > lv) continue;
    const f = 2400 + R() * 5000 * tone(t), a = 0.05 + R() * 0.07, pan = R() * 1.6 - 0.8;
    put(dry, t, I(0.02), (u) => Math.sin(TAU * f * u) * Math.exp(-u / 0.004) * a, pan);
  }
}

function kick(t0, gain) {
  let ph = 0;
  put(groove, t0, I(0.45), (t) => { const f = 45 + 80 * Math.exp(-t / 0.04); ph += TAU * f / SR; return Math.tanh(Math.sin(ph) * 1.8) * envAD(t, 0.002, 0.18) * gain; });
}
function hat(t0, gain, pan) {
  const hp = new Biquad('hp', 7500, 0.8);
  put(groove, t0, I(0.06), (t) => hp.run(R() * 2 - 1) * Math.exp(-t / 0.012) * gain, pan);
}
function bass(t0, dur, f, gain) {
  const lp = new Biquad('lp', 300, 1.1);
  let ph = 0;
  put(groove, t0, I(dur), (t, k) => {
    ph = (ph + f / SR) % 1;
    if (k % 32 === 0) lp.set(180 + 600 * Math.exp(-t / 0.08), 1.2);
    return lp.run(sawBlep(ph, f / SR)) * envAD(t, 0.004, dur * 0.6) * gain;
  });
}

function lock(t0, gain) {
  boom(t0, { gain: 0.9 * gain, f0: 140, f1: 48, dur: 1.4, click: 0.8, rev: 0.4 });
  put(dry, t0, I(1.8), (t) => (Math.sin(TAU * 1760 * t) * 0.5 + Math.sin(TAU * 2349 * t) * 0.3) * envAD(t, 0.001, 0.4) * 0.12 * gain, 0.1);
  put(send, t0, I(1.8), (t) => Math.sin(TAU * 1760 * t) * envAD(t, 0.001, 0.4) * 0.3 * gain);
}

function chord(t0, t1, freqs, gain, { attack = 0.6, release = 0.8, bright = 1400 } = {}) {
  const lp = new Biquad('lp', bright, 0.7), lp2 = new Biquad('lp', bright * 1.07, 0.7);
  const ph = freqs.map(() => R());
  const n = I(t1 - t0), i0 = I(t0);
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    let v = 0;
    freqs.forEach((f, j) => { ph[j] = (ph[j] + f * (1 + 0.002 * Math.sin(TAU * 0.3 * t + j)) / SR) % 1; v += sawBlep(ph[j], f / SR); });
    const g = Math.min(1, t / attack) * Math.min(1, (n - k) / SR / release) * gain * 0.06;
    dry.add(i0 + k, lp.run(v) * g, lp2.run(v) * g);
    send.add(i0 + k, v * g * 0.3, v * g * 0.3);
  }
}

function hiss(t0, dur, { gain = 0.2, f0 = 2600, f1 = 1800, q = 0.5, pan = 0, attack = 0.04, release = 0.3, flutter = 7 } = {}) {
  // cold gas through a nozzle: band-passed noise, a slow sweep, a soft attack and tail
  const bp = new Biquad('bp', f0, q), bp2 = new Biquad('bp', f0 * 1.07, q);
  const n = I(dur), i0 = I(t0);
  const [gl, gr] = panLR(pan);
  for (let k = 0; k < n; k++) {
    const u = k / n, tt = k / SR;
    if (k % 32 === 0) { bp.set(f0 * Math.pow(f1 / f0, u), q); bp2.set(f0 * 1.07 * Math.pow(f1 / f0, u), q); }
    const env = Math.min(1, tt / attack) * Math.min(1, (dur - tt) / release) * (0.88 + 0.12 * Math.sin(TAU * flutter * tt));
    const l = bp.run(R() * 2 - 1) * env * gain, r = bp2.run(R() * 2 - 1) * env * gain;
    dry.add(i0 + k, l * gl * 1.2, r * gr * 1.2);
    send.add(i0 + k, l * 0.2, r * 0.2);
  }
}

function shatter(t0, { gain = 0.3 } = {}) {
  // the push breaking: a spray of glassy grains across the stereo field, decaying
  for (let j = 0; j < 160; j++) {
    const t = t0 + Math.pow(R(), 2) * 1.1;
    const f = 2200 + R() * 7000, a = gain * (0.25 + R() * 0.75) * Math.exp(-(t - t0) * 2.2), pan = R() * 2 - 1;
    put(dry, t, I(0.12), (u) => Math.sin(TAU * f * u) * Math.exp(-u / 0.03) * a, pan);
    put(send, t, I(0.08), (u) => Math.sin(TAU * f * u) * Math.exp(-u / 0.03) * a * 0.8, pan);
  }
  noiseSweep(t0, 0.6, { f0: 6000, f1: 1500, q: 0.8, gain: 0.4 * gain, pan0: -0.5, pan1: 0.5, shape: (t) => Math.exp(-t * 6) });
}

function wind(t0, t1, level) {
  // falling: low rushing air
  const lp = new Biquad('lp', 400, 0.7), lp2 = new Biquad('lp', 420, 0.7);
  const n = I(t1 - t0), i0 = I(t0);
  for (let k = 0; k < n; k++) {
    const t = t0 + k / SR;
    if (k % 64 === 0) { const c = 250 + 450 * (0.5 + 0.5 * Math.sin(TAU * 0.37 * t)); lp.set(c, 0.8); lp2.set(c * 1.12, 0.8); }
    const g = level(t) * 0.5;
    dry.add(i0 + k, lp.run(R() * 2 - 1) * g, lp2.run(R() * 2 - 1) * g);
  }
}

function stab(t0, freqs, { gain = 0.3, dur = 0.5, bright = 3000 } = {}) {
  const lp = new Biquad('lp', bright, 0.9);
  const ph = freqs.map(() => R());
  put(dry, t0, I(dur + 0.4), (t, k) => {
    if (k % 32 === 0) lp.set(250 + bright * Math.exp(-t / 0.12), 0.9);
    let v = 0;
    freqs.forEach((f, q) => { ph[q] = (ph[q] + f / SR) % 1; v += sawBlep(ph[q], f / SR); });
    return Math.tanh(lp.run(v * 0.25) * 2) * envAD(t, 0.003, dur * 0.45) * gain;
  });
  put(send, t0, I(dur), (t) => (R() * 2 - 1) * envAD(t, 0.001, 0.1) * 0.15 * gain);
}

function ting(t0, f = 2637, gain = 0.25, b = dry, s2 = send) {
  put(b, t0, I(2.6), (t) => (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.01 * t)) * envAD(t, 0.002, 0.6) * 0.2 * gain);
  put(s2, t0, I(2.6), (t) => Math.sin(TAU * f * t) * envAD(t, 0.002, 0.9) * 0.4 * gain);
}

function scanSweep(t0, dur, gain = 0.2) {
  // a scanner bar: falling tone with a buzz, swept across
  let ph = 0;
  put(dry, t0, I(dur), (t) => { const f = 3400 * Math.pow(0.22, t / dur); ph += TAU * f / SR; return (Math.sin(ph) * 0.6 + Math.sin(ph * 3) * 0.12) * bell(t, dur) * gain; });
  noiseSweep(t0, dur, { f0: 5000, f1: 900, q: 2.5, gain: gain * 0.5, pan0: 0.6, pan1: -0.6 });
}

function crackle(t0, t1, density, level) {
  // crowded gas: dense, fast clicks
  const n = Math.round((t1 - t0) * density);
  for (let q = 0; q < n; q++) {
    const t = t0 + R() * (t1 - t0);
    const f = 4000 + R() * 8000, a = level(t) * (0.3 + R() * 0.7), pan = R() * 1.6 - 0.8;
    if (a <= 0) continue;
    put(dry, t, I(0.012), (u) => Math.sin(TAU * f * u) * Math.exp(-u / 0.0018) * a, pan);
  }
}

function freeze(t0, dur, gain = 0.25) {
  // time stops: a reverse swell into a suspended glassy cluster
  const n = I(0.6), tmp = new Float32Array(n);
  for (let k = 0; k < n; k++) { const t = k / SR; tmp[k] = (Math.sin(TAU * 880 * t) + Math.sin(TAU * 1318.5 * t) * 0.6 + (R() - 0.5) * 0.5) * Math.exp(-t / 0.2); }
  const i0 = I(t0 - 0.6);
  for (let k = 0; k < n; k++) { const v = tmp[n - 1 - k] * 0.2 * gain; dry.add(i0 + k, v, v); send.add(i0 + k, v, v); }
  const fr = [659.3, 987.8, 1318.5, 1975.5];
  put(dry, t0, I(dur), (t) => { let v = 0; fr.forEach((f, q) => { v += Math.sin(TAU * f * t + q) * (1 / (1 + q)); }); return v * 0.24 * gain * Math.min(1, t / 0.05) * Math.min(1, (dur - t) / 0.2); });
  put(send, t0, I(dur), (t) => Math.sin(TAU * 1318.5 * t) * 0.3 * gain * Math.min(1, (dur - t) / 0.2));
}

function gliss(t0, dur, f0, f1, gain = 0.15) {
  let ph = 0;
  put(dry, t0, I(dur), (t) => { const f = f0 * Math.pow(f1 / f0, t / dur); ph += TAU * f / SR; return Math.sin(ph) * bell(t, dur) * gain; }, 0.2);
  put(send, t0, I(dur), (t) => Math.sin(TAU * f0 * Math.pow(f1 / f0, t / dur) * t) * bell(t, dur) * gain * 0.5);
}

function rumble(t0, t1, level) {
  // tyre on concrete: low noise with a rotation flutter
  const lp = new Biquad('lp', 180, 0.9);
  const n = I(t1 - t0), i0 = I(t0);
  for (let k = 0; k < n; k++) {
    const t = t0 + k / SR;
    const v = lp.run(R() * 2 - 1) * (0.7 + 0.3 * Math.sin(TAU * 11 * t)) * level(t) * 0.6;
    dry.add(i0 + k, v, v);
  }
}

function airTick(t0, gain = 0.05) {
  // a card lands: a very soft breath of air with a glassy point (hero lines only)
  const bp = new Biquad('bp', 5200, 1.6);
  put(dry, t0, I(0.12), (t) => (bp.run(R() * 2 - 1) * 0.8 + Math.sin(TAU * 4186 * t) * 0.35) * envAD(t, 0.004, 0.03) * gain, 0.15);
  put(send, t0, I(0.08), (t) => Math.sin(TAU * 4186 * t) * envAD(t, 0.002, 0.05) * gain * 0.8);
}

// a tempo grid shared by every groove section: 100 bpm from the first groove downbeat, the 压 impact
const beat = 60 / 100, G0 = E.press;
function grooveSection(t0, t1, { level = () => 1, hats = true, kicks = 1, bassNotes = [55, 55, 65.4, 49], bassGain = 0.22, half = false } = {}) {
  let k = Math.ceil((t0 - G0) / (beat / 2) - 1e-9);
  for (let t = G0 + k * (beat / 2); t < t1 - 0.05; k++, t = G0 + k * (beat / 2)) {
    const lv = level(t);
    if (lv <= 0) continue;
    const every = half ? 8 : 4;
    if (k % every === 0) kick(t, 0.55 * lv * kicks);
    if (hats) hat(t, (k % 2 ? 0.05 : 0.09) * lv, k % 2 ? 0.4 : -0.4);
    if (k % 2 === 0) bass(t, beat * 0.9, bassNotes[Math.floor(k / 2) % bassNotes.length], bassGain * lv);
  }
}

// ------------------------------------------------------------------------------------------------ the cue sheet
const lin = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
const winf = (x, a, b, c, d) => Math.min(lin(x, a, b), 1 - lin(x, c, d));

// A1 倒挂 (frame-0 poster): a sub slam on frame 0, a low drone, glassy dust ticks, the fans idling
boom(cue('hook slam', E.hook), { gain: 1.0, f0: 110, f1: 32, dur: 2.4, click: 1.0, rev: 0.5 });
noiseSweep(E.hook, 1.2, { f0: 2500, f1: 250, q: 0.9, gain: 0.22, pan0: 0.4, pan1: -0.4 });
drone(E.hook, E.cut23 + 0.25, (t) => Math.min(1, t / 0.3) * (1 - lin(t, E.cut23 - 0.05, E.cut23 + 0.25)) * (0.8 + 0.4 * lin(t, E.cut12, E.cut23)));
fan(E.hook, E.cut23, (t) => 0.15 + 0.85 * smooth((t - E.cut12) / (E.cut23 - E.cut12)), 0.12);
dust(E.hook, E.cut12, 16, 0.06);
noiseSweep(E.cut12 - 0.28, 0.3, { f0: 300, f1: 4000, q: 1.0, gain: 0.2, shape: (t, d) => (t / d) ** 2 });
boom(cue('cut A1→A2', E.cut12), { gain: 0.45, f0: 90, f1: 40, dur: 0.8, click: 0.6, rev: 0.2 });

// A2 被吸住的？ the fans spool up and suck; 吸 cracks as a glitch; a breath of near-silence
suction(E.xi - 0.05, Math.max(0.3, E.crack - E.xi + 0.05), 0.16);
glitch(cue('吸 cracks', E.crack), { gain: 0.3 });

// A3 the Ping → 压: a deep thoom with a glass sonar tone, the air pad enters; the first big impact, the groove drops in
ping(cue('Ping', E.ping), { gain: 0.55 });
const airLevel = (t) => Math.max(
  winf(t, E.ping, E.ping + 1.2, E.cut56 - 0.3, E.cut56) * 0.9,          // A3–B2 air vision
  winf(t, E.cut67, E.cut67 + 0.4, E.cut78 - 0.3, E.cut78) * 0.7,        // C1 hologram ramp
  winf(t, E.open, E.open + 0.4, E.drop - 0.2, E.drop + 0.2) * 0.6,      // D2 the slit opens
  winf(t, E.swap, E.swap + 0.6, E.plunge - 0.2, E.plunge) * 0.6,        // E1–E2 its own gas
  winf(t, E.kfOff, E.kfOff + 0.3, E.kfResume, E.kfResume + 0.5) * 0.7,  // F1 freeze
  winf(t, E.borrow, E.borrow + 0.8, E.spent + 0.3, E.spent + 0.9) * 0.6,  // G1 summary, until the reserve is spent
  winf(t, E.title, E.title + 0.6, END - 0.6, END) * 0.5);                // the title
airPad(E.ping, END, airLevel);
impact(cue('压', E.press), { gain: 1.0 });

// the gold storm: countless tiny impacts wherever the picture shows them (A3 after 压, B1 a trickle, B2 dense outside
// and thinned for 缝里, C1 along the ramp, D2 until the push breaks)
const impacts = (t) => Math.max(
  winf(t, E.press, E.press + 0.1, E.cut34 - 0.2, E.cut34) * 0.5,
  winf(t, E.cut34, E.cut34 + 0.2, E.cut45 - 0.1, E.cut45) * 0.15,
  (0.15 + 0.85 * lin(t, E.outer - 0.05, E.outer + 0.3)) * winf(t, E.cut45 - 0.1, E.cut45, E.cut56 - 0.2, E.cut56),
  winf(t, E.cut67 + 0.2, E.cut67 + 0.6, E.cut78 - 0.4, E.cut78) * 0.5,
  winf(t, E.open, E.open + 0.2, E.lose - 0.2, E.lose) * 0.9);
const thin = (t) => 1 - 0.75 * winf(t, E.inner, E.inner + 0.15, E.inner + 1.1, E.inner + 1.5);   // 缝里 压得轻
rain(E.press, E.lose + 0.1, (t) => impacts(t) * thin(t), (t) => 1 - 0.7 * (1 - thin(t)) / 0.75);

// B1 风扇抽走缝里的空气: the groove, the fan whine, the suction swirl. The fans keep running on the ramp (quieter on the
// night macro and in the replay); when the slit opens at the deck's end their load drops and the pitch climbs.
grooveSection(E.press, E.cut56, { level: (t) => lin(t, E.press, E.press + 1.0) * (t < E.cut34 ? 0.75 : 1), hats: true });
fan(E.fans - 0.2, E.lose + 0.5, (t) => (0.2 + 0.8 * smooth((t - E.fans) / Math.max(0.3, E.suck - E.fans))) * (1 + 0.45 * lin(t, E.open, E.lose))
  * (1 - lin(t, E.lose, E.lose + 0.5)) * (1 - 0.55 * winf(t, E.cut56, E.cut56 + 0.1, E.cut67 - 0.1, E.cut67))
  * (1 - 0.5 * winf(t, E.cut67, E.cut67 + 0.2, E.cut78 - 0.2, E.cut78)), 0.1);
cue('fans', E.fans);
suction(cue('抽走', E.evacStart), E.evacDur + 0.4, 0.22);

// B2 外面 压得重 / 缝里 压得轻 → 压力差 → 按: a riser into the lock hit for the one push, a chord under it; the tyres take
// the load
boom(cue('外面 压得重', E.outer), { gain: 0.45, f0: 80, f1: 38, dur: 1.0, click: 0.5, rev: 0.2 });
ting(cue('缝里 压得轻', E.inner), 3520, 0.12);
riser(E.converge - 0.05, E.beam, { gain: 0.22 });
lock(cue('压力差 (the push locks)', E.beam), 1.0);
chord(E.beam, E.cut56 + 0.4, [110, 164.8, 220, 261.6, 329.6], 1.0);
lock(cue('按 → 轮胎被压紧', E.an), 0.85);
boom(E.an, { gain: 0.45, f0: 85, f1: 32, dur: 1.6, click: 0.5, rev: 0.3 });

// B3 才抓得住 (night macro): rubber on concrete; the grip; the car pulls away
noiseSweep(E.cut56 - 0.22, 0.25, { f0: 400, f1: 3000, q: 1.0, gain: 0.16, shape: (t, d) => (t / d) ** 2 });
rumble(E.cut56, E.cut67, (t) => 0.25 + 0.75 * lin(t, E.zhua, E.zhua + 0.15) * (1 - lin(t, E.zhua + 0.4, E.cut67)));
grooveSection(E.cut56, E.cut67, { hats: false, kicks: 0.8, bassGain: 0.18 });
stab(cue('抓', E.zhua), [110, 164.8, 220], { gain: 0.34, dur: 0.45, bright: 2600 });
boom(E.zhua, { gain: 0.65, f0: 95, f1: 40, dur: 0.9, click: 1.0, rev: 0.2 });
noiseSweep(E.zhua + 0.05, 0.8, { f0: 300, f1: 2600, q: 0.9, gain: 0.2, pan0: -0.6, pan1: 0.7 });

// C1 这股力，始终压向坡面 / 重力，始终向下: a swell, the stations ticking (wall, ceiling), gravity's low step, the slam on
// 压向坡面
riser(E.cut67 - 0.6, E.cut67, { gain: 0.14 });
boom(cue('cut B3→C1', E.cut67), { gain: 0.6, f0: 100, f1: 36, dur: 1.2, click: 0.8, rev: 0.3 });
noiseSweep(E.cut67, 1.3, { f0: 400, f1: 5200, q: 1.0, gain: 0.18, pan0: 0.6, pan1: -0.6 });
grooveSection(E.cut67 + 0.3, E.cut78 - 0.1, { level: (t) => lin(t, E.cut67 + 0.3, E.cut67 + 1.0) * (1 - 0.6 * winf(t, E.always - 0.9, E.always - 0.6, E.toward - 0.1, E.toward)) });
stab(cue('station: wall', E.wall), [82.4, 123.5, 164.8], { gain: 0.3 });
boom(cue('重力，始终向下', E.gravAll), { gain: 0.4, f0: 65, f1: 40, dur: 0.9, click: 0.1, rev: 0.1 });
gliss(E.gravAll + 0.05, 0.7, 660, 330, 0.08);
stab(cue('station: ceiling', E.ceil), [98, 146.8, 196], { gain: 0.32 });
riser(E.always - 0.9, E.toward, { gain: 0.16 });
impact(cue('始终压向坡面 (slam)', E.toward), { gain: 0.8 });
chord(E.toward, E.cut78 + 0.3, [110, 164.8, 220, 277.2, 329.6], 0.9);

// D1 坡，总有尽头: the groove drops out; ticking hats accelerate toward the edge; a ting on 尽头
drone(E.cut78 - 0.2, E.lose + 0.2, (t) => lin(t, E.cut78 - 0.2, E.cut78 + 0.4) * (1 - lin(t, E.lose - 0.1, E.lose + 0.2)) * 0.9);
for (let t = E.cut78 + 0.15, k = 0; t < E.open - 0.3; k++) {
  hat(t, 0.05 + 0.06 * lin(t, E.cut78, E.open), k % 2 ? 0.3 : -0.3);
  t += 0.32 - 0.2 * lin(t, E.cut78, E.open);
}
ting(cue('尽头', E.endOf), 3520, 0.3);

// D2 缝一敞开，→ 压力差就没了: a ping on 敞开, outside air rushes in, a shatter on 没了; wind. D3: the line falls, the sub drop
ping(cue('敞开', E.open - 0.06), { gain: 0.45 });
noiseSweep(E.open, E.lose - E.open + 0.3, { f0: 500, f1: 4200, q: 0.8, gain: 0.26, pan0: -0.7, pan1: 0.5, shape: (t, d) => Math.min(1, t / 0.15) * (1 - Math.max(0, t - d + 0.3) / 0.3) });
shatter(cue('没了 (the push breaks)', E.lose - 0.08), { gain: 0.26 });
boom(E.lose - 0.08, { gain: 0.38, f0: 75, f1: 30, dur: 1.4, click: 0.3, rev: 0.4 });
wind(E.lose - 0.1, E.cut1011 + 0.3, (t) => lin(t, E.lose - 0.1, E.lose + 0.4) * (1 - 0.55 * lin(t, E.cut910, E.cut910 + 0.6)) * (1 - lin(t, E.cut1011, E.cut1011 + 0.3)));
boom(cue('drop', E.drop), { gain: 0.5, f0: 48, f1: 28, dur: 2.4, click: 0.0, rev: 0.4 });
fall(cue('the line falls', E.textFall), { gain: 0.14 });

// E1 它自带高压冷气: a scanner sweep, the crowded crackle of stored gas (busier on 高压冷气)
scanSweep(cue('scan', E.swap - 0.1), 0.65, 0.22);
lock(cue('它自带', E.own), 0.45);
crackle(E.own, E.plunge, 700, (t) => 0.03 + 0.045 * lin(t, E.hp - 0.05, E.hp + 0.35) * (1 - 0.6 * lin(t, E.push, E.plunge)));
drone(E.swap - 0.1, E.plunge + 0.2, (t) => lin(t, E.swap - 0.1, E.swap + 0.5) * (1 - lin(t, E.plunge - 0.2, E.plunge + 0.2)) * 0.75, [65.4, 65.7, 98]);   // cold, in C

// E2 气往下喷 → 车往上推: cold hiss; a low push down; a riser into the impact on 推
hiss(E.spray - 0.06, E.plunge - E.spray + 0.25, { gain: 0.26, f0: 2700, f1: 1700, q: 0.45 });
boom(cue('往下喷', E.spray), { gain: 0.6, f0: 72, f1: 34, dur: 1.4, click: 0.4, rev: 0.3 });
riser(E.push - 0.9, E.push, { gain: 0.16 });
impact(cue('往上推', E.push), { gain: 0.75 });
chord(E.push, E.plunge + 0.8, [130.8, 196, 261.6, 329.6], 0.8);

// E3 into its own cloud: a whoosh, the cloud boom
noiseSweep(cue('plunge', E.plunge), 0.9, { f0: 3500, f1: 250, q: 0.7, gain: 0.24, pan0: 0.3, pan1: -0.3 });
hiss(E.plunge, E.black - E.plunge, { gain: 0.32, f0: 1500, f1: 700, q: 0.4, release: 0.05 });
boom(cue('cloud boom', E.black - 0.28), { gain: 0.95, f0: 60, f1: 28, dur: 1.2, click: 0.25, rev: 0.6 });

// S 另一场演示: hard silence on black (the gate in the mixdown) and one tone after it. F1: a half-time pulse, the jets;
// time freezes (reverse swell, suspended cluster) for 喷气偏离重心 and the twist about the centre of mass; 翻
grooveSection(E.lot + 0.4, E.kfOff - 0.1, { half: true, hats: true, bassNotes: [49, 49, 55, 43.65], bassGain: 0.2, level: (t) => lin(t, E.lot + 0.4, E.lot + 1.5) });
hiss(cue('jets', E.kfJet - 0.1), E.kfOff - E.kfJet + 0.15, { gain: 0.15, f0: 2200, f1: 2500, q: 0.5, pan: 0.3 });
freeze(cue('freeze', E.kfOff - 0.04), E.kfResume - E.kfOff + 0.15, 0.25);
gliss(cue('twist about 重心', E.kfCom - 0.1), E.kfResume - E.kfCom + 0.1, 330, 990, 0.12);
noiseSweep(cue('resume', E.kfResume - 0.1), 0.5, { f0: 600, f1: 4000, q: 0.9, gain: 0.18, pan0: 0.6, pan1: -0.6 });
hiss(E.kfResume, E.cut1314 - E.kfResume, { gain: 0.15, f0: 2400, f1: 1600, q: 0.5, pan: -0.3 });
grooveSection(E.kfResume + 0.2, E.cut1314 - 0.2, { half: true, hats: true, bassNotes: [49, 55, 43.65, 49], bassGain: 0.2 });
impact(cue('翻', E.flip), { gain: 0.7 });
stab(cue('over', E.over), [98, 146.8, 196, 246.9], { gain: 0.26, dur: 0.6, bright: 2200 });

// G1 坡上，借空气的力 / 空中，花自己的气 → 花完，就没了 → 空气现形: a resolving chord, a stab on 借, a ting on 花自己的气;
// the reserve runs out in thinner, shorter puffs and the music thins to a breath; the title impact and a long tail
drone(E.cut1314 - 0.1, E.spent + 0.7, (t) => lin(t, E.cut1314 - 0.1, E.cut1314 + 0.8) * (1 - lin(t, E.spent, E.spent + 0.7)) * 0.7);
stab(cue('借', E.borrow), [130.8, 164.8, 196, 261.6], { gain: 0.3, dur: 0.8, bright: 1800 });
chord(E.borrow, E.spent + 0.5, [130.8, 164.8, 196, 261.6, 329.6], 0.9, { release: 0.6 });
ting(cue('花自己的气', E.spend), 1975.5, 0.32);
ping(E.spend + 0.02, { gain: 0.28 });
chord(E.spend, E.spent + 0.5, [220, 329.6, 493.9, 659.3], 0.55, { release: 0.6 });
const PUFFS = 7, p0 = E.spend + 0.45, p1 = E.spent + 0.12;
for (let k = 0; k < PUFFS; k++) {                     // the carried gas runs out: thinner and shorter puffs, the last on 花完
  const t = p0 + k * (p1 - p0) / (PUFFS - 1);
  hiss(t, 0.3 - 0.03 * k, { gain: 0.2 * (1 - k / (PUFFS + 1)), f0: 2600, f1: 2000 - 120 * k, q: 0.5, attack: 0.01, release: 0.12, pan: (k % 2 ? 0.25 : -0.25) });
}
cue('花完 (the last puff)', p1);
gliss(cue('就没了', E.spent + 0.3), 0.6, 520, 260, 0.06);
dust(E.spent + 0.4, END, 12, 0.05);
impact(cue('空气现形 (title)', E.title - 0.05), { gain: 0.5 });
chord(E.title, END + 0.3, [110, 164.8, 220, 329.6, 440], 0.8, { release: 1.2 });

// a very soft air tick when a hero line lands, unless a causal hit already marks that instant
const HITS = sheet.map((c) => c.t);
for (const c of CARDS) for (const l of c.lines) {
  if (l.role !== 'hero' || HITS.some((h) => Math.abs(h - l.at) < 0.15)) continue;
  airTick(cue(`card ${c.id} lands`, l.at));
}

// ------------------------------------------------------------------------------------------------ mixdown
const wet = freeverb(send, { room: 0.88, damp: 0.35, wet: 1, predelay: 0.02 });
const out = new Bus(DUR);
out.mix(dry, 1);
out.mix(wet, 0.55);
out.mix(groove, 0.85);
// a hard silence on the black separator (every tail cut in 15 ms); the slate's own tone comes after the gate
for (let i = I(E.black - 0.015); i < Math.min(out.n, I(E.lot + 0.05)); i++) {
  const t = i / SR, g = 1 - Math.min(1, (t - (E.black - 0.015)) / 0.015) * (1 - lin(t, E.lot - 0.25, E.lot + 0.05));
  out.L[i] *= g; out.R[i] *= g;
}
const post = new Bus(DUR), postSend = new Bus(DUR);
ting(cue('另一场演示 (one tone)', E.sepIn + 0.05), 1318.5, 0.3, post, postSend);
out.mix(post, 1);
out.mix(freeverb(postSend, { room: 0.8, damp: 0.4, wet: 1 }), 0.4);
// end with the picture (its exposure fades over the last 0.45 s)
for (let i = I(END - 0.5); i < out.n; i++) { const g = Math.max(0, 1 - (i - I(END - 0.5)) / I(0.48)); out.L[i] *= g; out.R[i] *= g; }
// gentle high-pass on the whole score (keep the sub hits, clear rumble below 30 Hz)
for (const ch of [out.L, out.R]) { const hp = new Biquad('hp', 30, 0.7); for (let i = 0; i < out.n; i++) ch[i] = hp.run(ch[i]); }
softclip(out, 1.1);
const dst = path.resolve(ROOT, arg('out', 'out/audio/score.wav'));
fs.mkdirSync(path.dirname(dst), { recursive: true });
writeWav(dst, out);
const cuesSha = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'web/engine/cues.js'))).digest('hex');
sheet.sort((a, b) => a.t - b.t);
fs.writeFileSync(dst.replace(/\.wav$/, '.cues.json'), JSON.stringify({ about: 'v6 score cue sheet: every named hit at its cues.js instant (no voice)',
  cues_js_sha256: cuesSha, fps: FPS, frames: FRAMES, seconds: END, wav_seconds: +(out.n / SR).toFixed(4), cues: sheet }, null, 1));
console.log(`score: ${(out.n / SR).toFixed(2)} s (film ${END} s, ${FRAMES} frames) → ${dst}; ${sheet.length} cues → ${path.basename(dst).replace(/\.wav$/, '.cues.json')}`);
