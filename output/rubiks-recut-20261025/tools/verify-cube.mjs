// verify-cube.mjs — checks every demo solve and the superflip in our own cube model. Exit 1 on any failure.
import fs from 'node:fs';
import { solved, applyAlg, allHome, isIdentity, isSolved, byHome, stickerFacing, atHome, FACE_DIR } from '../src/lib/cube.js';

const ex = JSON.parse(fs.readFileSync(new URL('../src/data/example.json', import.meta.url)));
const D_EDGES = ['DF', 'DR', 'DB', 'DL'], D_CORNERS = ['DFR', 'DFL', 'DBL', 'DBR'], MID = ['FR', 'FL', 'BR', 'BL'];
const U_EDGES = ['UF', 'UR', 'UB', 'UL'], U_CORNERS = ['UFR', 'UFL', 'UBL', 'UBR'];
const uFace = (s) => s.filter((c) => c.pos[1] === 1).every((c) => stickerFacing(c, FACE_DIR.U) === 'U');
const uEdgesUp = (s) => s.filter((c) => c.pos[1] === 1 && c.type === 'edge').every((c) => stickerFacing(c, FACE_DIR.U) === 'U');
const CHECK = {
  lbl: { cross: (s) => allHome(s, D_EDGES), corners: (s) => allHome(s, [...D_EDGES, ...D_CORNERS]), middle: (s) => allHome(s, [...D_EDGES, ...D_CORNERS, ...MID]),
    llcross: (s) => allHome(s, [...D_EDGES, ...D_CORNERS, ...MID]) && uEdgesUp(s), llface: (s) => allHome(s, [...D_EDGES, ...D_CORNERS, ...MID]) && uFace(s),
    llcorners: (s) => allHome(s, [...D_EDGES, ...D_CORNERS, ...MID, ...U_CORNERS]), lledges: isIdentity },
  cfop: { cross: (s) => allHome(s, D_EDGES), f2l: (s) => allHome(s, [...D_EDGES, ...D_CORNERS, ...MID]), oll: (s) => allHome(s, [...D_EDGES, ...D_CORNERS, ...MID]) && uFace(s), pll: isIdentity },
  roux: { fb: (s) => allHome(s, ['L', 'DL', 'FL', 'BL', 'DFL', 'DBL']), sb: (s) => allHome(s, ['L', 'DL', 'FL', 'BL', 'DFL', 'DBL', 'R', 'DR', 'FR', 'BR', 'DFR', 'DBR']),
    cmll: (s) => allHome(s, ['L', 'DL', 'FL', 'BL', 'DFL', 'DBL', 'R', 'DR', 'FR', 'BR', 'DFR', 'DBR', ...U_CORNERS]), lse: isIdentity },
};
let ok = true;
const scr = applyAlg(solved(), ex.scramble);
console.log('scramble solved?', isSolved(scr));
for (const m of ['lbl', 'cfop', 'roux']) {
  let s = scr, n = 0;
  for (const st of ex.solutions[m].stages) {
    for (const step of st.steps) { s = applyAlg(s, step.moves); n += step.moves.length; }
    const pass = CHECK[m][st.id](s);
    ok &&= pass;
    console.log(`${m.padEnd(4)} ${st.id.padEnd(9)} after ${String(n).padStart(3)} moves: ${pass ? 'PASS' : 'FAIL'}`);
  }
}
const SF = "R L U2 F U' D F2 R2 B2 L U2 F' B' U R2 D F2 U R2 U";
const sf = applyAlg(solved(), SF);
const edges = sf.filter((c) => c.type === 'edge');
const sfPass = sf.filter((c) => c.type !== 'edge').every(atHome) && edges.every((c) => c.pos.every((v, i) => v === c.home[i]) && !atHome(c));
const back = applyAlg(sf, SF);
console.log('superflip: 20 moves', SF.split(' ').length === 20, '| corners+centres home, all 12 edges in place but flipped:', sfPass, '| applying it again solves:', isIdentity(back));
ok &&= sfPass && isIdentity(back);
console.log(ok ? 'ALL PASS' : 'FAILURES');
process.exit(ok ? 0 : 1);
