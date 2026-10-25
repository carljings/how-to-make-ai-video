import type React from 'react';
import type {SceneId} from '../timeline';
import {Hook, Split, End} from './Yellow';
import {Nobel} from './Prize';
import {Spread, Surprise, Types} from './Hall';
import {Shops, Bank, Then} from './Woodford';
import {Globe, Crowd} from './Big';

export const SCENE_COMPONENTS: Record<SceneId, React.FC<{t: number}>> = {
  hook: Hook, split: Split, nobel: Nobel, spread: Spread, surprise: Surprise, types: Types, shops: Shops, bank: Bank, then: Then, globe: Globe, crowd: Crowd, end: End,
};
