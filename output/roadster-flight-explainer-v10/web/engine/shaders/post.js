// post.js — HDR bloom (dual filter), anamorphic streak, final grade + text overlay.

export const COPY_FS = /* glsl */`
in vec2 vUv;
uniform sampler2D uTex;
uniform float uGain;
out vec4 o;
void main() { o = vec4(texture(uTex, vUv).rgb * uGain, 1.0); }`;

export const PREFILTER_FS = /* glsl */`
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform vec4 uThresh;   // x threshold, y knee, z clamp
out vec4 o;
vec3 q(vec2 uv) { return min(texture(uTex, uv).rgb, vec3(uThresh.z)); }
void main() {
  vec3 c = (q(vUv + uTexel * vec2(-1, -1)) + q(vUv + uTexel * vec2(1, -1)) + q(vUv + uTexel * vec2(-1, 1)) + q(vUv + uTexel * vec2(1, 1))) * 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThresh.x + uThresh.y, 0.0, 2.0 * uThresh.y);
  soft = soft * soft / (4.0 * uThresh.y + 1e-5);
  float w = max(soft, br - uThresh.x) / max(br, 1e-5);
  o = vec4(c * w, 1.0);
}`;

export const DOWN_FS = /* glsl */`
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;    // source texel
out vec4 o;
vec3 s(vec2 d) { return texture(uTex, vUv + d * uTexel).rgb; }
void main() {
  vec3 a = s(vec2(-2, -2)), b = s(vec2(0, -2)), c = s(vec2(2, -2));
  vec3 d = s(vec2(-1, -1)), e = s(vec2(1, -1));
  vec3 f = s(vec2(-2, 0)), g = s(vec2(0, 0)), h = s(vec2(2, 0));
  vec3 i = s(vec2(-1, 1)), j = s(vec2(1, 1));
  vec3 k = s(vec2(-2, 2)), l = s(vec2(0, 2)), m = s(vec2(2, 2));
  vec3 r = (d + e + i + j) * 0.125 + (a + b + g + f) * 0.03125 + (b + c + h + g) * 0.03125 + (f + g + l + k) * 0.03125 + (g + h + m + l) * 0.03125;
  o = vec4(r, 1.0);
}`;

export const UP_FS = /* glsl */`
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uRadius;
out vec4 o;
vec3 s(vec2 d) { return texture(uTex, vUv + d * uTexel * uRadius).rgb; }
void main() {
  vec3 r = s(vec2(-1, -1)) + 2.0 * s(vec2(0, -1)) + s(vec2(1, -1)) + 2.0 * s(vec2(-1, 0)) + 4.0 * s(vec2(0, 0))
         + 2.0 * s(vec2(1, 0)) + s(vec2(-1, 1)) + 2.0 * s(vec2(0, 1)) + s(vec2(1, 1));
  o = vec4(r / 16.0, 1.0);
}`;

// horizontal-only blur for the anamorphic streak (run at low height, growing offsets)
export const STREAKBLUR_FS = /* glsl */`
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uStep;
out vec4 o;
void main() {
  vec3 c = vec3(0.0);
  float wsum = 0.0;
  for (int i = -6; i <= 6; i++) {
    float fi = float(i);
    float w = exp(-fi * fi / 18.0);
    c += texture(uTex, vUv + vec2(fi * uStep * uTexel.x, 0.0)).rgb * w;
    wsum += w;
  }
  o = vec4(c / wsum, 1.0);
}`;

export const COMPOSITE_FS = /* glsl */`
in vec2 vUv;
uniform sampler2D uScene, uBloom, uStreak, uText;
uniform vec2 uRes;
uniform float uSeed;
uniform vec4 uPost1;    // x exposure, y bloom, z streak, w vignette
uniform vec4 uPost2;    // x chromatic aberration, y grain, z saturation, w contrast
uniform vec3 uLift, uGamma, uGain;
uniform vec4 uFlash;    // rgb, amount
uniform vec3 uStreakTint;
uniform float uTextFx;  // 0..1 chromatic split on big type
out vec4 o;
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec2 uv = vUv;
  vec2 cc = uv - 0.5;
  float r2 = dot(cc * vec2(1.0, 1.778), cc * vec2(1.0, 1.778));
  vec2 off = cc * r2 * uPost2.x;
  vec3 col;
  col.r = texture(uScene, uv - off).r;
  col.g = texture(uScene, uv).g;
  col.b = texture(uScene, uv + off).b;
  col += texture(uBloom, uv).rgb * uPost1.y;
  col += texture(uStreak, uv).rgb * uPost1.z * uStreakTint;
  col *= uPost1.x;
  col = aces(col);
  col = pow(max(col, 0.0), 1.0 / uGamma) * uGain + uLift * (1.0 - col);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uPost2.z);
  col = clamp((col - 0.18) * uPost2.w + 0.18, 0.0, 1.0);
  float vig = smoothstep(0.35, 1.05, length(cc * vec2(1.0, 0.82)) * 1.35);
  col *= 1.0 - uPost1.w * vig;
  col = mix(col, uFlash.rgb, clamp(uFlash.a, 0.0, 1.0));
  col = toSRGB(col);
  // text layer (premultiplied, sRGB already); big type gets a slight RGB split
  vec2 tuv = vec2(uv.x, 1.0 - uv.y);
  vec4 tx = texture(uText, tuv);
  if (uTextFx > 0.0) {
    float s = uTextFx * 2.5 / uRes.x;
    vec4 tr = texture(uText, tuv + vec2(s, 0.0)), tb = texture(uText, tuv - vec2(s, 0.0));
    tx = vec4(tr.r, tx.g, tb.b, max(tx.a, max(tr.a, tb.a)));
  }
  col = col * (1.0 - tx.a) + tx.rgb;
  float g = h12(gl_FragCoord.xy + uSeed * 91.7) - 0.5;
  col += g * uPost2.y * (0.6 + 0.4 * (1.0 - l));
  col += (h12(gl_FragCoord.xy * 1.7 + 3.1) - 0.5) / 255.0;
  o = vec4(col, 1.0);
}`;
