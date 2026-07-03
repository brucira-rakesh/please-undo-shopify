/**
 * Site-wide smooth scroll via Lenis.
 * Works with Horizon's .page-wrapper scroll container on desktop.
 */

/** @type {import('lenis').default | null} */
let lenis = null;

/** @type {HTMLElement | Window | null} */
let scroller = null;

/** @type {number | null} */
let rafId = null;

let listenersBound = false;

/**
 * @returns {HTMLElement | Window}
 */
export function getScroller() {
  const pageWrapper = document.querySelector('.page-wrapper');
  const isDesktop = window.matchMedia('(min-width: 990px)').matches;

  if (
    isDesktop &&
    pageWrapper instanceof HTMLElement &&
    getComputedStyle(document.documentElement).overflow === 'hidden'
  ) {
    return pageWrapper;
  }

  return window;
}

export function getLenis() {
  return lenis;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function destroySmoothScroll() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lenis?.destroy();
  lenis = null;
  scroller = null;
  document.documentElement.classList.remove('lenis', 'lenis-smooth');
}

async function initSmoothScroll() {
  if (prefersReducedMotion() || document.documentElement.classList.contains('shopify-design-mode')) {
    return null;
  }

  destroySmoothScroll();

  const { default: Lenis } = await import('https://esm.sh/lenis@1.1.18');
  scroller = getScroller();

  const options = {
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.2,
  };

  if (scroller !== window) {
    options.wrapper = scroller;
    options.content = scroller;
  }

  lenis = new Lenis(options);
  document.documentElement.classList.add('lenis', 'lenis-smooth');

  const raf = (time) => {
    lenis?.raf(time);
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);

  bindGlobalListeners();
  markScrollContainers();

  document.dispatchEvent(
    new CustomEvent('lenis:ready', {
      detail: { lenis, getScroller: () => scroller ?? getScroller() },
    })
  );

  return lenis;
}

function bindGlobalListeners() {
  if (listenersBound) return;
  listenersBound = true;

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !lenis) return;

    const link = event.target.closest('a[href^="#"]');
    if (!link || !(link instanceof HTMLAnchorElement)) return;

    const id = link.getAttribute('href');
    if (!id || id === '#') return;

    const target = document.querySelector(id);
    if (!target) return;

    const headerOffset = parseInt(
      getComputedStyle(document.body).getPropertyValue('--header-group-height') || '0',
      10
    );

    event.preventDefault();
    lenis.scrollTo(target, { offset: -headerOffset, duration: 1.2 });
  });

  let lastIsDesktop = window.matchMedia('(min-width: 990px)').matches;
  window.addEventListener(
    'resize',
    () => {
      const isDesktop = window.matchMedia('(min-width: 990px)').matches;
      if (isDesktop !== lastIsDesktop) {
        lastIsDesktop = isDesktop;
        initSmoothScroll();
      }
    },
    { passive: true }
  );

  if (document.documentElement.classList.contains('shopify-design-mode')) {
    document.addEventListener('shopify:section:load', () => {
      initSmoothScroll();
    });
  }
}

function markScrollContainers() {
  document
    .querySelectorAll(
      'cart-drawer-component, search-modal, .theme-drawer__dialog, .cart-drawer__items, [data-scroll-lock]'
    )
    .forEach((el) => {
      el.setAttribute('data-lenis-prevent', '');
    });
}

async function boot() {
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }
  return initSmoothScroll();
}

export const smoothScrollReady = boot();

window.PleaseUndoScroll = {
  getScroller: () => scroller ?? getScroller(),
  getLenis,
  ready: smoothScrollReady,
  reinit: initSmoothScroll,
};
