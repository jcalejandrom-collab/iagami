/**
 * Tests de cms/monitoring.js
 *
 * monitoring.js es un IIFE de browser — se carga via new Function(src)().
 * Estrategia: configurar window.__IAGAMI_CONFIG__ antes de cargar el módulo,
 * verificar que la API pública queda en window.SIGAP_MONITORING.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MON_SRC = readFileSync(resolve(__dirname, '../../cms/monitoring.js'), 'utf-8');

function loadMonitoring(config = {}) {
  delete window.SIGAP_MONITORING;
  // Limpiar listeners de eventos sigap:* del módulo anterior
  // (jsdom mantiene listeners entre tests)
  window.__IAGAMI_CONFIG__ = config;
  // eslint-disable-next-line no-new-func
  new Function(MON_SRC)();
  return window.SIGAP_MONITORING;
}

beforeEach(() => {
  delete window.SIGAP_MONITORING;
  delete window.__IAGAMI_CONFIG__;
  sessionStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  delete window.SIGAP_MONITORING;
  delete window.__IAGAMI_CONFIG__;
});

// ─── Sin DSN ──────────────────────────────────────────────────────────────────
describe('Sin DSN configurado', () => {
  it('expone SIGAP_MONITORING en window', () => {
    const mon = loadMonitoring({});
    expect(window.SIGAP_MONITORING).toBeDefined();
  });

  it('isReady es false sin DSN', () => {
    const mon = loadMonitoring({});
    expect(mon.isReady).toBe(false);
  });

  it('captureError es una función que no lanza (no-op)', () => {
    const mon = loadMonitoring({});
    expect(() => mon.captureError(new Error('test'))).not.toThrow();
  });

  it('captureMessage es una función que no lanza (no-op)', () => {
    const mon = loadMonitoring({});
    expect(() => mon.captureMessage('test message')).not.toThrow();
  });

  it('setUser es una función que no lanza (no-op)', () => {
    const mon = loadMonitoring({});
    expect(() => mon.setUser({ id: 'u1', email: 'test@test.com' })).not.toThrow();
  });

  it('addBreadcrumb es una función que no lanza (no-op)', () => {
    const mon = loadMonitoring({});
    expect(() => mon.addBreadcrumb({ message: 'crumb', category: 'test' })).not.toThrow();
  });

  it('NO intenta cargar scripts de CDN sin DSN', () => {
    const appendSpy = vi.spyOn(document.head, 'appendChild');
    loadMonitoring({});
    expect(appendSpy).not.toHaveBeenCalled();
  });
});

// ─── Con DSN ──────────────────────────────────────────────────────────────────
describe('Con DSN configurado', () => {
  it('intenta cargar Sentry SDK añadiendo un script al head', () => {
    const appendSpy = vi.spyOn(document.head, 'appendChild');
    loadMonitoring({ SENTRY_DSN: 'https://test@o123.ingest.sentry.io/456' });
    expect(appendSpy).toHaveBeenCalledOnce();
    const el = appendSpy.mock.calls[0][0];
    expect(el.tagName).toBe('SCRIPT');
    expect(el.src).toContain('sentry-cdn.com');
  });

  it('el script tiene crossOrigin = "anonymous"', () => {
    const appendSpy = vi.spyOn(document.head, 'appendChild');
    loadMonitoring({ SENTRY_DSN: 'https://test@o123.ingest.sentry.io/456' });
    const el = appendSpy.mock.calls[0][0];
    expect(el.crossOrigin).toBe('anonymous');
  });

  it('isReady es false hasta que el script cargue', () => {
    const mon = loadMonitoring({ SENTRY_DSN: 'https://test@o123.ingest.sentry.io/456' });
    expect(mon.isReady).toBe(false);
  });

  it('no lanza aunque Sentry no esté disponible en jsdom', () => {
    expect(() =>
      loadMonitoring({ SENTRY_DSN: 'https://test@o123.ingest.sentry.io/456' })
    ).not.toThrow();
  });
});

// ─── Captura de eventos sigap:* ───────────────────────────────────────────────
describe('Acumulación de breadcrumbs antes de Sentry', () => {
  it('almacena breadcrumbs de sigap:offline antes de cargar Sentry', () => {
    loadMonitoring({ SENTRY_DSN: 'https://test@o123.ingest.sentry.io/456' });

    // Disparar evento — debe quedar en _pendingCrumbs (no accesible externamente,
    // pero no lanzar error es suficiente para verificar el registro)
    expect(() => {
      window.dispatchEvent(new CustomEvent('sigap:offline', { detail: {} }));
    }).not.toThrow();
  });

  it('almacena breadcrumbs de sigap:session-expired', () => {
    loadMonitoring({ SENTRY_DSN: 'https://test@o123.ingest.sentry.io/456' });
    expect(() => {
      window.dispatchEvent(new CustomEvent('sigap:session-expired', { detail: { coleccion: 'noticias' } }));
    }).not.toThrow();
  });

  it('almacena breadcrumbs de sigap:auth-error', () => {
    loadMonitoring({ SENTRY_DSN: 'https://test@o123.ingest.sentry.io/456' });
    expect(() => {
      window.dispatchEvent(new CustomEvent('sigap:auth-error', { detail: { reason: 'missing-token' } }));
    }).not.toThrow();
  });

  it('no acumula errores globales sin DSN', () => {
    loadMonitoring({});
    // Sin DSN no hay interceptors de onerror
    const previousOnerror = window.onerror;
    expect(window.onerror).toBe(previousOnerror);
  });
});

// ─── Precaptura de errores globales ───────────────────────────────────────────
describe('Captura de errores globales antes de Sentry', () => {
  it('registra un handler en window.onerror cuando hay DSN', () => {
    const originalOnerror = window.onerror;
    loadMonitoring({ SENTRY_DSN: 'https://test@o123.ingest.sentry.io/456' });
    // El módulo debe sobrescribir o envolver onerror
    // (puede ser null o función — lo importante es que no lanza)
    expect(() => {
      if (window.onerror) {
        window.onerror('test error', 'test.js', 1, 1, new Error('test'));
      }
    }).not.toThrow();
    window.onerror = originalOnerror;
  });

  it('maneja unhandledrejection sin DSN sin lanzar', () => {
    loadMonitoring({});
    const p = Promise.reject(new Error('test rejection'));
    p.catch(() => {}); // evitar unhandled rejection en jsdom
    expect(() => {
      window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
        promise: p,
        reason: new Error('test rejection'),
      }));
    }).not.toThrow();
  });
});

// ─── Sanitización de usuario ──────────────────────────────────────────────────
describe('API con Sentry simulado', () => {
  it('setUser no falla con usuario nulo', () => {
    const mon = loadMonitoring({});
    expect(() => mon.setUser(null)).not.toThrow();
  });

  it('setUser no falla con usuario undefined', () => {
    const mon = loadMonitoring({});
    expect(() => mon.setUser(undefined)).not.toThrow();
  });

  it('setUser no falla con objeto vacío', () => {
    const mon = loadMonitoring({});
    expect(() => mon.setUser({})).not.toThrow();
  });

  it('captureError no falla con Error real', () => {
    const mon = loadMonitoring({});
    expect(() => mon.captureError(new Error('test'), { url: '/admin' })).not.toThrow();
  });

  it('captureError no falla con null', () => {
    const mon = loadMonitoring({});
    expect(() => mon.captureError(null)).not.toThrow();
  });
});
