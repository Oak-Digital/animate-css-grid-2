import sync from 'framesync';
import { tween } from 'popmotion';
import wait from 'wait';
import { EventEmitter } from 'eventemitter3';
import {
  BoundingClientRect,
  Coords,
  ItemPosition,
  PopmotionEasing,
  StartAnimationArguments,
} from '../types';
import { AnimateCSSGrid } from './animate-grid';
import { arraylikeToArray } from './arrays';
import { DATASET_ID_KEY } from './constants';
import { popmotionEasing } from './easings';
import {
  applyCoordTransform,
  baseCoords,
  getGridAwareBoundingClientRect,
} from './grid';
import { AnimateCSSGridEvents } from '../types/events';
import { wait2 } from './wait';

export const gridItemEventNames = [
  AnimateCSSGridEvents.ITEM_START,
  AnimateCSSGridEvents.ITEM_END,
  AnimateCSSGridEvents.ITEM_BEFORE_DESTROY,
  AnimateCSSGridEvents.ITEM_AFTER_DESTROY,
] as const;

export class AnimateCSSGridItem {
  public readonly id?: number | string;
  public readonly animateGrid?: AnimateCSSGrid;
  public positionData?: ItemPosition;

  private _element?: HTMLElement;
  private _isExtracted = false;
  private childRect: BoundingClientRect | null = null;
  private currentFromCoords: Coords | null = null;
  private stopAnimationFunction = () => {};
  private eventEmitter = new EventEmitter<
    | AnimateCSSGridEvents.ITEM_START
    | AnimateCSSGridEvents.ITEM_END
    | AnimateCSSGridEvents.ITEM_BEFORE_DESTROY
    | AnimateCSSGridEvents.ITEM_AFTER_DESTROY
  >();

  constructor(
    animateGrid?: AnimateCSSGrid,
    element?: HTMLElement,
    id?: number | string,
    gridRect?: DOMRect
  ) {
    this.id = id;
    this.animateGrid = animateGrid;

    if (element) {
      this.registerElement(element, gridRect);
    }
  }

  public get element() {
    return this._element;
  }

  public get isExtracted() {
    return this._isExtracted;
  }

  private set isExtracted(value: boolean) {
    this._isExtracted = value;
  }

  // these functions should be bound to have the correct this reference
  public get on() {
    return this.eventEmitter.on.bind(this.eventEmitter);
  }

  public get once() {
    return this.eventEmitter.once.bind(this.eventEmitter);
  }

  public get off() {
    return this.eventEmitter.off.bind(this.eventEmitter);
  }

  public registerElement(element: HTMLElement, gridRect?: DOMRect) {
    if (this.element) {
      throw new Error(
        'An element is already registered to this grid item. You can only register one element per grid item.'
      );
    }
    this._element = element;
    this.recordPosition(gridRect)
  }

  // extracting means that the user can gain control over the element
  // by setting the elements positioning to absolute and allowing the grid to
  // reorder the other elements
  public extract() {
    if (this.isExtracted) {
      return false;
    }
    if (!this.element || !this.positionData) {
      return false;
    }
    this.isExtracted = true;
    // translate because the element is absolutely positioned and the parent is not necessarily position relative
    const coords = this.getPositionCoords();
    if (!coords) {
      return false;
    }
    applyCoordTransform(this.element, coords, { immediate: true });
    this.element.style.position = 'absolute';
    this.element.style.boxSizing = 'border-box';
    this.element.style.width = this.positionData.rect.width + 'px';
    this.element.style.height = this.positionData.rect.height + 'px';

    return this;
  }

  public unExtract(resetCoords: boolean = true) {
    if (!this.isExtracted) {
      return false;
    }
    if (!this.element) {
      return false;
    }
    this.isExtracted = false;
    this.element.style.position = '';
    this.element.style.boxSizing = '';
    this.element.style.top = '';
    this.element.style.left = '';
    this.element.style.width = '';
    this.element.style.height = '';
    if (resetCoords) {
      this.resetTransforms();
    }
    return this;
  }

  // this must be called before calling startAnimation
  public prepareAnimation(gridRect?: DOMRect) {
    // if the element is extracted it should not be affected by the grid
    if (this.isExtracted) {
      return false;
    }
    if (!this.element || !this.positionData) {
      return false;
    }
    /* measure child element */
    const gridBoundingClientRect =
      gridRect ?? this.animateGrid?.getGridBoundingClientRect();

    /* const child = this.element.children[0] as HTMLElement; */

    /* if (!child) { */
    /*   return false; */
    /* } */
    /* const rect = getGridAwareBoundingClientRect(gridBoundingClientRect, child); */
    /* this.childRect = rect; */

    /* const gridRect = */
    /*   gridRectArg ?? this.animateGrid.getGridBoundingClientRect(); */
    // do not animate if boundingClientRect is the same as the position data since that means they haven't moved

    const itemGridRect = this.getItemGridRect(gridBoundingClientRect);

    const itemRect = this.positionData.rect;

    if (!itemGridRect) {
      return false;
    }

    if (
      itemGridRect.top === itemRect.top &&
      itemGridRect.left === itemRect.left &&
      itemGridRect.width === itemRect.width &&
      itemGridRect.height === itemRect.height
    ) {
      return false;
    }

    // having more than one child in the animated item is not supported
    if (arraylikeToArray(this.element.children).length > 1) {
      throw new Error(
        'Make sure every grid item has a single container element surrounding its children'
      );
    }

    this.eventEmitter.emit(AnimateCSSGridEvents.ITEM_START, this);

    const firstChild = this.element.children[0] as HTMLElement;
    /* firstChild.style.transform = ''; */

    const coords = this.calculateFromCoords();

    if (!coords) {
      return false;
    }

    this.element.style.transformOrigin = '0 0';
    /* if (firstChild && childLeft === left && childTop === top) { */
    /* firstChild.style.transformOrigin = '0 0'; */
    /* } */

    // this needs to happen imidiately so that the element is in the correct position before the animation starts
    // TODO: figure out why this is needed
    applyCoordTransform(this.element, coords, { immediate: true });
    applyCoordTransform(this.element, coords);

    this.currentFromCoords = coords;

    return true;
  }

  public getItemGridRect(gridRect?: DOMRect) {
    const gridBoundingClientRect =
      gridRect ?? this.animateGrid?.getGridBoundingClientRect();

    if (!this.element || !gridBoundingClientRect) {
      return null;
    }

    const itemGridRect = getGridAwareBoundingClientRect(
      gridBoundingClientRect,
      this.element
    );

    return itemGridRect;
  }

  public calculateFromCoords(): Coords | null {
    const itemGridRect = this.getItemGridRect();
    if (!itemGridRect || !this.positionData) {
      return null;
    }
    const itemRect = this.positionData.rect;
    return {
      scaleX: itemRect.width / itemGridRect.width,
      scaleY: itemRect.height / itemGridRect.height,
      translateX: itemRect.left - itemGridRect.left,
      translateY: itemRect.top - itemGridRect.top,
    };
  }

  public getPositionCoords(): Coords | null {
    if (!this.positionData) {
      return null;
    }
    const itemRect = this.positionData.rect;
    return {
      scaleX: 1,
      scaleY: 1,
      translateX: itemRect.left,
      translateY: itemRect.top,
    };
  }

  public async startAnimation({
    delay = 0,
    easing = 'easeInOut',
    duration = 250,
  }: StartAnimationArguments) {
    if (!this.element || !this.positionData) {
      return false;
    }

    /* applyCoordTransform(this.element, this.currentFromCoords ?? baseCoords); */

    if (delay > 0) {
      const { promise, abort } = wait2(delay);
      this.stopAnimationFunction = abort;
      await promise;
    }

    const completionPromise = new Promise<void>((resolve, reject) => {
      const { stop } = tween({
        from: this.currentFromCoords ?? baseCoords,
        to: baseCoords,
        duration,
        ease: popmotionEasing[easing],
      }).start({
        update: (transforms: Coords) => {
          applyCoordTransform(this.element!, transforms);
          // this helps prevent layout thrashing
          sync.postRender(() => this.recordPosition());
        },
        complete: () => {
          resolve();
        },
        error: (err: Error) => {
          reject(err);
        },
      });

      this.stopAnimationFunction = stop;
    });

    await completionPromise;

    this.eventEmitter.emit(AnimateCSSGridEvents.ITEM_END, this);

    return true;
  }

  public stopAnimation() {
    this.stopAnimationFunction();
    this.stopAnimationFunction = () => {};
  }

  public resetTransforms(force: boolean = false) {
    if (!force && this.isExtracted) {
      return;
    }
    if (!this.element) {
      return;
    }
    this.element.style.transform = '';
    const firstChild = this.element.children[0] as HTMLElement;
    if (firstChild) {
      firstChild.style.transform = '';
    }
  }

  protected getPositionData(gridRect?: DOMRect) {
    const gridBoundingClientRect =
      gridRect ?? this.animateGrid?.getGridBoundingClientRect();
    if (!gridBoundingClientRect || !this.element) {
      return null;
    }
    const rect = getGridAwareBoundingClientRect(
      gridBoundingClientRect,
      this.element
    );
    return {
      rect,
      gridBoundingClientRect,
    };
  }

  public recordPosition(gridRect?: DOMRect) {
    const newPosition = this.getPositionData(gridRect);
    if (!newPosition) {
      return;
    }
    this.positionData = newPosition;
  }

  public destroy() {
    this.eventEmitter.emit(AnimateCSSGridEvents.ITEM_BEFORE_DESTROY, this);
    // stop animation
    this.stopAnimationFunction();
    // reset transforms
    if (this.element) {
      this.element.style.transform = '';
    }

    this.eventEmitter.emit(AnimateCSSGridEvents.ITEM_AFTER_DESTROY, this);

    // remove event listeners
    this.eventEmitter.removeAllListeners();
  }
}
