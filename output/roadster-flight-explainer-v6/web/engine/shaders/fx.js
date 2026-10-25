// fx.js — force beams (ribbons), the Ping wavefront, the slit-air volume, floodlight god-rays (raymarched).
import { COMMON } from './common.js';

// ----------------------------------------------------------------------------------------------- RIBBON (beam)
// camera-facing quad from A (tail) to B (head); the fragment shader draws shaft + arrowhead + flowing chevrons.
export const RIBBON_VS = COMMON + /* glsl */`
uniform vec3 uA, uB;
uniform float uWidth;     // full width of the head (m)
out vec2 vUV;             // x: 0 tail → 1 head, y: -1..1 across
void main() {
  int k = gl_VertexID;
  vec3 axis = uB - uA;
  vec3 mid = 0.5 * (uA + uB);
  vec3 side = normalize(cross(axis, uCamPos - mid));
  float u = (k >= 2) ? 1.0 : 0.0;
  float v = (k == 0 || k == 2) ? -1.0 : 1.0;
  vec3 p = mix(uA, uB, u) + side * v * uWidth * 0.5;
  vUV = vec2(u, v);
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

export const RIBBON_FS = COMMON + /* glsl */`
in vec2 vUV;
uniform vec3 uColor;      // HDR colour
uniform vec4 uShape;      // x shaft half-width (fraction of the head half-width), y head length (fraction), z progress 0..1, w flow phase
uniform float uLenM;      // length in metres (chevron spacing)
uniform float uAlpha;
out vec4 o;
void main() {
  float u = vUV.x, v = abs(vUV.y);
  float p = uShape.z;
  if (u > p) discard;
  // the arrow travels: its head sits at the progress front
  float headStart = max(p - uShape.y, 0.0);
  float d;   // distance (in head half-widths) outside the solid shape
  if (u < headStart) d = v - uShape.x;
  else {
    float k = (u - headStart) / max(p - headStart, 1e-4);
    d = v - mix(1.0, 0.0, k);
  }
  float core = 1.0 - smoothstep(-0.05, 0.03, d);
  float halo = exp(-max(d, 0.0) * 9.0) * 0.35;
  float across = 1.0 - v / max(uShape.x, 1e-3);
  float chev = 0.5 + 0.5 * sin(6.2831 * (u * uLenM * 1.6 - v * 0.6 - uShape.w));
  chev = smoothstep(0.55, 0.95, chev);
  float hot = smoothstep(0.0, 1.0, across) * 0.6;
  vec3 c = uColor * (core * (0.65 + 0.35 * chev + hot) + halo);
  c *= smoothstep(0.0, 0.06, u);
  o = vec4(c * uAlpha, 1.0);
}`;

// ----------------------------------------------------------------------------------------------- SHELL (Ping)
export const SHELL_VS = COMMON + /* glsl */`
layout(location = 0) in vec3 aPos;
out vec3 vN;
out vec3 vP;
void main() {
  vN = aPos;
  vec3 p = uPing.xyz + aPos * uPing.w;
  vP = p;
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

export const SHELL_FS = COMMON + /* glsl */`
in vec3 vN;
in vec3 vP;
uniform float uShellGain;
out vec4 o;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(uCamPos - vP);
  float f = 1.0 - abs(dot(N, V));
  float r = pow(f, 5.0), g = pow(f, 4.0), b = pow(f, 3.2);
  float n = 0.7 + 0.6 * vnoise(N * 6.0 + uTime * 0.7);
  vec3 c = vec3(r * 0.55, g * 0.85, b * 1.0) * uAirRim.rgb * 2.5 * n;
  c += uAirRim.rgb * 0.03;
  o = vec4(c * uShellGain, 1.0);
}`;

// ---------------------------------------------------------------------------------------------- GAP VOLUME
// the slit's air as a glowing medium: integrate density along the view ray inside the car-local box.
export const GAPVOL_VS = COMMON + /* glsl */`
layout(location = 0) in vec3 aPos;     // unit cube -0.5..0.5
uniform vec4 uGapBox;                  // x x0, y x1, z half-width, w height
out vec3 vLocal;
void main() {
  vec3 l = vec3(mix(uGapBox.x, uGapBox.y, aPos.x + 0.5), aPos.y * 2.0 * uGapBox.z, (aPos.z + 0.5) * uGapBox.w);
  vLocal = l;
  gl_Position = uViewProj * uCarM * vec4(l, 1.0);
}`;

export const GAPVOL_FS = COMMON + /* glsl */`
in vec3 vLocal;
uniform vec4 uGapBox;
uniform vec4 uFanA, uFanB;
uniform vec3 uGapColor;
uniform float uGapGain;
out vec4 o;
vec2 boxHit(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (bmin - ro) * inv, t1 = (bmax - ro) * inv;
  vec3 tmin = min(t0, t1), tmax = max(t0, t1);
  return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z));
}
void main() {
  vec3 roL = (uCarInv * vec4(uCamPos, 1.0)).xyz;
  vec3 rdL = normalize(vLocal - roL);
  vec3 bmin = vec3(uGapBox.x, -uGapBox.z, 0.0), bmax = vec3(uGapBox.y, uGapBox.z, uGapBox.w);
  vec2 h = boxHit(roL, rdL, bmin, bmax);
  float t0 = max(h.x, 0.0), t1 = h.y;
  if (t1 <= t0) discard;
  float acc = 0.0;
  const int STEPS = 10;
  float jitter = hash12(gl_FragCoord.xy + uSeed);
  for (int i = 0; i < STEPS; i++) {
    float t = mix(t0, t1, (float(i) + jitter) / float(STEPS));
    vec3 p = roL + rdL * t;
    // flow toward the nearest fan as the fans run: advect the noise along the inflow
    vec3 fan = (abs(p.x - uFanA.x) < abs(p.x - uFanB.x)) ? uFanA.xyz : uFanB.xyz;
    vec2 rel = p.xy - fan.xy;
    float r = length(rel);
    float sw = uGap.z * 1.6 * uGap.x / (0.25 + r);              // swirl angle grows toward the fan
    float cs = cos(sw), sn = sin(sw);
    vec2 q = vec2(cs * rel.x - sn * rel.y, sn * rel.x + cs * rel.y) * (1.0 + 0.6 * uGap.x);
    float n = vnoise(vec3(q * vec2(7.0, 7.0), p.z * 20.0 + uSim * 0.5));
    n *= smoothstep(0.0, 0.45, r + 0.3 * (1.0 - uGap.x));
    float edge = smoothstep(0.0, 0.04, p.z) * smoothstep(0.0, 0.03, uGapBox.w - p.z)
      * smoothstep(0.0, 0.32, min(p.x - uGapBox.x, uGapBox.y - p.x)) * smoothstep(0.0, 0.26, uGapBox.z - abs(p.y));
    acc += (0.55 + 0.9 * n) * edge * gapDensityAt(p.x);
  }
  float L = (t1 - t0);
  float val = acc / float(STEPS) * L;
  float am = airMix((uCarM * vec4(roL + rdL * t0, 1.0)).xyz);
  o = vec4(uGapColor * val * uGapGain * am, 1.0);
}`;

// ---------------------------------------------------------------------------------------------- VOLUMETRIC LIGHT
// floodlight cones in haze, raymarched against the scene depth; per-pixel jitter averages out over sub-frames.
export const VOLUME_FS = COMMON + /* glsl */`
in vec2 vUv;
uniform sampler2D uDepth;
uniform vec4 uVol;      // x max distance, y haze density, z noise scale, w steps
uniform vec3 uVolWind;
out vec4 o;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
void main() {
  float dz = texture(uDepth, vUv).r;
  vec4 wp = uInvViewProj * vec4(vUv * 2.0 - 1.0, dz * 2.0 - 1.0, 1.0);
  wp /= wp.w;
  vec3 ro = uCamPos;
  vec3 rd = normalize(wp.xyz - ro);
  float tmax = min(length(wp.xyz - ro), uVol.x);
  int steps = int(uVol.w);
  float jitter = hash12(gl_FragCoord.xy * 1.37 + uSeed * 17.0);
  vec3 acc = vec3(0.0);
  float dt = tmax / float(steps);
  for (int i = 0; i < 96; i++) {
    if (i >= steps) break;
    float t = (float(i) + jitter) * dt;
    vec3 p = ro + rd * t;
    float am = airMix(p);
    if (am > 0.999) continue;
    float haze = uVol.y * (0.45 + 0.9 * fbm(p * uVol.z + uVolWind * uSim));
    for (int s = 0; s < MAX_SPOTS; s++) {
      if (s >= uNumSpots) break;
      if (uSpotX[s].z <= 0.0) continue;
      vec3 L; float dist;
      float c = spotCone(s, p, L, dist);
      if (c <= 1e-6) continue;
      c *= (1.0 + dist * dist) / (1.0 + max(dist, 4.0) * max(dist, 4.0));   // no blow-out at the lamp
      float sh = 1.0;
      if (uSpotX[s].y > 0.5 && uShadowP.w > 0.5) {
        vec4 sp = uShadowVP * vec4(p, 1.0);
        vec3 q = sp.xyz / sp.w * 0.5 + 0.5;
        if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0 && q.z < 1.0)
          sh = (q.z - 0.002 > texture(uShadow, q.xy).r) ? 0.0 : 1.0;
      }
      acc += uSpotCol[s].rgb * c * uSpotX[s].z * sh * hg(dot(rd, L), 0.45) * haze * (1.0 - am) * dt;
    }
  }
  o = vec4(acc, 1.0);
}`;

// ------------------------------------------------------------------------------------------------- ARC (torque)
// a ribbon bent along a circular arc in the plane (U, V) around C; drawn by RIBBON_FS (shaft, arrowhead, flow)
export const ARC_VS = COMMON + /* glsl */`
uniform vec3 uArcC, uArcU, uArcV;
uniform vec4 uArc;        // x radius (m), y start angle, z end angle (rad), w width (m)
out vec2 vUV;
void main() {
  int k = gl_VertexID;
  float j = float(k / 2), side = float(k % 2);
  float u = j / 64.0;
  float a = mix(uArc.y, uArc.z, u);
  vec3 radial = uArcU * cos(a) + uArcV * sin(a);
  vec3 p = uArcC + radial * (uArc.x + (side - 0.5) * uArc.w);
  vUV = vec2(u, side * 2.0 - 1.0);
  gl_Position = uViewProj * vec4(p, 1.0);
}`;
