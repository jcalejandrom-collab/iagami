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
    // En staging/producción la URL del backend se inyecta como meta tag:
    // <meta name="pb-url" content="https://api.iagami.gob.ve">
    // Si no existe el meta tag, se usa el dominio oficial como fallback.
    const metaPbUrl = document.querySelector('meta[name="pb-url"]')?.content;
    pbUrl = metaPbUrl || 'https://api.iagami.gob.ve';
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
