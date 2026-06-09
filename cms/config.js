'use strict';

/* ══════════════════════════════════════════════════════════════
   CONFIGURACIÓN DE ENTORNO — PORTAL IAGAMI
   Protegido mediante inmutabilidad (Object.freeze + defineProperty)
   ══════════════════════════════════════════════════════════════ */

(function () {
  const hostname = window.location.hostname;
  let pbUrl;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    pbUrl = 'http://127.0.0.1:8090';
  } else {
    // En producción: leer meta tag pb-url solo si no está vacío.
    // Fallback: window.__PB_URL__ (inyectable en build) o localhost.
    // Para PC fija: poner la IP del servidor en el meta tag.
    const metaContent = document.querySelector('meta[name="pb-url"]')?.content?.trim();
    pbUrl = (metaContent && metaContent !== '')
      ? metaContent
      : (window.__PB_URL__ || 'http://127.0.0.1:8090');
  }

  const config = Object.freeze({
    PB_URL: pbUrl,
    ENVIRONMENT: (hostname === 'localhost' || hostname === '127.0.0.1') ? 'development' : 'production'
  });

  Object.defineProperty(window, '__IAGAMI_CONFIG__', {
    value: config,
    writable: false,
    configurable: false,
    enumerable: true
  });
})();
