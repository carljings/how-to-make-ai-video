// particles.js — every particle is an analytic path p(t) (no simulation state) drawn as a motion-blurred streak with
// thin-lens depth of field. One shared streak emitter; one main() per system.
import { COMMON } from './common.js';

const STREAK = /* glsl */`
uniform vec4 uDof;        // x CoC gain (px), y focus distance (m), z min width px, w max width px
uniform float uShutter;   // streak time span (world seconds)
uniform float uGain;      // system brightness
out vec4 vCol;
out vec2 vQ;
out float vLen;
out float vW;
out float vBokeh;

// on-screen size in pixels of a world-space size at p (for things that have a physical size: gas, cloud)
float pxSize(float worldSize, vec3 p) {
  vec4 c = uViewProj * vec4(p, 1.0);
  return worldSize * uProj[1][1] * uRes.y * 0.5 / max(c.w, 0.05);
}
void emitStreak(vec3 head, vec3 tail, float wpx, vec4 col) {
  int k = gl_VertexID;
  vec4 a = uViewProj * vec4(tail, 1.0);
  vec4 b = uViewProj * vec4(head, 1.0);
  if (a.w < 0.08 || b.w < 0.08 || col.a <= 1e-4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vCol = vec4(0.0); return; }
  float depth = 0.5 * (a.w + b.w);
  float coc = uDof.x * abs(depth - uDof.y) / max(depth, 0.1);
  float w0 = max(wpx, uDof.z);
  float w = min(sqrt(w0 * w0 + coc * coc), uDof.w);
  col.a *= (w0 * w0) / (w * w);
  vBokeh = smoothstep(4.0, 14.0, w);
  vec2 sa = a.xy / a.w * uRes * 0.5, sb = b.xy / b.w * uRes * 0.5;
  vec2 d = sb - sa;
  float L = length(d);
  vec2 dir = L > 1e-3 ? d / L : vec2(1.0, 0.0);
  vec2 nr = vec2(-dir.y, dir.x);
  float hw = 0.5 * w;
  col.a *= w / (w + L);                 // energy spread along the streak
  bool atHead = k >= 2;
  float side = (k == 0 || k == 2) ? -1.0 : 1.0;
  vec2 s = (atHead ? sb + dir * hw : sa - dir * hw) + nr * side * hw;
  vec4 c = atHead ? b : a;
  gl_Position = vec4(s / (uRes * 0.5) * c.w, c.z, c.w);
  vQ = vec2(atHead ? L + hw : -hw, side * hw);
  vLen = L;
  vW = hw;
  vCol = col;
}
`;

export const STREAK_FS = /* glsl */`
in vec4 vCol;
in vec2 vQ;
in float vLen;
in float vW;
in float vBokeh;
uniform float uSoft;      // 1: always a soft gaussian (gas, cloud), never a bokeh disc
out vec4 o;
void main() {
  float x = clamp(vQ.x, 0.0, vLen);
  vec2 dd = vec2(vQ.x - x, vQ.y);
  float r = length(dd) / max(vW, 1e-3);
  if (r > 1.0) discard;
  float g = exp(-r * r * 3.2);
  float disc = smoothstep(1.0, 0.82, r) * (0.55 + 0.45 * smoothstep(0.55, 0.95, r));   // bokeh: flat disc, bright rim
  float a = mix(g, disc * 0.9, vBokeh * (1.0 - uSoft));
  o = vec4(vCol.rgb * vCol.a * a, 1.0);
}`;

// ---------------------------------------------------------------------------------------------------------- DUST
// world-space dust falling straight down (gravity made visible), lit only by the floods' cones and car lamps.
export const DUST_VS = COMMON + STREAK + /* glsl */`
uniform vec3 uBoxMin, uBoxSize;
uniform float uFall;      // fall speed m/s (world)
uniform float uDustT;     // dust clock (s)
uniform float uAmbientLit;
vec3 dustPos(float i, float t) {
  vec3 h = hash31(i * 1.37 + 0.5);
  vec3 p = uBoxMin + h * uBoxSize;
  float sp = uFall * (0.55 + 0.9 * hash11(i * 3.1 + 7.0));
  p.z = uBoxMin.z + mod(p.z - uBoxMin.z - sp * t, uBoxSize.z);
  float ph = hash11(i * 5.7) * 6.283;
  p.x += 0.18 * sin(t * 0.37 + ph) + 0.05 * sin(t * 1.3 + ph * 2.0);
  p.y += 0.18 * cos(t * 0.29 + ph * 1.7);
  return p;
}
void main() {
  float i = float(gl_InstanceID);
  vec3 head = dustPos(i, uDustT);
  vec3 tail = dustPos(i, uDustT - uShutter);
  if (abs(head.z - tail.z) > 1.0) tail = head;
  float lit = uAmbientLit;
  for (int s = 0; s < MAX_SPOTS; s++) {
    if (s >= uNumSpots) break;
    vec3 L; float dist;
    lit += spotCone(s, head, L, dist) * uSpotX[s].z * 0.06;
  }
  float tw = 0.55 + 0.45 * sin(uDustT * (2.0 + 3.0 * hash11(i)) + i);
  float size = 1.2 + 1.6 * pow(hash11(i * 9.1), 6.0);
  float am = airMix(head);
  vec3 c = mix(vec3(1.0, 0.93, 0.82), vec3(0.9, 0.95, 1.0), am);
  emitStreak(head, tail, size, vec4(c, lit * tw * uGain * (1.0 - 0.6 * am)));
}`;

// ---------------------------------------------------------------------------------------------------- AIR MOTES
// the air itself in air vision: a uniform field of fizzing motes (thermal jitter), gated by the Ping.
export const AIR_VS = COMMON + STREAK + /* glsl */`
uniform vec3 uBoxMin, uBoxSize;
uniform float uJitter;    // random-walk speed (m/s, slow motion)
uniform float uFade;      // distance fade (m)
vec3 airBase(float i) { return uBoxMin + hash31(i * 0.731 + 3.3) * uBoxSize; }
// piecewise-linear random walk: a new direction every 'seg' seconds (thermal zig-zag, slowed down)
vec3 walk(float i, float t) {
  float seg = 0.22 + 0.2 * hash11(i * 5.3);
  float k = floor(t / seg);
  float f = t / seg - k;
  vec3 acc = vec3(0.0);
  // position at the start of segment k is a bounded sum (wrap the index so it stays local)
  float k0 = mod(k, 4.0);
  for (int j = 0; j < 4; j++) {
    if (float(j) >= k0) break;
    acc += (hash31(i * 7.1 + float(j) * 13.7 + floor(k / 4.0) * 3.1) - 0.5);
  }
  vec3 d = hash31(i * 7.1 + k0 * 13.7 + floor(k / 4.0) * 3.1) - 0.5;
  return (acc + d * f) * uJitter * seg * 2.0;
}
float gapEmpty(vec3 p) {     // how empty the slit is at p (0 outside the slit)
  vec3 l = (uCarInv * vec4(p, 1.0)).xyz;
  bool inside = abs(l.x) < 1.6 && abs(l.y) < 0.78 && l.z > -0.02 && l.z < 0.14;
  return inside ? uGap.x * (1.0 - slitFill(l.x)) : 0.0;
}
void main() {
  float i = float(gl_InstanceID);
  vec3 b = airBase(i);
  vec3 head = b + walk(i, uSim);
  vec3 tail = b + walk(i, uSim - uShutter * 3.0);
  float am = airMix(head);
  float a = am * (0.35 + 0.65 * hash11(i * 7.3));
  a *= 1.0 - gapEmpty(head);
  float d = length(head - uCamPos);
  a *= smoothstep(0.3, 1.2, d) * exp(-d / uFade);
  vec3 c = mix(vec3(0.55, 0.78, 1.0), vec3(0.95, 0.98, 1.0), hash11(i * 4.1));
  float big = step(0.97, hash11(i * 2.9));
  emitStreak(head, tail, 1.5 + 1.5 * big, vec4(c * (1.0 + 1.5 * big), a * uGain));
}`;

// --------------------------------------------------------------------------------------------- GAP (slit) MOTES
// car-local population of the thin slit between the floor and the surface; the fans pull them out (evacuation).
export const GAP_VS = COMMON + STREAK + /* glsl */`
uniform vec4 uGapBox;     // x x0, y x1, z half-width, w height
uniform vec4 uFanA, uFanB;   // car-local fan centres (xyz), w radius
uniform vec4 uEvac;       // x t_start (sim), y duration (sim), z residual share, w spiral time
uniform vec4 uLeak;       // x level, y period (sim s), z exhaust speed, w unused
vec3 gapBase(float i) {
  vec3 h = hash31(i * 0.917 + 1.7);
  float x = mix(uGapBox.x, uGapBox.y, h.x);
  float y = (h.y * 2.0 - 1.0) * uGapBox.z;
  float z = 0.008 + h.z * (uGapBox.w - 0.016);
  return vec3(x, y, z);
}
vec3 jit(float i, float t) {
  vec3 ph = hash31(i * 3.3 + 2.0) * 6.283;
  return 0.006 * vec3(sin(t * 9.0 + ph.x), sin(t * 11.0 + ph.y), sin(t * 13.0 + ph.z));
}
// car-local path of a departing mote: spiral into the nearest fan, then out of the tail as exhaust
vec3 departPath(vec3 b, float u, float i, out float vis) {
  vec3 fan = (abs(b.x - uFanA.x) < abs(b.x - uFanB.x)) ? uFanA.xyz : uFanB.xyz;
  vis = 1.0;
  if (u < 1.0) {
    float e = u * u * (3.0 - 2.0 * u);
    vec2 r0 = b.xy - fan.xy;
    float ang = e * (3.5 + 2.0 * hash11(i)) * (hash11(i * 7.7) > 0.5 ? 1.0 : -1.0);
    float rad = mix(1.0, 0.05, pow(e, 0.7));
    vec2 rr = vec2(cos(ang) * r0.x - sin(ang) * r0.y, sin(ang) * r0.x + cos(ang) * r0.y) * rad;
    float z = mix(b.z, fan.z - 0.01, e * e);
    return vec3(fan.xy + rr, z);
  }
  // exhaust: emerges at the tail, streams backward and spreads (schematic outlet)
  float v = u - 1.0;
  vis = (1.0 - smoothstep(0.0, 2.2, v)) * smoothstep(0.0, 0.08, v);
  float y = (hash11(i * 2.3) * 2.0 - 1.0) * 0.55;
  return vec3(-2.25 - v * 2.6 - v * v * 0.4, y * (1.0 + v * 0.8), 0.22 + 0.08 * hash11(i * 5.1) + v * 0.05);
}
void main() {
  float i = float(gl_InstanceID);
  vec3 b = gapBase(i);
  float h = hash11(i * 13.13 + 0.1);
  float share = 1.0 - uEvac.z;
  float tDep = uEvac.x + h / max(share, 1e-3) * uEvac.y;   // departure time (sim), only if h < share
  bool departs = h < share;
  vec3 lh, lt;
  float vis = 1.0, vis2 = 1.0;
  float glow = 1.0;
  float fill = slitFill(b.x);
  if (departs && uSim > tDep && hash11(i * 5.31) >= fill) {
    float u = (uSim - tDep) / uEvac.w;
    float u2 = (uSim - uShutter - tDep) / uEvac.w;
    lh = departPath(b, u, i, vis);
    lt = u2 > 0.0 ? departPath(b, u2, i, vis2) : b;
    if (u >= 1.0 && u2 < 1.0) lt = lh;     // the hidden jump through the body
    glow = 1.0 + 1.5 * smoothstep(0.2, 0.9, u) * (1.0 - step(1.0, u));
  } else {
    lh = b + jit(i, uSim);
    lt = b + jit(i, uSim - uShutter);
    if (departs && uSim > tDep) glow = 1.0 + 0.6 * fill;     // outside air that rushed back in
  }
  vec3 head = (uCarM * vec4(lh, 1.0)).xyz;
  vec3 tail = (uCarM * vec4(lt, 1.0)).xyz;
  float am = airMix(head);
  vec3 c = mix(vec3(0.75, 0.88, 1.0), vec3(1.0, 0.86, 0.6), 0.35);
  // soft margins: the sheet of slit air thins out toward the skirt edges instead of ending in a hard rectangle
  float edge = smoothstep(0.0, 0.32, min(b.x - uGapBox.x, uGapBox.y - b.x)) * smoothstep(0.0, 0.26, uGapBox.z - abs(b.y));
  emitStreak(head, tail, 1.4, vec4(c, am * vis * glow * uGain * mix(0.15, 1.0, edge)));
}`;

// steady leak through the skirt edges toward the fans once the slit is low (shows the fans must keep running)
export const LEAK_VS = COMMON + STREAK + /* glsl */`
uniform vec4 uGapBox;
uniform vec4 uFanA, uFanB;
uniform vec4 uLeak;       // x level, y period (sim s), z unused, w unused
vec3 leakPath(float i, float u) {
  vec3 h = hash31(i * 1.77 + 9.0);
  float x = mix(uGapBox.x + 0.2, uGapBox.y - 0.2, h.x);
  float sy = h.y > 0.5 ? 1.0 : -1.0;
  vec3 edge = vec3(x, sy * (uGapBox.z + 0.25), 0.02 + 0.09 * h.z);
  vec3 fan = (abs(x - uFanA.x) < abs(x - uFanB.x)) ? uFanA.xyz : uFanB.xyz;
  float e = u * u;
  vec3 p = mix(edge, fan, e);
  p.z = mix(edge.z, fan.z - 0.01, e * e);
  return p;
}
void main() {
  float i = float(gl_InstanceID);
  float ph = hash11(i * 4.91);
  float per = uLeak.y * (0.8 + 0.4 * hash11(i * 8.2));
  float u = fract(uSim / per + ph);
  float u2 = fract((uSim - uShutter) / per + ph);
  vec3 lh = leakPath(i, u);
  vec3 lt = u2 < u ? leakPath(i, u2) : lh;
  vec3 head = (uCarM * vec4(lh, 1.0)).xyz;
  vec3 tail = (uCarM * vec4(lt, 1.0)).xyz;
  float vis = smoothstep(0.0, 0.15, u) * (1.0 - smoothstep(0.85, 1.0, u));
  emitStreak(head, tail, 1.3, vec4(vec3(0.85, 0.93, 1.0), airMix(head) * vis * uLeak.x * uGain));
}`;

// ------------------------------------------------------------------------------------------------------- GLINTS
// pressure as impacts: car-surface samples flash at random (deterministic); the slit-facing floor flashes only
// in proportion to the remaining slit air. Each flash is a tiny streak into the surface. v6: with uInbound > 0, the air
// that makes the next impact is seen arriving along the surface normal (pressure acts perpendicular to the surface).
export const GLINT_VS = COMMON + STREAK + /* glsl */`
layout(location = 4) in vec4 aSample;   // car-local position, class (0 outer, 1 floor facing the slit)
layout(location = 5) in vec3 aNormal;   // car-local normal
uniform float uRate;                     // flashes per second per site
uniform float uInbound;                  // 0..1 inbound streak before each impact
void main() {
  float i = float(gl_InstanceID);
  float ph = hash11(i * 3.17);
  float cell = floor(uSim * uRate + ph);
  float fr = fract(uSim * uRate + ph);
  float prob = uPress.y * (aSample.w > 0.5 ? gapDensityAt(aSample.x) * 0.9 : 1.0);
  vec3 p = (uCarM * vec4(aSample.xyz, 1.0)).xyz;
  vec3 n = normalize(mat3(uCarM) * aNormal);
  float am = airMix(p);
  const float PRE = 0.24;
  if (uInbound > 0.0 && fr > 1.0 - PRE) {
    float onNext = step(hash12(vec2(i, cell + 1.0)), prob);
    float u = (fr - (1.0 - PRE)) / PRE;              // 0 → 1 as it arrives
    vec3 head = p + n * (0.012 + 0.6 * (1.0 - u));
    vec3 tail = head + n * (0.06 + 0.1 * (1.0 - u));
    float a = onNext * uInbound * smoothstep(0.0, 0.4, u) * am * 0.5;
    emitStreak(head, tail, 1.15, vec4(vec3(0.72, 0.86, 1.0), a * uGain));
    return;
  }
  float on = step(hash12(vec2(i, cell)), prob);
  float env = exp(-fr * 7.0);
  vec3 head = p + n * 0.006;
  float big = step(0.93, hash12(vec2(cell, i * 0.37)));
  vec3 c = mix(vec3(1.0, 0.5, 0.12), vec3(1.0, 0.9, 0.65), env);
  emitStreak(head, head, 1.6 + (1.6 + 3.0 * big) * env, vec4(c * (1.0 + 2.0 * big), on * env * am * uGain));
}`;

// -------------------------------------------------------------------------------------------------- CONVERGENCE
// many small pushes → one push: outer impact sites stream toward the beam axis, then along it into the surface.
export const CONVERGE_VS = COMMON + STREAK + /* glsl */`
layout(location = 4) in vec4 aSample;
layout(location = 5) in vec3 aNormal;
uniform vec4 uConv;        // x launch (sim), y duration (sim), z level, w loop period (0 = once)
uniform vec4 uAxis;        // car-local axis entry z (outside), w head z (at the surface)
vec3 convPath(vec3 s, vec3 n, float u, float i) {
  vec3 entry = vec3(0.12 * (hash11(i) - 0.5), 0.12 * (hash11(i * 2.0) - 0.5), uAxis.x);
  vec3 head = vec3(0.0, 0.0, uAxis.w);
  if (u < 0.6) {
    float e = u / 0.6;
    e = e * e * (3.0 - 2.0 * e);
    vec3 c1 = s + n * 0.25;              // clear the body, then gather on the axis outside the car
    vec3 c2 = entry + vec3(0.0, 0.0, 0.8);
    vec3 a = mix(s, c1, e), b = mix(c1, c2, e), c = mix(c2, entry, e);
    return mix(mix(a, b, e), mix(b, c, e), e);
  }
  float e = (u - 0.6) / 0.4;
  return mix(entry, head, e * e);
}
void main() {
  float i = float(gl_InstanceID);
  if (aSample.w > 0.5) { emitStreak(vec3(0.0), vec3(0.0), 1.0, vec4(0.0)); return; }
  float delay = hash11(i * 7.31) * 0.45;
  float t = uSim - uConv.x - delay * uConv.y;
  if (uConv.w > 0.0) t = mod(t, uConv.w);
  float u = t / uConv.y;
  float u2 = (t - uShutter) / uConv.y;
  if (u <= 0.0 || u >= 1.0) { emitStreak(vec3(0.0), vec3(0.0), 1.0, vec4(0.0)); return; }
  vec3 lh = convPath(aSample.xyz, aNormal, u, i);
  vec3 lt = convPath(aSample.xyz, aNormal, max(u2, 0.0), i);
  vec3 head = (uCarM * vec4(lh, 1.0)).xyz;
  vec3 tail = (uCarM * vec4(lt, 1.0)).xyz;
  float vis = smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.88, 1.0, u));
  if (hash11(i * 0.77) > 0.35) { emitStreak(vec3(0.0), vec3(0.0), 1.0, vec4(0.0)); return; }
  emitStreak(head, tail, 1.6, vec4(1.0, 0.72, 0.32, vis * uConv.z * airMix(head) * uGain));
}`;

// ---------------------------------------------------------------------------------------------------- FAN WAKE
// continuous exhaust of the fans out of the tail (schematic outlet), in car space
export const WAKE_VS = COMMON + STREAK + /* glsl */`
uniform vec4 uWake;        // x level, y period, z speed, w spread
void main() {
  float i = float(gl_InstanceID);
  float ph = hash11(i * 2.93);
  float per = uWake.y * (0.7 + 0.6 * hash11(i * 6.1));
  float u = fract(uSim / per + ph);
  float u2 = fract((uSim - uShutter) / per + ph);
  vec3 h = hash31(i * 1.1 + 4.0);
  vec3 o = vec3(-2.2, (h.x * 2.0 - 1.0) * 0.5, 0.16 + 0.18 * h.y);
  vec3 dir = normalize(vec3(-1.0, (h.x * 2.0 - 1.0) * uWake.w, 0.12 * (h.z - 0.3)));
  float L = uWake.z * per;
  vec3 lh = o + dir * L * u;
  vec3 lt = u2 < u ? o + dir * L * u2 : lh;
  vec3 head = (uCarM * vec4(lh, 1.0)).xyz;
  vec3 tail = (uCarM * vec4(lt, 1.0)).xyz;
  float vis = smoothstep(0.0, 0.05, u) * (1.0 - u);
  emitStreak(head, tail, 1.3, vec4(0.8, 0.9, 1.0, vis * uWake.x * airMix(head) * uGain));
}`;

// ------------------------------------------------------------------------------------------------------ INRUSH
// the deck ends under the car: outside air pours into the opened slit at its front and streams rearward (car space)
export const INRUSH_VS = COMMON + STREAK + /* glsl */`
uniform vec4 uGapBox;
uniform vec4 uRush;       // x level, y period (sim s), z run length (m), w unused
void main() {
  float i = float(gl_InstanceID);
  vec3 h = hash31(i * 2.17 + 5.0);
  float per = uRush.y * (0.7 + 0.6 * hash11(i * 3.9));
  float u = fract(uSim / per + h.x);
  float u2 = fract((uSim - uShutter) / per + h.x);
  float x0 = uOpen.x + 0.8;
  float L = uRush.z * (0.45 + 0.55 * h.y);
  float y = (h.z * 2.0 - 1.0) * uGapBox.z;
  float z = 0.015 + hash11(i * 7.7) * (uGapBox.w - 0.03);
  float dz = 0.35 * (hash11(i * 1.3) - 0.35);
  float e = 1.0 - (1.0 - u) * (1.0 - u), e2 = 1.0 - (1.0 - u2) * (1.0 - u2);
  vec3 lh = vec3(x0 - L * e, y, z + (1.0 - e) * dz);
  vec3 lt = u2 < u ? vec3(x0 - L * e2, y, z + (1.0 - e2) * dz) : lh;
  vec3 head = (uCarM * vec4(lh, 1.0)).xyz, tail = (uCarM * vec4(lt, 1.0)).xyz;
  float vis = smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.65, 1.0, u)) * step(uGapBox.x, lh.x);
  emitStreak(head, tail, 1.5, vec4(0.85, 0.93, 1.0, vis * uRush.x * airMix(head) * uGain));
}`;

// ------------------------------------------------------------------------------------------------------ SHARDS
// the push beam breaks: gold sparks fly off its axis and fade (world space)
export const SHARDS_VS = COMMON + STREAK + /* glsl */`
uniform vec3 uShardA, uShardB;   // beam tail, head
uniform vec4 uShard;             // x start (sim), y duration, z speed, w level
void main() {
  float i = float(gl_InstanceID);
  vec3 h = hash31(i * 1.91 + 7.0);
  float age = uSim - uShard.x;
  if (age <= 0.0 || age >= uShard.y) { emitStreak(vec3(0.0), vec3(0.0), 1.0, vec4(0.0)); return; }
  vec3 axis = uShardB - uShardA;
  vec3 ax = normalize(axis);
  vec3 base = uShardA + axis * h.x + (hash31(i * 4.4) - 0.5) * 0.12;
  vec3 d = normalize(hash31(i * 3.7 + 1.0) - 0.5);
  d = normalize(d - ax * dot(d, ax) * 0.75);
  float sp = uShard.z * (0.25 + 0.75 * h.y);
  float k = 2.2;
  vec3 head = base + d * sp * (1.0 - exp(-age * k)) / k;
  float a2 = max(age - uShutter, 0.0);
  vec3 tail = base + d * sp * (1.0 - exp(-a2 * k)) / k;
  float big = step(0.92, h.z);
  float a = pow(1.0 - age / uShard.y, 1.6) * uShard.w;
  emitStreak(head, tail, 1.5 + 2.0 * big, vec4(vec3(1.0, 0.66, 0.24) * (1.4 + 2.5 * big), a * airMix(head) * uGain));
}`;

// ------------------------------------------------------------------------------------------------------- STORE
// the car's own gas (schematic): two pressure vessels packed with fast, crowded ice-cyan motes; the reserve level
// removes motes as it is spent. Instances [0, uStoreN.x) are gas, the rest outline the vessels as glass contours.
export const STORE_VS = COMMON + STREAK + /* glsl */`
uniform vec4 uVessel;     // car-local x0, x1, |y| of the two axes, z
uniform vec4 uStore;      // x reserve 0..1, y jitter rate (1/s), z jitter amplitude (m), w radius (m)
uniform vec4 uStoreN;     // x gas count, y outline gain, z gas gain, w unused
vec3 capsulePoint(vec3 h, float side) {
  float r = uStore.w;
  float x = mix(uVessel.x - 0.7 * r, uVessel.y + 0.7 * r, h.x);
  float cap = max(uVessel.x - x, x - uVessel.y);
  float rr = r * 0.9 * sqrt(h.y) * (cap > 0.0 ? sqrt(max(0.0, 1.0 - (cap / r) * (cap / r))) : 1.0);
  float a = h.z * 6.2831;
  return vec3(x, side * uVessel.z + rr * cos(a), uVessel.w + rr * sin(a));
}
void main() {
  float i = float(gl_InstanceID);
  float side = hash11(i * 9.13) < 0.5 ? -1.0 : 1.0;
  vec3 lh, lt;
  vec4 col;
  float w = 1.3;
  if (i < uStoreN.x) {
    vec3 b = capsulePoint(hash31(i * 0.613 + 2.0), side);
    // fast random walk: a new direction every 1/rate seconds (crowded, violently jittering)
    float k = floor(uSim * uStore.y + hash11(i));
    float f = fract(uSim * uStore.y + hash11(i));
    vec3 j0 = hash31(i * 3.1 + k * 7.7) - 0.5, j1 = hash31(i * 3.1 + (k + 1.0) * 7.7) - 0.5;
    lh = b + mix(j0, j1, f) * uStore.z;
    float f2 = fract((uSim - uShutter) * uStore.y + hash11(i));
    lt = b + mix(j0, j1, max(f2, 0.0)) * uStore.z;
    if (f2 > f) lt = lh;
    float keep = 1.0 - smoothstep(uStore.x - 0.025, uStore.x, hash11(i * 6.77));
    float hot = step(0.96, hash11(i * 2.2));
    col = vec4(vec3(0.35, 0.85, 1.0) * (1.0 + 2.0 * hot), keep * uStoreN.z);
  } else {
    float j = i - uStoreN.x;
    vec3 h = hash31(j * 1.37 + 11.0);
    float r = uStore.w;
    float a = h.z * 6.2831;
    float x;
    if (h.x < 0.6) { x = mix(uVessel.x, uVessel.y, floor(h.y * 9.0) / 8.0); }          // rings
    else { x = mix(uVessel.x, uVessel.y, h.y); a = floor(h.z * 6.0) * 1.0472; }        // long lines
    if (h.x > 0.9) {                                                                     // end caps
      float c = (h.y < 0.5 ? -1.0 : 1.0), ang = hash11(j * 3.3) * 1.5708;
      x = (c < 0.0 ? uVessel.x : uVessel.y) + c * r * sin(ang);
      r *= cos(ang);
    }
    lh = vec3(x, side * uVessel.z + r * cos(a), uVessel.w + r * sin(a));
    lt = lh;
    w = 1.1;
    col = vec4(0.55, 0.88, 1.0, 0.35 * uStoreN.y);
  }
  vec3 head = (uCarM * vec4(lh, 1.0)).xyz, tail = (uCarM * vec4(lt, 1.0)).xyz;
  emitStreak(head, tail, w, vec4(col.rgb, col.a * airMix(head) * uGain));
}`;

// --------------------------------------------------------------------------------------------------------- JETS
// cold-gas jets from the schematic nozzles: white mist to the eye (night), ice cyan in air vision. Emitted in car
// space (plumes turn with the car, as in the source). With uCarVel = 0 a particle sits at nozzle + R·u·age relative to
// the car: for a steady car velocity V that is the exact drag-free result, because exhaust inherits V (emitted at
// x_now − V·age with world velocity V + R·u, so V cancels) — the E2 schematic uses this comoving plume. A non-zero
// uCarVel shifts trails back by −V·age, i.e. drops the inherited velocity: it is only a look-fit of the night
// reconstruction to the source footage (where plumes lag in the air), not a velocity model. No flow is simulated.
export const JET_VS = COMMON + STREAK + /* glsl */`
uniform vec4 uNozP[6];    // car-local positions (w unused)
uniform vec4 uNozD[6];    // car-local exhaust directions, w level 0..1
uniform vec3 uCarVel;     // world m per sim second
uniform vec4 uJet;        // x period (sim s), y exit speed (m/s), z length scale, w spread
uniform vec4 uJetLook;    // x cyan (air) amount, y night gain, z air gain, w size scale
void main() {
  float i = float(gl_InstanceID);
  int k = int(mod(i, 6.0));
  float lv = uNozD[k].w;
  if (lv < 0.01) { emitStreak(vec3(0.0), vec3(0.0), 1.0, vec4(0.0)); return; }
  vec3 h = hash31(i * 0.731 + 3.0);
  float per = uJet.x * (0.75 + 0.5 * h.x);
  float age = fract(uSim / per + h.y) * per;
  float age2 = max(age - uShutter, 0.0);
  vec3 d = normalize(uNozD[k].xyz);
  vec3 up = abs(d.z) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
  vec3 s1 = normalize(cross(d, up)), s2 = cross(d, s1);
  float ang = h.z * 6.2831, rr = sqrt(hash11(i * 4.7));
  vec3 rad = (s1 * cos(ang) + s2 * sin(ang)) * rr;
  float sp = uJet.y * uJet.z * (0.7 + 0.6 * hash11(i * 8.1)) * (0.6 + 0.4 * sqrt(lv));
  vec3 lh = uNozP[k].xyz + d * sp * age + rad * (0.03 + uJet.w * age * uJet.z);
  vec3 lt = uNozP[k].xyz + d * sp * age2 + rad * (0.03 + uJet.w * age2 * uJet.z);
  vec3 head = (uCarM * vec4(lh, 1.0)).xyz - uCarVel * age;
  vec3 tail = (uCarM * vec4(lt, 1.0)).xyz - uCarVel * age2;
  float u = age / per;
  float am = airMix(head);
  float fade = smoothstep(0.0, 0.04, u) * pow(1.0 - u, 1.4) * sqrt(lv);
  float size = pxSize((0.05 + 0.5 * u * uJet.z) * uJetLook.w, head);
  vec3 night = vec3(0.82, 0.88, 0.96) * uJetLook.y;
  vec3 air = vec3(0.35, 0.85, 1.0) * uJetLook.z;
  vec3 c = mix(night, air, max(am, uJetLook.x));
  float core = mix(1.0, 0.35, smoothstep(0.0, 0.5, u));
  emitStreak(head, tail, max(size, 1.2), vec4(c, fade * core * uGain));
}`;

// -------------------------------------------------------------------------------------------------------- PUFFS
// the white cloud: soft gas sprites inside flattened, growing puffs, lit by the floods (air vision tints it cyan)
export const PUFF_VS = COMMON + STREAK + /* glsl */`
uniform vec4 uPuff[18];   // centre xyz, radius
uniform vec4 uPuffD[18];  // x density, y vertical flattening, z age (s), w unused
uniform vec4 uPuffN;      // x count, y per puff, z drift clock, w size scale
uniform vec4 uPuffLook;   // x ambient, y spot gain, z cyan amount (air), w unused
void main() {
  float i = float(gl_InstanceID);
  float k = floor(i / uPuffN.y);
  if (k >= uPuffN.x) { emitStreak(vec3(0.0), vec3(0.0), 1.0, vec4(0.0)); return; }
  int ki = int(k);
  vec4 P = uPuff[ki], D = uPuffD[ki];
  vec3 h = hash31(i * 0.377 + 9.0);
  vec3 dir = normalize(hash31(i * 1.913 + 2.0) - 0.5);
  float fr = pow(h.x, 0.55);
  vec3 p = P.xyz + dir * P.w * fr * vec3(1.0, 1.0, D.y);
  float tt = uPuffN.z * 0.25;
  p += (vec3(vnoise(p * 0.45 + tt), vnoise(p * 0.45 + tt + 11.0), vnoise(p * 0.45 + tt + 23.0)) - 0.5) * P.w * 0.5;
  p.z += uPuffN.z * 0.08 * h.y;
  if (p.z < 0.05) p.z = 0.05 + 0.3 * h.z;
  float lit = uPuffLook.x;
  for (int s = 0; s < MAX_SPOTS; s++) {
    if (s >= uNumSpots) break;
    vec3 L; float dist;
    lit += spotCone(s, p, L, dist) * 0.05 * uPuffLook.y;
  }
  float am = airMix(p);
  vec3 c = mix(vec3(0.92, 0.94, 0.97), vec3(0.4, 0.8, 1.0), max(am, uPuffLook.z));
  float size = pxSize(P.w * (0.35 + 0.45 * h.y) * uPuffN.w, p);
  float a = D.x * (1.0 - fr * fr * 0.6) * min(lit, 2.0);
  emitStreak(p, p, size, vec4(c, a * uGain));
}`;

// -------------------------------------------------------------------------------------------------------- LINES
// overhead lines in the lot (v4 staging polylines): constant-width antialiased segments, lit by the floods
export const CABLE_VS = COMMON + STREAK + /* glsl */`
layout(location = 4) in vec4 aA;   // xyz start, w radius (m)
layout(location = 5) in vec3 aB;
void main() {
  vec3 mid = 0.5 * (aA.xyz + aB);
  float lit = 0.55;
  for (int s = 0; s < MAX_SPOTS; s++) {
    if (s >= uNumSpots) break;
    vec3 L; float dist;
    lit += spotCone(s, mid, L, dist) * 0.05;
  }
  float w = max(pxSize(2.0 * aA.w, mid), 1.35);
  emitStreak(aB, aA.xyz, w, vec4(vec3(0.62, 0.64, 0.68) * min(lit, 1.6), uGain));
}`;

// --------------------------------------------------------------------------------------------------------- PATH
// the spent gas made visible: an ice-cyan tube of light along the airborne path (uniform polyline, 48 points)
export const PATH_VS = COMMON + STREAK + /* glsl */`
uniform vec4 uPathP[48];  // xyz (w unused)
uniform vec4 uPath;       // x drawn 0..1 (from the lip), y drained 0..1, z radius (m), w flow clock
vec3 pathAt(float u) {
  float f = clamp(u, 0.0, 1.0) * 47.0;
  int a = int(min(floor(f), 46.0));
  return mix(uPathP[a].xyz, uPathP[a + 1].xyz, f - float(a));
}
void main() {
  float i = float(gl_InstanceID);
  vec3 h = hash31(i * 0.519 + 4.0);
  float u = h.x;
  if (u > uPath.x || u < uPath.y) { emitStreak(vec3(0.0), vec3(0.0), 1.0, vec4(0.0)); return; }
  vec3 c0 = pathAt(u);
  vec3 dir = normalize(pathAt(u + 0.01) - pathAt(u - 0.01));
  vec3 up = abs(dir.z) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
  vec3 s1 = normalize(cross(dir, up)), s2 = cross(dir, s1);
  float a = h.y * 6.2831, rr = uPath.z * sqrt(h.z);
  vec3 p = c0 + (s1 * cos(a) + s2 * sin(a)) * rr;
  float flow = 0.5 + 0.5 * sin(6.2831 * (u * 6.0 - uPath.w * 0.8));
  float edge = smoothstep(0.0, 0.03, uPath.x - u) * smoothstep(0.0, 0.03, u - uPath.y);
  float core = exp(-rr * rr / (uPath.z * uPath.z) * 2.0);
  emitStreak(p, p - dir * 0.08, 1.4, vec4(vec3(0.35, 0.85, 1.0) * (0.6 + 0.8 * flow), edge * (0.3 + 0.7 * core) * uGain));
}`;
