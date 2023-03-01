import {
  AnimateCSSGridEvent,
  AnimateCSSGridEventCallback,
  animateCSSGridEventsToItemsMap,
  animateCSSGridItemEvents,
  AnimateCSSGridOptions,
  PopmotionEasing,
} from '../types';
import wait from 'wait';
import { throttle } from 'lodash';
import { AnimateCSSGridItem } from './grid-item';
import EventEmitter from 'eventemitter3';
import { IAnimateGridItem } from '../types/grid-item';
import { IAnimateGrid } from '../types/animate-grid';

export class AnimateCSSGrid implements IAnimateGrid {
  // protected and private properties
  private _element?: HTMLElement;
  private _easing: keyof PopmotionEasing = 'easeInOut';
  private mutationsDisabled = false;
  private gridItems: IAnimateGridItem[] = [];
  private resizeFunction = () => {};
  private scrollFunction = () => {};
  private eventEmitter = new EventEmitter<AnimateCSSGridEvent>();
  private duration: number;
  private stagger: number;
  private observer: MutationObserver;
  private autoRegisterChildren: boolean;
  private absoluteAnimation: boolean;

  constructor(
    element?: HTMLElement,
    {
      duration = 250,
      stagger = 0,
      easing = 'easeInOut',
      autoRegisterChildren = true,
      absoluteAnimation = false,
    }: AnimateCSSGridOptions = {}
  ) {
    this.duration = duration;
    this.stagger = stagger;
    this.easing = easing;
    this.autoRegisterChildren = autoRegisterChildren;
    this.absoluteAnimation = absoluteAnimation;

    this.setResizeListener();
    this.setResizeListener();

    this.observer = new MutationObserver(this.mutationCallback.bind(this));

    if (element) {
      this.registerElement(element);
    }
  }

  // these functions should be bound to have the correct this reference
  public on<EventName extends AnimateCSSGridEvent>(
    eventName: EventName,
    callback: AnimateCSSGridEventCallback[EventName]
  ) {
    this.eventEmitter.on(eventName, callback);
    return this;
  }

  public once<EventName extends AnimateCSSGridEvent>(
    eventName: EventName,
    callback: AnimateCSSGridEventCallback[EventName]
  ) {
    this.eventEmitter.once(eventName, callback);
    return this;
  }

  public off<EventName extends AnimateCSSGridEvent>(
    eventName: EventName,
    callback: AnimateCSSGridEventCallback[EventName]
  ) {
    this.eventEmitter.off(eventName, callback);
    return this;
  }

  // Use this for type safety
  private emit<EventName extends AnimateCSSGridEvent>(
    eventName: EventName,
    ...args: Parameters<AnimateCSSGridEventCallback[EventName]>
  ) {
    this.eventEmitter.emit(eventName, ...args);
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
    // REFACTOR: This function should be refactored to keep better track of registered elements
    if (this.element) {
      throw new Error('Element already registered');
    }
    this._element = element;

    // TODO: cache rect of grid, so children don't have to read it
    const rect = this.getGridRect(); // should never be undefined
    if (!rect) {
      throw new Error('Grid rect not found');
    }

    // create grid item instances
    if (this.autoRegisterChildren) {
      this.createInitialGridItems();
    }

    this.recordPositions();

    this.observer.observe(this._element, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['class'],
    });

    return this;
  }

  public unregisterElement(element: HTMLElement | IAnimateGridItem) {
    if (element instanceof HTMLElement) {
      // TODO: unregister element
    } else {
      this.unregisterGridItem(element);
    }
  }

  // public methods

  public getGridRect() {
    return this.element?.getBoundingClientRect();
  }

  public async disableWhile(func: () => void) {
    this.mutationsDisabled = true;
    func();
    await wait(0);
    this.mutationsDisabled = false;
  }

  public recordPositions() {
    if (this.autoRegisterChildren) {
      this.registerExistingElements();
    }
    this.gridItems.forEach((gridItem) => gridItem.recordPosition());
  }

  public registerExistingElements() {
    // check if there are new grid items that need to be added
    // TODO: probably a bit slow, so maybe refactor?
    const newGridItems = Array.from(this.element?.children ?? []).filter(
      (child) => !this.gridItems.find((item) => item.element === child)
    );
    newGridItems.forEach((child) => {
      const gridItem = new AnimateCSSGridItem(this, child as HTMLElement, {
        absoluteAnimation: this.absoluteAnimation,
        duration: this.duration,
        stagger: this.stagger,
        easing: this.easing,
      });
      this.registerGridItem(gridItem);
    });
  }

  public unregisterRemovedElements() {
    const removedGridItems = this.gridItems.filter(
      (gridItem) =>
        gridItem.element && !this.element?.contains(gridItem.element)
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

  public registerGridItem(gridItem: IAnimateGridItem, index?: number) {
    // TODO: maybe check if the element already exists?
    const newIndex = index ?? this.gridItems.length;
    this.gridItems.splice(newIndex, 0, gridItem);
  }

  public unregisterGridItem(gridItem: IAnimateGridItem) {
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

  public forceGridAnimation() {
    this.mutationCallback('forceGridAnimation');
  }

  private createInitialGridItems() {
    this.gridItems = Array.from(this.element?.children ?? []).map((child) => {
      // assume the child is an HTML element or else 💀
      const gridItem = new AnimateCSSGridItem(this, child as HTMLElement, {
        absoluteAnimation: this.absoluteAnimation,
        duration: this.duration,
        stagger: this.stagger,
        easing: this.easing,
      });

      // setup event listeners
      animateCSSGridEventsToItemsMap.forEach(([eventName, itemEventName]) => {
        gridItem.on(itemEventName, (data) => {
          this.emit(eventName, data);
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
          return m.attributeName === 'class';
        }
      ).length;
      if (!relevantMutationHappened) {
        return;
      }
      if (this.mutationsDisabled) return;
    }

    if (this.autoRegisterChildren && addedOrRemoved) {
      this.unregisterRemovedElements();
      this.registerExistingElements();
    }

    // stop animation and reset transforms of items
    // TODO: we can probably change this, such that the animations look more smooth
    this.gridItems.forEach((gridItem) => {
      gridItem.stopAnimation();
      /* gridItem.resetTransforms(); */
    });

    // prepare animation of children by getting their child coordinates
    // this will prevent the grid from jumping around
    const affectedItems = this.gridItems.filter((gridItem) =>
      gridItem.prepareAnimation()
    );
    /* debugger; */

    await this.disableWhile(() => {
      // call on start
      this.emit('start', affectedItems);
    });

    // start animation for children
    await Promise.allSettled(
      affectedItems.map((gridItem) => {
        return gridItem.startAnimation();
      })
    );

    this.recordPositions();

    await this.disableWhile(() => {
      // call on end
      this.emit('end', affectedItems);
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
