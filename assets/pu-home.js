/**
 * Please Undo Homepage — GSAP scroll animations (uses global Lenis from smooth-scroll.js)
 */

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';

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

  const scrollAmount = getScrollAmount();
  if (scrollAmount === 0) return;

  gsap.to(track, {
    x: scrollAmount,
    ease: 'none',
    scrollTrigger: scrollTriggerConfig(orange, {
      start: 'top top',
      end: () => `+=${Math.abs(getScrollAmount()) || 1}`,
      pin: pin,
      scrub: 1,
      invalidateOnRefresh: true,
    }),
  });
}

function initScrambleText() {
  const el = document.querySelector('[data-pu-scramble-text]');
  if (!el || !gsap) return;

  const finalText = el.dataset.finalText || el.textContent || '';
  let revealed = false;

  const scramble = () => {
    if (revealed) return;
    revealed = true;
    const length = finalText.length;
    const state = Array.from({ length }, () => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]);
    let frame = 0;
    const totalFrames = 50;

    const tick = () => {
      frame++;
      const progress = frame / totalFrames;
      const resolved = Math.floor(progress * length);

      for (let i = 0; i < length; i++) {
        if (finalText[i] === ' ') {
          state[i] = ' ';
        } else if (i < resolved) {
          state[i] = finalText[i];
        } else {
          state[i] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      el.textContent = state.join('');

      if (frame < totalFrames) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = finalText;
      }
    };
    tick();
  };

  ScrollTrigger.create(
    scrollTriggerConfig(el, {
      start: 'top 75%',
      once: true,
      onEnter: scramble,
    })
  );

  const ticker = document.querySelector('[data-pu-ticker-track]');
  if (ticker && gsap) {
    const width = ticker.scrollWidth / 2;
    if (width > 0) {
      gsap.to(ticker, {
        x: -width,
        duration: 20,
        ease: 'none',
        repeat: -1,
      });
    }
  }
}

function initProductSlider() {
  const section = document.querySelector('[data-pu-product-slider]');
  if (!section || !gsap || !ScrollTrigger) return;

  const hang = section.querySelector('[data-pu-hanging-title]');
  const slides = section.querySelectorAll('[data-pu-product-slide]');
  const segments = section.querySelectorAll('[data-pu-progress-segment]');
  const titleEl = section.querySelector('[data-pu-product-title]');
  const categoryEl = section.querySelector('[data-pu-product-category]');
  const linkEl = section.querySelector('[data-pu-product-link]');

  if (hang) {
    gsap.fromTo(
      hang,
      { y: -200, rotation: -5 },
      {
        y: 0,
        rotation: 0,
        ease: 'bounce.out',
        duration: 1.2,
        scrollTrigger: scrollTriggerConfig(section, {
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        }),
      }
    );
  }

  if (slides.length <= 1) return;

  const total = slides.length;

  ScrollTrigger.create(
    scrollTriggerConfig(section, {
      start: 'top top',
      end: `+=${total * 400}`,
      pin: true,
      scrub: 0.5,
      onUpdate: (self) => {
        const index = Math.min(total - 1, Math.floor(self.progress * total));
        slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
        segments.forEach((seg, i) => seg.classList.toggle('is-active', i <= index));

        const active = slides[index];
        if (active && titleEl) titleEl.textContent = active.dataset.title || '';
        if (active && categoryEl) categoryEl.textContent = active.dataset.vendor || '';
        if (active && linkEl) linkEl.href = active.dataset.url || linkEl.href;
      },
    })
  );
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
  if (!document.querySelector('[data-pu-hero], [data-pu-image-scroll]')) return;

  try {
    await window.PleaseUndoScroll?.ready;
    await loadGsap();
    initImageScroll();
    initScrambleText();
    initProductSlider();
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
