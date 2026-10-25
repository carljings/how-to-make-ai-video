// Yellow.tsx: the everyday world. The hook (frame 0 is already the whole question), the twist, and the ending,
// which returns to the hook's picture so the film loops.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {HOOK, SPLIT, END, BEAT, scene} from '../timeline';
import {C} from '../lib/palette';
import {SANS} from '../lib/fonts';
import {clamp, seg, easeOut, springAt, rng, lerp, smooth} from '../lib/math';
import {Bean, blinkAt} from '../art/Bean';
import {Phone, Notice, Coin, Choice, Hand, BagIcon, PiggyIcon, Telescope, Sparkle} from '../art/Props';
import {YellowBg} from '../ui/World';

// ---- coins bursting out of the phone: launched at `at`, simple ballistic arcs, seeded ----
const BURST = (() => {
  const R = rng(11);
  return Array.from({length: 16}, (_, i) => ({vx: (i % 2 ? 1 : -1) * (480 + R() * 520), vy: -520 - R() * 420, spin: 6 + R() * 10, r: 26 + R() * 18, delay: i * 0.025, rot: (R() - 0.5) * 40}));
})();
const CoinBurst: React.FC<{t: number; at: number; x: number; y: number}> = ({t, at, x, y}) => (
  <>
    {BURST.map((c, i) => {
      const lt = t - at - c.delay;
      if (lt < 0 || lt > 1.8) return null;
      const px = x + c.vx * lt, py = y + c.vy * lt + 0.5 * 2900 * lt * lt;
      if (py > 2100) return null;
      return <Coin key={i} x={px} y={py} r={c.r} spin={c.spin * lt} rot={c.rot} />;
    })}
  </>
);

// The two answer buttons and the cursor that swings between them on the beat
const Buttons: React.FC<{t: number; at: [number, number]; cursor: number; labels: [string, string]; fills: [string, string]; icons: [React.ReactNode, React.ReactNode]; y: number; fontSizes?: [number, number]}> =
  ({t, at, cursor, labels, fills, icons, y, fontSizes = [50, 50]}) => {
    const xs = [300, 730];
    // after `cursor`, the hand alternates A, B, A, B … one beat each, arriving on the beat
    const lt = t - cursor, beat = Math.floor(lt / BEAT), ph = lt / BEAT - beat;
    const from = xs[(beat + 1) % 2], to = xs[beat % 2];
    const hx = lt < 0 ? 560 : lerp(from, to, smooth(clamp(ph / 0.55))), press = lt < 0 ? 0 : Math.max(0, 1 - Math.abs(ph - 0.62) / 0.12);
    const on = lt < 0 ? -1 : ph > 0.5 ? beat % 2 : (beat + 1) % 2;
    const hk = easeOut(seg(t, cursor - 0.2, cursor + 0.1));
    return (
      <>
        {xs.map((x, i) => (
          <Choice key={i} x={x} y={y} w={390} letter={i ? 'B' : 'A'} label={labels[i]} fill={fills[i]} icon={icons[i]} fontSize={fontSizes[i]}
            k={springAt(t - at[i], {freq: 2.4, damp: 0.42})} hi={on === i ? 1 : 0} press={on === i ? press : 0} />
        ))}
        {hk > 0 && <g opacity={hk}><Hand x={hx + 135} y={y + 18} s={0.8} press={press} /></g>}
      </>
    );
  };

export const Hook: React.FC<{t: number}> = ({t}) => {
  const ping = Math.exp(-Math.max(0, t) / 0.25); // the notification's arrival bounce
  const bob = Math.sin(t * 2.4) * 6;
  return (
    <AbsoluteFill>
      <YellowBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {/* glow behind the phone */}
        <circle cx={610} cy={965} r={360 + 20 * Math.sin(t * 3)} fill="#fff" opacity={0.35} />
        {[0, 1, 2, 3, 4, 5].map((i) => <Sparkle key={i} x={610 + Math.cos(i * 1.05 + t) * 330} y={965 + Math.sin(i * 1.05 + t) * 330} r={14 + 8 * Math.sin(t * 4 + i)} fill="#fff" opacity={0.8} />)}
        <CoinBurst t={t} at={HOOK.coins} x={610} y={1010} />
        <g transform={`translate(0 ${bob}) rotate(${-3 + 2 * ping} 610 965) translate(610 965) scale(1.1) translate(-610 -965)`}>
          <Phone x={610} y={965} w={440} h={600}>
            <Notice x={22} y={86 - 10 * ping} w={396} title="到账提醒" amount="+¥1000.00" />
            <g transform="translate(220 400)">
              <circle r={92 + 10 * Math.sin(t * 5)} fill={C.yellow} opacity={0.5} />
              <Coin x={0} y={0} r={74} spin={t * 3} />
            </g>
          </Phone>
        </g>
        {/* 叮！ the payment arrives on frame 0 */}
        <g transform={`translate(300 720) rotate(-12) scale(${1 + 0.25 * Math.exp(-t / 0.12)})`} opacity={clamp(1 - (t - 0.7) / 0.3)}>
          <text textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={78} fill={C.red} stroke={C.line} strokeWidth={8} paintOrder="stroke">叮！</text>
        </g>
        <Bean x={168} y={1215 - 70 * Math.max(0, Math.sin(Math.PI * clamp((t - 0.05) / 0.42)))} s={0.9} color={C.white} mood={t < 0.9 ? 'o' : 'smile'} look={t < 0.9 ? [1, -0.4] : [Math.sin(t * Math.PI * 2 / (2 * BEAT)) * 0.9, 0.4]}
          blink={blinkAt(t, 1)} squash={Math.sin(t * 6) * 0.15} label="你" labelK={springAt(t - 0.35)} prop="question" propK={springAt(t - 1.4)} />
        <Buttons t={t} at={HOOK.buttons} cursor={HOOK.cursor} labels={['花掉', '存起来']} fills={[C.red, C.teal]} y={1372}
          icons={[<BagIcon key="b" s={0.62} />, <PiggyIcon key="p" s={0.62} />]} />
      </svg>
    </AbsoluteFill>
  );
};

// ---- the twist: the phone splits in two; one payment once, one every month ----
const Calendar: React.FC<{x: number; y: number; t: number; monthly: boolean; at: number}> = ({x, y, t, monthly, at}) => {
  const cw = 60, gap = 10;
  return (
    <g transform={`translate(${x} ${y})`}>
      <text x={(cw * 4 + gap * 3) / 2} y={-18} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={26} fill="#6b7280">未来12个月</text>
      {Array.from({length: 12}, (_, i) => {
        const cx = (i % 4) * (cw + gap), cy = Math.floor(i / 4) * (cw + gap);
        const show = monthly ? at + i * 0.13 : i === 0 ? at : Infinity;
        const k = springAt(t - show, {freq: 3, damp: 0.5}), drop = (1 - clamp((t - show) / 0.18)) * -60;
        return (
          <g key={i}>
            <rect x={cx} y={cy} width={cw} height={cw} rx={12} fill={k > 0.01 ? '#FFF3C4' : '#F1F1EE'} stroke={C.line} strokeWidth={3} />
            <text x={cx + 8} y={cy + 20} fontFamily={SANS} fontWeight={700} fontSize={15} fill="#9ca3af">{i + 1}月</text>
            {t >= show && <Coin x={cx + cw / 2} y={cy + cw / 2 + 6 + drop} r={19 * clamp(k)} />}
          </g>
        );
      })}
    </g>
  );
};

const Pill: React.FC<{x: number; y: number; text: string; k: number; fill: string; color?: string}> = ({x, y, text, k, fill, color = '#fff'}) => {
  const w = [...text].length * 52 + 56;
  return (
    <g transform={`translate(${x} ${y}) scale(${0.5 + 0.5 * k}) rotate(${(1 - k) * -8})`} opacity={clamp(k * 2)}>
      <rect x={-w / 2 + 6} y={-38} width={w} height={84} rx={42} fill={C.line} />
      <rect x={-w / 2} y={-44} width={w} height={84} rx={42} fill={fill} stroke={C.line} strokeWidth={6} />
      <text y={14} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={48} fill={color}>{text}</text>
    </g>
  );
};

export const Split: React.FC<{t: number}> = ({t}) => {
  const a = scene('split').a;
  const apart = easeOut(seg(t, SPLIT.apart, SPLIT.apart + 0.45));
  const lx = lerp(610, 275, apart), rx = lerp(610, 765, apart);
  const freeze = t < SPLIT.apart ? 1 : Math.exp(-(t - SPLIT.apart) / 0.15);
  return (
    <AbsoluteFill>
      <YellowBg t={a + (t - a) * 0.3} />
      <svg width={1080} height={1920} style={{position: 'absolute', filter: freeze > 0.05 ? `saturate(${1 - 0.7 * freeze})` : undefined}}>
        {[{x: rx, monthly: true, title: '工资到账', note: '每月', at: SPLIT.monthly}, {x: lx, monthly: false, title: '奖金到账', note: '仅此一次', at: SPLIT.once}].map((p) => (
          <g key={p.title} transform={`translate(0 ${30 * apart}) rotate(${(p.monthly ? 3 : -3) * apart} ${p.x} 960)`}>
            <Phone x={p.x} y={960} w={lerp(440, 340, apart)} h={lerp(600, 560, apart)}>
              <g transform={`scale(${lerp(1, 0.775, apart)})`}>
                <Notice x={22} y={86} w={396} title={p.title} amount="+¥1000" note={p.note} accent={p.monthly ? C.teal : C.orange} />
                <g opacity={apart}><Calendar x={60} y={330} t={t} monthly={p.monthly} at={p.at} /></g>
              </g>
            </Phone>
          </g>
        ))}
        <Pill x={lx} y={712} text="只发一次" k={springAt(t - SPLIT.once + 0.1)} fill={C.orange} />
        <Pill x={rx} y={712} text="每月都有" k={springAt(t - SPLIT.monthly + 0.1)} fill={C.teal} />
        <text x={540} y={1000} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={72} fill={C.ink} opacity={apart}>vs</text>
        <Bean x={540} y={1395 + (1 - springAt(t - SPLIT.apart - 0.2)) * 300} s={0.78} color={C.white} mood={t < SPLIT.monthly + 1 ? 'o' : 'flat'}
          look={[Math.sin((t - a) * 2.6) > 0 ? 1 : -1, -0.6]} blink={blinkAt(t, 5)} squash={Math.sin(t * 6) * 0.12} label="你" labelK={1} prop="question" propK={springAt(t - SPLIT.monthly)} />
      </svg>
      {freeze > 0.05 && t < SPLIT.apart + 0.3 && (
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          {/* the pause sign of the freeze */}
          <g transform="translate(540 960)" opacity={freeze}>
            <circle r={110} fill={C.ink} opacity={0.85} />
            <rect x={-38} y={-48} width={26} height={96} rx={8} fill={C.yellow} />
            <rect x={12} y={-48} width={26} height={96} rx={8} fill={C.yellow} />
          </g>
        </svg>
      )}
    </AbsoluteFill>
  );
};

// ---- the end: back to the 1000, the two kinds of people as the answers ----
export const End: React.FC<{t: number}> = ({t}) => {
  const a = scene('end').a, lt = t - a;
  const bob = Math.sin(t * 2.4) * 6, pulse = t > END.which ? Math.max(0, Math.sin((t - END.which) * Math.PI * 2 / (2 * BEAT))) : 0;
  const poll = easeOut(seg(t, END.options - 0.2, END.options + 0.3));
  return (
    <AbsoluteFill>
      <YellowBg t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <circle cx={610} cy={965} r={360 + 20 * Math.sin(t * 3)} fill="#fff" opacity={0.35} />
        <g transform={`translate(0 ${bob + (1 - easeOut(clamp(lt / 0.5))) * 300}) rotate(-3 610 965) translate(610 965) scale(1.1) translate(-610 -965)`}>
          <Phone x={610} y={965} w={440} h={600}>
            <Notice x={22} y={86} w={396} title="到账提醒" amount="+¥1000.00" />
            {/* the coin turns into the closing question, like a poll on the screen */}
            <g transform={`translate(220 ${400 + 30 * (1 - poll)})`} opacity={1 - poll}>
              <circle r={92} fill={C.yellow} opacity={0.5} />
              <Coin x={0} y={0} r={74} spin={t * 3} />
            </g>
            <g transform={`translate(220 400) scale(${0.85 + 0.15 * poll * (1 + 0.04 * pulse)})`} opacity={poll}>
              <rect x={-190} y={-110} width={380} height={220} rx={34} fill="#fff" stroke={C.line} strokeWidth={5} />
              <text y={-28} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={32} fill="#6b7280">评论区说说</text>
              <text y={48} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={58} fill={C.ink}>你是<tspan fill={C.red}>哪种人</tspan>？</text>
            </g>
          </Phone>
        </g>
        <Bean x={168} y={1215} s={0.9} color={C.white} mood="smile" look={[Math.sin(t * Math.PI * 2 / (2 * BEAT)) * 0.9, 0.4]} blink={blinkAt(t, 1)}
          squash={Math.sin(t * 6) * 0.15} label="你" labelK={1} prop="question" propK={springAt(lt - 0.3)} />
        <Buttons t={t} at={[END.options, END.options + 0.18]} cursor={END.options + 0.5} labels={['往前看', '挣多少花多少']} fills={[C.teal, C.orange]} y={1372} fontSizes={[50, 38]}
          icons={[<Telescope key="t" s={0.62} />, null]} />
      </svg>
    </AbsoluteFill>
  );
};
