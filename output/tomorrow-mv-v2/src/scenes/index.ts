import type React from 'react';
import type {SceneId} from '../timeline';
import {Night} from './Night';
import {Dawn} from './Dawn';
import {World} from './World';
import {Planet} from './Planet';
import {Spring} from './Spring';
import {Heart} from './Heart';
import {Tear} from './Tear';
import {Wind} from './Wind';
import {Wings} from './Wings';
import {Birds} from './Birds';
import {News} from './News';
import {Buzz} from './Buzz';
import {Mountain} from './Mountain';
import {Fire} from './Fire';
import {Notes} from './Notes';
import {Bless} from './Bless';

export const SCENE_COMPONENTS: Record<SceneId, React.FC<{t: number}>> = {
  night: Night, dawn: Dawn, world: World, planet: Planet, spring: Spring, heart: Heart,
  tear: Tear, wind: Wind, wings: Wings, birds: Birds, news: News, buzz: Buzz, mountain: Mountain, fire: Fire, notes: Notes, bless: Bless,
};
