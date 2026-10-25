// gl.js — minimal WebGL2 helpers: programs, meshes, render targets, fullscreen pass.

export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: true, stencil: false, premultipliedAlpha: false,
    preserveDrawingBuffer: true, powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 unavailable');
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float unavailable');
  gl.getExtension('OES_texture_float_linear');
  return gl;
}

const HEADER = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\n';

function compile(gl, type, src, label) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    const lines = src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}: ${l}`);
    const m = /0:(\d+)/.exec(log || '');
    const at = m ? +m[1] : 0;
    const ctx = lines.slice(Math.max(0, at - 4), at + 3).join('\n');
    throw new Error(`[${label}] shader compile failed:\n${log}\n${ctx}`);
  }
  return s;
}

export function program(gl, vs, fs, label = 'prog', defines = '') {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, HEADER + defines + vs, label + '.vs'));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, HEADER + defines + fs, label + '.fs'));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`[${label}] link failed: ${gl.getProgramInfoLog(p)}`);
  const uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const name = info.name.replace(/\[0\]$/, '');
    uniforms[name] = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size };
  }
  return { gl, p, uniforms, label, units: {} };
}

// set uniforms by name; textures: {tex, unit}
export function use(prog, values = {}) {
  const gl = prog.gl;
  gl.useProgram(prog.p);
  let unit = 0;
  for (const [name, v] of Object.entries(values)) {
    const u = prog.uniforms[name];
    if (!u || v === undefined || v === null) continue;
    const t = u.type;
    if (t === gl.SAMPLER_2D || t === gl.SAMPLER_3D) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(t === gl.SAMPLER_3D ? gl.TEXTURE_3D : gl.TEXTURE_2D, v);
      gl.uniform1i(u.loc, unit);
      unit++;
      continue;
    }
    switch (t) {
      case gl.FLOAT: u.size > 1 ? gl.uniform1fv(u.loc, v) : gl.uniform1f(u.loc, v); break;
      case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
      case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
      case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
      case gl.INT: case gl.BOOL: u.size > 1 ? gl.uniform1iv(u.loc, v) : gl.uniform1i(u.loc, v); break;
      case gl.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v); break;
      case gl.FLOAT_MAT4: gl.uniformMatrix4fv(u.loc, false, v); break;
      default: break;
    }
  }
}

// indexed mesh from typed arrays; attribs: {name: {data, size, type?, normalized?, loc}}
export function mesh(gl, attribs, indices, mode = null) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  for (const a of Object.values(attribs)) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, a.data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a.loc);
    const type = a.type || gl.FLOAT;
    if (a.integer) gl.vertexAttribIPointer(a.loc, a.size, type, 0, 0);
    else gl.vertexAttribPointer(a.loc, a.size, type, !!a.normalized, 0, 0);
    if (a.divisor) gl.vertexAttribDivisor(a.loc, a.divisor);
  }
  let count = 0, itype = null;
  if (indices) {
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    count = indices.length;
    itype = indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
  }
  gl.bindVertexArray(null);
  return { vao, count, itype, mode: mode ?? gl.TRIANGLES };
}

export function draw(gl, m, instances = 0, count = null) {
  gl.bindVertexArray(m.vao);
  if (m.itype) {
    if (instances) gl.drawElementsInstanced(m.mode, count ?? m.count, m.itype, 0, instances);
    else gl.drawElements(m.mode, count ?? m.count, m.itype, 0);
  } else if (instances) gl.drawArraysInstanced(m.mode, 0, count ?? m.count, instances);
  else gl.drawArrays(m.mode, 0, count ?? m.count);
  gl.bindVertexArray(null);
}

export function texture2D(gl, w, h, { internal = null, format = null, type = null, filter = null, wrap = null, data = null } = {}) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal ?? gl.RGBA16F, w, h, 0, format ?? gl.RGBA, type ?? gl.HALF_FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter ?? gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter ?? gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap ?? gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap ?? gl.CLAMP_TO_EDGE);
  return t;
}

// color (+ optional depth texture) render target
export function target(gl, w, h, { depth = false, depthTex = false, internal = null, type = null, filter = null } = {}) {
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  const color = texture2D(gl, w, h, { internal: internal ?? gl.RGBA16F, type: type ?? gl.HALF_FLOAT, filter });
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
  let dtex = null;
  if (depthTex) {
    dtex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, dtex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, w, h, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dtex, 0);
  } else if (depth) {
    const rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
  }
  const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer incomplete ' + st);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fb, color, depth: dtex, w, h };
}

export function depthTarget(gl, size) {
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, size, size, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
  gl.drawBuffers([gl.NONE]);
  gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fb, depth: t, w: size, h: size };
}

export function bindTarget(gl, t) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
  gl.viewport(0, 0, t ? t.w : gl.drawingBufferWidth, t ? t.h : gl.drawingBufferHeight);
}

export const FULLSCREEN_VS = `
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export function fullscreen(gl) {
  const vao = gl.createVertexArray();
  return () => { gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null); };
}
