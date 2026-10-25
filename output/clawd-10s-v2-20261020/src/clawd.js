// clawd.js — Clawd (the Claude Code pixel creature) as a small, soft vinyl toy. Silhouette measured from the official app
// animation's front pose (1 grid unit = 20 px there): body 8×6, two black 1×1 eyes on body row 1 at body columns 1 and 6,
// 2×2 arms on body rows 2–3, four 1×2 legs at body columns 0, 2, 5, 7. Our interpretation: 5 units deep, generously
// rounded edges, a tiny catch-light in each eye, and a rig (squash at the feet, arms, legs, eyes) for animation.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export const CLAY = new THREE.Color('#D97757');
export const U = 0.1;                     // one grid unit in world units → Clawd is 0.8 tall (a domino is 1.0)
const D = 5;                              // body depth in units

export function makeClawd() {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);     // rig = squash pivot at the feet
  const mat = new THREE.MeshPhysicalMaterial({ color: CLAY, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.6, sheenColor: new THREE.Color('#FFD9C4'), sheenRoughness: 0.5 });
  const eyeM = new THREE.MeshBasicMaterial({ color: '#060505' });
  const glintM = new THREE.MeshBasicMaterial({ color: '#FFF6EA' });
  const box = (w, h, d, x, y, z, m, r, parent = rig) => {
    const g = new RoundedBoxGeometry(w * U, h * U, d * U, 4, r * U); const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x * U, y * U, z * U); mesh.castShadow = true; mesh.receiveShadow = m !== eyeM && m !== glintM; parent.add(mesh); mesh.userData.rest = mesh.position.clone(); return mesh;
  };
  const body = box(8, 6, D, 0, 5, 0, mat, 1.1);
  const armL = box(2.2, 2, 2, -4.9, 5, 0, mat, 0.7), armR = box(2.2, 2, 2, 4.9, 5, 0, mat, 0.7);
  const legs = [];
  for (const c of [-3.5, -1.5, 1.5, 3.5]) for (const z of [D / 2 - 0.6, -D / 2 + 0.6]) legs.push(box(1, 2.2, 1, c, 1.1, z, mat, 0.4));
  const eyes = [-2.5, 2.5].map((x) => { const e = box(1, 1.15, 0.3, x, 6.45, D / 2 + 0.05, eyeM, 0.12); box(0.32, 0.32, 0.1, 0.22, 0.22, 0.2, glintM, 0.05, e); return e; });
  root.userData = { rig, body, armL, armR, legs, eyes, mat };
  return root;
}

// pose: { x, y, z, yaw, lean, roll, sy (squash), arm [L, R] lift in units, wave, tuck, eye {x, y, s, blink} }
export function poseClawd(root, p) {
  const { rig, armL, armR, legs, eyes } = root.userData;
  root.position.set(p.x, p.y, p.z); root.rotation.set(0, p.yaw, 0);
  rig.rotation.set(p.lean, 0, p.roll); const sxz = 1 / Math.sqrt(Math.max(0.4, p.sy)); rig.scale.set(sxz, p.sy, sxz);
  const [aL, aR] = p.arm;
  armL.position.copy(armL.userData.rest).add(new THREE.Vector3(-0.3 * Math.max(0, aL) * U, aL * U, 0)); armL.rotation.z = -0.35 * aL;
  armR.position.copy(armR.userData.rest).add(new THREE.Vector3(0.3 * Math.max(0, aR) * U, aR * U, 0)); armR.rotation.z = 0.35 * aR + 0.5 * p.wave;
  for (const l of legs) { l.scale.y = 1 - 0.5 * p.tuck; l.position.y = l.userData.rest.y + 0.55 * p.tuck * U; }
  for (const e of eyes) { e.scale.set(p.eye.s, p.eye.s * p.eye.blink, 1); e.position.set(e.userData.rest.x + p.eye.x * U, e.userData.rest.y + p.eye.y * U, e.userData.rest.z); }
}
