import { PopmotionEasing } from './third-party/popmotion';

export type AnimateCSSGridOptions = {
  duration?: number;
  stagger?: number;
  easing?: keyof PopmotionEasing;
  autoRegisterChildren?: boolean;
  absoluteAnimation?: boolean;
};

export type AnimateCSSGridItemOptions = {
  duration?: number;
  easing?: keyof PopmotionEasing;
  absoluteAnimation?: boolean;
  autoSetCounterScaler?: boolean;
};
