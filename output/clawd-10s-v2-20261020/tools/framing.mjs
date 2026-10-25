#!/usr/bin/env node
// framing.mjs — project Clawd (and the monolith) through the preview camera without rendering: Clawd's on-screen height
// (target ≈ 10–15 % of 1920 = 190–290 px for most shots) and whether it is inside the frame.
//   node tools/framing.mjs [t1,t2,…]
import * as THREE from 'three';
import { camera, clawd } from '../src/motion.js';
import { MONO, DH } from '../src/world.js';
const W = 1080, H = 1920;
const ts = (process.argv[2] || '0,0.6,1.3,1.7,1.9,2.5,3.3,4.0,4.28,4.6,5.2,6.0,6.4,7.0,8.0,8.6,9.5,9.97').split(',').map(Number);
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 500);
for (const t of ts) {
  const c = camera(t), p = clawd(t);
  cam.position.set(...c.pos); cam.fov = c.fov; cam.lookAt(...c.look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const pts = []; for (const dx of [-0.65, 0.65]) for (const dy of [0, 0.8]) for (const dz of [-0.25, 0.25]) pts.push(new THREE.Vector3(p.x + dx, p.y + dy, p.z + dz).project(cam));
  const xs = pts.map((v) => (v.x + 1) / 2 * W), ys = pts.map((v) => (1 - v.y) / 2 * H);
  const m = new THREE.Vector3(MONO.x, MONO.s * DH, MONO.z).project(cam);
  console.log(`t ${t.toFixed(2)}  clawd x ${Math.min(...xs).toFixed(0)}–${Math.max(...xs).toFixed(0)} y ${Math.min(...ys).toFixed(0)}–${Math.max(...ys).toFixed(0)} (h ${(Math.max(...ys) - Math.min(...ys)).toFixed(0)} px)   monolith top ${((m.x + 1) / 2 * W).toFixed(0)},${((1 - m.y) / 2 * H).toFixed(0)}`);
}
