import { wrapGrid } from '../src/index';
import { tween } from 'popmotion';

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

  const gridIgnoreElement =
    document.querySelector<HTMLElement>('.grid .card--2')!;
  console.log(gridIgnoreElement);
  const { unwrapGrid: uwg } = wrapGrid(grid, {
    easing: 'backOut',
    onStart: (els) =>
      els.forEach((el) => {
        console.log('foo');
        el.classList.add('big');
      }),
    onEnd: (els) => els.forEach((el) => el.classList.add('small')),
  });

  uwg();
  console.log('unwrapped');

  const { unwrapGrid } = wrapGrid(grid, {
    easing: 'backOut',
    onStart: (els) =>
      els.forEach((el) => {
        /* console.log('onstart'); */
        el.classList.add('big');
      }),
    onEnd: (els) => {
      els.forEach((el) => el.classList.add('small'));
      /* console.log('onend'); */
    },
    elementsIgnored: [gridIgnoreElement],
  });

  document
    .querySelector('.js-remove-listener')
    ?.addEventListener('click', unwrapGrid);
  // // ========================================================
  // // fade test
  // // ========================================================

  const gridFade = document.querySelector<HTMLElement>('.grid-fade')!;

  const { extractChild, unExtractChild } = wrapGrid(gridFade, {});

  const gridFadeCard = document.querySelector<HTMLElement>(
    '.grid-fade .card--2'
  )!;
  let expanded = true;
  gridFade.addEventListener('click', (ev) => {
    if (expanded) {
      gridFadeCard.style.display = 'block';
      extractChild(gridFadeCard);
      tween({
        from: 1,
        to: 0,
        duration: 500,
      }).start({
        update: (v: any) => {
          gridFadeCard.style.opacity = `${v}`;
        },
        complete: () => {
          gridFadeCard.style.display = 'none';
        },
      });
    } else {
      gridFadeCard.style.display = 'block';
      unExtractChild(gridFadeCard);
      tween({
        from: 0,
        to: 1,
        duration: 500,
      }).start({
        update: (v: any) => {
          gridFadeCard.style.opacity = `${v}`;
        },
        complete: () => {
          gridFadeCard.style.display = 'block';
        },
      });
    }
    expanded = !expanded;
  });

  // // ========================================================
  // // accordion test
  // // ========================================================

  const subjects = document.querySelector<HTMLElement>('.subjects')!;

  // animate the grid
  const { unwrapGrid: unwrapGridSubjects } = wrapGrid(subjects, {
    easing: 'linear',
  });

  // add a click handler
  subjects.addEventListener('click', (ev) => {
    [...document.querySelectorAll('.subject')].forEach((el) =>
      el.classList.remove('subject--active')
    );
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

  const changeGrid = document.querySelector('.grid-children-change');
  const { unwrapChangeGrid, forceGridAnimation } = wrapGrid(changeGrid);

  const updateContents = () => {
    [...changeGrid.querySelectorAll('.card')].forEach((el) => {
      const width = Math.random() * 300;
      const height = Math.random() * 200;
      const inner = el.querySelector('.card__inner');
      inner.style.width = `${width}px`;
      inner.style.height = `${height}px`;
    });
    forceGridAnimation();
  };

  setInterval(updateContents, 2000);

  // ========================================================
  // nested grid
  // ========================================================

  const addCard = (container) => (i) => {
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

  wrapGrid(nestedGrid, { duration: 300 });

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
    document.querySelector<HTMLElement>('.hidden-cards-grid');

  document
    .querySelector('.js-toggle-grid')
    ?.addEventListener('click', () =>
      hiddenCardGrid?.classList.toggle('grid--full')
    );

  document.querySelector('.js-hide-button')?.addEventListener('click', () => {
    [...(hiddenCardGrid?.querySelectorAll('.card') ?? [])].forEach((el) =>
      el.classList.remove('card--hidden')
    );
  });

  document.querySelector('.js-add-card')?.addEventListener('click', () => {
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

  wrapGrid(hiddenCardGrid!, {
    stagger: 20,
    easing: 'backOut',
    duration: 10000,
  });

  // scroll test

  const scrollTest = document.querySelector<HTMLElement>('.scroll-example');
  scrollTest?.addEventListener('click', () => {
    const children = scrollTest.children;
    const reversed = [...children].reverse();
    scrollTest.innerHTML = '';
    reversed.forEach((c) => {
      scrollTest.appendChild(c);
    });
  });
  wrapGrid(scrollTest!, {
    duration: 2000,
  });
});
