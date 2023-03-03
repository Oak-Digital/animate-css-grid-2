import { IAnimateGridItem } from './grid-item';

export const animateCSSGridEvents = [
  'start',
  'end',
  'beforeDestroy',
  'afterDestroy',
  'itemStart',
  'itemEnd',
  'itemBeforeDestroy',
  'itemAfterDestroy',
] as const;

export type AnimateCSSGridEvent = typeof animateCSSGridEvents[number];

export type AnimateCSSGridEventCallback = {
  start: (items: IAnimateGridItem[]) => void;
  end: (items: IAnimateGridItem[]) => void;
  beforeDestroy: () => void;
  afterDestroy: () => void;
  itemStart: (item: IAnimateGridItem) => void;
  itemEnd: (item: IAnimateGridItem) => void;
  itemBeforeDestroy: (item: IAnimateGridItem) => void;
  itemAfterDestroy: (item: IAnimateGridItem) => void;
};

export const animateCSSGridItemEvents = [
  'start',
  'end',
  'progress',
  'beforeDestroy',
  'afterDestroy',
  'extracted',
  'unextracted',
] as const;

export type AnimateCSSGridItemEvent = typeof animateCSSGridItemEvents[number];

export type AnimateCSSGridItemEventCallback = {
  start: (item: IAnimateGridItem) => void;
  end: (item: IAnimateGridItem) => void;
  progress: () => void;
  beforeDestroy: (item: IAnimateGridItem) => void;
  afterDestroy: (item: IAnimateGridItem) => void;
  extracted: (item: IAnimateGridItem) => void;
  unextracted: (item: IAnimateGridItem) => void;
};

export const animateCSSGridEventsToItemsMap = [
  ['itemStart', 'start'] as const,
  ['itemEnd', 'end'] as const,
  ['itemBeforeDestroy', 'beforeDestroy'] as const,
  ['itemAfterDestroy', 'afterDestroy'] as const,
] as const;
