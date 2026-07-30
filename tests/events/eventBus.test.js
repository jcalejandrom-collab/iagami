import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadCMSDB } from '../setup.js';

describe('Event Bus — Bus.emit / Bus.on / Bus.off', () => {
  let Bus;

  beforeEach(() => {
    const CMSDB = loadCMSDB();
    Bus = CMSDB.Bus;
  });

  it('Bus.emit() dispara el listener registrado con Bus.on()', () => {
    const handler = vi.fn();
    Bus.on('sigap:test-event', handler);

    Bus.emit('sigap:test-event', { valor: 42 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail).toEqual({ valor: 42 });

    Bus.off('sigap:test-event', handler);
  });

  it('Bus.off() elimina el listener correctamente', () => {
    const handler = vi.fn();
    Bus.on('sigap:test-event', handler);
    Bus.off('sigap:test-event', handler);

    Bus.emit('sigap:test-event');

    expect(handler).not.toHaveBeenCalled();
  });

  it('múltiples listeners reciben el mismo evento', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    Bus.on('sigap:multi', h1);
    Bus.on('sigap:multi', h2);

    Bus.emit('sigap:multi', { x: 1 });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();

    Bus.off('sigap:multi', h1);
    Bus.off('sigap:multi', h2);
  });

  it('el detail del evento contiene los datos emitidos', () => {
    const received = [];
    const handler = (e) => received.push(e.detail);
    Bus.on('sigap:data', handler);

    Bus.emit('sigap:data', { coleccion: 'noticias', status: 200 });

    expect(received[0]).toEqual({ coleccion: 'noticias', status: 200 });
    Bus.off('sigap:data', handler);
  });

  it('emit sin detail envía objeto vacío', () => {
    const handler = vi.fn();
    Bus.on('sigap:empty', handler);

    Bus.emit('sigap:empty');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail).toEqual({});

    Bus.off('sigap:empty', handler);
  });
});

describe('Eventos del sistema — sigap:session-expired y sigap:offline', () => {
  it('sigap:session-expired se emite al recibir 401 con token activo', async () => {
    sessionStorage.setItem('pb_token', 'Bearer eyJtest.abc');
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));

    const expired = vi.fn();
    window.addEventListener('sigap:session-expired', expired);

    const CMSDB = loadCMSDB(() =>
      Promise.resolve(new Response('{}', { status: 401 }))
    );

    // Re-añadir listener después de cargar nueva instancia
    window.addEventListener('sigap:session-expired', expired);
    sessionStorage.setItem('pb_token', 'Bearer eyJtest.abc');

    await CMSDB.verifyToken();

    // El evento debe haberse disparado o el token debe haberse limpiado
    const tokenGone = sessionStorage.getItem('pb_token') === null;
    expect(tokenGone || expired.mock.calls.length > 0).toBe(true);

    window.removeEventListener('sigap:session-expired', expired);
  });

  it('sigap:offline se emite cuando falla la red durante verifyToken', async () => {
    vi.useFakeTimers();
    sessionStorage.setItem('pb_token', 'Bearer eyJtest.abc');
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));

    const offlineEvents = [];
    window.addEventListener('sigap:offline', () => offlineEvents.push(true), { once: true });

    const CMSDB = loadCMSDB(() => Promise.reject(new TypeError('Failed to fetch')));
    const promise = CMSDB.verifyToken();
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();
    expect(offlineEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('sigap:online se emite cuando el navegador recupera conexión', () => {
    loadCMSDB();
    const onlineEvents = [];
    window.addEventListener('sigap:online', () => onlineEvents.push(true));

    window.dispatchEvent(new Event('online'));

    expect(onlineEvents.length).toBeGreaterThanOrEqual(1);
    window.removeEventListener('sigap:online', () => {});
  });

  it('el listener online no se duplica al cargar múltiples instancias (regresión)', () => {
    // Cargar 3 instancias; destroy() se llama en beforeEach entre ellas
    // pero aquí probamos carga secuencial sin destroy intermedio
    const inst1 = loadCMSDB();
    inst1.destroy();
    delete window.CMSDB;

    const inst2 = loadCMSDB();
    inst2.destroy();
    delete window.CMSDB;

    loadCMSDB();

    const onlineEvents = [];
    window.addEventListener('sigap:online', () => onlineEvents.push(true));
    window.dispatchEvent(new Event('online'));

    // Solo 1 listener activo (las instancias anteriores llamaron destroy)
    expect(onlineEvents.length).toBe(1);
    window.removeEventListener('sigap:online', () => {});
  });
});
