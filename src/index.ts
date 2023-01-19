import sync from 'framesync';
import throttle from 'lodash/throttle';
import { tween } from 'popmotion';
import { arraylikeToArray } from './lib/arrays';
import { DATASET_KEY } from './lib/constants';
import { popmotionEasing } from './lib/easings';
import { applyCoordTransform, getGridAwareBoundingClientRect } from './lib/grid';
import {
  CachedPositionData,
  ChildBoundingClientRect,
  Coords,
  ItemPosition,
  WrapGridArguments,
} from './types';


// return a function that take a reference to a grid dom node and optional config
export const wrapGrid = (
  container: HTMLElement,
  {
    duration = 250,
    stagger = 0,
    easing = 'easeInOut',
    onStart = () => {},
    onElementStart = () => {},
    onElementEnd = () => {},
    onEnd = () => {},
    elementsIgnored = [],
  }: WrapGridArguments = {}
) => {
  if (!popmotionEasing[easing]) {
    throw new Error(`${easing} is not a valid easing name`);
  }

  let idCounter = 0;
  const getNewId = () => idCounter++;

  let mutationsDisabled: boolean = false;

  const disableMutationsWhileFunctionRuns = (func: () => void) => {
    mutationsDisabled = true;
    func();
    setTimeout(() => {
      mutationsDisabled = false;
    }, 0);
  };

  // all cached position data, and in-progress tween data, is stored here
  const cachedPositionData: CachedPositionData = {};
  // initially and after every transition, record element positions
  const recordPositions = (
    elements: HTMLCollectionOf<HTMLElement> | HTMLElement[]
  ) => {
    const gridBoundingClientRect = container.getBoundingClientRect();
    arraylikeToArray(elements).forEach((el) => {
      if (typeof el.getBoundingClientRect !== 'function') {
        return;
      }
      if (!el.dataset[DATASET_KEY]) {
        const newId = `${getNewId()}`;
        el.dataset[DATASET_KEY] = newId;
      }
      const animateGridId = el.dataset[DATASET_KEY] as string;

      if (!cachedPositionData[animateGridId]) {
        cachedPositionData[animateGridId] = {} as ItemPosition;
      }

      const rect = getGridAwareBoundingClientRect(gridBoundingClientRect, el);
      cachedPositionData[animateGridId].rect = rect;
      cachedPositionData[animateGridId].gridBoundingClientRect =
        gridBoundingClientRect;
    });
  };
  recordPositions(container.children as HTMLCollectionOf<HTMLElement>);

  const throttledResizeListener = throttle(() => {
    const bodyElement = document.querySelector('body');
    const containerIsNoLongerInPage =
      bodyElement && !bodyElement.contains(container);
    if (!container || containerIsNoLongerInPage) {
      window.removeEventListener('resize', throttledResizeListener);
    }
    recordPositions(container.children as HTMLCollectionOf<HTMLElement>);
  }, 250);
  window.addEventListener('resize', throttledResizeListener);

  const throttledScrollListener = throttle(() => {
    recordPositions(container.children as HTMLCollectionOf<HTMLElement>);
  }, 20);
  container.addEventListener('scroll', throttledScrollListener);

  const extractedChildren: HTMLElement[] = [];

  // this function should set an absolute position on the element
  // such that it's in the same place as it was before
  const extractChild = (el: HTMLElement) => {
    const isExtracted = extractedChildren.some(
      (child) => child.dataset[DATASET_KEY] === el.dataset[DATASET_KEY]
    );
    if (isExtracted) {
      return;
    }
    extractedChildren.push(el);
    console.log(extractedChildren);
    el.style.position = 'absolute';
    mutationCallback('forceGridAnimation');
  };

  const unExtractChild = (el: HTMLElement) => {
    const extractedIndex = extractedChildren.findIndex(
      (child) => child.dataset[DATASET_KEY] === el.dataset[DATASET_KEY]
    );
    if (extractedIndex === -1) {
      return;
    }
    extractedChildren.splice(extractedIndex, 1);
    console.log(extractedChildren);
    el.style.position = '';
    mutationCallback('forceGridAnimation');
  };

  const mutationCallback = (
    mutationsList: MutationRecord[] | 'forceGridAnimation'
  ) => {
    if (mutationsList !== 'forceGridAnimation') {
      // check if we care about the mutation
      const relevantMutationHappened = mutationsList.filter(
        (m: MutationRecord) =>
          m.attributeName === 'class' ||
          m.addedNodes.length ||
          m.removedNodes.length
      ).length;
      if (!relevantMutationHappened) {
        return;
      }
      if (mutationsDisabled) return;
    }
    const gridBoundingClientRect = container.getBoundingClientRect();
    const childrenElements = arraylikeToArray(container.children) as HTMLElement[];
    // stop current transitions and remove transforms on transitioning elements
    childrenElements
      .filter((el) => {
        const itemPosition =
          cachedPositionData[el.dataset[DATASET_KEY] as string];
        if (itemPosition && itemPosition.stopTween) {
          itemPosition.stopTween();
          delete itemPosition.stopTween;
          return true;
        }
        return false;
      })
      .forEach((el) => {
        el.style.transform = '';
        const firstChild = el.children[0] as HTMLElement;
        if (firstChild) {
          firstChild.style.transform = '';
        }
      });
    const animatedGridChildren = childrenElements
      .map((el) => ({
        childCoords: {} as ChildBoundingClientRect,
        el,
        boundingClientRect: getGridAwareBoundingClientRect(
          gridBoundingClientRect,
          el
        ),
      }))
      .filter(({ el, boundingClientRect }) => {
        const itemPosition =
          cachedPositionData[el.dataset[DATASET_KEY] as string];
        // don't animate the initial appearance of elements,
        // just cache their position so they can be animated later
        if (!itemPosition) {
          recordPositions([el]);
          return false;
        } else if (
          boundingClientRect.top === itemPosition.rect.top &&
          boundingClientRect.left === itemPosition.rect.left &&
          boundingClientRect.width === itemPosition.rect.width &&
          boundingClientRect.height === itemPosition.rect.height
        ) {
          // if it hasn't moved, dont animate it
          return false;
        }
        return true;
      });

    // having more than one child in the animated item is not supported
    animatedGridChildren.forEach(({ el }) => {
      if (arraylikeToArray(el.children).length > 1) {
        throw new Error(
          'Make sure every grid item has a single container element surrounding its children'
        );
      }
    });

    if (!animatedGridChildren.length) {
      return;
    }

    const animatedElements = animatedGridChildren.map(({ el }) => el);
    disableMutationsWhileFunctionRuns(() => onStart(animatedElements));

    const completionPromises: Array<Promise<any>> = [];

    animatedGridChildren
      // do this measurement first so as not to cause layout thrashing
      .map((data) => {
        const firstChild = data.el.children[0] as HTMLElement;
        // different transform origins give different effects. "50% 50%" is default
        if (firstChild) {
          data.childCoords = getGridAwareBoundingClientRect(
            gridBoundingClientRect,
            firstChild
          );
        }
        return data;
      })
      .forEach(
        (
          {
            el,
            boundingClientRect: { top, left, width, height },
            childCoords: { top: childTop, left: childLeft },
          },
          i
        ) => {
          const firstChild = el.children[0] as HTMLElement;
          const itemPosition =
            cachedPositionData[el.dataset[DATASET_KEY] as string];
          const coords: Coords = {
            scaleX: itemPosition.rect.width / width,
            scaleY: itemPosition.rect.height / height,
            translateX: itemPosition.rect.left - left,
            translateY: itemPosition.rect.top - top,
          };

          el.style.transformOrigin = '0 0';
          if (firstChild && childLeft === left && childTop === top) {
            firstChild.style.transformOrigin = '0 0';
          }

          let cachedResolve: (value?: any) => void = () => {};

          const completionPromise = new Promise((resolve) => {
            cachedResolve = resolve;
          });

          completionPromises.push(completionPromise);

          applyCoordTransform(el, coords, { immediate: true });
          // now start the animation
          const isIgnored = elementsIgnored.some(
            (ignoredEl) =>
              el.dataset[DATASET_KEY] === ignoredEl.dataset[DATASET_KEY]
          );
          const isExtracted = extractedChildren.some(
            (extractedEl) =>
              el.dataset[DATASET_KEY] === extractedEl.dataset[DATASET_KEY]
          );

          const finalCoords = {
            translateX: 0,
            translateY: 0,
            scaleX: 1,
            scaleY: 1,
          };
          const toCoords = isIgnored || isExtracted ? coords : finalCoords;
          const tweenDuration = isExtracted ? 0 : duration;
          const startAnimation = () => {
            disableMutationsWhileFunctionRuns(() => {
              onElementStart(el);
            });
            const { stop } = tween({
              from: coords,
              to: toCoords,
              duration: tweenDuration,
              ease: popmotionEasing[easing],
            }).start({
              update: (transforms: Coords) => {
                applyCoordTransform(el, transforms);
                // this helps prevent layout thrashing
                sync.postRender(() => recordPositions([el]));
              },
              complete: () => {
                if (isIgnored) {
                  // set the transform to initial value
                  applyCoordTransform(el, finalCoords);
                  sync.postRender(() => {
                    recordPositions([el]);
                    disableMutationsWhileFunctionRuns(() => {
                      onElementEnd(el);
                    });
                    cachedResolve();
                  });
                } else {
                  cachedResolve();
                }
              },
            });
            itemPosition.stopTween = stop;
          };

          if (typeof stagger !== 'number') {
            startAnimation();
          } else {
            const timeoutId = setTimeout(() => {
              sync.update(startAnimation);
            }, stagger * i);
            itemPosition.stopTween = () => clearTimeout(timeoutId);
          }
        }
      );

    Promise.all(completionPromises).then(() => {
      onEnd(animatedElements);
    });
  };

  const observer = new MutationObserver(mutationCallback);
  observer.observe(container, {
    childList: true,
    attributes: true,
    subtree: true,
    attributeFilter: ['class'],
  });
  const unwrapGrid = () => {
    window.removeEventListener('resize', throttledResizeListener);
    container.removeEventListener('scroll', throttledScrollListener);
    observer.disconnect();
  };
  const forceGridAnimation = () => mutationCallback('forceGridAnimation');
  return { unwrapGrid, forceGridAnimation, extractChild, unExtractChild };
};
