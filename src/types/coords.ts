export interface Coords {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  // required to work with popmotion "from" key
  [key: string]: number;
}
