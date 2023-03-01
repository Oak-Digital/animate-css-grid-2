import sync from 'framesync';
import { EventEmitter } from 'eventemitter3';
import {
  AnimateCSSGridItemEvent,
  AnimateCSSGridItemEventCallback,
  AnimateCSSGridItemOptions,
  AnimateCSSGridOptions,
  BoundingClientRect,
  ItemPosition,
  PopmotionEasing,
  Transform,
} from '../types';
import { arraylikeToArray } from './arrays';
import { popmotionEasing } from './easings';
import { applyCoordTransform } from './grid';
import { wait2 } from './wait';
import { IAnimateGridItem } from '../types/grid-item';
import { IAnimateGrid } from '../types/animate-grid';
import { mat4 } from 'gl-matrix';
import {
  compose,
  fromDefinition,
  fromTransformAttribute,
  identity,
  Matrix,
  scale,
  toCSS,
  translate,
} from 'transformation-matrix';
import { animate } from 'popmotion';
import { AnimateGridCounterScale } from './counter-scaler';

export class AnimateCSSGridItem implements IAnimateGridItem {
  public readonly animateGrid?: IAnimateGrid;

  private _element?: HTMLElement;

  // Animation specific properties
  private currentFromRect: BoundingClientRect | null = null;
  private currentFromTransform: Matrix = identity();
  private fromWidth: number | null = null;
  private fromHeight: number | null = null;
  private currentToRect: BoundingClientRect | null = null;
  private currentToTransform: Matrix = identity();
  private toWidth: number | null = null;
  private toHeight: number | null = null;
  private easing: keyof PopmotionEasing = 'easeInOut';
  private duration: number = 250;
  private absoluteAnimation: boolean = false;
  private autoSetCounterScaler: boolean = true;
  private counterScaler?: AnimateGridCounterScale;

  private stopAnimationFunction = () => {};
  private eventEmitter = new EventEmitter<AnimateCSSGridItemEvent>();

  constructor(
    animateGrid: IAnimateGrid,
    element?: HTMLElement,
    {
      easing = 'easeInOut',
      duration = 250,
      absoluteAnimation = false,
      autoSetCounterScaler = true,
    }: AnimateCSSGridItemOptions = {}
  ) {
    this.animateGrid = animateGrid;
    this.easing = easing;
    this.duration = duration;
    this.absoluteAnimation = absoluteAnimation;
    this.autoSetCounterScaler = autoSetCounterScaler;

    if (element) {
      this.setElement(element);
    }
  }

  public get element() {
    return this._element;
  }

  public setElement(element: HTMLElement) {
    this._element = element;
    this.recordPosition();

    if (this.autoSetCounterScaler) {
      const counterScalerElement = element.children?.[0];
      if (
        !counterScalerElement ||
        !(counterScalerElement instanceof HTMLElement)
      ) {
        console.log(counterScalerElement, element);
        /* throw new Error( */
        /*   'AnimateCSSGridItem: The element must have a child html element to use autoSetCounterScaler' */
        /* ); */
        return this;
      }

      const counterScaler = new AnimateGridCounterScale(
        counterScalerElement,
        this
      );
      this.setCounterScaler(counterScaler);
    }

    return this;
  }

  public setCounterScaler(counterScaler: AnimateGridCounterScale) {
    this.counterScaler = counterScaler;
  }

  public removeCounterScaler() {
    this.counterScaler = undefined;
  }

  // these functions should be bound to have the correct this reference
  public on<EventName extends AnimateCSSGridItemEvent>(
    eventName: EventName,
    callback: AnimateCSSGridItemEventCallback[EventName]
  ) {
    this.eventEmitter.on(eventName, callback);
    return this;
  }

  public once<EventName extends AnimateCSSGridItemEvent>(
    eventName: EventName,
    callback: AnimateCSSGridItemEventCallback[EventName]
  ) {
    this.eventEmitter.once(eventName, callback);
    return this;
  }

  public off<EventName extends AnimateCSSGridItemEvent>(
    eventName: EventName,
    callback: AnimateCSSGridItemEventCallback[EventName]
  ) {
    this.eventEmitter.off(eventName, callback);
    return this;
  }

  // Use this for type safety
  private emit<EventName extends AnimateCSSGridItemEvent>(
    eventName: EventName,
    ...args: Parameters<AnimateCSSGridItemEventCallback[EventName]>
  ) {
    this.eventEmitter.emit(eventName, ...args);
  }

  // To make sure the element is ready to be animated, make sure to call record position at some point before calling this
  // this must be called before calling startAnimation and should be called when the elements actual position has changed
  // returns true if the animation was prepared
  public prepareAnimation() {
    /* console.log('preparing', this.element, this.currentFromRect, this.currentFromTransform) */
    if (!this.element || !this.currentFromTransform || !this.currentFromRect) {
      // This element is not ready to be animated
      return false;
    }

    // do not animate if boundingClientRect is the same as the position data since that means they haven't moved

    const itemGridRect = this.getGridRelativeRect();

    /* const itemRect = this.positionData.rect; */
    const itemFromRect = this.currentFromRect;

    if (!itemGridRect) {
      return false;
    }

    if (
      itemGridRect.top === itemFromRect.top &&
      itemGridRect.left === itemFromRect.left &&
      itemGridRect.width === itemFromRect.width &&
      itemGridRect.height === itemFromRect.height
    ) {
      return false;
    }

    // having more than one child in the animated item is not supported - counter scaling
    /* if (arraylikeToArray(this.element.children).length > 1) { */
    /*   throw new Error( */
    /*     'Make sure every grid item has a single container element surrounding its children' */
    /*   ); */
    /* } */

    /* const firstChild = this.element.children[0] as HTMLElement; */
    /* firstChild.style.transform = ''; */

    // if it is a `position: absolute` animation:
    // - set the transform translate to the current position of the currentFromRect

    const styles = this.element.style;
    const oldTransform = styles.transform;
    styles.transform = '';

    // find curentToRect
    const itemToRect = this.getGridRelativeRect();
    const itemToTransform = this.getCurrentTransforms();
    if (!itemToRect || !itemToTransform) {
      styles.transform = oldTransform;
      return false;
    }
    this.emit('start', this);

    /* console.log('prepared', this); */

    this.currentToRect = itemToRect;
    this.currentToTransform = itemToTransform;

    this.fromWidth = itemFromRect.width;
    this.fromHeight = itemFromRect.height;
    this.toWidth = itemToRect.width;
    this.toHeight = itemToRect.height;

    const { top, left } = itemFromRect;
    if (this.absoluteAnimation) {
      // we want to preserve the current transform and only override the translate
      const newMatrix = compose([
        this.currentFromTransform,
        translate(left, top),
      ]);
      /* console.log(newMatrix, left, top); */
      this.currentFromTransform = newMatrix;

      this.currentToTransform = compose([
        this.currentToTransform,
        translate(itemToRect.left, itemToRect.top),
      ]);
    } else {
      // otherwise:
      // - set the transform translate to the current position of the currentFromRect relative to the currentToRect
      const { top: toTop, left: toLeft } = itemToRect;
      const newMatrix = compose([
        this.currentFromTransform,
        translate(
          left - toLeft + itemToTransform.e,
          top - toTop + itemToTransform.f
        ),
        scale(itemFromRect.width / itemToRect.width),
      ]);
      this.currentFromTransform = newMatrix;

      /* styles.transform = toCSS(newMatrix); */
    }

    // At this point the styles should be set to the original position

    this.element.style.transformOrigin = '0 0'; // TODO: is this needed?
    // TODO: counter scaling

    return true;
    // after all grid items have been prepared, the styles can be applied
  }

  // gets the rect relative to the parent grid
  public getGridRelativeRect() {
    // get grid rect
    const gridRect = this.animateGrid?.getGridRect();

    if (!this.element || !gridRect) {
      return null;
    }

    // subtract grid position from item position
    const { top, left, width, height } = this.element.getBoundingClientRect();
    const rect = {
      top: top - gridRect.top,
      left: left - gridRect.left,
      width,
      height,
    };

    // if an element is display:none it will return top: 0 and left:0
    // TODO: handle `display: none` elements

    return rect;
  }

  public async startAnimation() {
    if (
      !this.element ||
      !this.currentFromTransform ||
      !this.currentToTransform
    ) {
      return false;
    }

    /* applyCoordTransform(this.element, this.currentFromCoords ?? baseCoords); */

    const oldPosition = this.element.style.position;
    const oldBoxSizing = this.element.style.boxSizing;
    if (this.absoluteAnimation) {
      this.element.style.position = 'absolute';
      this.element.style.boxSizing = 'border-box';
      // set width and height
      this.element.style.width = `${this.currentFromRect?.width}px`;
      this.element.style.height = `${this.currentFromRect?.height}px`;
    }

    /* if (delay > 0) { */
    /*   const { promise, abort } = wait2(delay); */
    /*   this.stopAnimationFunction = abort; */
    /*   await promise; */
    /* } */

    const completionPromise = new Promise<void>((resolve, reject) => {
      if (!this.currentFromTransform || !this.currentToTransform) {
        reject();
        return;
      }

      const transformAnimation = animate({
        from: toCSS(this.currentFromTransform),
        to: toCSS(this.currentToTransform),
        duration: this.duration, // TODO: use this from options
        onUpdate: (value: string) => {
          // We assume the element is not null here, and if it is, the use will get an error
          this.element!.style.transform = value;
          // this helps prevent layout thrashing
          sync.postRender(() => {
            this.recordPosition();
            this.emit('progress');
          });
        },
        onComplete: () => {
          resolve();
        },
      });

      let whAnimation: { stop: () => void } | null = null;
      if (
        this.absoluteAnimation &&
        this.currentFromRect &&
        this.currentToRect
      ) {
        whAnimation = animate({
          from: `${this.currentFromRect.width};${this.currentFromRect.height}`,
          to: `${this.currentToRect.width};${this.currentToRect.height}`,
          duration: this.duration, // TODO: use this from options
          onUpdate: (value: string) => {
            const [newWidth, newHeight] = value
              .split(';')
              .map((v) => parseInt(v));
            // We assume the element is not null here, and if it is, the use will get an error
            this.element!.style.width = `${newWidth}px`;
            this.element!.style.height = `${newHeight}px`;
          },
        });
      }

      this.stopAnimationFunction = () => {
        transformAnimation.stop();
        if (whAnimation) {
          whAnimation.stop();
        }
        resolve();
      };
    });

    await completionPromise;

    this.resetTransforms();
    if (this.absoluteAnimation) {
      this.element.style.position = oldPosition;
      this.element.style.boxSizing = oldBoxSizing;
    }

    // TODO: this might not be needed

    this.emit('end', this);

    return true;
  }

  public getCurrentScale(): [number, number] {
    return [
      this.currentFromTransform?.a ?? 1,
      this.currentFromTransform?.d ?? 1,
    ];
  }

  public stopAnimation() {
    this.stopAnimationFunction();
    this.stopAnimationFunction = () => {};
  }

  public resetTransforms() {
    if (!this.element) {
      return;
    }
    this.element.style.transform = '';
    this.element.style.width = '';
    this.element.style.height = '';
    const firstChild = this.element.children[0] as HTMLElement;
    if (firstChild) {
      firstChild.style.transform = '';
    }
  }

  public getCurrentTransforms(): Matrix {
    if (typeof window === 'undefined' || !this.element) {
      return identity();
    }

    const style = window.getComputedStyle(this.element);
    const transform = style.getPropertyValue('transform');
    if (transform === 'none') {
      return identity();
    }

    const transformMatrix = compose(
      fromDefinition(fromTransformAttribute(transform))
    );

    return transformMatrix;
  }

  public getCurrentRect() {
    if (!this.element) {
      return null;
    }

    return this.element.getBoundingClientRect();
  }

  public recordPosition() {
    const newTransforms = this.getCurrentTransforms();
    const newRect = this.getGridRelativeRect();
    /* console.log('recording position', newTransforms, newRect); */
    if (newTransforms) {
      this.currentFromTransform = newTransforms;
    }
    if (newRect) {
      this.currentFromRect = newRect;
    }

    return this;
  }

  public destroy() {
    this.emit('beforeDestroy', this);
    // stop animation
    this.stopAnimationFunction();
    // reset transforms
    this.resetTransforms();

    this.emit('afterDestroy', this);

    // remove event listeners
    this.eventEmitter.removeAllListeners();
  }
}
