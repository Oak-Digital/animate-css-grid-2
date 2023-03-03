import { animate, backOut, linear } from 'popmotion';
import { AnimateCSSGrid, AnimateCSSGridItem } from '../src/index';
import { arraylikeToArray } from '../src/lib/arrays';

document.addEventListener('DOMContentLoaded', () => {
  const grid: HTMLElement = document.querySelector('.grid')!;

  document
    .querySelector('.js-toggle-grid')!
    .addEventListener('click', () => grid.classList.toggle('grid--full'));

  document.querySelector('.js-add-card')!.addEventListener('click', () => {
    const randomNumber = Math.floor(Math.random() * 5) + 1;
    grid.insertAdjacentHTML(
      'beforeend',
      `
      <div class="card card--${randomNumber}">
      <div>
        <div class="card__avatar"></div>
        <div class="card__title"></div>
        <div class="card__description"></div>
      </div>
    </div>
    `
    );
  });

  grid.addEventListener('click', (ev) => {
    let target = <HTMLElement>ev.target;
    while (target !== document.body) {
      if (target.classList.contains('card')) {
        target.classList.toggle('card--expanded');
        return;
      }
      target = <HTMLElement>target.parentElement;
    }
  });

  /* const gridIgnoreElement = */
  /*   document.querySelector<HTMLElement>('.grid .card--2')!; */
  /* console.log(gridIgnoreElement); */
  const ag = new AnimateCSSGrid(grid, {
    easing: backOut,
  });

  ag.on('start', (els) => {
    els.forEach((el) => {
      /* console.log('foo'); */
      el.element?.classList.add('big');
    });
  });
  ag.on('end', (els) => {
    els.forEach((el) => el.element?.classList.add('small'));
  });

  ag.destroy();
  console.log('unwrapped');

  const ag2 = new AnimateCSSGrid(grid, {
    easing: backOut,
    mode: 'absolute',
    /* duration: 6000, */
    modeOptions: {
      /* itemAnimateWidthHeight: true, */
      animateWidthHeight: true,
    }
  });

  /* ag2.recordPositions(); */
  ag2.on('start', (els) => {
    els.forEach((el) => {
      /* console.log('onstart'); */
      el.element?.classList.add('big');
    });
  });
  ag2.on('end', (els) => {
    els.forEach((el) => el.element?.classList.add('small'));
  });

  document
    .querySelector('.js-remove-listener')
    ?.addEventListener('click', ag2.destroy);
  // // ========================================================
  // // fade test
  // // ========================================================

  const gridFade = document.querySelector<HTMLElement>('.grid-fade')!;
  const fadeCard = document.querySelector<HTMLElement>(
    '#fade-card'
  );

  const fadeOptions = {
    easing: backOut,
  };
  const agFade = new AnimateCSSGrid(gridFade, fadeOptions);

  const fadeCardItem = new AnimateCSSGridItem(agFade, fadeCard!, fadeOptions);
  agFade.registerElement(fadeCardItem);

  const gridFadeCard = document.querySelector<HTMLElement>(
    '.grid-fade .card--2'
  )!;
  let cardHidden = false;
  gridFade.addEventListener('click', () => {
    if (cardHidden) {
      gridFadeCard.style.display = '';
      fadeCardItem.unExtract();
      animate({
        from: 0,
        to: 1,
        duration: 500,
        onUpdate: (v: any) => {
          gridFadeCard.style.opacity = `${v}`;
        },
        onComplete: () => {
          /* gridFadeCard.style.display = 'none'; */
        },
      });
    } else {
      gridFadeCard.style.display = '';
      fadeCardItem.extract();
      animate({
        from: 1,
        to: 0,
        duration: 500,
        onUpdate: (v: any) => {
          gridFadeCard.style.opacity = `${v}`;
        },
        onComplete: () => {
          gridFadeCard.style.display = 'none';
        },
      });
    }
    cardHidden = !cardHidden;
  });

  // // ========================================================
  // // accordion test
  // // ========================================================

  const subjects = document.querySelector<HTMLElement>('#subjects')!;

  // animate the grid
  const agSubjects = new AnimateCSSGrid(subjects, {
    easing: linear,
    duration: 300,
    /* absoluteAnimation: true, */
    mode: 'absolute',
    modeOptions: {
      itemAnimateWidthHeight: true,
    },
  });

  // add a click handler
  subjects.addEventListener('click', (ev) => {
    [
      ...arraylikeToArray(document.querySelectorAll<HTMLElement>('#subjects .subject')),
    ].forEach((el) => el.classList.remove('subject--active'));
    let target = <HTMLElement>ev.target;
    while (target !== document.body) {
      if (target.classList.contains('subject')) {
        target.classList.toggle('subject--active');
        return;
      }
      target = target.parentElement!;
    }
  });


  const subjectsStatic = document.querySelector<HTMLElement>('#subjects-static')!;

  // animate the grid
  const agSubjectsStatic = new AnimateCSSGrid(subjectsStatic, {
    easing: linear,
    duration: 300,
    /* absoluteAnimation: true, */
    mode: 'static',
  });

  // add a click handler
  subjectsStatic.addEventListener('click', (ev) => {
    [
      ...arraylikeToArray(document.querySelectorAll<HTMLElement>('#subjects-static .subject')),
    ].forEach((el) => el.classList.remove('subject--active'));
    let target = <HTMLElement>ev.target;
    while (target !== document.body) {
      if (target.classList.contains('subject')) {
        target.classList.toggle('subject--active');
        return;
      }
      target = target.parentElement!;
    }
  });

  // ========================================================
  // children change
  // ========================================================

  const changeGrid = document.querySelector<HTMLElement>(
    '.grid-children-change'
  )!;
  const agChange = new AnimateCSSGrid(changeGrid);

  const updateContents = () => {
    [
      ...arraylikeToArray(changeGrid.querySelectorAll<HTMLElement>('.card')),
    ].forEach((el) => {
      const width = Math.random() * 300;
      const height = Math.random() * 200;
      const inner = el.querySelector<HTMLElement>('.card__inner')!;
      inner.style.width = `${width}px`;
      inner.style.height = `${height}px`;
    });
    agChange.forceGridAnimation();
  };

  /* setInterval(updateContents, 2000); */

  // ========================================================
  // nested grid
  // ========================================================

  const addCard = (container: HTMLElement) => () => {
    const randomNumber = Math.floor(Math.random() * 5) + 1;
    container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="card card--${randomNumber}">
      <div></div>
    </div>
    `
    );
  };

  const nestedGrid = document.querySelector<HTMLElement>('.nested-grid')!;
  [...Array(400).keys()].forEach(addCard(nestedGrid));

  const agNested = new AnimateCSSGrid(nestedGrid, {
    duration: 300,
    mode: 'static',
  });

  nestedGrid.addEventListener('click', (ev) => {
    let target = <HTMLElement>ev.target;
    while (target !== document.body) {
      if (target.classList.contains('card')) {
        target.classList.toggle('card--expanded');
        return;
      }
      target = target.parentElement!;
    }
  });

  // ========================================================
  // hidden cards grid
  // ========================================================

  const hiddenCardGrid =
    document.querySelector<HTMLElement>('.hidden-cards-grid')!;

  document
    .querySelector('.js-toggle-grid')
    ?.addEventListener('click', () =>
      hiddenCardGrid?.classList.toggle('grid--full')
    );

  document.querySelector('.js-hide-button')?.addEventListener('click', () => {
    [
      ...arraylikeToArray(
        hiddenCardGrid.querySelectorAll<HTMLElement>('.card')
      ),
    ].forEach((el) => el.classList.remove('card--hidden'));
  });

  document
    .querySelector('.hidden-test.js-add-card')
    ?.addEventListener('click', () => {
      const randomNumber = Math.floor(Math.random() * 5) + 1;
      hiddenCardGrid?.insertAdjacentHTML(
        'beforeend',
        `
      <div class="card card--${randomNumber}">
      <div>
        <div class="card__avatar"></div>
        <div class="card__title"></div>
        <div class="card__description"></div>
      </div>
    </div>
    `
      );
    });

  hiddenCardGrid?.addEventListener('click', (ev) => {
    let target = <HTMLElement>ev.target;
    while (target !== document.body) {
      if (target.classList.contains('card')) {
        target.classList.toggle('card--hidden');
        return;
      }
      target = target.parentElement!;
    }
  });

  new AnimateCSSGrid(hiddenCardGrid!, {
    stagger: 300,
    easing: backOut,
    duration: 4000,
  });

  // scroll test

  const scrollTest = document.querySelector<HTMLElement>('.scroll-example')!;
  scrollTest?.addEventListener('click', () => {
    const children = scrollTest.children;
    const reversed = [...arraylikeToArray(children)].reverse();
    scrollTest.innerHTML = '';
    reversed.forEach((c) => {
      scrollTest.appendChild(c);
    });
  });
  new AnimateCSSGrid(scrollTest, {
    duration: 2000,
    mode: 'static',
  });
});
