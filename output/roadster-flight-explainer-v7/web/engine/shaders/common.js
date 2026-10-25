// common.js — shared GLSL: hashing, noise, frame uniforms, the two-realities mix (night vs air vision), lights.

export const COMMON = /* glsl */`
#define PI 3.14159265359
#define MAX_SPOTS 4
#define MAX_CARDS 6

uniform mat4 uView, uProj, uViewProj, uInvViewProj;
uniform vec3 uCamPos;
uniform vec2 uRes;
uniform float uTime;      // film seconds
uniform float uSim;       // world clock (event seconds, slow-motion aware)
uniform float uSeed;      // per-subframe seed

// ---- the Ping: night ↔ air vision
uniform vec4 uPing;       // xyz centre, w radius (m)
uniform vec4 uPingP;      // x band width, y ring intensity, z global air floor, w sky air
uniform vec3 uAirBg;      // air-vision background colour
uniform vec4 uAirRim;     // rgb rim colour, w contour strength

// ---- lights (night)
uniform vec4 uSpotPos[MAX_SPOTS];  // xyz, w intensity
uniform vec4 uSpotDir[MAX_SPOTS];  // xyz, w cos(outer)
uniform vec4 uSpotCol[MAX_SPOTS];  // rgb, w cos(inner)
uniform vec4 uSpotX[MAX_SPOTS];    // x range, y casts shadow, z beam strength, w surface strength
uniform int uNumSpots;
uniform sampler2D uShadow;
uniform mat4 uShadowVP;
uniform vec4 uShadowP;             // x bias, y texel size, z radius (texels), w enabled
uniform vec4 uCardC[MAX_CARDS];    // xyz centre direction, w unused
uniform vec4 uCardS[MAX_CARDS];    // x tan half-width, y tan half-height, z roll, w softness
uniform vec4 uCardCol[MAX_CARDS];  // rgb radiance, w diffuse weight
uniform int uNumCards;
uniform vec3 uSkyTop, uSkyHorizon, uGround;
uniform vec4 uFog;                 // rgb, w density

// ---- car & air-physics state
uniform mat4 uCarM, uCarInv;
uniform vec4 uGap;      // x evacuation 0..1, y residual density, z flow clock, w gap glow gain
uniform vec4 uPress;    // x outer pressure glow, y glint level, z contact glow, w beam progress
uniform vec4 uOpen;     // the deck ends under the car: slit air restored for car-local x > uOpen.x (soft uOpen.y); w on

// share of the slit refilled with outside air at car-local x (0 = still sealed and pumped out)
float slitFill(float lx) {
  if (uOpen.w < 0.5) return 0.0;
  return smoothstep(uOpen.x - uOpen.y, uOpen.x + uOpen.y, lx);
}
// slit air density at car-local x (1 = outside pressure)
float gapDensityAt(float lx) { return 1.0 - uGap.x * (1.0 - uGap.y) * (1.0 - slitFill(lx)); }

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash31(float p) { vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
vec2 hash21(float p) { vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }

float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i), n100 = hash13(i + vec3(1, 0, 0)), n010 = hash13(i + vec3(0, 1, 0)), n110 = hash13(i + vec3(1, 1, 0));
  float n001 = hash13(i + vec3(0, 0, 1)), n101 = hash13(i + vec3(1, 0, 1)), n011 = hash13(i + vec3(0, 1, 1)), n111 = hash13(i + vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float vnoise2(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1, 0)), c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm2(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise2(p); p = p * 2.07 + 7.3; a *= 0.5; } return s; }

float airMix(vec3 p) {
  float d = length(p - uPing.xyz);
  float m = (uPing.w > 0.0) ? 1.0 - smoothstep(uPing.w - uPingP.x, uPing.w, d) : 0.0;
  return max(m, uPingP.z);
}
float pingRing(vec3 p) {
  if (uPing.w <= 0.0 || uPingP.y <= 0.0) return 0.0;
  float d = length(p - uPing.xyz);
  float x = (d - uPing.w) / max(uPingP.x * 0.22, 1e-3);
  return exp(-x * x) * uPingP.y;
}

float spotCone(int i, vec3 p, out vec3 L, out float dist) {
  vec3 lv = uSpotPos[i].xyz - p;
  dist = length(lv);
  L = lv / max(dist, 1e-4);
  float c = dot(-L, uSpotDir[i].xyz);
  float cone = smoothstep(uSpotDir[i].w, uSpotCol[i].w, c);
  float range = uSpotX[i].x;
  float win = 1.0 - smoothstep(range * 0.7, range, dist);
  return cone * win * uSpotPos[i].w / (1.0 + dist * dist);
}

float shadowAt(vec3 p, vec3 n) {
  if (uShadowP.w < 0.5) return 1.0;
  vec4 sp = uShadowVP * vec4(p + n * 0.02, 1.0);
  vec3 s = sp.xyz / sp.w * 0.5 + 0.5;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  float sum = 0.0;
  float r = uShadowP.z * uShadowP.y;
  float ang = hash13(p * 91.7 + uSeed) * 6.2831;
  for (int k = 0; k < 12; k++) {
    float fk = float(k);
    float rr = sqrt((fk + 0.5) / 12.0) * r;
    float a = ang + fk * 2.39996;
    vec2 o = vec2(cos(a), sin(a)) * rr;
    float d = texture(uShadow, s.xy + o).r;
    sum += (s.z - uShadowP.x > d) ? 0.0 : 1.0;
  }
  return sum / 12.0;
}
`;

// Physically-based helpers + the night environment (analytic softbox "cards" + sky gradient)
export const PBR = /* glsl */`
vec3 F_Schlick(vec3 F0, float c) { return F0 + (1.0 - F0) * pow(1.0 - c, 5.0); }
float D_GGX(float NoH, float a) { float a2 = a * a; float d = NoH * NoH * (a2 - 1.0) + 1.0; return a2 / (PI * d * d + 1e-7); }
float V_Smith(float NoV, float NoL, float a) {
  float a2 = a * a;
  float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
  float gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / (gv + gl + 1e-5);
}

vec3 skyColor(vec3 d) {
  float h = d.z;
  vec3 c = mix(uSkyHorizon, uSkyTop, smoothstep(0.0, 0.6, h));
  c = mix(uGround, c, smoothstep(-0.08, 0.02, h));
  return c;
}

vec3 cardRadiance(vec3 R, float rough, out float diffW) {
  vec3 c = vec3(0.0);
  diffW = 0.0;
  for (int i = 0; i < MAX_CARDS; i++) {
    if (i >= uNumCards) break;
    vec3 cd = uCardC[i].xyz;
    float w = dot(R, cd);
    if (w <= 0.02) continue;
    vec3 up = abs(cd.z) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec3 t1 = normalize(cross(cd, up));
    vec3 t2 = cross(t1, cd);
    float cr = cos(uCardS[i].z), sr = sin(uCardS[i].z);
    vec3 a1 = t1 * cr + t2 * sr, a2 = -t1 * sr + t2 * cr;
    vec2 uv = vec2(dot(R, a1), dot(R, a2)) / w;
    float soft = uCardS[i].w + rough * 0.9;
    vec2 q = abs(uv) - uCardS[i].xy;
    float m = (1.0 - smoothstep(-soft, soft, q.x)) * (1.0 - smoothstep(-soft, soft, q.y));
    c += uCardCol[i].rgb * m * pow(1.0 - clamp(rough, 0.0, 1.0), 4.0) / (1.0 + rough * 5.0);
  }
  return c;
}

vec3 envSpec(vec3 R, float rough) {
  float dw;
  return skyColor(R) + cardRadiance(R, rough, dw);
}

vec3 envDiffuse(vec3 N) {
  vec3 c = mix(uGround, uSkyTop, N.z * 0.5 + 0.5) * 1.6;
  for (int i = 0; i < MAX_CARDS; i++) {
    if (i >= uNumCards) break;
    float area = 4.0 * uCardS[i].x * uCardS[i].y / (1.0 + uCardS[i].x * uCardS[i].x + uCardS[i].y * uCardS[i].y);
    c += uCardCol[i].rgb * uCardCol[i].w * area * max(dot(N, uCardC[i].xyz), 0.0) / PI;
  }
  return c;
}
`;
