// surface.js — every opaque surface, shaded in both realities and mixed per fragment by the Ping.
import { COMMON, PBR } from './common.js';

export const SURFACE_VS = COMMON + /* glsl */`
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
layout(location = 2) in float aMat;
layout(location = 3) in vec2 aExt;
uniform mat4 uModel;
uniform mat3 uNormalMat;
out vec3 vPos;
out vec3 vNor;
out vec3 vLocal;
out vec3 vLocalN;
out vec2 vExt;
flat out int vMat;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vPos = wp.xyz;
  vNor = normalize(uNormalMat * aNor);
  vLocal = aPos;
  vLocalN = aNor;
  vExt = aExt;
  vMat = int(aMat + 0.5);
  gl_Position = uViewProj * wp;
}`;

export const SURFACE_FS = COMMON + PBR + /* glsl */`
in vec3 vPos;
in vec3 vNor;
in vec3 vLocal;
in vec3 vLocalN;
in vec2 vExt;
flat in int vMat;
uniform vec4 uMatA[24];   // base rgb, roughness
uniform vec4 uMatB[24];   // metallic, clearcoat, emissive strength, kind
uniform vec4 uMatE[24];   // emissive rgb, air edge
uniform int uObj;         // 0 car body, 1 wheel, 2 ramp, 3 neon, 4 lattice, 5 venue, 6 floor
uniform float uMirror;    // -1 for mirrored instances (flip normals' facing test)
uniform vec4 uLamps;      // x front white, y tail red, z amber, w fan glow
uniform vec4 uObjAir;     // x air base gain, y rim gain, z contour gain, w night gain
uniform sampler2D uRefl;  // mirrored scene (floor reflections), mip-mapped
uniform vec4 uReflP;      // x on, y strength, z lod bias, w distortion
uniform float uAirAlpha;  // car opacity in air vision (x-ray)
uniform vec4 uPools[4];   // floor light pools around the flood fixtures: xy, radius, intensity
uniform float uFanOnly;   // > 0: x-ray overlay pass that draws only the schematic fans (additive, through the body)
uniform vec4 uRampGold;   // borrowed pressure on the whole driving surface: x level, y swept arc length s, z sparkle
uniform vec4 uFloorLook;  // x 1 = the kickflip lot (pale rough ground, no polished-floor pools/reflections)
out vec4 outColor;

// tyre contact patches on the surface under the car (car space), for the load the push puts through the tyres
float contactPatches(vec3 p) {
  vec3 l = (uCarInv * vec4(p, 1.0)).xyz;
  if (abs(l.z) > 0.12) return 0.0;
  float c = 0.0;
  for (int k = 0; k < 4; k++) {
    vec2 w = vec2(k < 2 ? 1.33 : -1.32, (k % 2 == 0) ? 0.857 : -0.857);
    vec2 d = (l.xy - w) / vec2(0.22, 0.2);
    c += exp(-dot(d, d) * 1.4);
  }
  return c * (1.0 - smoothstep(0.03, 0.12, abs(l.z)));
}

float gridLine(float x, float w) {
  float fw = fwidth(x);
  float d = abs(fract(x - 0.5) - 0.5);
  return 1.0 - smoothstep(w * 0.5, w * 0.5 + fw * 1.2, d);
}

// soft contact occlusion of a surface point by the car (box footprint in car space)
float carOcclusion(vec3 p) {
  vec3 l = (uCarInv * vec4(p, 1.0)).xyz;
  if (l.z < -0.08 || l.z > 0.5) return 0.0;
  vec2 q = abs(l.xy) - vec2(2.05, 0.92);
  float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float o = 1.0 - smoothstep(-0.5, 0.65, sdf);
  return o * (1.0 - smoothstep(0.1, 0.5, l.z));
}

void main() {
  vec3 N = normalize(vNor);
  bool ff = gl_FrontFacing;
  if (uMirror < 0.0) ff = !ff;
  if (!ff) N = -N;
  vec3 V = normalize(uCamPos - vPos);
  float NoV = max(dot(N, V), 1e-4);
  int mi = vMat;
  vec4 A = uMatA[mi], B = uMatB[mi], E = uMatE[mi];
  vec3 base = A.rgb;
  float rough = A.a;
  float metal = B.x;
  float cc = B.y;
  int kind = int(B.w + 0.5);
  vec3 emis = E.rgb * B.z;
  float occl = 0.0;
  if (uFanOnly > 0.0) {      // schematic rotor seen through the smoked-glass body: spinning blades, hub, rim
    if (kind != 6) discard;
    vec2 fc = vLocal.xy - (vLocal.x > 0.0 ? vec2(0.62, 0.0) : vec2(-0.68, 0.0));
    float r = length(fc) / 0.28;
    float a = atan(fc.y, fc.x) + uGap.z * 9.0 * (vLocal.x > 0.0 ? 1.0 : -1.0);
    float blades = smoothstep(0.3, 0.7, abs(sin(a * 4.5))) * smoothstep(0.18, 0.3, r);
    float hub = 1.0 - smoothstep(0.14, 0.2, r);
    float rim = smoothstep(0.84, 0.9, r);
    vec3 c = vec3(0.3, 0.78, 1.0) * uLamps.w * (0.12 + 0.75 * blades + 1.1 * rim + 0.7 * hub);
    outColor = vec4(c * uFanOnly * airMix(vPos), 1.0);
    return;
  }

  // ---------------------------------------------------------------- procedural materials (night)
  if (kind == 4) {           // concrete driving surface / slab
    vec2 st = vExt.x > 0.0 || vExt.y != 0.0 ? vec2(vExt.x, vExt.y) : vPos.xy + vPos.z;
    float n = fbm2(st * vec2(1.7, 0.9));
    float fine = vnoise2(st * 23.0);
    float stain = smoothstep(0.55, 0.85, fbm2(st * 0.23 + 3.1));
    base *= 0.82 + 0.3 * n + 0.08 * fine - 0.12 * stain;
    rough = clamp(rough + 0.12 * (n - 0.5), 0.35, 0.95);
    occl = carOcclusion(vPos);
  } else if (kind == 5) {    // tyre: sidewall vs tread darkness
    base *= 0.85 + 0.3 * vnoise2(vLocal.xz * 40.0);
  } else if (kind == 6) {    // schematic fan: blades
    vec2 c = vLocal.xy - (vLocal.x > 0.0 ? vec2(0.62, 0.0) : vec2(-0.68, 0.0));
    float a = atan(c.y, c.x) + uGap.z * 9.0 * (vLocal.x > 0.0 ? 1.0 : -1.0);
    float blades = smoothstep(0.35, 0.65, abs(sin(a * 4.5)));
    base = mix(vec3(0.02), vec3(0.09), blades);
    emis += vec3(0.15, 0.55, 1.0) * uLamps.w * (0.4 + 0.6 * blades);
  } else if (kind == 3) {    // emissive lamps/neon follow the lamp switches
    if (uObj == 0) {
      float sw = mi == 6 ? uLamps.x : mi == 7 ? uLamps.y : mi == 8 ? uLamps.z : 1.0;
      emis *= sw;
    }
  }
  if (uObj == 6 && uFloorLook.x > 0.5) {   // the kickflip lot: pale, rough, patched ground
    float n = fbm2(vPos.xy * 0.18), f = vnoise2(vPos.xy * 2.7);
    base *= 0.72 + 0.5 * n + 0.12 * f - 0.18 * smoothstep(0.62, 0.8, fbm2(vPos.xy * 0.05 + 7.0));
    rough = 0.82;
  } else if (uObj == 6) {   // venue floor: dark polished concrete with faint wear
    float n = fbm2(vPos.xy * 0.35);
    base *= 0.7 + 0.6 * n;
    rough = clamp(0.32 + 0.25 * (n - 0.5) + 0.15 * vnoise2(vPos.xy * 3.0), 0.15, 0.7);
    occl = carOcclusion(vPos);
  }

  // ---------------------------------------------------------------- night shading
  vec3 F0 = mix(vec3(0.04), base, metal);
  vec3 diffC = base * (1.0 - metal);
  vec3 night = vec3(0.0);
  float ca = 0.03;
  for (int i = 0; i < MAX_SPOTS; i++) {
    if (i >= uNumSpots) break;
    vec3 L; float dist;
    float att = spotCone(i, vPos, L, dist) * uSpotX[i].w;
    if (att <= 1e-5) continue;
    float NoL = max(dot(N, L), 0.0);
    if (NoL <= 0.0) continue;
    float sh = uSpotX[i].y > 0.5 ? shadowAt(vPos, N) : 1.0;
    vec3 H = normalize(L + V);
    float NoH = max(dot(N, H), 0.0), VoH = max(dot(V, H), 0.0);
    float a = max(rough * rough, 0.002);
    vec3 F = F_Schlick(F0, VoH);
    vec3 spec = F * D_GGX(NoH, a) * V_Smith(NoV, NoL, a);
    vec3 dif = (1.0 - F) * diffC / PI;
    vec3 lc = uSpotCol[i].rgb * att * NoL * sh;
    vec3 layer = (dif + spec) * lc;
    if (cc > 0.0) {
      float Fc = 0.04 + 0.96 * pow(1.0 - VoH, 5.0);
      layer = layer * (1.0 - Fc * cc) + vec3(Fc * D_GGX(NoH, ca * ca + 0.0004) * V_Smith(NoV, NoL, ca * ca + 0.0004)) * lc * cc;
    }
    night += layer;
  }
  vec3 R = reflect(-V, N);
  float specOcc = mix(1.0, 0.25, occl);
  vec3 Fenv = F0 + (max(vec3(1.0 - rough), F0) - F0) * pow(1.0 - NoV, 5.0);
  night += envSpec(R, rough) * Fenv * specOcc;
  night += diffC * envDiffuse(N) * (1.0 - 0.85 * occl);
  if (cc > 0.0) {
    float Fc = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
    night = night * (1.0 - Fc * cc) + envSpec(R, ca) * Fc * cc;
  }
  if (uObj == 6 && uFloorLook.x < 0.5) {
    for (int i = 0; i < 4; i++) {
      float d = length(vPos.xy - uPools[i].xy) / max(uPools[i].z, 1e-3);
      night += base * uPools[i].w * 40.0 * exp(-d * d * 2.2) * (1.0 - 0.7 * occl);
    }
  }
  if (uObj == 6 && uReflP.x > 0.5) {
    vec2 suv = gl_FragCoord.xy / uRes;
    vec2 wob = (vec2(vnoise2(vPos.xy * 2.3), vnoise2(vPos.xy * 2.3 + 7.1)) - 0.5) * uReflP.w;
    float lod = uReflP.z + rough * 5.0 + 1.5 * vnoise2(vPos.xy * 0.4);
    vec3 refl = textureLod(uRefl, suv + wob, lod).rgb;
    float F = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
    night += refl * F * uReflP.y * (1.0 - 0.6 * occl);
  }
  night *= uObjAir.w;
  night += emis;
  vec3 GOLDC = vec3(1.0, 0.62, 0.2);
  if (uObj == 2 && uPress.z > 0.0) night += GOLDC * contactPatches(vPos) * uPress.z * 6.0;
  float tyreLoad = 0.0;
  if (uObj == 1 && uPress.z > 0.0 && kind == 5) {     // the tread where it presses into the surface
    float lz = (uCarInv * vec4(vPos, 1.0)).z;
    tyreLoad = uPress.z * (1.0 - smoothstep(0.0, 0.14, lz));
    night += GOLDC * tyreLoad * 2.5;
  }
  float goldLayer = 0.0;
  if (uObj == 2 && uRampGold.x > 0.0 && kind == 4 && vExt.x > 0.0) {
    float sweep = smoothstep(uRampGold.y, uRampGold.y - 2.5, vExt.y);
    vec2 cell = floor(vExt * vec2(9.0, 9.0));
    float tick = floor(uSim * 7.0 + hash12(cell) * 7.0);
    float spark = step(0.86, hash12(cell + tick * 1.37)) * smoothstep(0.5, 0.0, length(fract(vExt * 9.0) - 0.5));
    goldLayer = uRampGold.x * sweep * (0.22 + 0.5 * fbm2(vExt * vec2(0.7, 0.35) + uSim * 0.1) + uRampGold.z * 4.0 * spark);
    night += GOLDC * goldLayer;
  }
  float dcam = length(vPos - uCamPos);
  night = mix(night, uFog.rgb, 1.0 - exp(-dcam * uFog.w));

  // ---------------------------------------------------------------- air vision
  float fres = pow(1.0 - NoV, 3.5);
  vec3 air = uAirBg * (0.9 + 0.35 * N.z) * uObjAir.x;
  air += uAirRim.rgb * fres * (0.18 + 0.5 * E.a) * uObjAir.y;
  float contour = 0.0;
  if (uObj == 0) {
    contour = gridLine(vLocal.x * 2.5, 0.022) * 0.35;
    // pressure skin: outer surfaces (not the floor facing the gap) glow gold
    float floorFace = smoothstep(0.32, 0.18, vLocal.z) * smoothstep(-0.3, -0.75, vLocalN.z);
    float p = mix(1.0, gapDensityAt(vLocal.x), floorFace);
    float flick = 0.75 + 0.5 * vnoise(vLocal * 9.0 + vec3(0.0, 0.0, uSim * 7.0));
    air += vec3(1.0, 0.62, 0.22) * uPress.x * p * flick * (0.12 + 0.5 * fres);
  } else if (uObj == 2) {
    contour = (gridLine(vExt.y * 0.5, 0.02) * 0.18 * step(0.01, abs(vExt.y) + vExt.x) + gridLine(vPos.z * 1.0, 0.02) * 0.15);
    air += vec3(1.0, 0.62, 0.22) * (uPress.z * contactPatches(vPos) * 4.0 + goldLayer * 0.8);
  } else if (uObj == 6) {
    // v6: a fine dot lattice (1 m) with faint 5 m lines instead of a heavy grid, fading with distance from the camera
    vec2 q = vPos.xy;
    float fw = fwidth(q.x) + fwidth(q.y);
    float dd = length(abs(fract(q + 0.5) - 0.5));
    float dotm = 1.0 - smoothstep(0.03, 0.03 + 1.5 * fw, dd);
    float major = max(gridLine(q.x * 0.2, 0.01), gridLine(q.y * 0.2, 0.01)) * 0.3;
    contour = (dotm * 1.1 + major) * exp(-length(vPos.xy - uCamPos.xy) * 0.03);
  } else if (uObj == 4) {
    air += uAirRim.rgb * 0.05;
  } else if (uObj == 1) {
    contour = gridLine(atan(vLocal.z, vLocal.x) * 3.0, 0.05) * 0.25;
    air += vec3(1.0, 0.62, 0.22) * tyreLoad * 2.0;
  }
  air += uAirRim.rgb * contour * uAirRim.w;
  if (kind == 3) air += (E.rgb * 0.18 + emis * 0.015) * uObjAir.x;
  if (kind == 6) air += vec3(0.2, 0.7, 1.0) * uLamps.w * 1.5;
  air = mix(air, uAirBg, 1.0 - exp(-dcam * 0.012));

  float am = airMix(vPos);
  vec3 col = mix(night, air, am);
  col += uAirRim.rgb * pingRing(vPos) * 4.0;
  float alpha = (uObj <= 1) ? mix(1.0, uAirAlpha, am) : 1.0;
  outColor = vec4(max(col, 0.0), alpha);
}`;

export const SKY_FS = COMMON + PBR + /* glsl */`
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 p = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 d = normalize(p.xyz / p.w - uCamPos);
  vec3 night = skyColor(d);
  float n = fbm(d * 3.0 + vec3(0.0, 0.0, uSim * 0.02));
  vec3 air = uAirBg * (0.75 + 0.5 * n) + uAirRim.rgb * 0.015 * smoothstep(0.2, 0.9, n);
  float am = max(uPingP.w, uPingP.z);
  outColor = vec4(mix(night, air, am), 1.0);
}`;

export const DEPTH_VS = /* glsl */`
layout(location = 0) in vec3 aPos;
uniform mat4 uModel;
uniform mat4 uLightVP;
void main() { gl_Position = uLightVP * uModel * vec4(aPos, 1.0); }`;

export const DEPTH_FS = /* glsl */`
out vec4 o;
void main() { o = vec4(1.0); }`;
