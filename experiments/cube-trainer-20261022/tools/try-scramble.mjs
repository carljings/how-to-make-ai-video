import { randomScrambleForEvent } from "cubing/scramble";
import { setSearchDebug } from "cubing/search";
const t0 = performance.now();
for (let i = 0; i < 3; i++) {
  const s = await randomScrambleForEvent("333");
  console.log((performance.now() - t0).toFixed(0) + "ms", s.toString());
}
process.exit(0);
