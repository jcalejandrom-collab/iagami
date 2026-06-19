/**
 * IAGAMI — Módulo de animaciones FASE 1 + FASE 2
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

  /* ─── FASE 2 ──────────────────────────────────────────────────────────────── */

  /* ─── 5. STAGGER CARDS ───────────────────────────────────────────────────────
     Cuando un grid entra en el viewport, sus hijos aparecen uno a uno
     con un pequeño retraso entre cada uno (efecto cascada).
     Uso: agrega data-stagger al contenedor grid.
     CSS necesario en cada página:
       [data-stagger] > * { opacity:0; transform:translateY(20px);
                            transition:opacity .4s ease, transform .4s ease; }
       [data-stagger] > *.stagger-in { opacity:1; transform:none; }
  ────────────────────────────────────────────────────────────────────────── */
  function initStaggerCards() {
    if (reduced) {
      document.querySelectorAll('[data-stagger]').forEach(grid => {
        grid.querySelectorAll(':scope > *').forEach(el => el.classList.add('stagger-in'));
      });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const grid  = entry.target;
        const items = Array.from(grid.querySelectorAll(':scope > *'));
        const base  = parseInt(grid.dataset.staggerDelay || '60', 10);
        items.forEach((item, i) => {
          setTimeout(() => item.classList.add('stagger-in'), i * base);
        });
        io.unobserve(grid);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('[data-stagger]').forEach(grid => io.observe(grid));
  }

  /* ─── 6. FILTER FADE ─────────────────────────────────────────────────────────
     Fade-out + fade-in cuando se cambia el contenido de un contenedor filtrable.
     Uso JS: IAGAMI_ANIM.filterFade(containerEl, renderFn)
       containerEl : el div que contiene las cards
       renderFn    : función que actualiza el innerHTML
  ────────────────────────────────────────────────────────────────────────── */
  function filterFade(container, renderFn) {
    if (reduced || !container) { renderFn(); return; }
    container.style.transition = 'opacity .22s ease';
    container.style.opacity    = '0';
    setTimeout(() => {
      renderFn();
      requestAnimationFrame(() => {
        container.style.opacity = '1';
        staggerChildren(container);
      });
    }, 220);
  }

  function staggerChildren(container) {
    if (reduced) return;
    const base  = 55;
    const items = Array.from(container.querySelectorAll(':scope > *'));
    items.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(16px)'; });
    items.forEach((el, i) => {
      setTimeout(() => {
        el.style.transition = 'opacity .35s ease, transform .35s ease';
        el.style.opacity    = '1';
        el.style.transform  = 'none';
      }, i * base);
    });
  }

  /* ─── 7. TAB UNDERLINE SLIDE ─────────────────────────────────────────────────
     Desliza un indicador visual bajo el tab activo.
     Uso: agrega data-tab-group al contenedor de tabs.
     El módulo inyecta un div.tab-indicator y lo mueve con CSS transform.
  ────────────────────────────────────────────────────────────────────────── */
  function initTabSlider() {
    document.querySelectorAll('[data-tab-group]').forEach(group => {
      const indicator = document.createElement('div');
      indicator.className = 'tab-indicator';
      indicator.style.cssText = `
        position:absolute;bottom:0;left:0;height:3px;
        background:var(--primary,#1d6b3e);border-radius:2px 2px 0 0;
        transition:transform .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1);
        pointer-events:none;`;
      group.style.position = 'relative';
      group.appendChild(indicator);

      function moveIndicator(activeBtn) {
        if (!activeBtn) return;
        const gRect = group.getBoundingClientRect();
        const bRect = activeBtn.getBoundingClientRect();
        indicator.style.width     = bRect.width + 'px';
        indicator.style.transform = `translateX(${bRect.left - gRect.left}px)`;
      }

      const active = group.querySelector('.active, [aria-selected="true"]');
      if (active) moveIndicator(active);

      group.addEventListener('click', e => {
        const btn = e.target.closest('button, [role="tab"]');
        if (!btn || !group.contains(btn)) return;
        requestAnimationFrame(() => moveIndicator(btn));
      });
    });
  }

  /* ─── 8. SMOOTH NUMBER UPDATE ───────────────────────────────────────────────
     Para actualizar un número en pantalla con animación (badges de conteo).
     Uso JS: IAGAMI_ANIM.animateNumber(el, newValue)
  ────────────────────────────────────────────────────────────────────────── */
  function animateNumber(el, newVal) {
    if (reduced || !el) { el.textContent = newVal; return; }
    const from = parseFloat(el.textContent) || 0;
    const to   = parseFloat(newVal) || 0;
    if (from === to) return;
    const dur   = 400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * ease);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ─── INIT ─────────────────────────────────────────────────────────────── */
  function init() {
    initNavShrink();
    initScrollReveal();
    initCounters();
    initStaggerCards();
    initTabSlider();
    window.IAGAMI_ANIM = {
      initProgressBars,
      animateCounter,
      filterFade,
      staggerChildren,
      animateNumber
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
