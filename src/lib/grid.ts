import sync from 'framesync';
import { Coords } from '../types';
import { BoundingClientRect } from '../types/rect';

/* export const baseCoords: Coords = { */
/*   translateX: 0, */
/*   translateY: 0, */
/*   scaleX: 1, */
/*   scaleY: 1, */
/* }; */

// in order to account for scroll, (which we're not listening for)
// always cache the item's position relative
// to the top and left of the grid container
/* export const getGridAwareBoundingClientRect = ( */
/*   gridBoundingClientRect: BoundingClientRect, */
/*   el: HTMLElement */
/* ): BoundingClientRect => { */
/*   const { top, left, width, height } = el.getBoundingClientRect(); */
/*   const rect = { top, left, width, height }; */
/*   rect.top -= gridBoundingClientRect.top; */
/*   rect.left -= gridBoundingClientRect.left; */
/*   // if an element is display:none it will return top: 0 and left:0 */
/*   // TODO: handle `display: none` elements */
/**/
/*   return rect; */
/* }; */

// the function used during the tweening
export const applyCoordTransform = (
  el: HTMLElement,
  { translateX, translateY, scaleX, scaleY }: Coords,
  { immediate }: { immediate?: boolean } = {}
): void => {
  const isFinished =
    translateX === 0 && translateY === 0 && scaleX === 1 && scaleY === 1;
  const styleEl = () => {
    el.style.transform = isFinished
      ? ''
      : `translateX(${translateX}px) translateY(${translateY}px) scaleX(${scaleX}) scaleY(${scaleY})`;
  };
  if (immediate) {
    styleEl();
  } else {
    sync.render(styleEl);
  }
  const firstChild = el.children[0] as HTMLElement;
  if (firstChild) {
    const styleChild = () => {
      firstChild.style.transform = isFinished
        ? ''
        : `scaleX(${1 / scaleX}) scaleY(${1 / scaleY})`;
    };
    if (immediate) {
      styleChild();
    } else {
      sync.render(styleChild);
    }
  }
};
