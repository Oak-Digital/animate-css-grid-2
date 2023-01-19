import { PopmotionEasing } from '../types/third-party/popmotion';

import {
  anticipate,
  backIn,
  backInOut,
  backOut,
  circIn,
  circInOut,
  circOut,
  easeIn,
  easeInOut,
  easeOut,
  linear,
} from '@popmotion/easing';

export const popmotionEasing: PopmotionEasing = {
  anticipate,
  backIn,
  backInOut,
  backOut,
  circIn,
  circInOut,
  circOut,
  easeIn,
  easeInOut,
  easeOut,
  linear,
} as const;

export const isPopmotionEasing = (easing: string): easing is keyof PopmotionEasing => {
  return easing in popmotionEasing;
}
