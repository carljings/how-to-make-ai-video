#!/usr/bin/env node
// framing.mjs — projects the key subjects through the preview camera (no rendering) and prints their screen boxes, so
// framing and the text safe area (x ≤ 940, y ≤ 1560 for key content) can be checked without spending GPU time.
//   node tools/framing.mjs [t1,t2,…]
import * as THREE from 'three';
import { camera, clawd, ZL, G, ZG, stoneZ, U } from '../src/motion.js';
const W = 1080, H = 1920;
const ts = (process.argv[2] || '0,1.2,2.5,3.2,3.75,3.97,4.2,4.75,5.5,6.0,7.0,7.9').split(',').map(Number);
const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
const box = (pts) => { const p = pts.map((v) => v.clone().project(cam)).map((v) => [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]);
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return `x ${Math.min(...xs).toFixed(0)}–${Math.max(...xs).toFixed(0)}  y ${Math.min(...ys).toFixed(0)}–${Math.max(...ys).toFixed(0)}`; };
const cube = (x0, x1, y0, y1, z0, z1) => [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [z0, z1].map((z) => new THREE.Vector3(x, y, z))));
for (const t of ts) {
  const c = camera(t), s = clawd(t);
  cam.position.set(...c.pos); cam.fov = c.fov; cam.up.set(Math.sin(c.roll), Math.cos(c.roll), 0); cam.lookAt(...c.look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const cl = cube(-1.8, 1.8, s.y, s.y + 2.4 * s.sy, s.z - 0.9, s.z + 0.9);
  const ghost = cube(-1.3, 1.3, -0.2, 0, ZL - 0.95, ZL + 0.95);
  const giant = cube(-6 * G, 6 * G, 0, 8 * G, ZG - 2 * G, ZG + 2 * G);
  console.log(`t ${t.toFixed(2)}  clawd ${box(cl)} | landing stone ${box(ghost)} | giant ${box(giant)}`);
}
