/**
 * IAGAMI — Módulo de animaciones FASE 1
 * Pure JS + CSS. Sin dependencias. WCAG / prefers-reduced-motion safe.
 */
'use strict';
(function () {

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── 1. SCROLL REVEAL ─────────────────────────────────────────────────────
     Agrega clase .revealed a elementos con [data-reveal] cuando entran
     en el viewport. CSS define la animación real.
  ────────────────────────────────────────────────────────────────────────── */
  function initScrollReveal() {
    if (reduced) {
      document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.dataset.revealDelay || 0;
          setTimeout(() => el.classList.add('revealed'), Number(delay));
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
  }

  /* ─── 2. CONTADORES ANIMADOS ────────────────────────────────────────────────
     Uso: <span data-counter="150" data-counter-suffix="+" data-counter-duration="1200">0</span>
     El contador arranca cuando el elemento entra en el viewport.
  ────────────────────────────────────────────────────────────────────────── */
  function animateCounter(el) {
    const target   = parseFloat(el.dataset.counter);
    const suffix   = el.dataset.counterSuffix || '';
    const duration = parseInt(el.dataset.counterDuration || '1200', 10);
    const decimals = String(target).includes('.') ? String(target).split('.')[1].length : 0;
    const start    = performance.now();

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value    = target * easeOut(progress);
      el.textContent = value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
    if (reduced) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-counter]').forEach(el => io.observe(el));
  }

  /* ─── 3. NAVBAR SHRINK + BLUR ───────────────────────────────────────────────
     Agrega .nav-scrolled al elemento con class .nav cuando scroll > 40px.
     CSS define el efecto de shrink y backdrop-filter.
  ────────────────────────────────────────────────────────────────────────── */
  function initNavShrink() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          nav.classList.toggle('nav-scrolled', window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ─── 4. PROGRESS BARS ANIMADAS ─────────────────────────────────────────────
     Las barras con .prog-fill o .modal-prog-fill arrancan en width:0
     y se animan al target cuando entran en el viewport.
  ────────────────────────────────────────────────────────────────────────── */
  function initProgressBars() {
    if (reduced) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const target = bar.dataset.progressTarget || bar.style.width || '0%';
          bar.style.width = '0%';
          requestAnimationFrame(() => {
            setTimeout(() => { bar.style.width = target; }, 80);
          });
          io.unobserve(bar);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.prog-fill, .modal-prog-fill').forEach(bar => {
      const current = bar.style.width;
      if (current && current !== '0%') {
        bar.dataset.progressTarget = current;
        bar.style.width = '0%';
        io.observe(bar);
      }
    });
  }

  /* ─── 5. SKELETON SHIMMER ────────────────────────────────────────────────────
     Uso: reemplaza contenido temporal con <div class="skel-line"></div>
     El shimmer se aplica automáticamente vía CSS.
  ────────────────────────────────────────────────────────────────────────── */
  // (Solo CSS — se activa con clase .skeleton en el contenedor padre)

  /* ─── INIT ─────────────────────────────────────────────────────────────── */
  function init() {
    initNavShrink();
    initScrollReveal();
    initCounters();
    // Progress bars se llaman desde cada página después de renderizar las barras
    window.IAGAMI_ANIM = { initProgressBars, animateCounter };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
