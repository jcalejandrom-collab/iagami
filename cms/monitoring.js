'use strict';

/* exported SIGAP_MONITORING */
/* ════════════════════════════════════════════════════════════════════
   SIGAP_MONITORING — Observabilidad y captura de errores
   Versión: no-op automático sin DSN, Sentry opcional en producción.

   Arquitectura:
   • Se integra con el Event Bus de pb.js via window CustomEvents.
   • NO modifica pb.js ni ningún módulo existente.
   • Si no hay SENTRY_DSN en __IAGAMI_CONFIG__ → no-op completo.
   • Si hay DSN → carga Sentry SDK desde CDN de forma asíncrona.
   ════════════════════════════════════════════════════════════════════ */

(function () {
  const cfg = (typeof window !== 'undefined' && window.__IAGAMI_CONFIG__) || {};
  const DSN     = cfg.SENTRY_DSN  || '';
  const ENV     = cfg.ENV         || 'production';
  const VERSION = cfg.VERSION     || 'unknown';

  /* ── API pública (no-op hasta que Sentry cargue) ─────────────────── */
  const noop = () => {};
  const api = {
    captureError:   noop,
    captureMessage: noop,
    setUser:        noop,
    addBreadcrumb:  noop,
    isReady:        false,
  };

  if (typeof window !== 'undefined') {
    window.SIGAP_MONITORING = api;
  }

  /* ── Sin DSN → solo exponer la API no-op ─────────────────────────── */
  if (!DSN) { return; }

  /* ── Captura inmediata de errores globales antes de Sentry ───────── */
  const _preloadQueue = [];
  const _origError = window.onerror;

  window.onerror = function (msg, src, line, col, err) {
    _preloadQueue.push({ type: 'error', err: err || new Error(msg), extra: { src, line, col } });
    if (_origError) { return _origError.apply(this, arguments); }
    return false;
  };

  window.addEventListener('unhandledrejection', function (e) {
    _preloadQueue.push({ type: 'error', err: e.reason, extra: { type: 'unhandledrejection' } });
  });

  /* ── Listener de eventos sigap:* para breadcrumbs ─────────────────── */
  const SIGAP_EVENTS = [
    'sigap:session-expired',
    'sigap:offline',
    'sigap:online',
    'sigap:auth-error',
    'sigap:circuit-open',
    'sigap:access-denied',
    'sigap:server-error',
    'sigap:reconnecting',
    'sigap:collection-error',
  ];

  const _pendingCrumbs = [];

  SIGAP_EVENTS.forEach(function (name) {
    window.addEventListener(name, function (e) {
      _pendingCrumbs.push({
        category: 'sigap',
        message:  name,
        level:    name.includes('error') || name.includes('expired') || name.includes('circuit') ? 'warning' : 'info',
        data:     e.detail || {},
        timestamp: Date.now() / 1000,
      });
    });
  });

  /* ── Carga Sentry SDK de forma asíncrona ─────────────────────────── */
  const SENTRY_CDN = 'https://browser.sentry-cdn.com/7.119.1/bundle.min.js';
  const script = document.createElement('script');
  script.src = SENTRY_CDN;
  script.crossOrigin = 'anonymous';
  script.integrity = '';

  script.onload = function () {
    if (typeof Sentry === 'undefined') { return; }

    Sentry.init({
      dsn:         DSN,
      environment: ENV,
      release:     'sigap@' + VERSION,
      tracesSampleRate: 0.1,    // 10% de sesiones con trazas de rendimiento
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend: function (event) {
        // No enviar errores de extensiones del navegador
        const url = event.request && event.request.url;
        if (url && (url.includes('chrome-extension') || url.includes('moz-extension'))) {
          return null;
        }
        return event;
      },
    });

    /* Reenviar breadcrumbs acumulados antes de la carga */
    _pendingCrumbs.forEach(function (crumb) {
      Sentry.addBreadcrumb(crumb);
    });
    _pendingCrumbs.length = 0;

    /* Reenviar errores capturados antes de la carga */
    _preloadQueue.forEach(function (item) {
      Sentry.captureException(item.err, { extra: item.extra });
    });
    _preloadQueue.length = 0;

    /* Leer usuario de sesión */
    _setCurrentUser();

    /* Escuchar cambios de sesión */
    window.addEventListener('sigap:session-expired', _clearUser);
    window.addEventListener('sigap:online', _setCurrentUser);

    /* Actualizar API pública con métodos reales */
    api.captureError   = function (err, ctx)  { Sentry.captureException(err, { extra: ctx }); };
    api.captureMessage = function (msg, ctx)  { Sentry.captureMessage(msg, { extra: ctx }); };
    api.setUser        = function (user)      { Sentry.setUser(_sanitizeUser(user)); };
    api.addBreadcrumb  = function (crumb)     { Sentry.addBreadcrumb(crumb); };
    api.isReady        = true;

    /* Registrar breadcrumbs de eventos futuros en tiempo real */
    SIGAP_EVENTS.forEach(function (name) {
      window.addEventListener(name, function (e) {
        Sentry.addBreadcrumb({
          category: 'sigap',
          message:  name,
          level:    name.includes('error') || name.includes('expired') || name.includes('circuit') ? 'warning' : 'info',
          data:     e.detail || {},
        });
      });
    });
  };

  script.onerror = function () {
    // Sentry no cargó (sin conexión, CDN bloqueado) → no-op silencioso
  };

  document.head.appendChild(script);

  /* ── Helpers internos ────────────────────────────────────────────── */
  function _setCurrentUser() {
    try {
      const raw = sessionStorage.getItem('pb_user');
      if (!raw || typeof Sentry === 'undefined') { return; }
      const user = JSON.parse(raw);
      Sentry.setUser(_sanitizeUser(user));
    } catch (_e) { /* sessionStorage no accesible */ }
  }

  function _clearUser() {
    if (typeof Sentry !== 'undefined') { Sentry.setUser(null); }
  }

  function _sanitizeUser(user) {
    if (!user || typeof user !== 'object') { return null; }
    return {
      id:    user.id    || undefined,
      email: user.email || undefined,
      rol:   user.rol   || undefined,
      // nombre excluido intencionalmente (datos personales)
    };
  }

})();
