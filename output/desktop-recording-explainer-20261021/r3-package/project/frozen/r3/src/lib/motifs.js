// motifs.js — recurring set pieces: the case card (paper form, typed rule, ⏎ launch) and the chorus hook
// ("I'M UPPING MY P(DOOM)" → struck through → SCORE / 我在刷分), which escalates across the four choruses.
import { W, H, C, rgba, mix, clamp, lerp, E, F, font, hash, frameIdx, pulse, TAU } from './core.js';
import { paper, enterKey, roundRect, glow, grid, mk } from './draw.js';
import { typed } from './text.js';

/** characters typed at t, from keys [[time, count], ...]: each key types up to `count` at ~24 chars/s */
export function typedCount(t, keys, rate = 24) {
  let n = 0;
  for (const [tk, cnt] of keys) { if (t < tk) break; n = Math.min(cnt, n + (t - tk) * rate); n = Math.max(n, Math.min(cnt, (t - tk) * rate)); }
  return n;
}
function fitFont(c, s, maxW, size, wgt, fam) { c.font = font(wgt, size, fam); const w = c.measureText(s).width; return w > maxW ? Math.floor(size * maxW / w) : size; }

/**
 * case card. spec: { t0, enterAt, x, y, w, h, rot, num, src, title, rows:[{label, text, t?, keys?, size?, col?, labelCol?, note?}], thumb(c,x,y,w,h,t) }
 * slides in at t0, ⏎ pressed at enterAt, then launched toward the camera (0.28 s).
 */
export function caseCard(c, t, sp) {
  const x0 = sp.x ?? 70, y0 = sp.y ?? 600, w = sp.w ?? 940, h = sp.h ?? 700;
  const uin = E.outExpo(clamp((t - sp.t0) / 0.55));
  const launch = sp.enterAt != null ? clamp((t - sp.enterAt - 0.07) / 0.28) : 0;
  if (launch >= 1) return;
  c.save();
  const cx = x0 + w / 2, cy = y0 + h / 2;
  c.translate(cx + (1 - uin) * 1150, cy + (1 - uin) * 60);
  c.rotate((sp.rot ?? -0.018) + (1 - uin) * 0.12);
  const ls = 1 + 2.6 * E.in3(launch); c.scale(ls, ls); c.globalAlpha = 1 - E.in2(launch);
  c.translate(-w / 2, -h / 2);
  // tab
  c.fillStyle = rgba(C.inkline); roundRect(c, 0, -58, 250, 70, 8); c.fill();
  c.fillStyle = rgba(C.bone); c.font = font(900, 36, F.sans); c.fillText('案例 ' + sp.num, 26, -12);
  paper(c, 0, 0, w, h, { rules: 0 });
  // header line: source in mono
  c.font = font(400, 22, F.mono); c.fillStyle = rgba(C.graphite); c.textAlign = 'right';
  c.fillText(sp.src, w - 34, 44); c.textAlign = 'left';
  c.font = font(900, fitFont(c, sp.title, w - 80, 56, 900, F.sans), F.sans); c.fillStyle = rgba(C.inkline); c.fillText(sp.title, 36, 108);
  c.fillStyle = rgba(C.inkline, 0.85); c.fillRect(36, 132, w - 72, 3);
  let yy = 196;
  for (const r of sp.rows) {
    const ra = r.t != null ? clamp((t - r.t) / 0.18) : 1;
    if (ra <= 0 && !r.keys) { yy += (r.gap ?? 128); continue; }
    c.font = font(700, 25, F.sans); c.fillStyle = rgba(r.labelCol ?? C.graphite, Math.max(ra, r.keys ? clamp((t - r.keys[0][0] + 0.6) / 0.2) : 0));
    c.letterSpacing = '3px'; c.fillText(r.label, 38, yy); c.letterSpacing = '0px';
    const size = r.size ?? 46;
    if (r.keys) {
      const n = typedCount(t, r.keys);
      const lines = r.text.split('\n');
      const launched = sp.enterAt != null && t > sp.enterAt + 0.05;
      let before = 0;
      lines.forEach((ln, i) => {
        const L = [...ln].length, k = clamp(n - before, 0, L);
        const last = i === lines.length - 1;
        const caretHere = !launched && n >= before && (n < before + L || (last && n >= before + L)) && (i === 0 || n > before);
        typed(c, ln, 38, yy + 62 + i * size * 1.3, k, { size, col: r.col ?? C.inkline, caret: caretHere, t, caretCol: C.signal });
        before += L;
      });
      yy += 62 + lines.length * size * 1.3 + 14;
    } else {
      c.globalAlpha *= ra;
      c.font = font(700, size, F.sans); c.fillStyle = rgba(r.col ?? C.inkline);
      r.text.split('\n').forEach((ln, i) => c.fillText(ln, 38, yy + 62 + i * size * 1.3));
      c.globalAlpha /= Math.max(ra, 1e-3);
      yy += 62 + r.text.split('\n').length * size * 1.3 + 14;
    }
    if (r.note) { c.font = font(400, 24, F.sans); c.fillStyle = rgba(C.graphite, ra); c.fillText(r.note, 38, yy - 4); yy += 30; }
    yy += 28;
  }
  if (sp.thumb) sp.thumb(c, 36, yy - 6, w - 72, h - yy - 30, t);
  if (sp.enterAt != null) {
    const press = clamp((t - sp.enterAt + 0.03) / 0.05) * (1 - clamp((t - sp.enterAt - 0.2) / 0.1));
    const kA = clamp((t - (sp.enterAt - 1.6)) / 0.3);
    if (kA > 0) { c.globalAlpha *= kA; enterKey(c, w - 104, h - 72, 0.8, press); }
  }
  c.restore();
  if (sp.enterAt != null && t >= sp.enterAt) {
    const f = Math.exp(-(t - sp.enterAt) / 0.09);
    c.fillStyle = rgba(C.hot, 0.55 * f); c.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ the chorus hook
/**
 * hook(c, t, n, w): n = 1 | 2 | 4 (3 is staged inside its own scene); w = [tI, tUpping, tMy, tP] sung-word times;
 * swap = time "P(DOOM)" is struck and SCORE lands (n=1); 2 and 4 show SCORE directly.
 */
export function hook(c, t, n, w, o = {}) {
  const [tI, tU, tM, tP] = w;
  const orange = n === 2, maxi = n === 4;
  const strobe = maxi ? (Math.floor((t - tI) / 0.2275) % 2 === 0) : false;
  const bg = orange ? C.signal : maxi ? (t >= tI && strobe ? C.signal : C.ink) : C.ink;
  const fg = orange ? C.inkline : maxi ? (t >= tI && strobe ? C.inkline : C.bone) : C.bone;
  c.fillStyle = rgba(bg); c.fillRect(0, 0, W, H);
  if (!orange) grid(c, 0, 0, W, H, 60, C.bone, 0.035, 240, 0.06);
  else grid(c, 0, 0, W, H, 60, C.inkline, 0.06, 240, 0.1);
  // shake on each word (stronger on 4)
  const hits = [tI, tU, tM, tP];
  let sh = 0; for (const h of hits) if (t >= h) sh = Math.max(sh, Math.exp(-(t - h) / 0.08));
  const amp = (maxi ? 26 : 10) * sh, fi = frameIdx(t);
  c.save(); c.translate((hash(fi, 1) - 0.5) * amp, (hash(fi, 2) - 0.5) * amp);
  // karaoke line (mono, small, top): the sung words light up
  const words = ["I'M", 'UPPING', 'MY', n === 1 ? 'P(DOOM)' : 'SCORE'];
  const swap = o.swap ?? tP + 0.36;
  c.font = font(600, 34, F.mono); c.letterSpacing = '4px';
  let x = 84; const y = 560;
  words.forEach((s, i) => {
    const on = t >= hits[i];
    const onOrange = orange || (maxi && t >= tI && strobe);      // r3: hook 4's orange strobe frames hid the sung words
    c.fillStyle = rgba(on ? (onOrange ? C.inkline : C.signal) : (onOrange ? C.blood : C.graphite), on ? 1 : 0.7);
    c.fillText(s, x, y); const ww = c.measureText(s).width;
    if (n === 1 && i === 3 && t >= tP + 0.22) { c.fillStyle = rgba(C.signal); c.fillRect(x - 4, y - 13, (ww + 8) * clamp((t - tP - 0.22) / 0.1), 5); }
    x += ww + 26;
  });
  if (n === 1 && t >= swap) { c.fillStyle = rgba(C.signal); c.fillText('SCORE', x, y); }
  c.letterSpacing = '0px';
  // the current word, full width
  let cur = -1; for (let i = 0; i < 4; i++) if (t >= hits[i]) cur = i;
  if (cur >= 0) {
    const k = t - hits[cur];
    let s = words[cur];
    const isLast = cur === 3;
    if (n === 1 && isLast && t >= swap) s = 'SCORE';
    const kk = (n === 1 && isLast && t >= swap) ? t - swap : k;
    const col = (isLast && (n !== 1 || t >= swap)) ? (orange ? C.inkline : maxi ? (strobe ? C.inkline : C.signal) : C.signal) : fg;
    const size = fitFont(c, s, 900, cur === 1 ? 420 : 560, 800, F.cond);
    // P(DOOM), once struck, falls away BEHIND the new word (n = 1)
    const sizeP = fitFont(c, 'P(DOOM)', 900, 560, 800, F.cond);
    if (n === 1 && isLast && t >= swap) {
      const fk = t - swap;
      c.save(); c.translate(540 + 180 * fk, 1040 + 1400 * fk * fk + 160 * fk); c.rotate(0.9 * fk); c.globalAlpha = clamp(1 - fk / 0.4);
      c.font = font(800, sizeP, F.cond); c.textAlign = 'center'; c.fillStyle = rgba(C.graphite); c.fillText('P(DOOM)', 0, sizeP * 0.36);
      c.restore();
    }
    const u = clamp(kk / 0.16), sc = 1.32 - 0.32 * E.outBack(u);
    const yb = 1040 + size * 0.36;
    c.save(); c.translate(540, yb - size * 0.36); c.scale(sc, sc);
    // UPPING rises: letters shoot up from below, staggered
    c.font = font(800, size, F.cond); c.textAlign = 'center';
    if (cur === 1) {
      const chars = [...s]; let tw = c.measureText(s).width, cx = -tw / 2; c.textAlign = 'left';
      chars.forEach((ch, i) => {
        const cw = c.measureText(ch).width, d = clamp((k - i * 0.025) / 0.14), dy = (1 - E.outBack(d)) * 380;
        c.fillStyle = rgba(col, clamp(d * 3)); c.fillText(ch, cx, size * 0.36 + dy); cx += cw;
      });
    } else {
      if (maxi) { // echo copies behind, stepping out
        for (let e = 3; e >= 1; e--) { c.fillStyle = rgba(strobe ? C.ink : C.signal, 0.22 * (4 - e) / 3); c.fillText(s, -e * 14 * Math.min(1, k * 8), size * 0.36 + e * 18 * Math.min(1, k * 8)); }
      }
      c.fillStyle = rgba(col, clamp(kk / 0.03)); c.fillText(s, 0, size * 0.36);
    }
    c.restore();
    // the strike line across P(DOOM), on top (n = 1, before the swap)
    if (n === 1 && isLast && t < swap && t >= tP + 0.22) {
      c.font = font(800, sizeP, F.cond); const ww = c.measureText('P(DOOM)').width;
      c.fillStyle = rgba(C.signal); c.fillRect(540 - ww / 2 - 20, 1040 - 10, (ww + 40) * E.outExpo(clamp((t - tP - 0.22) / 0.1)), 22);
    }
    // 我在刷分 under SCORE
    const zh = n === 1 ? swap + 0.06 : tP + 0.08;
    if (t >= zh) {
      const u2 = E.outBack(clamp((t - zh) / 0.18));
      c.save(); c.translate(540, 1330); c.scale(1.3 - 0.3 * u2, 1.3 - 0.3 * u2);
      c.font = font(900, 112, F.sans); c.textAlign = 'center'; c.fillStyle = rgba(orange ? C.inkline : C.bone, clamp((t - zh) / 0.05));
      c.fillText('我在刷分', 0, 0); c.restore();
    }
  }
  c.restore();
  // flash on each word
  let fl = 0; for (const h of hits) if (t >= h) fl = Math.max(fl, Math.exp(-(t - h) / 0.06));
  if (fl > 0.01) { c.fillStyle = rgba(orange ? C.hot : C.signal, (maxi ? 0.35 : 0.18) * fl); c.fillRect(0, 0, W, H); }
}
