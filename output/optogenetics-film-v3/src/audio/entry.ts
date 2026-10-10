// entry.ts: bundled by scripts/score.mjs and run in headless Chrome, which has OfflineAudioContext.
import {renderScore, toWav} from './score';

declare global { interface Window { renderScoreWav: () => Promise<{b64: string; seconds: number; peak: number}> } }
window.renderScoreWav = async () => {
  const buf = await renderScore(), bytes = toWav(buf);
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) for (const v of buf.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return {b64: btoa(bin), seconds: buf.duration, peak};
};
