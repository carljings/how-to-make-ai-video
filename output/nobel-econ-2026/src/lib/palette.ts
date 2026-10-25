// palette.ts: the film's colours. Colour carries meaning: gold = money and the prize, teal = looking ahead,
// orange = spending what you earn, red = prices going up, white = "you", cream = text in the dark world.
export const C = {
  yellow: '#FFD43B', yellowHi: '#FFE57F', yellowLo: '#F5B819',
  ink: '#16181F', navy: '#13203A', navyHi: '#1C2D50', navyLo: '#0B1426', line: '#0A1020',
  cream: '#FFF6E5', gold: '#F6C445', goldLo: '#C8901A', goldHi: '#FFE49A',
  teal: '#2EC4B0', tealLo: '#178C80', orange: '#FF9B3D', orangeLo: '#D86E14',
  red: '#FF5A4A', redLo: '#C9372B', green: '#3CCB7F', white: '#FFFFFF', grey: '#9AA6B8', paper: '#FFFDF7', blush: '#FF9AA2',
} as const;
// Every "sticker" shape in the film has the same thick dark outline
export const OUTLINE = 7;
