import { AnimateCSSGridEvent, AnimateCSSGridEventCallback } from "./events";
import { IAnimateGridItem } from "./grid-item";

export interface IAnimateGrid {
    registerElement(element: HTMLElement): this;
    unregisterElement(element: HTMLElement | IAnimateGridItem): void;
    // This function should register new grid items
    registerExistingElements(): void;
    // This function should unregister removed grid items
    unregisterRemovedElements(): void;
    // force starts the animation of all grid items that have changed
    // startAnimation(): IAnimateGridItem[]; // TODO:
    on<EventName extends AnimateCSSGridEvent>(eventName: EventName, callback: AnimateCSSGridEventCallback[EventName]): this;
    once<EventName extends AnimateCSSGridEvent>(eventName: EventName, callback: AnimateCSSGridEventCallback[EventName]): this;
    off<EventName extends AnimateCSSGridEvent>(eventName: EventName, callback: AnimateCSSGridEventCallback[EventName]): this;
    // records the current position of all grid items - should be used whenever the grid changes
    recordPositions(): void;
    getGridRect(): DOMRect | undefined;
    // This method is used to disable mutations while a function is running, so it won't cause mutations.
    // It is used while updating styles on grid items, so that the observer doesn't trigger a mutation.
    disableWhile(func: () => void): void;

    destroy(): void;

    // public properties
    // the element that contains the grid items
    element: HTMLElement | undefined;
}
