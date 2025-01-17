import { Easing } from 'popmotion';

export type AnimateCSSGridMode = 'absolute' | 'static';
export type AnimateCSSGridModeOptions = {
  absolute: {
    animateWidthHeight?: boolean;
    itemAnimateWidthHeight?: boolean;
  };
  static: {};
};

export type AnimateCSSGridOptions<Mode extends AnimateCSSGridMode> = {
  duration?: number;
  stagger?: number;
  easing?: Easing;
  autoRegisterChildren?: boolean;
  mode?: Mode;
  modeOptions?: AnimateCSSGridModeOptions[Mode];
};

export type AnimateCSSGridItemOptions<Mode extends AnimateCSSGridMode> = {
  duration?: number;
  easing?: Easing;
  absoluteAnimation?: boolean;
  autoSetCounterScaler?: boolean;
  mode?: Mode;
  modeOptions?: AnimateCSSGridModeOptions[Mode];
};

export type AnimateCSSGridModeWithOptions<Mode extends AnimateCSSGridMode> = {
  mode: Mode;
  options: AnimateCSSGridModeOptions[Mode];
};
