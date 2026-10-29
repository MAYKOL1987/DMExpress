const carousel = document.getElementById('brandCarousel');

if (carousel) {
    const previous = document.querySelector('[data-brand-direction="-1"]');
    const next = document.querySelector('[data-brand-direction="1"]');
    const strip = carousel.closest('.dm-brand-strip');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let updateScheduled = false;
    let autoplayTimer = null;

    const updateControls = () => {
        const maxScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
        previous.disabled = carousel.scrollLeft <= 1;
        next.disabled = maxScroll - carousel.scrollLeft <= 1;
    };

    const scheduleControlUpdate = () => {
        if (updateScheduled) return;
        updateScheduled = true;
        window.requestAnimationFrame(() => {
            updateScheduled = false;
            updateControls();
        });
    };

    const scrollCarousel = (direction) => {
        const firstBrand = carousel.querySelector('li');
        if (!firstBrand) return;

        const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap) || 0;
        const step = firstBrand.getBoundingClientRect().width + gap;
        const visibleBrands = Math.max(1, Math.floor((carousel.clientWidth + gap) / step));
        const distance = step * Math.max(1, visibleBrands - 1);

        carousel.scrollBy({
            left: direction * distance,
            behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
        });
    };

    const stopAutoplay = () => {
        if (!autoplayTimer) return;
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
    };

    const advanceAutomatically = () => {
        const firstBrand = carousel.querySelector('li');
        if (!firstBrand) return;

        const maxScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
        if (maxScroll <= 1) return;

        if (maxScroll - carousel.scrollLeft <= 2) {
            carousel.scrollTo({ left: 0, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
            return;
        }

        const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap) || 0;
        carousel.scrollBy({
            left: firstBrand.getBoundingClientRect().width + gap,
            behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
        });
    };

    const startAutoplay = () => {
        stopAutoplay();
        if (document.hidden || strip.contains(document.activeElement)) return;
        if (carousel.scrollWidth <= carousel.clientWidth + 1) return;
        autoplayTimer = window.setInterval(advanceAutomatically, 3500);
    };

    previous.addEventListener('click', () => {
        stopAutoplay();
        scrollCarousel(-1);
        window.setTimeout(startAutoplay, 450);
    });
    next.addEventListener('click', () => {
        stopAutoplay();
        scrollCarousel(1);
        window.setTimeout(startAutoplay, 450);
    });
    carousel.addEventListener('scroll', scheduleControlUpdate, { passive: true });
    window.addEventListener('resize', scheduleControlUpdate, { passive: true });
    strip.addEventListener('focusin', stopAutoplay);
    strip.addEventListener('focusout', (event) => {
        if (!strip.contains(event.relatedTarget)) startAutoplay();
    });
    strip.addEventListener('touchstart', stopAutoplay, { passive: true });
    strip.addEventListener('touchend', () => window.setTimeout(startAutoplay, 900), { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoplay();
        else startAutoplay();
    });
    prefersReducedMotion.addEventListener?.('change', startAutoplay);
    updateControls();
    startAutoplay();
}
