import type React from 'react';
import type {SceneId} from '../timeline';
import {Night} from './Night';
import {Dawn} from './Dawn';
import {World} from './World';
import {Planet} from './Planet';
import {Spring} from './Spring';
import {Heart} from './Heart';

export const SCENE_COMPONENTS: Record<SceneId, React.FC<{t: number}>> = {night: Night, dawn: Dawn, world: World, planet: Planet, spring: Spring, heart: Heart};
