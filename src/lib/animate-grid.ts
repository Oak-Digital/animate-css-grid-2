import {
  AnimateCSSGridEvent,
  AnimateCSSGridEventCallback,
  animateCSSGridEventsToItemsMap,
  animateCSSGridItemEvents,
  AnimateCSSGridMode,
  AnimateCSSGridModeOptions,
  AnimateCSSGridOptions,
  PopmotionEasing,
} from '../types';
import wait from 'wait';
import { throttle } from 'lodash';
import { AnimateCSSGridItem } from './grid-item';
import EventEmitter from 'eventemitter3';
import { IAnimateGridItem } from '../types/grid-item';
import { IAnimateGrid } from '../types/animate-grid';
import { animate } from 'popmotion';
import sync, { cancelSync, Process } from 'framesync';
import { AUTO_IGNORE_DATASET } from './constants';

export class AnimateCSSGrid<Mode extends AnimateCSSGridMode = 'absolute'> implements IAnimateGrid {
  // protected and private properties
  private _element: HTMLElement;
  private _easing: keyof PopmotionEasing = 'easeInOut';
  private mutationsDisabled = false;
  private gridItems: IAnimateGridItem[] = [];
  private resizeFunction = () => {};
  private scrollFunction = () => {};
  private eventEmitter = new EventEmitter<AnimateCSSGridEvent>();
  private duration: number;
  private stagger: number; // TODO:
  private observer: MutationObserver;
  private autoRegisterChildren: boolean;
  private toWidthHeight: [number, number] | null = null;
  private widthHeight: [number, number];
  private mode: Mode;
  private animateWidthHeight: boolean;
  private modeOptions: AnimateCSSGridModeOptions[Mode] = {};
  private stopAnimation = () => {};
  private queuedForceAnimation: Process = sync.postRender(() => {})

  constructor(
    element: HTMLElement,
    {
      duration = 250,
      stagger = 0,
      easing = 'easeInOut',
      autoRegisterChildren = true,
      mode,
      modeOptions = {},
    }: AnimateCSSGridOptions<Mode> = {}
  ) {
    const newMode = mode ?? 'absolute';
    this.mode = newMode as Mode; // defualt is absolute
    this.duration = duration;
    this.stagger = stagger;
    this.easing = easing;
    this.autoRegisterChildren = autoRegisterChildren;
    this.modeOptions = modeOptions;

    this.setResizeListener();
    this.setScrollListener();

    this.observer = new MutationObserver(this.mutationCallback.bind(this));

    this._element = element;
    if (this.autoRegisterChildren) {
      this.registerExistingElements();
    }
    this.widthHeight = this.getCurrentWidthHeight();

    if (this.mode === 'absolute') {
      const mOptions = this.modeOptions as AnimateCSSGridModeOptions['absolute'];
      this.animateWidthHeight = mOptions.animateWidthHeight ?? true;
    } else if (this.mode === 'static') {
      const mOptions = this.modeOptions as AnimateCSSGridModeOptions['static'];
      // We cannot animate width and height in static mode since it will mess up the transformations of the grid items
      this.animateWidthHeight = false;
    } else {
      throw new Error('Invalid mode');
    }

    this.observer.observe(this._element, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['class'],
    });
  }

  public getGridItem(element: HTMLElement) {
    return this.gridItems.find((item) => item.element === element);
  }

  private getCurrentWidthHeight(): [number, number] {
    const rect = this._element.getBoundingClientRect();
    return [rect.width, rect.height];
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

  // This function registers a new element to the grid
  public registerElement(element: HTMLElement | IAnimateGridItem): IAnimateGridItem {
    // REFACTOR: This function should be refactored to keep better track of registered elements
    let gridItem: IAnimateGridItem;
    if (!(element instanceof HTMLElement)) {
      gridItem = element;
    } else {
      gridItem = new AnimateCSSGridItem(this, element, {
        duration: this.duration,
        easing: this.easing,
        mode: this.mode,
        modeOptions: this.modeOptions,
      });
    }

    gridItem.recordPosition();

    animateCSSGridEventsToItemsMap.forEach(([eventName, itemEventName]) => {
      gridItem.on(itemEventName, (...args) => {
        this.emit(eventName, ...args);
      });
    });

    gridItem.on('extracted', () => {
      this.forceGridAnimation();
    });

    gridItem.on('unextracted', () => {
      this.forceGridAnimation();
    });

    /* const newIndex = index ?? this.gridItems.length; */
    /* this.gridItems.splice(newIndex, 0, gridItem); */
    this.gridItems.push(gridItem);

    return gridItem;
  }

  public unregisterElement(element: HTMLElement | IAnimateGridItem) {
    let index = -1;
    if (element instanceof HTMLElement) {
      // TODO: unregister element
      index = this.gridItems.findIndex((item) => item.element === element);
    } else {
      index = this.gridItems.findIndex((item) => item === element);
    }

    if (index === -1) {
      return;
    }

    const item = this.gridItems[index];
    this.gridItems.splice(index, 1);
    item.destroy();
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
    this.widthHeight = this.getCurrentWidthHeight();
    this.gridItems.forEach((gridItem) => gridItem.recordPosition());
  }

  public registerExistingElements() {
    // check if there are new grid items that need to be added
    // TODO: probably a bit slow, so maybe refactor?
    const newGridItems = Array.from(this.element?.children ?? []).filter(
      (child) => !this.gridItems.find((item) => item.element === child)
    ).filter((child): child is HTMLElement => {
      return child instanceof HTMLElement;
    }).filter((child) => {
      if (child.dataset[AUTO_IGNORE_DATASET] !== undefined && child.dataset[AUTO_IGNORE_DATASET] !== null) {
        return false;
      }
      return true;
    });
    const itemInstances = newGridItems.map((child) => {
      return this.registerElement(child);
    });

    return itemInstances;
  }

  public unregisterRemovedElements() {
    const removedGridItems = this.gridItems.filter(
      (gridItem) =>
        gridItem.element && !this.element?.contains(gridItem.element)
    );
    removedGridItems.forEach((gridItem) => this.unregisterElement(gridItem));
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

    let newlyRegistered: IAnimateGridItem[] = [];
    if (this.autoRegisterChildren && addedOrRemoved) {
      this.unregisterRemovedElements();
      newlyRegistered = this.registerExistingElements();
    }

    // stop animation and reset transforms of items
    this.stopAnimation();
    if (this.animateWidthHeight) {
      this.element.style.width = '';
      this.element.style.height = '';
    }
    this.gridItems.forEach((gridItem) => {
      gridItem.stopAnimation();
      gridItem.resetTransforms();
    });

    newlyRegistered.forEach((item) => {
      item.recordPosition()
    });

    /* debugger; */

    // prepare animation of children by getting their child coordinates
    // this will prevent the grid from jumping around
    const affectedItems = this.gridItems.filter((gridItem) =>
      gridItem.prepareAnimation()
    );
    const itemsToAnimate = affectedItems;
    // find the new width and height of the grid now
    this.toWidthHeight = this.getCurrentWidthHeight();
    itemsToAnimate.forEach((item) => item.afterPrepareAnimation());

    let animationPromise: Promise<void>;
    if (this.animateWidthHeight) {
      animationPromise = this.startSizeAnimation(this.widthHeight, this.toWidthHeight);
    } else {
      animationPromise = Promise.resolve();
    }

    await this.disableWhile(() => {
      // call on start
      this.emit('start', itemsToAnimate);
    });

    // start animation for children
    await Promise.allSettled(
      itemsToAnimate.map((gridItem) => {
        return gridItem.startAnimation();
      })
    );
    await animationPromise;
    if (this.animateWidthHeight) {
      sync.render(() => {
        this.element.style.width = '';
        this.element.style.height = '';
      });
    }

    sync.postRender(() => {
      this.recordPositions();
    });

    await this.disableWhile(() => {
      // call on end
      this.emit('end', itemsToAnimate);
    });
  }

  private startSizeAnimation(from: [number, number], to: [number, number]) {
    sync.render(() => {
      this.element.style.width = `${from[0]}px`;
      this.element.style.height = `${from[1]}px`;
    })
    return new Promise<void>((resolve, reject) => {
      const animation = animate({
        from: `${from[0]};${from[1]}`,
        to: `${to[0]};${to[1]}`,
        duration: this.duration,
        /* easing: this.easing, */
        onUpdate: (value: string) => {
          const [width, height] = value.split(';');
          /* console.log(width, height); */
          sync.render(() => {
            this.element.style.width = `${width}px`;
            this.element.style.height = `${height}px`;
          });
          this.widthHeight = [Number(width), Number(height)];
        },
        onComplete: () => {
          this.stopAnimation();
          resolve();
        },
        onStop: () => {
          /* reject(); */
        }
      });
      this.stopAnimation = () => {
        animation.stop();
        this.stopAnimation = () => {}
      }
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
