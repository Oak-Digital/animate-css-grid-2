import { IAnimateGridItem } from "../types/grid-item";

export class AnimateGridCounterScale {
  private _element: HTMLElement;
  private _gridItem: IAnimateGridItem;
  private onProgressFunction = this.onProgress.bind(this);

  constructor(element: HTMLElement, gridItem: IAnimateGridItem) {
    this._element = element;
    this._gridItem = gridItem;
    this.setupListeners();
  }

  private onProgress() {
    const [currentScaleX, currentScaleY] = this._gridItem.getCurrentScale();
    const newScale = [1 / currentScaleX, 1 / currentScaleY];
    this._element.style.transform = `scaleX(${newScale[0]}) scaleY(${newScale[1]})`;
  }
  
  private setupListeners() {
    this._gridItem.on('progress', this.onProgressFunction);
  }

  private removeListeners() {
    this._gridItem.off('progress', this.onProgressFunction);
  }


  public reset() {
    this._element.style.transform = '';
  }

  public destroy() {
    this.removeListeners();
  }
}
