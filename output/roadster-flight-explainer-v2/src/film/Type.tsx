// Type.tsx: the text that is not anchored to the scene: persistent boundary tag, hook question, chapter markers,
// qualifier chips, statement cards, the reserve gauge and the approved narration captions. Drawn after bloom, crisp,
// inside Douyin's safe area (top bar < 160 px, right icon column, bottom description band > 1500 px).
import {SANS} from '../lib/fonts';
import {ATTRIBUTION_CHIP, CHAPTERS, HOOK, INTERNALS_CHIP, NOTE_STYLE, RESERVE_LABEL, SOURCE_CHIP, TAG} from './copy';
import {CAPTIONS, CUTS, OverlayFrame, clamp, noteText, phrase, scene, smooth, win} from './data';

const LEFT = 60;
const TAG_Y = 172;

export const Tag: React.FC = () => (
  <div style={{
    position: 'absolute', left: LEFT, top: TAG_Y, padding: '5px 14px', borderRadius: 8, fontFamily: SANS, fontWeight: 500,
    fontSize: 28, letterSpacing: 2, color: 'rgba(255,255,255,0.9)', background: 'rgba(6,10,16,0.5)',
    border: '1.5px solid rgba(255,255,255,0.3)',
  }}>{TAG}</div>
);

export const Hook: React.FC<{t: number}> = ({t}) => {
  const a = 1 - smooth((t - 2.95) / 0.35);
  if (a <= 0) return null;
  const s = smooth(t / 0.55);
  return (
    <div style={{position: 'absolute', left: LEFT, top: 236, opacity: a, fontFamily: SANS, color: '#fff', textShadow: '0 4px 26px rgba(0,0,0,0.75)'}}>
      <div style={{fontSize: 76, fontWeight: 700, letterSpacing: 4, opacity: 0.94}}>{HOOK[0]}</div>
      <div style={{fontSize: 128, fontWeight: 900, letterSpacing: 6, marginTop: -8, color: '#eaf6ff', transform: `translateX(${(1 - s) * 16}px)`}}>{HOOK[1]}</div>
    </div>
  );
};

export const Chapter: React.FC<{t: number}> = ({t}) => {
  const c = [...CHAPTERS].reverse().find((k) => t >= k.start);
  if (!c) return null;
  const a = win(t, c.start + 0.15, c.start + 0.45, c.start + 3.8, c.start + 4.3);
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', left: LEFT, top: 222, opacity: a, fontFamily: SANS, fontWeight: 900, fontSize: 44,
      letterSpacing: 3, color: '#ffffff', textShadow: '0 3px 18px rgba(0,0,0,0.8)', transform: `translateY(${(1 - a) * 8}px)`}}>{c.text}</div>
  );
};

type Chip = {key: string; text: string; level: number; accent?: string};

// qualifier chips stacked under the tag/chapter, each in a fixed slot order so nothing jumps around
export const leftChips = (t: number, f: OverlayFrame): Chip[] => {
  const chips: Chip[] = [];
  if (t < 14) {
    chips.push({key: 'source', text: SOURCE_CHIP, level: win(t, 3.32, 3.65, 13.6, 14.0)});      // after the hook fades
    chips.push({key: 'attribution', text: ATTRIBUTION_CHIP, level: win(t, phrase('02', 2).start_s, phrase('02', 2).start_s + 0.3, 13.6, 14.0)});
  }
  // inferred internals (nozzle ports, vessels) are drawn from the reaction act through the reserve act
  chips.push({key: 'internals', text: INTERNALS_CHIP, level: win(t, scene('04').start_s + 2.6, scene('04').start_s + 3.0, scene('07').start_s - 0.3, scene('07').start_s + 0.1)});
  for (const [id, lv] of f.n) {
    if ((NOTE_STYLE[id] ?? 'chip') === 'chip') chips.push({key: id, text: noteText(id), level: lv, accent: id === 'hypothesis' ? '#ffb04a' : undefined});
  }
  return chips.filter((c) => c.level > 0.01);
};

export const Chips: React.FC<{t: number; f: OverlayFrame}> = ({t, f}) => {
  const chips = leftChips(t, f);
  const top0 = 290;
  return (
    <>
      {chips.map((c, i) => (
        <div key={c.key} style={{
          position: 'absolute', left: LEFT, top: top0 + i * 46, opacity: clamp(c.level), padding: '4px 13px', borderRadius: 7,
          fontFamily: SANS, fontWeight: c.accent ? 700 : 500, fontSize: 27, letterSpacing: 1.5, whiteSpace: 'nowrap',
          color: c.accent ?? 'rgba(255,255,255,0.88)', background: 'rgba(6,10,16,0.55)',
          border: `1.5px solid ${c.accent ? 'rgba(255,176,74,0.7)' : 'rgba(255,255,255,0.22)'}`,
        }}>{c.text}</div>
      ))}
      {f.r !== null && <Reserve t={t} r={f.r} top={top0 + chips.length * 46 + 8} />}
    </>
  );
};

// unnumbered reserve indicator: lit dots fall as gas is used (schematic fractions, not pressure or endurance)
const Reserve: React.FC<{t: number; r: number; top: number}> = ({t, r, top}) => {
  const a = smooth((t - phrase('06', 1).start_s) / 0.6);
  if (a <= 0) return null;
  const n = 18, lit = Math.round(n * clamp(r));
  return (
    <div style={{position: 'absolute', left: LEFT, top, opacity: a, fontFamily: SANS}}>
      <div style={{fontWeight: 500, fontSize: 26, color: 'rgba(255,255,255,0.86)', letterSpacing: 2, marginBottom: 8}}>{RESERVE_LABEL}</div>
      <div style={{display: 'flex', gap: 6}}>
        {Array.from({length: n}, (_, i) => (
          <div key={i} style={{width: 13, height: 13, borderRadius: 7, background: i < lit ? '#62d4ff' : 'transparent',
            border: `2px solid ${i < lit ? '#62d4ff' : 'rgba(255,255,255,0.28)'}`, boxShadow: i < lit ? '0 0 8px rgba(98,212,255,0.7)' : 'none'}} />
        ))}
      </div>
    </div>
  );
};

// statements: medium cards and the acts' large takeaways, top right, never more than one at a time
export const Statements: React.FC<{f: OverlayFrame}> = ({f}) => {
  const shown = f.n.filter(([id, lv]) => (NOTE_STYLE[id] === 'card' || NOTE_STYLE[id] === 'key') && lv > 0.01);
  return (
    <>
      {shown.map(([id, lv], i) => {
        const key = NOTE_STYLE[id] === 'key';
        const s = smooth(lv);
        return (
          <div key={id} style={{
            position: 'absolute', right: 60, top: 236 + i * (key ? 96 : 70), opacity: s, textAlign: 'right', fontFamily: SANS,
            fontWeight: key ? 900 : 700, fontSize: key ? 66 : 46, letterSpacing: key ? 4 : 2, whiteSpace: 'nowrap',
            color: key ? '#ffffff' : '#bfe9ff', textShadow: '0 4px 22px rgba(0,0,0,0.85)', transform: `translateY(${(1 - s) * 10}px)`,
          }}>
            {noteText(id)}
            {key && <div style={{height: 4, marginTop: 6, marginLeft: 'auto', width: `${70 * s}%`, background: 'linear-gradient(90deg, rgba(98,212,255,0), #62d4ff)'}} />}
          </div>
        );
      })}
    </>
  );
};

// approved narration captions: one phrase at a time (display text keeps the approved line break)
export const Captions: React.FC<{t: number}> = ({t}) => {
  // the latest phrase that has started: a new line always replaces the previous line's lingering tail
  let i = -1;
  for (let k = CAPTIONS.length - 1; k >= 0; k--) if (t >= CAPTIONS[k].start_s) { i = k; break; }
  if (i < 0) return null;
  const c = CAPTIONS[i];
  const next = CAPTIONS[i + 1];
  const contiguous = next && next.line_id === c.line_id;
  if (!contiguous && t >= c.end_s + 0.35) return null;
  // the opening phrase is on screen from frame 0 (no fade-in); others take 2 frames
  const fadeIn = c.start_s <= 0 ? 1 : clamp((t - c.start_s) / 0.067);
  const a = fadeIn * (contiguous ? 1 : clamp((c.end_s + 0.35 - t) / 0.15));
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 1318, display: 'flex', justifyContent: 'center', opacity: a}}>
      <div style={{
        padding: '10px 26px', borderRadius: 14, background: 'rgba(0,0,0,0.46)', fontFamily: SANS, fontWeight: 700, fontSize: 54,
        letterSpacing: 2, color: '#fff', lineHeight: 1.28, textAlign: 'center', whiteSpace: 'pre-line', textShadow: '0 2px 10px rgba(0,0,0,0.5)',
      }}>{c.display_text}</div>
    </div>
  );
};

// explicit act cuts: a short flash into the first principle cutaway, dips at the camera/CoM jumps
export const Transition: React.FC<{t: number}> = ({t}) => {
  const flash = t >= 14 ? Math.max(0, 1 - (t - 14) / 0.26) : 0;
  const dip = Math.max(...[40, 52.1].map((c) => clamp(1 - Math.abs(t - c + 0.017) / 0.11)));
  return (
    <>
      {flash > 0 && <div style={{position: 'absolute', inset: 0, background: 'rgba(205,236,255,1)', opacity: 0.32 * flash * flash}} />}
      {flash > 0 && <div style={{position: 'absolute', left: 0, right: 0, top: 1920 * (t - 14) / 0.26 - 3, height: 6, background: '#62d4ff', opacity: flash, boxShadow: '0 0 24px #62d4ff'}} />}
      {dip > 0 && <div style={{position: 'absolute', inset: 0, background: '#000', opacity: dip}} />}
    </>
  );
};

export const SOURCE_CUTS = CUTS;
