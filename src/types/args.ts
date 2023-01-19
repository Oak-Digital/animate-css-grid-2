import { PopmotionEasing } from './third-party/popmotion';

export interface WrapGridArguments {
  duration?: number;
  stagger?: number;
  easing?: keyof PopmotionEasing;
  onElementStart?: (el: HTMLElement) => void;
  onElementEnd?: (el: HTMLElement) => void;
  onStart?: (animatedChildren: HTMLElement[]) => void;
  onEnd?: (animatedChildren: HTMLElement[]) => void;
  elementsIgnored?: HTMLElement[];
}
