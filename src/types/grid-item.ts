import { AnimateCSSGridItemEvent, AnimateCSSGridItemEventCallback } from "./events";

export interface IAnimateGridItem {
    // prepares the animation by recording the new position of the grid item and setting the from position to the previously recorded position
    prepareAnimation(): void;
    // starts animation from previously recorded position to current position
    startAnimation(): void;
    stopAnimation(): void;

    setElement(element: HTMLElement): this;

    on<EventName extends AnimateCSSGridItemEvent>(eventName: EventName, callback: AnimateCSSGridItemEventCallback[EventName]): this;
    once<EventName extends AnimateCSSGridItemEvent>(eventName: EventName, callback: AnimateCSSGridItemEventCallback[EventName]): this;
    off<EventName extends AnimateCSSGridItemEvent>(eventName: EventName, callback: AnimateCSSGridItemEventCallback[EventName]): this;

    getCurrentScale(): [number, number];

    // Records the current position of the grid item
    // this position should be used as the from position when animating
    recordPosition(): this;

    destroy(): void;
    
    // properties
    element: HTMLElement | undefined;
}
