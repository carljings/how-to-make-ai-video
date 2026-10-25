// layout.ts: where things sit on the 1080×1920 frame. Douyin covers the top ~200 px (status bar, tabs), the bottom
// ~480 px (account, caption, music) and a column ~170 px wide on the right (like, comment, share), so the lyrics
// live in y≈290–660 and the postcard in y≈700–1440, with its key action left of x≈880.
export const HEADER_Y = 214;
export const CARD = {x: 66, y: 702, w: 948, h: 736, border: 22, pad: 8};
export const CW = CARD.w - 2 * (CARD.border + CARD.pad); // 888: the scene's drawing area inside the card
export const CH = CARD.h - 2 * (CARD.border + CARD.pad); // 676
export const CX0 = CARD.x + CARD.border + CARD.pad, CY0 = CARD.y + CARD.border + CARD.pad; // its top-left on screen
// The card's tilt in each scene (degrees); it springs to the next value on every downbeat
export const TILT = [-1.2, 0.9, -0.7, 1.1, -0.9, 0.5];
