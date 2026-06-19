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

  /* ─── FASE 3 ──────────────────────────────────────────────────────────────── */

  /* ─── 9. PAGE TRANSITION ────────────────────────────────────────────────────
     Fade suave al cambiar de página dentro del SPA (showPage).
     Uso JS: IAGAMI_ANIM.pageFade(inEl, outEl)
       outEl : elemento .page que sale (opcional, si null solo fade in)
       inEl  : elemento .page que entra
  ────────────────────────────────────────────────────────────────────────── */
  function pageFade(inEl, outEl) {
    if (reduced || !inEl) { return; }
    inEl.style.animation = 'pageIn .32s cubic-bezier(.4,0,.2,1) forwards';
  }

  /* ─── 10. RIPPLE EN BOTONES ─────────────────────────────────────────────────
     Efecto de onda al hacer clic. Se aplica a cualquier elemento con
     la clase .btn-p, .btn-s, .cta-btn, o atributo data-ripple.
  ────────────────────────────────────────────────────────────────────────── */
  function initRipple() {
    if (reduced) return;
    function createRipple(e) {
      const btn  = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x    = e.clientX - rect.left - size / 2;
      const y    = e.clientY - rect.top  - size / 2;
      const r    = document.createElement('span');
      r.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;
        width:${size}px;height:${size}px;left:${x}px;top:${y}px;
        background:rgba(255,255,255,.28);transform:scale(0);
        animation:rippleAnim .55s ease-out forwards;`;
      const prev = btn.style.position;
      if (!prev || prev === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }
    document.querySelectorAll('.btn-p,.btn-s,.cta-btn,[data-ripple]').forEach(btn => {
      btn.addEventListener('click', createRipple);
    });
  }

  /* ─── 11. TYPEWRITER ────────────────────────────────────────────────────────
     Escribe el texto carácter a carácter.
     Uso: <span data-typewriter data-tw-speed="55">Texto aquí</span>
     El texto original del elemento es el que se escribe.
  ────────────────────────────────────────────────────────────────────────── */
  function initTypewriter() {
    if (reduced) return;
    document.querySelectorAll('[data-typewriter]').forEach(el => {
      const text  = el.textContent.trim();
      const speed = parseInt(el.dataset.twSpeed || '55', 10);
      el.textContent = '';
      el.style.borderRight = '2px solid currentColor';
      el.style.paddingRight = '2px';

      const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        let i = 0;
        const delay = parseInt(el.dataset.twDelay || '0', 10);
        setTimeout(() => {
          const t = setInterval(() => {
            el.textContent = text.slice(0, ++i);
            if (i >= text.length) {
              clearInterval(t);
              setTimeout(() => { el.style.borderRight = 'none'; el.style.paddingRight = '0'; }, 800);
            }
          }, speed);
        }, delay);
      }, { threshold: 0.8 });
      io.observe(el);
    });
  }

  /* ─── 12. HERO PARALLAX ─────────────────────────────────────────────────────
     El contenido izquierdo del hero sube levemente al hacer scroll,
     dando sensación de profundidad respecto a la imagen de fondo.
  ────────────────────────────────────────────────────────────────────────── */
  function initHeroParallax() {
    if (reduced) return;
    const heroLeft = document.querySelector('.hero-left');
    if (!heroLeft) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y < 600) heroLeft.style.transform = `translateY(${y * 0.12}px)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ─── FASE 4 ──────────────────────────────────────────────────────────────── */

  /* ─── 13. MODAL ANIMADO ──────────────────────────────────────────────────────
     openModalAnim / closeModalAnim reemplazan openModal/closeModal.
     La clase .closing dispara el keyframe de salida antes de ocultar.
  ────────────────────────────────────────────────────────────────────────── */
  function openModalAnim(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('closing');
    m.classList.add('open');
  }

  function closeModalAnim(id) {
    const m = document.getElementById(id);
    if (!m) return;
    if (reduced) { m.classList.remove('open'); return; }
    m.classList.add('closing');
    setTimeout(() => { m.classList.remove('open', 'closing'); }, 200);
  }

  /* ─── 14. CARD 3D TILT ───────────────────────────────────────────────────────
     Inclinación 3D suave al mover el mouse sobre las cards.
     Máximo 8° de rotación.
  ────────────────────────────────────────────────────────────────────────── */
  function initCardTilt() {
    if (reduced) return;
    const MAX = 8;

    function onMove(e) {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2);
      const dy   = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `perspective(600px) rotateY(${dx * MAX}deg) rotateX(${-dy * MAX}deg) translateY(-4px)`;
    }

    function onLeave(e) {
      const card = e.currentTarget;
      card.style.transition = 'transform .4s ease';
      card.style.transform  = '';
      setTimeout(() => { card.style.transition = ''; }, 400);
    }

    document.querySelectorAll('.svc-card,.news-card,.proj-card,.ev-card').forEach(card => {
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });
  }

  /* ─── 15. CURSOR GLOW EN HERO ────────────────────────────────────────────────
     Un resplandor verde translúcido sigue el cursor dentro del hero.
  ────────────────────────────────────────────────────────────────────────── */
  function initCursorGlow() {
    if (reduced) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const glow = document.createElement('div');
    glow.className = 'hero-cursor-glow';
    hero.appendChild(glow);
    hero.addEventListener('mousemove', e => {
      const rect = hero.getBoundingClientRect();
      glow.style.left = (e.clientX - rect.left) + 'px';
      glow.style.top  = (e.clientY - rect.top)  + 'px';
      glow.style.opacity = '1';
    });
    hero.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
    glow.style.opacity = '0';
    glow.style.transition = 'opacity .4s ease, left .08s ease, top .08s ease';
  }

  /* ─── 16. WORD REVEAL EN HEADINGS ────────────────────────────────────────────
     Los h2 con data-word-reveal se revelan palabra a palabra al entrar
     en el viewport.
  ────────────────────────────────────────────────────────────────────────── */
  function initWordReveal() {
    if (reduced) return;
    document.querySelectorAll('[data-word-reveal]').forEach(el => {
      const words = el.textContent.trim().split(/\s+/);
      el.classList.add('word-reveal');
      el.innerHTML = words.map((w, i) =>
        `<span class="word" style="transition-delay:${i * 90}ms">${w}</span>`
      ).join(' ');

      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        el.classList.add('revealed');
        io.disconnect();
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* ─── 17. TOAST CON BARRA DE PROGRESO ───────────────────────────────────────
     Inyecta una barra animada al toast para indicar cuánto tiempo queda.
     Se llama desde la función toast() de cada página.
  ────────────────────────────────────────────────────────────────────────── */
  function addToastBar(toastEl) {
    if (reduced || !toastEl) return;
    const old = toastEl.querySelector('.toast-bar');
    if (old) old.remove();
    const bar = document.createElement('span');
    bar.className = 'toast-bar';
    toastEl.style.position = 'relative';
    toastEl.style.overflow = 'hidden';
    toastEl.appendChild(bar);
  }

  /* ─── INIT ─────────────────────────────────────────────────────────────── */
  function init() {
    initNavShrink();
    initScrollReveal();
    initCounters();
    initStaggerCards();
    initTabSlider();
    initRipple();
    initTypewriter();
    initHeroParallax();
    initCardTilt();
    initCursorGlow();
    initWordReveal();
    window.IAGAMI_ANIM = {
      initProgressBars,
      animateCounter,
      filterFade,
      staggerChildren,
      animateNumber,
      pageFade,
      initRipple,
      openModalAnim,
      closeModalAnim,
      addToastBar,
      initCardTilt
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
