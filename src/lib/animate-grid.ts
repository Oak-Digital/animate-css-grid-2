import { AnimateCSSGridOptions, PopmotionEasing } from '../types';
import wait from 'wait';
import { throttle } from 'lodash';
import { AnimateCSSGridItem, gridItemEventNames } from './grid-item';
import EventEmitter from 'eventemitter3';
import { AnimateCSSGridEvents } from '../types/events';

export class AnimateCSSGrid {
  // public properties
  public readonly element: HTMLElement;

  // protected and private properties
  private idCounter = 0;
  private _easing: keyof PopmotionEasing = 'easeInOut';
  private mutationsDisabled = false;
  private gridItems: AnimateCSSGridItem[] = [];
  private resizeFunction = () => {};
  private scrollFunction = () => {};
  private eventEmitter = new EventEmitter<AnimateCSSGridEvents>();
  private duration: number;
  private stagger: number;
  private observer: MutationObserver;

  constructor(
    element: HTMLElement,
    { duration = 250, stagger = 0, easing = 'easeInOut' }: AnimateCSSGridOptions = {}
  ) {
    this.element = element;
    this.duration = duration;
    this.stagger = stagger;
    this.easing = easing;

    this.setResizeListener();
    this.setResizeListener();

    this.observer = new MutationObserver(this.mutationCallback.bind(this));
    this.observer.observe(this.element, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['class'],
    });

    // cache rect of grid, so children don't have to calculate it
    const rect = this.getGridBoundingClientRect();
    // create grid item instances
    this.gridItems = Array.from(this.element.children).map((child) => {
      const id = this.getNewId();
      // assume the child is an HTML element or else 💀
      const gridItem = new AnimateCSSGridItem(
        this,
        child as HTMLElement,
        id,
        rect
      );

      // setup event listeners
      const eventNames = gridItemEventNames.forEach((name) => {
        gridItem.on(name, (data) => {
          this.eventEmitter.emit(name, data);
        });
      });

      return gridItem;
    });
  }

  public get on() {
    return this.eventEmitter.on.bind(this.eventEmitter);
  }

  public get once() {
    return this.eventEmitter.once.bind(this.eventEmitter);
  }

  public get off() {
    return this.eventEmitter.off.bind(this.eventEmitter);
  }

  // getters and setters
  public get easing() {
    return this._easing;
  }

  public set easing(easing: keyof PopmotionEasing) {
    this._easing = easing;
  }

  // public methods
  public getGridBoundingClientRect() {
    return this.element.getBoundingClientRect();
  }

  public async disableMutationsWhileFunctionRuns(func: () => void) {
    this.mutationsDisabled = true;
    func();
    await wait(0);
    this.mutationsDisabled = false;
  }

  public recordPositions() {
    this.gridItems.forEach((gridItem) => gridItem.recordPosition());
  }

  public destroy() {
    // remove mutation observer
    this.observer.disconnect();

    // remove window resize and scroll listener
    this.removeEventResizeListener();
    this.removeEventScrollListener();

    // remove event emitter
    this.eventEmitter.removeAllListeners();

    // reset grid items
    this.gridItems.forEach((gridItem) => gridItem.destroy());
  }

  // protected and private methods
  protected getNewId() {
    return this.idCounter++;
  }

  public forceGridAnimation() {
    this.mutationCallback('forceGridAnimation');
  }

  protected async mutationCallback(
    mutationsList: MutationRecord[] | 'forceGridAnimation'
  ) {
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
      if (this.mutationsDisabled) return;
    }

    // stop animation and reset transforms of items
    // TODO: we can probably change this, such that the animations look more smooth
    this.gridItems.forEach((gridItem) => {
      gridItem.stopAnimation();
      gridItem.resetTransforms();
    });

    // prepare animation of children by getting their child coordinates
    // this will prevent the grid from jumping around
    const affectedItems = this.gridItems.filter((gridItem) =>
      gridItem.prepareAnimation()
    );

    await this.disableMutationsWhileFunctionRuns(() => {
      // call on start
      this.eventEmitter.emit(AnimateCSSGridEvents.START, affectedItems);
    });

    // start animation for children
    await Promise.allSettled(
      affectedItems.map((gridItem, i) => {
        return gridItem.startAnimation({
          delay: i * this.stagger,
          duration: this.duration,
          easing: this.easing,
        });
      })
    );

    await this.disableMutationsWhileFunctionRuns(() => {
      // call on end
      this.eventEmitter.emit(AnimateCSSGridEvents.END, affectedItems);
    });
  }

  private setResizeListener() {
    // remove first just to make sure
    this.removeEventResizeListener();

    this.resizeFunction = throttle(() => {
      const bodyElement = document.querySelector('body');
      const containerIsNoLongerInPage =
        bodyElement && !bodyElement.contains(this.element);
      if (!this.element || containerIsNoLongerInPage) {
        this.removeEventResizeListener();
      }
      this.recordPositions();
    }, 250);

    window.addEventListener('resize', this.resizeFunction);
  }

  private removeEventResizeListener() {
    window.removeEventListener('resize', this.resizeFunction);
  }

  private setScrollListener() {
    // remove first just to make sure
    this.removeEventScrollListener();

    this.scrollFunction = throttle(() => {
      this.recordPositions();
    }, 20);

    window.addEventListener('scroll', this.scrollFunction);
  }

  private removeEventScrollListener() {
    window.removeEventListener('scroll', this.scrollFunction);
  }
}
