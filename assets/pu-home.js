/**
 * Please Undo Homepage — GSAP scroll animations (uses global Lenis from smooth-scroll.js)
 */

/** @type {typeof import('gsap') | null} */
let gsap = null;

/** @type {typeof import('gsap/ScrollTrigger') | null} */
let ScrollTrigger = null;

function getScroller() {
  return window.PleaseUndoScroll?.getScroller?.() ?? window;
}

function getLenis() {
  return window.PleaseUndoScroll?.getLenis?.() ?? null;
}

function setupScrollerProxy(scroller) {
  if (!ScrollTrigger || scroller === window) return;

  ScrollTrigger.scrollerProxy(scroller, {
    scrollTop(value) {
      if (arguments.length) {
        scroller.scrollTop = value;
      }
      return scroller.scrollTop;
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    },
    pinType: scroller.style?.transform ? 'transform' : 'fixed',
  });

  ScrollTrigger.defaults({ scroller });
}

async function loadGsap() {
  if (gsap && ScrollTrigger) return { gsap, ScrollTrigger };

  const [gsapMod, stMod] = await Promise.all([
    import('https://esm.sh/gsap@3.12.5'),
    import('https://esm.sh/gsap@3.12.5/ScrollTrigger'),
  ]);

  gsap = gsapMod.default;
  ScrollTrigger = stMod.default;
  gsap.registerPlugin(ScrollTrigger);

  const scroller = getScroller();
  setupScrollerProxy(scroller);

  const lenis = getLenis();
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
  } else {
    document.addEventListener('lenis:ready', () => {
      getLenis()?.on('scroll', ScrollTrigger.update);
      ScrollTrigger.refresh();
    });
  }

  return { gsap, ScrollTrigger };
}

function scrollTriggerConfig(trigger, extra = {}) {
  const scroller = getScroller();
  const config = { trigger, ...extra };
  if (scroller !== window) config.scroller = scroller;
  return config;
}

function initImageScroll() {
  const section = document.querySelector('[data-pu-image-scroll]');
  if (!section || !gsap || !ScrollTrigger) return;

  const purple = section.querySelector('[data-pu-scroll-purple]');
  const orange = section.querySelector('[data-pu-scroll-orange]');
  const pin = section.querySelector('[data-pu-scroll-pin]');
  const track = section.querySelector('[data-pu-scroll-track]');

  if (purple) {
    gsap.fromTo(
      purple.querySelector('.pu-image-scroll__curved-text'),
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        scrollTrigger: scrollTriggerConfig(purple, {
          start: 'top 80%',
          end: 'bottom 20%',
          scrub: 1,
        }),
      }
    );
  }

  if (!pin || !track || window.matchMedia('(max-width: 749px)').matches) return;

  const getScrollAmount = () => {
    const amount = track.scrollWidth - window.innerWidth + 160;
    return amount > 0 ? -amount : 0;
  };

  const tween = gsap.to(track, {
    x: () => getScrollAmount(),
    ease: 'none',
    scrollTrigger: scrollTriggerConfig(orange, {
      start: 'top top',
      end: () => `+=${Math.max(Math.abs(getScrollAmount()), 1)}`,
      pin: pin,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    }),
  });

  if (Math.abs(getScrollAmount()) < 1) {
    tween.scrollTrigger?.kill();
    tween.kill();
    gsap.set(track, { x: 0 });
  }
}

function initProductSlider() {
  const section = document.querySelector('[data-pu-product-slider]');
  if (!section || !gsap || !ScrollTrigger) return;

  const hang = section.querySelector('[data-pu-hanging-title]');
  const pin = section.querySelector('[data-pu-product-pin]');
  const track = section.querySelector('[data-pu-product-track]');
  const slides = section.querySelectorAll('[data-pu-product-slide]');
  const segments = section.querySelectorAll('[data-pu-progress-segment]');

  const setSlidePositions = (rawIndex) => {
    const activeIndex = Math.round(rawIndex);
    slides.forEach((slide, i) => {
      const offset = i - rawIndex;
      gsap.set(slide, {
        xPercent: offset * 100,
        opacity: Math.abs(offset) <= 1 ? 1 : 0,
        zIndex: i === activeIndex ? 2 : 1,
      });
      slide.classList.toggle('is-active', i === activeIndex);
    });
  };

  if (!pin || !track || slides.length === 0) return;

  setSlidePositions(0);

  if (slides.length <= 1) return;

  const total = slides.length;
  const scrollPerProduct = 500;
  const snapStep = 1 / (total - 1);
  const hangOffset = hang ? hang.offsetHeight : 0;

  ScrollTrigger.create(
    scrollTriggerConfig(pin, {
      start: () => `top ${hangOffset}px`,
      end: () => `+=${Math.max((total - 1) * scrollPerProduct, 1)}`,
      pin: pin,
      scrub: 0.6,
      snap: {
        snapTo: snapStep,
        duration: { min: 0.25, max: 0.55 },
        ease: 'power2.inOut',
      },
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const rawIndex = self.progress * (total - 1);
        const index = Math.min(total - 1, Math.round(rawIndex));

        setSlidePositions(rawIndex);
        segments.forEach((seg, i) => seg.classList.toggle('is-active', i <= index));
      },
    })
  );
}

function initHeroParallax() {
  const hero = document.querySelector('[data-pu-hero]');
  if (!hero || !gsap || !ScrollTrigger) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 749px)').matches) return;

  const elements = hero.querySelectorAll('[data-pu-parallax]');

  elements.forEach((el) => {
    const y = parseFloat(el.dataset.parallaxY || '30');
    const x = parseFloat(el.dataset.parallaxX || '0');

    gsap.fromTo(
      el,
      { y: 0, x: 0 },
      {
        y,
        x,
        ease: 'none',
        scrollTrigger: scrollTriggerConfig(hero, {
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        }),
      }
    );
  });
}

function animateScrambleReveal(el) {
  gsap.from(el, {
    skewX: -30,
    x: 100,
    opacity: 0,
    duration: 0.55,
    ease: 'power3.out',
    scrollTrigger: scrollTriggerConfig(el, {
      start: 'top 88%',
      toggleActions: 'play none none reverse',
    }),
  });
}

function splitTextIntoWords(el) {
  if (el.dataset.puSplit) return [...el.querySelectorAll('.pu-scramble__word')];

  const text = el.textContent.trim();
  if (!text) return [];

  el.textContent = '';
  el.dataset.puSplit = 'true';

  const words = text.split(/\s+/);
  const spans = [];

  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'pu-scramble__word';
    span.textContent = word;
    el.appendChild(span);
    spans.push(span);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });

  return spans;
}

function initScrambleVideoPlayback(section) {
  const VIDEO2_OFFSET_MS = 3000;

  const queue = [...section.querySelectorAll('[data-pu-scramble-video]')]
    .map((wrapper) => ({
      wrapper,
      video: wrapper.querySelector('video'),
      entryDelayMs: (parseFloat(wrapper.dataset.playDelay) || 0) * 1000,
    }))
    .filter((item) => item.video);

  if (!queue.length) return;

  const ensurePlaying = (item) => {
    item.wrapper.classList.add('is-playing');
    if (item.video.paused) {
      item.video.play().catch(() => {});
    }
  };

  queue.forEach((item) => {
    item.video.loop = true;
    item.video.muted = true;
    item.video.playsInline = true;
    item.video.preload = 'auto';
  });

  const v1 = queue[0];
  const startV1 = () => ensurePlaying(v1);

  if (v1.entryDelayMs > 0) {
    window.setTimeout(startV1, v1.entryDelayMs);
  } else {
    startV1();
  }

  queue.slice(1).forEach((item, offsetIndex) => {
    const startMs = v1.entryDelayMs + VIDEO2_OFFSET_MS * (offsetIndex + 1);
    window.setTimeout(() => ensurePlaying(item), startMs);
  });
}

function initScrambleText() {
  const section = document.querySelector('[data-pu-scramble]');
  if (!section || !gsap || !ScrollTrigger) return;

  const textEl = section.querySelector('[data-pu-scramble-text]');
  if (!textEl) return;

  initScrambleVideoPlayback(section);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const segments = textEl.querySelectorAll('[data-pu-scramble-segment]');
  const targets = segments.length ? segments : [textEl];

  targets.forEach((segment) => {
    splitTextIntoWords(segment).forEach((word) => animateScrambleReveal(word));
  });

  section.querySelectorAll('[data-pu-scramble-video]').forEach((video) => {
    animateScrambleReveal(video);
  });
}

function initSvgGrid() {
  const section = document.querySelector('[data-pu-svg-grid]');
  if (!section) return;

  const btn = section.querySelector('[data-pu-svg-toggle]');
  const cards = section.querySelectorAll('[data-pu-svg-card]');
  let swapped = false;

  btn?.addEventListener('click', () => {
    swapped = !swapped;
    btn.classList.toggle('is-active', swapped);

    cards.forEach((card, i) => {
      card.classList.toggle('is-swapped', swapped);

      const defaultImg = card.querySelector('[data-pu-svg-default]');
      const altImg = card.querySelector('[data-pu-svg-alt]');
      if (defaultImg && altImg) {
        defaultImg.hidden = swapped;
        altImg.hidden = !swapped;
      }

      if (gsap) {
        gsap.fromTo(
          card,
          { scale: 0.96 },
          { scale: 1, duration: 0.45, delay: i * 0.06, ease: 'back.out(1.6)' }
        );
      }
    });
  });
}

function initSearchOpen() {
  document.querySelector('[data-pu-search-open]')?.addEventListener('click', () => {
    const trigger = document.querySelector('[data-search-button], .header-actions__search, button[aria-label*="Search" i]');
    trigger?.click();
  });
}

function destroyAnimations() {
  ScrollTrigger?.getAll().forEach((st) => st.kill());
  gsap = null;
  ScrollTrigger = null;
}

async function init() {
  if (!document.querySelector('[data-pu-hero], [data-pu-image-scroll], [data-pu-product-slider], [data-pu-scramble]')) return;

  try {
    await window.PleaseUndoScroll?.ready;
    await loadGsap();
    initImageScroll();
    initHeroParallax();
    initProductSlider();
    initScrambleText();
    initSvgGrid();
    initSearchOpen();
    ScrollTrigger?.refresh();
  } catch (err) {
    console.warn('PU Home animations failed to load:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

document.addEventListener('shopify:section:load', () => {
  destroyAnimations();
  init();
});

document.addEventListener('lenis:ready', () => {
  if (ScrollTrigger) ScrollTrigger.refresh();
});
