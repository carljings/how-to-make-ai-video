// data.js — the film's data in one place (facts: docs/FACTS.md).
import EX0 from './data/example.js';
export const EX = EX0;
export const stepsOf = (method) => EX.solutions[method].stages.flatMap((st) => st.steps.map((s) => s.moves));
export const cfopSteps = () => stepsOf('cfop');
export const stagesOf = (method) => EX.solutions[method].stages.map((st) => ({ id: st.id, moves: st.steps.flatMap((s) => s.moves), steps: st.steps }));

export const SUPERFLIP = "R L U2 F U' D F2 R2 B2 L U2 F' B' U R2 D F2 U R2 U";
// cube20.org distance table (half-turn metric); 16+ are the site's estimates
export const DIST = [1n, 18n, 243n, 3240n, 43239n, 574908n, 7618438n, 100803036n, 1332343288n, 17596479795n, 232248063316n,
  3063288809012n, 40374425656248n, 531653418284628n, 6989320578825358n, 91365146187124313n,
  1100000000000000000n, 12000000000000000000n, 29000000000000000000n, 1500000000000000000n, 490000000n];
export const TOTAL = 43252003274489856000n;
// upper / lower bounds over time (cube20.org history table)
export const BOUNDS = [[1981, 18, 52], [1990, 18, 42], [1992, 18, 39], [1992.4, 18, 37], [1995, 18, 29], [1995.1, 20, 29], [2005, 20, 28], [2006, 20, 27], [2007, 20, 26], [2008, 20, 25], [2008.3, 20, 23], [2008.6, 20, 22], [2010, 20, 20]];
// WCA results (API, checked 2026-10-23)
export const GZ_R2_GENG = [2.51, 3.99, 3.21, 4.42, 4.75];
export const GZ_FINAL = [['王艺衡', 4.20], ['沈懿', 4.54], ['李昭昆', 4.67], ['曹岂娴', 4.69], ['连允之', 4.77], ['耿暄一', 4.81]];
export const GZ_FINAL_WANG = [5.23, 3.60, 4.07, 4.93, 3.28];
export const GZ_FINAL_GENG = [4.53, 4.16, 4.87, 5.02, 5.39];
export const HEFEI_WANG = [3.68, 4.61, 3.39, 3.41, 3.45];
