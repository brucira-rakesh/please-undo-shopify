/**
 * Please Undo — Product Detail Page
 */

function formatMoney(cents, format) {
  if (typeof cents === 'string') cents = cents.replace('.', '');
  const value = Number(cents) / 100;
  if (format) {
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      if (key === 'amount') return value.toFixed(2);
      if (key === 'amount_no_decimals') return String(Math.round(value));
      return value.toFixed(2);
    });
  }
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
}

function initProductPage() {
  const main = document.querySelector('[data-pu-product-main]');
  if (!main) return;

  const productData = main.querySelector('[data-pu-product-json]');
  if (!productData) return;

  let product;
  try {
    product = JSON.parse(productData.textContent);
  } catch {
    return;
  }

  const variantInput = main.querySelector('[name="id"]');
  const priceEl = main.querySelector('[data-pu-product-price]');
  const compareEl = main.querySelector('[data-pu-product-compare]');
  const stickyPriceEl = document.querySelector('[data-pu-sticky-price]');
  const mainImage = main.querySelector('[data-pu-product-main-image]');
  const variantButtons = main.querySelectorAll('[data-pu-variant-id]');
  const galleryItems = main.querySelectorAll('[data-pu-media-id]');
  const featuresBtn = main.querySelector('[data-pu-scroll-features]');
  const stickyBar = document.querySelector('[data-pu-pdp-sticky]');
  const stickyAddBtn = document.querySelector('[data-pu-sticky-add]');
  const heroBuyBtn = main.querySelector('[ref="addToCartButton"], [name="add"]');
  const progressSegs = document.querySelectorAll('[data-pu-pdp-progress-seg]');
  const moneyFormat = main.dataset.moneyFormat;

  const formatPrice = (cents) => {
    if (window.Shopify?.formatMoney && moneyFormat) {
      return Shopify.formatMoney(cents, moneyFormat);
    }
    return formatMoney(cents, moneyFormat);
  };

  const updateVariant = (variantId) => {
    const variant = product.variants.find((v) => String(v.id) === String(variantId));
    if (!variant) return;

    if (variantInput) variantInput.value = variant.id;

    variantButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.puVariantId === String(variant.id));
    });

    const priceText = formatPrice(variant.price);
    if (priceEl) priceEl.textContent = priceText;
    if (stickyPriceEl) stickyPriceEl.textContent = priceText;

    if (compareEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareEl.hidden = false;
        compareEl.textContent = formatPrice(variant.compare_at_price);
      } else {
        compareEl.hidden = true;
      }
    }

    if (variant.featured_image && mainImage) {
      mainImage.src = variant.featured_image.src;
      mainImage.alt = variant.featured_image.alt || product.title;
    }

    if (heroBuyBtn) {
      heroBuyBtn.disabled = !variant.available;
      heroBuyBtn.textContent = variant.available
        ? heroBuyBtn.dataset.labelAvailable || 'SHOP NOW'
        : 'SOLD OUT';
    }

    if (stickyAddBtn) {
      stickyAddBtn.disabled = !variant.available;
      stickyAddBtn.textContent = variant.available
        ? heroBuyBtn?.dataset.labelAvailable || 'SHOP NOW'
        : 'SOLD OUT';
    }
  };

  variantButtons.forEach((btn) => {
    btn.addEventListener('click', () => updateVariant(btn.dataset.puVariantId));
  });

  galleryItems.forEach((item) => {
    item.addEventListener('click', () => {
      const mediaId = item.dataset.puMediaId;
      if (mediaId === 'fallback' || !mainImage) return;

      const media = product.media.find((m) => String(m.id) === String(mediaId));
      if (!media) return;

      mainImage.src = media.preview_image?.src || media.src;
      mainImage.alt = media.alt || product.title;
      galleryItems.forEach((el) => {
        const isActive = el === item;
        el.classList.toggle('is-active', isActive);
        el.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    });
  });

  if (featuresBtn) {
    featuresBtn.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelector('#pu-pdp-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (stickyAddBtn && heroBuyBtn) {
    stickyAddBtn.addEventListener('click', () => heroBuyBtn.click());
  }

  const initialVariant =
    product.variants.find((v) => v.id === Number(variantInput?.value)) || product.variants[0];
  if (initialVariant) updateVariant(initialVariant.id);

  /* Sticky buy bar */
  if (stickyBar && heroBuyBtn) {
    stickyBar.hidden = false;
    const heroCta = main.querySelector('.pu-pdp-hero__cta');

    const toggleSticky = () => {
      if (!heroCta) return;
      const rect = heroCta.getBoundingClientRect();
      const show = rect.bottom < 0;
      stickyBar.classList.toggle('is-visible', show);
    };

    window.addEventListener('scroll', toggleSticky, { passive: true });
    toggleSticky();
  }

  /* Section progress scroll spy */
  const sectionIds = ['pu-pdp-story', 'pu-pdp-use', 'pu-pdp-details', 'pu-pdp-recs'];

  const updateProgress = () => {
    let activeIndex = 0;
    const scrollY = window.scrollY + window.innerHeight * 0.35;

    sectionIds.forEach((id, index) => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= scrollY) activeIndex = index;
    });

    progressSegs.forEach((seg) => {
      const idx = Number(seg.dataset.sectionIndex);
      seg.classList.toggle('is-active', idx === activeIndex);
    });
  };

  if (progressSegs.length) {
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }
}

function closeAccordionItem(details, reducedMotion, onDone) {
  const panel = details.querySelector('.pu-pdp-details__panel');
  if (!details.classList.contains('is-open')) {
    onDone?.();
    return;
  }

  details.classList.remove('is-open');

  if (reducedMotion || !panel) {
    details.removeAttribute('open');
    onDone?.();
    return;
  }

  const onClose = (ev) => {
    if (ev.target !== panel || ev.propertyName !== 'grid-template-rows') return;
    panel.removeEventListener('transitionend', onClose);
    details.removeAttribute('open');
    onDone?.();
  };

  panel.addEventListener('transitionend', onClose);
}

function openAccordionItem(details, reducedMotion) {
  details.setAttribute('open', '');
  if (reducedMotion) {
    details.classList.add('is-open');
    return;
  }
  requestAnimationFrame(() => details.classList.add('is-open'));
}

function initPdpAccordion() {
  const items = document.querySelectorAll('[data-pu-accordion]');
  if (!items.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  items.forEach((details) => {
    const summary = details.querySelector('.pu-pdp-details__summary');
    if (!summary) return;

    if (details.open) {
      details.classList.add('is-open');
    }

    summary.addEventListener('click', (event) => {
      event.preventDefault();

      if (details.classList.contains('is-open')) {
        closeAccordionItem(details, reducedMotion);
        return;
      }

      items.forEach((other) => {
        if (other !== details) {
          closeAccordionItem(other, reducedMotion);
        }
      });

      openAccordionItem(details, reducedMotion);
    });
  });
}

function initShowcaseCards() {
  document.querySelectorAll('[data-pu-showcase-card]').forEach((card) => {
    const select = card.querySelector('[data-pu-showcase-select]');
    const variantInput = card.querySelector('[data-pu-showcase-variant-input]');
    const priceEl = card.querySelector('[data-pu-showcase-price]');
    const addBtn = card.querySelector('[ref="addToCartButton"], .pu-showcase-card__buy-btn');

    if (!select || !variantInput) return;

    select.addEventListener('change', () => {
      const option = select.options[select.selectedIndex];
      variantInput.value = select.value;
      if (priceEl && option.dataset.price) {
        priceEl.textContent = option.dataset.price;
      }
      if (addBtn) {
        addBtn.disabled = option.disabled;
        addBtn.textContent = option.disabled ? 'Sold out' : 'Add to cart';
      }
    });
  });
}

function bootProductPage() {
  initProductPage();
  initPdpAccordion();
  initShowcaseCards();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootProductPage);
} else {
  bootProductPage();
}
