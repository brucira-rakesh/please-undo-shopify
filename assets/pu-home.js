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

  const getScrollDistance = () => {
    const overflow = track.scrollWidth - window.innerWidth + 80;
    return Math.max(overflow, window.innerHeight * 0.35);
  };

  const getScrollAmount = () => {
    const overflow = track.scrollWidth - window.innerWidth + 80;
    return overflow > 0 ? -overflow : 0;
  };

  const tween = gsap.to(track, {
    x: () => getScrollAmount(),
    ease: 'none',
    scrollTrigger: scrollTriggerConfig(orange, {
      start: 'top top',
      end: () => `+=${getScrollDistance()}`,
      pin: pin,
      pinSpacing: true,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    }),
  });

  const refreshScroll = () => {
    ScrollTrigger.refresh();
  };

  section.querySelectorAll('.pu-image-scroll__image').forEach((img) => {
    if (img.complete) return;
    img.addEventListener('load', refreshScroll, { once: true });
    img.addEventListener('error', refreshScroll, { once: true });
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(refreshScroll);
  }

  window.addEventListener('load', refreshScroll, { once: true });

  if (Math.abs(getScrollAmount()) < 1) {
    gsap.set(track, { x: 0 });
  }

  return tween;
}

function initProductSlider() {
  const section = document.querySelector('[data-pu-product-slider]');
  if (!section || !gsap || !ScrollTrigger) return;

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

  const setProgress = (index, total) => {
    if (!segments.length || total <= 1) return;
    const segIndex = Math.round((index / (total - 1)) * (segments.length - 1));
    segments.forEach((seg, i) => seg.classList.toggle('is-active', i === segIndex));
  };

  if (!pin || !track || slides.length === 0) return;

  setSlidePositions(0);
  setProgress(0, slides.length);

  if (slides.length <= 1) return;

  const total = slides.length;
  const scrollPerProduct = 600;

  ScrollTrigger.create(
    scrollTriggerConfig(section, {
      start: 'top top',
      end: () => `+=${Math.max((total - 1) * scrollPerProduct, 1)}`,
      pin: pin,
      pinSpacing: true,
      scrub: 0.65,
      snap: {
        snapTo: 1 / (total - 1),
        duration: { min: 0.2, max: 0.5 },
        ease: 'power2.inOut',
      },
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const rawIndex = self.progress * (total - 1);
        const index = Math.min(total - 1, Math.round(rawIndex));
        setSlidePositions(rawIndex);
        setProgress(index, total);
      },
    })
  );
}

let heroParallaxCleanup = null;
let scrambleVideoCleanup = null;
let scrambleTickerCleanup = null;

function initScrambleTicker() {
  const root = document.querySelector('[data-pu-product-ticker]');
  if (!root) return () => {};

  const marquee = root.querySelector('.pu-scramble__ticker-marquee');
  const track = root.querySelector('[data-pu-ticker-track]');
  const group = track?.querySelector('[data-pu-ticker-group]');
  if (!marquee || !track || !group) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const sourceNodes = [...group.children].map((node) => node.cloneNode(true));
  if (!sourceNodes.length) return () => {};

  let resizeTimer = 0;

  const appendBatch = (target) => {
    sourceNodes.forEach((node) => {
      target.appendChild(node.cloneNode(true));
    });
  };

  const build = () => {
    track.classList.remove('is-ready');
    track.style.animation = 'none';
    track.style.transform = 'translateX(0)';
    track.querySelectorAll('[data-pu-ticker-group-clone]').forEach((el) => el.remove());

    group.innerHTML = '';
    appendBatch(group);

    const minWidth = marquee.offsetWidth + 2;
    while (group.scrollWidth < minWidth) {
      appendBatch(group);
    }

    const clone = group.cloneNode(true);
    clone.removeAttribute('data-pu-ticker-group');
    clone.dataset.puTickerGroupClone = '';
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);

    const groupWidth = group.getBoundingClientRect().width;
    const duration = Math.max(18, Math.min(40, groupWidth / 28));
    track.style.setProperty('--pu-scramble-ticker-duration', `${duration}s`);
    track.style.animation = '';
    track.classList.add('is-ready');
  };

  build();

  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 150);
  };

  window.addEventListener('resize', onResize);

  group.querySelectorAll('img').forEach((img) => {
    if (img.complete) return;
    img.addEventListener('load', build, { once: true });
    img.addEventListener('error', build, { once: true });
  });

  return () => {
    window.clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    track.classList.remove('is-ready');
    track.style.transform = '';
    track.style.animation = '';
    track.style.removeProperty('--pu-scramble-ticker-duration');
    track.querySelectorAll('[data-pu-ticker-group-clone]').forEach((el) => el.remove());
  };
}

function initHeroParallax() {
  heroParallaxCleanup?.();
  heroParallaxCleanup = null;

  const hero = document.querySelector('[data-pu-hero]');
  if (!hero || !gsap) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 749px)').matches) return;

  const elements = hero.querySelectorAll('[data-pu-parallax]');
  if (!elements.length) return;

  const items = [...elements].map((el) => ({
    el,
    maxY: parseFloat(el.dataset.parallaxY || '30'),
    maxX: parseFloat(el.dataset.parallaxX || '0'),
    setX: gsap.quickTo(el, 'x', { duration: 0.85, ease: 'power3.out' }),
    setY: gsap.quickTo(el, 'y', { duration: 0.85, ease: 'power3.out' }),
  }));

  const reset = () => {
    items.forEach(({ el, setX, setY }) => {
      setX(0);
      setY(0);
    });
  };

  const onMove = (event) => {
    const rect = hero.getBoundingClientRect();
    const normX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    items.forEach(({ maxX, maxY, setX, setY }) => {
      setX(normX * maxX);
      setY(normY * maxY);
    });
  };

  hero.addEventListener('mousemove', onMove);
  hero.addEventListener('mouseleave', reset);

  heroParallaxCleanup = () => {
    hero.removeEventListener('mousemove', onMove);
    hero.removeEventListener('mouseleave', reset);
    items.forEach(({ el }) => gsap.set(el, { x: 0, y: 0 }));
  };
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
  const VIDEO_HANDOFF_MS = 3000;
  /** @type {number[]} */
  const timeouts = [];

  const queue = [...section.querySelectorAll('[data-pu-scramble-video]')]
    .map((wrapper) => ({
      wrapper,
      video: wrapper.querySelector('video'),
      entryDelayMs: (parseFloat(wrapper.dataset.playDelay) || 0) * 1000,
    }))
    .filter((item) => item.video);

  if (!queue.length) return () => {};

  const schedule = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timeouts.push(id);
    return id;
  };

  const playExclusive = (item) => {
    queue.forEach(({ wrapper, video }) => {
      if (video === item.video) return;
      wrapper.classList.remove('is-playing');
      video.pause();
      video.currentTime = 0;
    });

    item.wrapper.classList.add('is-playing');
    item.video.currentTime = 0;
    item.video.play().catch(() => {});
  };

  queue.forEach((item) => {
    item.video.loop = true;
    item.video.muted = true;
    item.video.playsInline = true;
    item.video.preload = 'auto';
    item.video.pause();
    item.video.currentTime = 0;
  });

  let currentIndex = 0;

  const handoff = () => {
    currentIndex = (currentIndex + 1) % queue.length;
    playExclusive(queue[currentIndex]);
    if (queue.length > 1) {
      schedule(handoff, VIDEO_HANDOFF_MS);
    }
  };

  const startPlayback = () => {
    currentIndex = 0;
    playExclusive(queue[0]);
    if (queue.length > 1) {
      schedule(handoff, VIDEO_HANDOFF_MS);
    }
  };

  schedule(startPlayback, queue[0].entryDelayMs);

  return () => {
    timeouts.forEach((id) => window.clearTimeout(id));
    queue.forEach(({ wrapper, video }) => {
      wrapper.classList.remove('is-playing');
      video.pause();
      video.currentTime = 0;
    });
  };
}

function initScrambleText() {
  const section = document.querySelector('[data-pu-scramble]');
  if (!section || !gsap || !ScrollTrigger) return;

  const textEl = section.querySelector('[data-pu-scramble-text]');
  if (!textEl) return;

  scrambleVideoCleanup?.();
  scrambleVideoCleanup = initScrambleVideoPlayback(section);

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
  heroParallaxCleanup?.();
  heroParallaxCleanup = null;
  scrambleVideoCleanup?.();
  scrambleVideoCleanup = null;
  scrambleTickerCleanup?.();
  scrambleTickerCleanup = null;
  ScrollTrigger?.getAll().forEach((st) => st.kill());
  gsap = null;
  ScrollTrigger = null;
}

async function init() {
  if (!document.querySelector('[data-pu-hero], [data-pu-image-scroll], [data-pu-product-slider], [data-pu-scramble]')) return;

  scrambleTickerCleanup?.();
  scrambleTickerCleanup = initScrambleTicker();

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
