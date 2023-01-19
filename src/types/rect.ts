export interface BoundingClientRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ChildBoundingClientRect {
  top?: number;
  left?: number;
}

export interface ItemPosition {
  rect: BoundingClientRect;
  gridBoundingClientRect: BoundingClientRect;
  stopTween?: () => void;
}
