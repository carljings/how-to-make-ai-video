import type React from 'react';
import type {SceneId} from '../timeline';
import {Hook} from './Hook';
import {Brain} from './Brain';
import {Quiz} from './Quiz';
import {Alga} from './Alga';
import {Gate} from './Gate';
import {Control} from './Control';
import {Payoff} from './Payoff';
import {Clinic} from './Clinic';
import {End} from './End';

export const SCENE_COMPONENTS: Record<SceneId, React.FC<{t: number}>> = {
  hook: Hook, brain: Brain, quiz: Quiz, alga: Alga, gate: Gate, control: Control, payoff: Payoff, clinic: Clinic, end: End,
};
