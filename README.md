# Animate CSS Grid

[Demo example](https://animate-css-grid-2-oak-digital.vercel.app/)

Seamlessly animate all CSS grid properties, including:

### `grid-column` and `grid-row`

<a href="https://codepen.io/aholachek/pen/VXjOPB">
<img src="./examples/grid-column-optimized.gif" alt="grid-column and grid-row" width="500px">
</a>


### `grid-template-columns`

<a href="https://codepen.io/aholachek/pen/VXjOPB">
<img src="./examples/grid-template-columns-optimized-1.gif" alt="grid-template-columns" width="500px">
</a>

### `grid-gap`

<a href="https://codepen.io/aholachek/pen/VXjOPB">
<img src="./examples/grid-gap-optimized-1.gif" alt="grid-gap" width="500px">
</a>


- #### [Fork Photo Grid Example on CodeSandbox (uses ES2015 imports)](https://codesandbox.io/s/animate-css-grid-template-t6qsf)
- #### [Fork Photo Grid Example on Codepen (uses script tags)](https://codepen.io/aholachek/pen/VXjOPB)

This script makes it easy to transition your CSS grid gracefully from one state to another.
If the content of the grid changes, or if the grid or one of its children is updated with the addition or removal of a class, the grid will automatically transition to its new configuration.

## How to use it

Just call the `wrapGrid` method on your grid container, and optionally provide a config object as a second argument.
If the grid is removed from the page, the animations will automatically be cleaned up as well.

ES6 Module:

`yarn add animate-css-grid` or `npm install animate-css-grid`

```js
import { AnimateCSSGrid } from 'animate-css-grid'

const grid = document.querySelector(".grid");
const ag = new AnimateCSSGrid(grid)
```

Optional config object:

```js
{
  // int: default is 0 ms
  stagger: 100,
  // int: default is 250 ms
  duration: 500
  // string: default is 'easeInOut'
  easing: 'backInOut',
}
```

Available easing functions:

- `'linear'`
- `'easeIn'` / `'easeOut'` / `'easeInOut'`
- `'circIn'` / `'circOut'` / `'circInOut'`
- `'backIn'` / `'backOut'` / `'backInOut'`
- `'anticipate'`

[Learn more about available easing functions here.](https://popmotion.io/api/easing/)

The `AnimateCSSGrid` instance gives you access to the following methods and fields

```js
// listen for events
ag.on(eventName, yourFunction)
// listen for eventName, but only once
ag.once(eventName, yourFunction)
// remove event listener
ag.off(eventName, yourFunction)

// takes the html element out of the grid with position absolute
// and let's you do what you want with it, for example fading it out
ag.extractChild(HTMLElement)

// removes position absolute from the child, so it can be part of the grid again
ag.unExtractChild(HTMLElement)

// force a grid animation - do this if you only change styles
// or something else that does not trigger the animation
ag.forceGridAnimation()

// removes all event listeners and the animations will no longer work
ag.destroy()
```

### Events

These are the event types. If you use typescript you should use the provided enum (AnimateCSSGridEvents ).

```js
ag.on('start', (affectedElements) => {})
ag.on('end', (affectedElements) => {})
ag.on('beforeDestroy', () => {})
ag.on('afterDestroy', () => {})
ag.on('itemStart', (item) => {})
ag.on('itemEnd', (item) => {})
ag.on('itemBeforeDestroy', (item) => {})
ag.on('itemAfterDestroy', (item) => {})
```

## Requirements

1.  The updates to the grid will have to come from addition or removal of a class or element. Currently, inline style updates will not trigger transitions. (Although you can manually trigger transitions in that case by calling `forceGridAnimation()`)
2.  **Important** If a grid item has children, they should be surrounded by a single container element. This is so we can apply a counter scale and prevent children elements from getting warped during scale transitions of the parent.

Example:

```html
<!-- grid class -->
<ul class="some-grid-class-that-changes">
  <li class="grid-item">
    <!-- each grid item must have a single direct child -->
    <div>
      <h3>Item title</h3>
      <div>Item body</div>
    </div>
  </li>
<div>
```

## How it works

The script registers a `MutationObserver` that activates when the grid or one of its children adds or loses a class or element. That means there's no need to remove the animations before removing the grid, everything should be cleaned up automatically.
It uses the FLIP animation technique to smoothly update the grid, applying a counter transform to the children of each item so that they do not appear distorted while the transition occurs.

It should work on container elements without CSS grid applied as well, but was developed and tested with CSS grid in mind.

## Usage with Frameworks

The `animate-css-grid` library can easily be used with frameworks like React or Vue.

Check out the [React example](https://codepen.io/aholachek/pen/mxwvmV) or the [Vue example](https://codepen.io/sustained/pen/Rwbdgob) on Codepen!

## Roadmap

- [ ] ability to animate width and height of elements, so text doesn't jump, but slowly becomes smaller or larger
- [ ] option for animating height (and width) of the grid, so it looks more natural. Instead of scaling.
- [ ] investigate which animation library to use with a small footprint

## Publishing

```
pnpm run build
pnpm publish
```
