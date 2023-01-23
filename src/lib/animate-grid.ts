import { AnimateCSSGridOptions, PopmotionEasing } from '../types';
import wait from 'wait';
import { throttle } from 'lodash';
import { AnimateCSSGridItem, gridItemEventNames } from './grid-item';
import EventEmitter from 'eventemitter3';
import { AnimateCSSGridEvents } from '../types/events';

export class AnimateCSSGrid {
  // protected and private properties
  private _element?: HTMLElement;
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
  private autoRegisterChildren: boolean;

  constructor(
    element?: HTMLElement,
    {
      duration = 250,
      stagger = 0,
      easing = 'easeInOut',
      autoRegisterChildren = true,
    }: AnimateCSSGridOptions = {}
  ) {
    this.duration = duration;
    this.stagger = stagger;
    this.easing = easing;
    this.autoRegisterChildren = autoRegisterChildren;

    this.setResizeListener();
    this.setResizeListener();

    this.observer = new MutationObserver(this.mutationCallback.bind(this));

    if (element) {
      this.registerElement(element);
    }
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

  public get element() {
    return this._element;
  }

  public registerElement(element: HTMLElement) {
    if (this.element) {
      throw new Error('Element already registered');
    }
    this._element = element;

    // cache rect of grid, so children don't have to calculate it
    const rect = this.getGridBoundingClientRect(); // should never be undefined
    if (!rect) {
      throw new Error('Grid rect not found');
    }

    // create grid item instances
    if (this.autoRegisterChildren) {
      this.createInitialGridItems(rect);
    }

    this.observer.observe(this._element, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['class'],
    });
  }

  // public methods
  public getGridBoundingClientRect() {
    return this.element?.getBoundingClientRect();
  }

  public async disableMutationsWhileFunctionRuns(func: () => void) {
    this.mutationsDisabled = true;
    func();
    await wait(0);
    this.mutationsDisabled = false;
  }

  public recordPositions() {
    if (this.autoRegisterChildren) {
      this.registerNewGridItems();
    }
    this.gridItems.forEach((gridItem) => gridItem.recordPosition());
  }

  public registerNewGridItems() {
    // check if there are new grid items that need to be added
    // TODO: probably a bit slow, so maybe refactor?
    const newGridItems = Array.from(this.element?.children ?? []).filter(
      (child) => !this.gridItems.find((item) => item.element === child)
    );
    newGridItems.forEach((child) => {
      const id = this.getNewId();
      const gridItem = new AnimateCSSGridItem(
        this,
        child as HTMLElement,
        id,
        this.getGridBoundingClientRect()
      );
      this.registerGridItem(gridItem);
    });
  }

  public unregisterRemovedGridItems() {
    const removedGridItems = this.gridItems.filter(
      (gridItem) => gridItem.element && !this.element?.contains(gridItem.element)
    );
    removedGridItems.forEach((gridItem) => this.unregisterGridItem(gridItem));
  }

  public findChildItem(child: HTMLElement | AnimateCSSGridItem) {
    if (child instanceof AnimateCSSGridItem) {
      return child;
    }
    const childItem = this.gridItems.find((item) => item.element === child);
    if (!childItem) {
      throw new Error('Child not found');
    }
    return childItem;
  }

  public extractChild(child: HTMLElement | AnimateCSSGridItem) {
    const childItem = this.findChildItem(child);
    const result = childItem.extract();
    if (result) {
      this.forceGridAnimation();
    }
    return result;
  }

  public unExtractChild(child: HTMLElement | AnimateCSSGridItem) {
    const childItem = this.findChildItem(child);
    const result = childItem.unExtract();
    if (result) {
      this.forceGridAnimation();
    }
    return result;
  }

  public registerGridItem(gridItem: AnimateCSSGridItem, index?: number) {
    // TODO: maybe check if the element already exists?
    const newIndex = index ?? this.gridItems.length;
    this.gridItems.splice(newIndex, 0, gridItem);
  }

  public unregisterGridItem(gridItem: AnimateCSSGridItem) {
    const index = this.gridItems.indexOf(gridItem);
    if (index === -1) {
      return;
    }
    const item = this.gridItems.splice(index, 1)[0];
    item.destroy();
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

  private createInitialGridItems(gridRect: DOMRect) {
    this.gridItems = Array.from(this.element?.children ?? []).map((child) => {
      const id = this.getNewId();
      // assume the child is an HTML element or else 💀
      const gridItem = new AnimateCSSGridItem(
        this,
        child as HTMLElement,
        id,
        gridRect
      );

      // setup event listeners
      gridItemEventNames.forEach((name) => {
        gridItem.on(name, (data) => {
          this.eventEmitter.emit(name, data);
        });
      });

      return gridItem;
    });
  }

  protected async mutationCallback(
    mutationsList: MutationRecord[] | 'forceGridAnimation'
  ) {
    let addedOrRemoved = false;
    if (mutationsList !== 'forceGridAnimation') {
      // check if we care about the mutation
      const relevantMutationHappened = mutationsList.filter(
        (m: MutationRecord) => {
          if (m.addedNodes.length > 0 || m.removedNodes.length > 0) {
            addedOrRemoved = true;
            return true;
          }
          return m.attributeName === 'class'
        }
      ).length;
      if (!relevantMutationHappened) {
        return;
      }
      if (this.mutationsDisabled) return;
    }

    if (this.autoRegisterChildren && addedOrRemoved) {
      this.unregisterRemovedGridItems();
      this.registerNewGridItems();
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
      if (!this.element) {
        return;
      }
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
