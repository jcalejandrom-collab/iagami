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
  } else if (hostname.includes('ngrok-free.dev')) {
    pbUrl = 'https://crewmate-reps-fidgety.ngrok-free.dev';
  } else {
    pbUrl = 'https://api.iagami.gob.ve';
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
