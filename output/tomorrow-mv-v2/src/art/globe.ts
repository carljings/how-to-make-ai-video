// globe.ts: the land dots of land.ts, placed either on the flat map (world scene) or on a sphere (the planet),
// and anything in between: the world scene rolls the map into the planet by interpolating the two.
import {LAND, LAND_STEP, LAND_LAT0} from './land';

export const DOTS: {lon: number; lat: number}[] = [];
LAND.forEach((row, r) => [...row].forEach((c, k) => { if (c === '#') DOTS.push({lon: -180 + (k + 0.5) * LAND_STEP, lat: LAND_LAT0 - r * LAND_STEP}); }));

// The flat map inside the card: 360° across x 22..866, latitude stretched 1.2× (it reads better as a picture)
export const MAP = {x0: 22, x1: 866, y0: 70, k: 844 / 360, sy: 1.2};
export const flat = (lon: number, lat: number): [number, number] => [MAP.x0 + (lon + 180) * MAP.k, MAP.y0 + (LAND_LAT0 - lat) * MAP.k * MAP.sy];
export const CITIES: Record<string, [number, number]> = {
  SFO: [-122.4, 37.8], NYC: [-74, 40.7], SAO: [-46.6, -23.5], LON: [-0.1, 51.5], CAI: [31.2, 30], DXB: [55.3, 25.2], DEL: [77.2, 28.6],
  PEK: [116.4, 39.9], SHA: [121.5, 31.2], TYO: [139.7, 35.7], SYD: [151.2, -33.9], LAG: [3.4, 6.5],
};

const D = Math.PI / 180;
// Orthographic projection: centre longitude lam0, tilt phi0 (degrees). z > 0 is the visible side.
export const sphere = (lon: number, lat: number, lam0: number, phi0: number, cx: number, cy: number, R: number): [number, number, number] => {
  const l = (lon - lam0) * D, p = lat * D, p0 = phi0 * D;
  return [cx + R * Math.cos(p) * Math.sin(l), cy - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l)];
};
