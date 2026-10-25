#!/usr/bin/env node
// framing.mjs — project the key subjects through the camera (no rendering): Clawd's box, the playhead and ring row.
//   node tools/framing.mjs [t1,t2,…]
import * as THREE from 'three';
import { camera, clawd, Y_BASE, Y_RING } from '../src/plan.js';
const W = 1080, H = 1920, cam = new THREE.PerspectiveCamera(32, W / H, 0.05, 300);
const ts = (process.argv[2] || '0,1,1.7,2.3,3.5,4.2,4.6,5.2,6.4,8.4,9.3,9.9').split(',').map(Number);
const P = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [Math.round((v.x + 1) / 2 * W), Math.round((1 - v.y) / 2 * H)]; };
for (const t of ts) {
  const c = camera(t), p = clawd(t); cam.position.set(...c.pos); cam.fov = c.fov; cam.lookAt(...c.look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const f = P(p.x, p.y, p.z), h = P(p.x, p.y + 0.8 * 1.35, p.z);
  console.log(`t ${t.toFixed(2)}  clawd feet ${f} head ${h} (h ${f[1] - h[1]}px)  base@0 ${P(0, Y_BASE, 0)}  ring@0 ${P(0, Y_RING, 0)}  ring@+3 ${P(3, Y_RING, 0)}  base@-3 ${P(-3, Y_BASE, 0)}`);
}
