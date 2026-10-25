// clawd.js — the official Clawd silhouette (12 × 8 pixel units, read off the official app sprite) for 2D and 3D.
//
//   ..########..   body 8×6 (cols 2–9, rows 0–5)
//   ..#E####E#..   eyes 1×1 at (3,1) and (8,1)
//   ############   arms 2×2 on both sides (rows 2–3)
//   ############
//   ..########..
//   ..########..
//   ..#.#..#.#..   legs 1×2 at cols 2, 4, 7, 9
//   ..#.#..#.#..
//
// Base colour is the official brand orange #d97757; scenes light it like any other material.
export const CLAWD_ORANGE = '#d97757';
export const CLAWD_BITMAP = [
  '..########..',
  '..#E####E#..',
  '############',
  '############',
  '..########..',
  '..########..',
  '..#.#..#.#..',
  '..#.#..#.#..',
];

// ---------- 2D ----------
// Draw the sprite with its top-left at (x, y); s = size of one pixel unit.
// opts: { eyes: 'open'|'closed'|'happy'|'wide', color, eyeColor, legPhase (−1..1 shifts leg pairs), armsUp (0..2 units) }
export function drawClawd2D(ctx, x, y, s, opts = {}) {
  const color = opts.color || CLAWD_ORANGE, eyeColor = opts.eyeColor || '#111';
  const armsUp = opts.armsUp || 0, legPhase = opts.legPhase || 0;
  ctx.fillStyle = color;
  ctx.fillRect(x + 2 * s, y, 8 * s, 6 * s);                                   // body
  ctx.fillRect(x, y + (2 - armsUp) * s, 2 * s, 2 * s);                       // arms
  ctx.fillRect(x + 10 * s, y + (2 - armsUp) * s, 2 * s, 2 * s);
  const legs = [2, 4, 7, 9];
  legs.forEach((c, i) => {
    const lift = legPhase && ((i % 2 === 0) === legPhase > 0) ? Math.abs(legPhase) * s : 0;
    ctx.fillRect(x + c * s, y + 6 * s, s, 2 * s - lift);
  });
  ctx.fillStyle = eyeColor;
  const eyes = opts.eyes || 'open';
  for (const c of [3, 8]) {
    if (eyes === 'open') ctx.fillRect(x + c * s, y + s, s, s);
    else if (eyes === 'wide') ctx.fillRect(x + c * s - s * 0.15, y + s * 0.85, s * 1.3, s * 1.3);
    else if (eyes === 'closed') ctx.fillRect(x + c * s - s * 0.1, y + s * 1.4, s * 1.2, s * 0.3);
    else if (eyes === 'happy') { ctx.fillRect(x + c * s - s * 0.1, y + s * 1.25, s * 0.4, s * 0.3); ctx.fillRect(x + c * s + s * 0.3, y + s * 0.95, s * 0.4, s * 0.3); ctx.fillRect(x + c * s + s * 0.7, y + s * 1.25, s * 0.4, s * 0.3); }
  }
}

// ---------- 3D ----------
// Boxes in pixel units, origin at the bottom centre of the feet, +y up, +z towards the viewer (the face).
// depth: body depth in units. Returns [{x, y, z, w, h, d, part}] centres + sizes.
export function clawdBoxes({ depth = 4, armsUp = 0, legLift = [0, 0, 0, 0], eyeDepth = 0.18 } = {}) {
  const col = (c, w = 1) => c + w / 2 - 6;          // column -> x centre
  const row = (r, h = 1) => 8 - r - h / 2;          // row (from top) -> y centre
  const b = [];
  b.push({ part: 'body', x: col(2, 8), y: row(0, 6), z: 0, w: 8, h: 6, d: depth });
  b.push({ part: 'arm', x: col(0, 2), y: row(2, 2) + armsUp, z: 0, w: 2, h: 2, d: Math.min(2, depth) });
  b.push({ part: 'arm', x: col(10, 2), y: row(2, 2) + armsUp, z: 0, w: 2, h: 2, d: Math.min(2, depth) });
  [2, 4, 7, 9].forEach((c, i) => {
    const lift = legLift[i] || 0;
    b.push({ part: 'leg', x: col(c), y: row(6, 2) + lift / 2, z: 0, w: 1, h: 2 - lift, d: Math.min(1.6, depth) });
  });
  for (const c of [3, 8]) b.push({ part: 'eye', x: col(c), y: row(1), z: depth / 2 + eyeDepth / 2 - 0.02, w: 1, h: 1, d: eyeDepth });
  return b;
}

// Merged BufferGeometry with vertex colours (orange body, black eyes) — for InstancedMesh crowds.
export function clawdGeometry(THREE, { unit = 1, depth = 4, armsUp = 0, parts = null, orange = CLAWD_ORANGE, eye = '#141414' } = {}) {
  const boxes = clawdBoxes({ depth, armsUp }).filter((b) => !parts || parts.includes(b.part));
  const pos = [], nor = [], colr = [], idx = [];
  const cO = new THREE.Color(orange), cE = new THREE.Color(eye);
  for (const b of boxes) {
    const g = new THREE.BoxGeometry(b.w * unit, b.h * unit, b.d * unit);
    g.translate(b.x * unit, b.y * unit, b.z * unit);
    const base = pos.length / 3;
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    const c = b.part === 'eye' ? cE : cO;
    for (let i = 0; i < p.length / 3; i++) colr.push(c.r, c.g, c.b);
    for (const k of g.index.array) idx.push(base + k);
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  geo.setIndex(idx);
  return geo;
}

// A hero Clawd as a Group of (optionally rounded) boxes. pose: { armsUp, legLift:[4], eyes:'open'|'closed'|'happy'|'wide', squash }
// RoundedBoxGeometry must be passed in (three/addons) to keep this module dependency-free.
export function makeClawd(THREE, { unit = 1, depth = 4, rounded = null, radius = 0.12, color = CLAWD_ORANGE, roughness = 0.55,
  metalness = 0, eyeColor = '#121212', pose = {}, material = null } = {}) {
  const group = new THREE.Group();
  const mat = material || new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const eyeMat = new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.25, metalness: 0 });
  const eyes = pose.eyes || 'open';
  for (const b of clawdBoxes({ depth, armsUp: pose.armsUp || 0, legLift: pose.legLift || [0, 0, 0, 0] })) {
    if (b.part === 'eye') {
      let w = b.w, h = b.h, y = b.y;
      if (eyes === 'closed') { h = 0.28; y = b.y - 0.15; w = 1.15; }
      if (eyes === 'wide') { w = 1.3; h = 1.3; }
      if (eyes === 'happy') { h = 0.32; y = b.y - 0.05; w = 1.15; }
      const g = new THREE.BoxGeometry(w * unit, h * unit, b.d * unit);
      const m = new THREE.Mesh(g, eyeMat);
      m.position.set(b.x * unit, y * unit, b.z * unit);
      m.castShadow = true;
      group.add(m);
      continue;
    }
    const g = rounded && b.part === 'body' ? new rounded(b.w * unit, b.h * unit, b.d * unit, 3, radius * unit)
      : rounded ? new rounded(b.w * unit, b.h * unit, b.d * unit, 2, Math.min(radius, 0.18) * unit) : new THREE.BoxGeometry(b.w * unit, b.h * unit, b.d * unit);
    const m = new THREE.Mesh(g, mat);
    m.position.set(b.x * unit, b.y * unit, b.z * unit);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.part = b.part;
    group.add(m);
  }
  if (pose.squash) group.scale.set(1 + pose.squash * 0.5, 1 - pose.squash, 1 + pose.squash * 0.5);
  return group;
}
