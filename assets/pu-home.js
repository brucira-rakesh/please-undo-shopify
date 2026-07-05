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

  if (!pin || !track) return;

  const isMobileScroll = () => window.matchMedia('(max-width: 749px)').matches;

  const getHorizontalOverflow = () => {
    const edgePadding = isMobileScroll() ? 32 : 80;
    return Math.max(0, track.scrollWidth - window.innerWidth + edgePadding);
  };

  const getScrollMetrics = () => {
    const overflow = getHorizontalOverflow();
    const scrollAmount = overflow > 0 ? -overflow : 0;

    if (isMobileScroll()) {
      return {
        amount: scrollAmount,
        distance: overflow,
      };
    }

    return {
      amount: scrollAmount,
      distance: Math.max(overflow, window.innerHeight * 0.35),
    };
  };

  const refreshScroll = () => {
    ScrollTrigger?.refresh();
  };

  const metrics = getScrollMetrics();

  if (isMobileScroll() && metrics.distance < 1) {
    gsap.set(track, { x: 0 });
    return;
  }

  const pinEl = pin;

  const tween = gsap.to(track, {
    x: () => getScrollMetrics().amount,
    ease: 'none',
    scrollTrigger: scrollTriggerConfig(orange, {
      start: 'top top',
      end: () => {
        const distance = getScrollMetrics().distance;
        return distance > 0 ? `+=${distance}` : '+=1';
      },
      pin: pinEl,
      pinSpacing: true,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: isMobileScroll() ? 0 : 1,
    }),
  });

  section.querySelectorAll('.pu-image-scroll__image').forEach((img) => {
    if (img.complete) return;
    img.addEventListener('load', refreshScroll, { once: true });
    img.addEventListener('error', refreshScroll, { once: true });
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(refreshScroll);
  }

  window.addEventListener('load', refreshScroll, { once: true });

  if (Math.abs(metrics.amount) < 1) {
    gsap.set(track, { x: 0 });
  }

  requestAnimationFrame(refreshScroll);

  return tween;
}

let productSliderSwingTween = null;
let productSliderScrollTrigger = null;
let productSliderSlideTween = null;

function destroyProductSliderScroll() {
  productSliderSlideTween?.kill();
  productSliderSlideTween = null;
  productSliderScrollTrigger?.kill();
  productSliderScrollTrigger = null;
  document.querySelector('[data-pu-product-slider]')?.classList.remove('is-pinned');
}

function initProductSliderSignSwing(section) {
  const swing = section.querySelector('[data-pu-hang-swing]');
  if (!swing) return;

  productSliderSwingTween?.kill();
  productSliderSwingTween = null;
  swing.classList.remove('is-css-swing');
  gsap?.set(swing, { clearProps: 'transform' });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap?.set(swing, { rotate: 3, transformOrigin: '50% 0' });
    return;
  }

  if (gsap) {
    gsap.set(swing, { rotate: -4.5, transformOrigin: '50% 0' });
    productSliderSwingTween = gsap.to(swing, {
      rotate: 4.5,
      duration: 2.6,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return;
  }

  swing.classList.add('is-css-swing');
}

function initProductSlider() {
  const section = document.querySelector('[data-pu-product-slider]');
  if (!section) return;

  initProductSliderSignSwing(section);

  if (!gsap || !ScrollTrigger) return;

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
    segments.forEach((seg, i) => seg.classList.toggle('is-active', i === index));
  };

  if (!pin || !track || slides.length === 0) return;

  section.classList.remove('is-pinned');

  slides.forEach((slide) => gsap.set(slide, { clearProps: 'transform,opacity,zIndex' }));

  setSlidePositions(0);
  setProgress(0, slides.length);

  if (slides.length <= 1) return;

  destroyProductSliderScroll();

  const total = slides.length;
  const getScrollPerSlide = () => Math.max(window.innerHeight * 0.75, 520);
  const getPinLeadIn = () => Math.max(window.innerHeight * 0.4, 320);

  const getSlideProgress = (scrollProgress) => {
    const leadIn = getPinLeadIn();
    const slideDistance = Math.max((total - 1) * getScrollPerSlide(), 1);
    const leadInRatio = leadIn / (leadIn + slideDistance);

    if (scrollProgress <= leadInRatio) return 0;
    return (scrollProgress - leadInRatio) / (1 - leadInRatio);
  };

  const setProductSliderPinned = (pinned) => {
    section.classList.toggle('is-pinned', pinned);
  };

  productSliderScrollTrigger = ScrollTrigger.create(
    scrollTriggerConfig(section, {
      id: 'pu-product-slider',
      start: 'top top',
      end: () => {
        const leadIn = getPinLeadIn();
        const slideDistance = Math.max((total - 1) * getScrollPerSlide(), 1);
        return `+=${leadIn + slideDistance}`;
      },
      pin: pin,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: () => setProductSliderPinned(true),
      onEnterBack: () => setProductSliderPinned(true),
      onLeave: () => setProductSliderPinned(false),
      onLeaveBack: () => setProductSliderPinned(false),
      onUpdate: (self) => {
        const rawIndex = getSlideProgress(self.progress) * (total - 1);
        setSlidePositions(rawIndex);
        setProgress(Math.round(rawIndex), total);
      },
    })
  );

  if (productSliderScrollTrigger?.isActive) {
    setProductSliderPinned(true);
  }
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
    items.forEach(({ setX, setY }) => {
      setX(0);
      setY(0);
    });
  };

  const onPointerMove = (event) => {
    const rect = hero.getBoundingClientRect();
    const point = event.touches?.[0] ?? event;
    const normX = ((point.clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((point.clientY - rect.top) / rect.height - 0.5) * 2;

    items.forEach(({ maxX, maxY, setX, setY }) => {
      setX(normX * maxX);
      setY(normY * maxY);
    });
  };

  hero.addEventListener('pointermove', onPointerMove);
  hero.addEventListener('pointerleave', reset);
  hero.addEventListener('touchmove', onPointerMove, { passive: true });
  hero.addEventListener('touchend', reset);
  hero.addEventListener('touchcancel', reset);

  heroParallaxCleanup = () => {
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', reset);
    hero.removeEventListener('touchmove', onPointerMove);
    hero.removeEventListener('touchend', reset);
    hero.removeEventListener('touchcancel', reset);
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
  /** @type {number[]} */
  const timeouts = [];
  let playbackToken = 0;

  const queue = [...section.querySelectorAll('[data-pu-scramble-video]')]
    .map((wrapper) => ({
      wrapper,
      video: wrapper.querySelector('video'),
      entryDelayMs: (parseFloat(wrapper.dataset.playDelay) || 0) * 1000,
    }))
    .filter((item, index, items) => item.video && items.findIndex((other) => other.video === item.video) === index);

  if (!queue.length) return () => {};

  const token = ++playbackToken;

  const clearAll = () => {
    timeouts.forEach((id) => window.clearTimeout(id));
    timeouts.length = 0;
  };

  const schedule = (fn, ms) => {
    const id = window.setTimeout(() => {
      if (token !== playbackToken) return;
      fn();
    }, ms);
    timeouts.push(id);
    return id;
  };

  const playExclusive = (index) => {
    if (token !== playbackToken) return;

    queue.forEach(({ wrapper, video }, i) => {
      if (i === index) return;
      wrapper.classList.remove('is-playing');
      video.pause();
      video.currentTime = 0;
    });

    const item = queue[index];
    item.wrapper.classList.add('is-playing');
    item.video.currentTime = 0;
    item.video.play().catch(() => {});
  };

  let currentIndex = 0;

  const advance = () => {
    if (token !== playbackToken || queue.length <= 1) return;
    currentIndex = (currentIndex + 1) % queue.length;
    playExclusive(currentIndex);
  };

  const onVideoEnded = () => {
    if (token !== playbackToken) return;
    advance();
  };

  queue.forEach(({ video }) => {
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.pause();
    video.currentTime = 0;
    video.addEventListener('ended', onVideoEnded);
  });

  const startPlayback = () => {
    if (token !== playbackToken) return;
    currentIndex = 0;
    playExclusive(0);
  };

  schedule(startPlayback, queue[0].entryDelayMs);

  return () => {
    playbackToken++;
    clearAll();
    queue.forEach(({ wrapper, video }) => {
      video.removeEventListener('ended', onVideoEnded);
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
  if (!section || section.dataset.puSvgGridInit === 'true') return;

  section.dataset.puSvgGridInit = 'true';

  const btn = section.querySelector('[data-pu-svg-toggle]');
  const keyCap = btn?.querySelector('.pu-svg-grid__key-cap');
  const cards = section.querySelectorAll('[data-pu-svg-card]');
  let swapped = false;

  const setKeyPressed = (pressed) => {
    btn?.classList.toggle('is-pressing', pressed);
  };

  const animateKeyPress = () => {
    if (!keyCap || !gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.killTweensOf(keyCap);
    gsap.fromTo(
      keyCap,
      { y: swapped ? 8 : 0, scale: swapped ? 0.99 : 1 },
      {
        y: swapped ? 11 : 10,
        scale: 0.985,
        duration: 0.07,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(keyCap, {
            y: swapped ? 8 : 0,
            scale: swapped ? 0.99 : 1,
            duration: swapped ? 0.18 : 0.38,
            ease: swapped ? 'power2.out' : 'back.out(2.4)',
            onComplete: () => {
              gsap.set(keyCap, { clearProps: 'transform' });
            },
          });
        },
      }
    );
  };

  btn?.addEventListener('pointerdown', () => setKeyPressed(true));
  btn?.addEventListener('pointerup', () => setKeyPressed(false));
  btn?.addEventListener('pointerleave', () => setKeyPressed(false));
  btn?.addEventListener('pointercancel', () => setKeyPressed(false));

  const setCardTileColor = (card, isSwapped) => {
    const tile = card.querySelector('.pu-svg-grid__tile');
    if (!tile) return;

    const defaultColor =
      card.dataset.tileColorDefault ||
      getComputedStyle(card).getPropertyValue('--tile-color-default').trim();
    const altColor =
      card.dataset.tileColorAlt ||
      getComputedStyle(card).getPropertyValue('--tile-color-alt').trim();

    tile.style.backgroundColor = isSwapped ? altColor : defaultColor;
  };

  cards.forEach((card) => setCardTileColor(card, swapped));

  btn?.addEventListener('click', () => {
    swapped = !swapped;
    btn.classList.toggle('is-active', swapped);
    btn.setAttribute('aria-pressed', swapped ? 'true' : 'false');
    section.classList.toggle('is-swapped', swapped);
    setKeyPressed(false);
    animateKeyPress();

    cards.forEach((card, i) => {
      card.classList.toggle('is-swapped', swapped);
      setCardTileColor(card, swapped);

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
  productSliderSwingTween?.kill();
  productSliderSwingTween = null;
  destroyProductSliderScroll();
  document.querySelector('[data-pu-svg-grid]')?.removeAttribute('data-pu-svg-grid-init');
  ScrollTrigger?.getAll().forEach((st) => st.kill());
  gsap = null;
  ScrollTrigger = null;
}

let puHomeResizeTimer = null;

function refreshPuHomeScroll() {
  ScrollTrigger?.refresh();
}

function bindPuHomeResizeRefresh() {
  window.addEventListener('resize', () => {
    window.clearTimeout(puHomeResizeTimer);
    puHomeResizeTimer = window.setTimeout(refreshPuHomeScroll, 200);
  });
  window.addEventListener('orientationchange', refreshPuHomeScroll);
}

async function init() {
  if (
    !document.querySelector(
      '[data-pu-hero], [data-pu-image-scroll], [data-pu-product-slider], [data-pu-scramble], [data-pu-svg-grid]'
    )
  )
    return;

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
    bindPuHomeResizeRefresh();
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

document.addEventListener('shopify:section:unload', () => {
  destroyAnimations();
});

document.addEventListener('lenis:ready', () => {
  if (ScrollTrigger) ScrollTrigger.refresh();
});
