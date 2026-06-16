'use strict';

(function () {
  function isValidUrl(str) {
    try { new URL(str); return true; } catch (_) { return false; }
  }

  const hostname = window.location.hostname;
  let pbUrl;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    pbUrl = 'http://127.0.0.1:8090';
  } else {
    const metaContent = document.querySelector('meta[name="pb-url"]')?.content?.trim();
    const candidate = (metaContent && metaContent !== '')
      ? metaContent
      : (window.__PB_URL__ || 'http://127.0.0.1:8090');
    pbUrl = isValidUrl(candidate) ? candidate : 'http://127.0.0.1:8090';
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
